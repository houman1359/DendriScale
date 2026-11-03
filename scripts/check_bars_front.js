'use strict';
// Checks the benchmark bars' empirical fronts across methods against an independent computation. Node only, no
// packages: it runs the site's own presentation.js and bars.js on data/ inside a minimal DOM stand-in.
//
//   node scripts/check_bars_front.js [--svg-dir DIR] [--monochrome]
//
// For every original model and benchmark chart it recomputes, from the bars' own rows, the nondominated set of our
// measured models (no original model, no published reference, no external release measured here, whole-model
// bytes required) within each cohort (evaluation set and protocol), training regime, metric and byte convention, on
// unrounded bytes and scores, and requires that set to equal (1) the page's front membership, (2) the bars carrying
// a front tag and (3) the filled markers on the size-score panel. Each staircase must join exactly one such group,
// in size order, and never mix training regimes; each panel must draw every measured result of the chart (dominated
// and unsuccessful ones too), with one plot per byte convention of our models; front tags must name their cohort
// and regime; no text may say "Pareto optimal" or "best model". With --svg-dir it also writes the panel and bars of
// two charts as SVG files.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const svgDir = process.argv.includes('--svg-dir') ? process.argv[process.argv.indexOf('--svg-dir') + 1] : null;
const monochrome = process.argv.includes('--monochrome'); // render in the site's monochrome mode

class Node {
  constructor(tag, ns) {
    this.tagName = tag; this.ns = ns; this.attributes = new Map(); this.children = []; this._text = '';
    this.style = {display: '', setProperty() {}}; this.dataset = {}; this.listeners = {};
    this.classList = {add() {}, remove() {}, toggle() {}, contains: () => false};
    this.value = ''; this.checked = false; this.clientWidth = 1100; this.open = false; this.hidden = false;
  }
  append(...nodes) { for (const n of nodes) this.children.push(typeof n === 'string' ? Object.assign(new Node('#text'), {_text: n}) : n); }
  appendChild(n) { this.append(n); return n; }
  replaceChildren(...nodes) { this.children = []; this.append(...nodes); }
  setAttribute(k, v) { this.attributes.set(k, String(v)); }
  getAttribute(k) { return this.attributes.has(k) ? this.attributes.get(k) : null; }
  removeAttribute(k) { this.attributes.delete(k); }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  dispatchEvent() {}
  set textContent(v) { this.children = []; this._text = String(v); }
  get textContent() { return this._text + this.children.map(c => c.textContent).join(''); }
  showModal() {} close() {} scrollIntoView() {} focus() {}
  cloneNode() { return this; }
  walk(fn) { fn(this); for (const c of this.children) c.walk(fn); }
  find(fn) { const out = []; this.walk(n => { if (fn(n)) out.push(n); }); return out; }
}
const ids = new Map();
const document = {
  getElementById: id => { if (!ids.has(id)) ids.set(id, new Node('div')); return ids.get(id); },
  createElement: tag => new Node(tag), createElementNS: (ns, tag) => new Node(tag, ns), querySelectorAll: () => [],
};
const window = {};
const ctx = vm.createContext({window, document, console, Intl, Number, Math, JSON, Set, Map, String, Array, Object,
  RegExp, Date, Event: class {}, getComputedStyle: () => ({paddingLeft: '20px'}),
  ResizeObserver: class { observe() {} disconnect() {} }});
for (const f of ['presentation.js', 'bars.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, {filename: f});
const read = f => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f), 'utf8'));
const DATA = read('snapshot.json');
const el = (tag, text) => { const x = document.createElement(tag); if (text !== undefined) x.textContent = text; return x; };
const se = (tag, attrs, text) => { const x = document.createElementNS('svg', tag); for (const [k, v] of Object.entries(attrs)) x.setAttribute(k, v); if (text !== undefined) x.textContent = text; return x; };
document.getElementById('monochrome').checked = monochrome;
window.DendriScaleBars(DATA, {el, se, sizeNotes: read('benchmark_size_notes.json').entries,
  benchmarkCoverage: read('benchmark_evaluation_coverage.json'), variantAliases: read('variant_aliases.json')});
const {rows, cross} = window.DendriScaleBarData, UI = window.DendriScaleUI;

// The reference: brute force over our measured models, written from the definition, not from bars.js.
const external = r => ['ternary', 'binary', 'external'].includes(r.method) || String(r.label).startsWith('External · ');
const ours = r => !r.published && r.method !== 'teacher' && !external(r) && Number.isFinite(r.size.bytes) && r.size.bytes > 0;
// Training regime, read independently of bars.js: the label's exposure token (digits, optional decimals, then M),
// with the segment's "N-stage" when stated, or "untrained"; otherwise not recorded.
const regime = r => {
  const segments = String(r.label).split(' · ').filter(x => !/^[0-9.]+ GB$/.test(x.trim()));
  for (const segment of segments) {
    const words = segment.split(/[\s,()+]+/).filter(Boolean);
    const exposure = words.find(w => /^[0-9]+(\.[0-9]+)?M$/.test(w));
    if (exposure) { const stage = words.find(w => /^[0-9]+-stage$/.test(w)); return exposure + (stage ? ` (${stage})` : ''); }
  }
  return segments.some(x => x.toLowerCase().split(/[\s,()]+/).includes('untrained')) ? 'untrained' : 'regime not recorded';
};
const group = r => JSON.stringify([r.model, r.benchmark, r.cohort, r.direction || 'max', r.scoreUnit || '%', r.size.basis, r.n, regime(r)]);
const better = (a, b) => (a.direction === 'min' ? b.score - a.score : a.score - b.score);
const reference = new Map();
for (const r of rows.filter(ours)) {
  const rivals = rows.filter(q => ours(q) && group(q) === group(r));
  if (!rivals.some(q => q.size.bytes <= r.size.bytes && better(q, r) >= 0 && (q.size.bytes < r.size.bytes || better(q, r) > 0))) reference.set(r, group(r));
}
const problems = [];
const page = cross.member;
// Same members, and the page's groups are the reference's groups (a one-to-one map between the two keys).
const pairs = new Map(), back = new Map();
for (const [r, k] of reference) { const pk = page.get(r); if (!pairs.has(k)) pairs.set(k, pk); if (!back.has(pk)) back.set(pk, k); if (pairs.get(k) !== pk || back.get(pk) !== k) pairs.set(k, '#mismatch'); }
if (reference.size !== page.size || [...reference.keys()].some(r => !page.has(r)) || [...pairs.values()].includes('#mismatch')) problems.push('front membership differs from the reference');

// Render every original model's charts and compare what the reader sees with the reference.
const switcher = document.getElementById('barsModels');
const models = switcher.find(n => n.tagName === 'button' && n.dataset.model).map(b => b.dataset.model);
const charts = [];
for (const model of models) {
  switcher.find(n => n.tagName === 'button' && n.dataset.model === model)[0].onclick();
  for (const card of document.getElementById('barsGrid').find(n => n.tagName === 'article')) {
    const benchmark = card.dataset.benchmark;
    const [panel, chart] = card.find(n => n.tagName === 'svg');
    const expected = [...reference.keys()].filter(r => UI.canonicalModelId(r.model) === model && r.benchmark === benchmark);
    const want = new Set(expected.map(r => r.id + '|' + r.cohort + '|' + r.size.basis));
    const ident = n => n.getAttribute('data-point-id');
    const bars = chart.find(n => n.getAttribute('data-front') === 'true');
    const tagged = chart.find(n => n.getAttribute('class') === 'front-tag');
    const filled = panel.find(n => n.getAttribute('class') === 'front-point' && n.getAttribute('data-front') === 'true');
    const stairs = panel.find(n => n.getAttribute('class') === 'front-staircase');
    const groups = new Set(expected.map(r => group(r)));
    // Each staircase joins one reference group exactly, smallest member first.
    const byId = new Map(rows.filter(r => UI.canonicalModelId(r.model) === model && r.benchmark === benchmark).map(r => [r.id, r]));
    for (const s of stairs) {
      const ids = JSON.parse(s.getAttribute('data-members') || '[]'), members = ids.map(i => byId.get(i));
      const keysHere = new Set(members.map(r => r && group(r)));
      if (members.some(r => !r || !reference.has(r)) || keysHere.size !== 1) { problems.push(`${model} ${benchmark}: a staircase joins points outside one front`); continue; }
      const k = [...keysHere][0], want = expected.filter(r => group(r) === k);
      if (want.length !== members.length) problems.push(`${model} ${benchmark}: a staircase misses front members`);
      if (members.some((r, j) => j && r.size.bytes < members[j - 1].size.bytes)) problems.push(`${model} ${benchmark}: staircase out of size order`);
      if (s.getAttribute('data-size-basis') !== members[0].size.basis) problems.push(`${model} ${benchmark}: staircase byte convention mislabelled`);
      if (new Set(members.map(regime)).size !== 1 || s.getAttribute('data-regime') !== regime(members[0])) problems.push(`${model} ${benchmark}: a staircase mixes or mislabels training regimes`);
    }
    // Every measured result with a whole-model size is drawn exactly once, front or not, in a plot of its own
    // cohort and byte convention; published references share one plot of their own.
    const drawable = [...byId.values()].filter(r => (r.method !== 'teacher' || r.published) && r.size.bytes > 0);
    const markers = panel.find(n => n.getAttribute('class') === 'front-point');
    const drawn = markers.map(ident), drawnSet = new Set(drawn);
    if (drawable.some(r => !drawnSet.has(r.id)) || drawn.some(i => !byId.has(i))) problems.push(`${model} ${benchmark}: panel does not draw every measured result`);
    if (drawnSet.size !== drawn.length) problems.push(`${model} ${benchmark}: a result is drawn twice`);
    const expectedPlots = new Set();
    for (const r of drawable) {
      if (r.published) { expectedPlots.add('published'); continue; }
      const sameCohort = drawable.filter(q => !q.published && q.cohort === r.cohort && ours(q));
      expectedPlots.add(JSON.stringify([r.cohort, ours(r) ? r.size.basis : (sameCohort[0] ? [...new Set(sameCohort.map(q => q.size.basis))].sort()[0] : null)]));
    }
    const plots = panel.find(n => n.getAttribute('class') === 'front-plot');
    if (plots.length !== expectedPlots.size) problems.push(`${model} ${benchmark}: ${plots.length} plots for ${expectedPlots.size} cohort and byte-convention groups`);
    for (const plot of plots) {
      const inPlot = plot.find(n => n.getAttribute('class') === 'front-point').map(n => byId.get(ident(n)));
      if (plot.getAttribute('data-cohort') === 'published') { if (inPlot.some(r => !r.published)) problems.push(`${model} ${benchmark}: a measured result in the published plot`); continue; }
      if (new Set(inPlot.map(r => r.cohort)).size > 1 || inPlot.some(r => r.published)) problems.push(`${model} ${benchmark}: cohorts joined in one plot`);
      if (new Set(inPlot.filter(ours).map(r => r.size.basis)).size > 1) problems.push(`${model} ${benchmark}: byte conventions mixed in one plot`);
      const stairs = plot.find(n => n.getAttribute('class') === 'front-staircase');
      if (new Set(stairs.map(n => n.getAttribute('data-regime'))).size !== stairs.length) problems.push(`${model} ${benchmark}: two staircases of one regime in one plot`);
    }
    // Front tags name the cohort; wording rules hold everywhere in the card.
    for (const b of bars) {
      const r = byId.get(ident(b)), t = b.find(n => n.getAttribute('class') === 'front-tag')[0];
      const wanted = `${(b.getAttribute('aria-label').match(/, ([EP]\d+), on the empirical/) || [])[1]}, ${regime(r)}`;
      if (!t || !/^◆ /.test(t.textContent) || !t.textContent.endsWith(wanted)) problems.push(`${model} ${benchmark}: front tag "${t && t.textContent}" does not name cohort and regime "${wanted}"`);
    }
    const words = card.find(n => n.tagName === '#text' || n.tagName === 'text' || n.tagName === 'title' || n.tagName === 'desc').map(n => n._text).join(' ') + ' ' + [...card.find(n => n.getAttribute('aria-label'))].map(n => n.getAttribute('aria-label')).join(' ');
    if (/pareto[- ]optimal|best model/i.test(words)) problems.push(`${model} ${benchmark}: forbidden wording`);
    const barIds = new Set(bars.map(ident)), markerIds = new Set(filled.map(ident)), wantIds = new Set(expected.map(r => r.id));
    if (barIds.size !== wantIds.size || [...wantIds].some(i => !barIds.has(i))) problems.push(`${model} ${benchmark}: bars tagged front differ`);
    if (tagged.length !== bars.length) problems.push(`${model} ${benchmark}: a front bar lacks its text tag`);
    if (markerIds.size !== wantIds.size || [...wantIds].some(i => !markerIds.has(i))) problems.push(`${model} ${benchmark}: filled panel markers differ`);
    if (stairs.length !== groups.size) problems.push(`${model} ${benchmark}: ${stairs.length} staircases for ${groups.size} groups`);
    charts.push({model, benchmark, front: expected.length, groups: groups.size, staircases: stairs.length, want: want.size, plots: plots.length, drawn: drawnSet.size});
    if (svgDir && ((model === 'Qwen/Qwen3-8B' && benchmark === 'GSM8K') || (model === 'allenai/OLMo-2-0325-32B-Instruct' && benchmark === 'GSM8K'))) {
      const xml = n => n.tagName === '#text' ? n._text.replace(/&/g, '&amp;').replace(/</g, '&lt;')
        : `<${n.tagName}${[...n.attributes].map(([k, v]) => ` ${k}="${v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')}"`).join('')}${n.tagName === 'svg' ? ' xmlns="http://www.w3.org/2000/svg"' : ''}>${n._text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}${n.children.map(xml).join('')}</${n.tagName}>`;
      const stem = model.split('/').pop() + '_' + benchmark.replace(/[^A-Za-z0-9]+/g, '-');
      fs.mkdirSync(svgDir, {recursive: true});
      fs.writeFileSync(path.join(svgDir, stem + '_panel.svg'), xml(panel));
      fs.writeFileSync(path.join(svgDir, stem + '_bars.svg'), xml(chart));
    }
  }
}
const show = (model, benchmark) => [...reference.keys()].filter(r => UI.canonicalModelId(r.model) === model && r.benchmark === benchmark)
  .sort((a, b) => a.cohort.localeCompare(b.cohort) || a.size.bytes - b.size.bytes)
  .map(r => `${(r.size.bytes / 1e9).toFixed(2)} GB · ${r.score.toFixed(2)} · ${r.size.basis} · ${r.variant}`);
console.log(JSON.stringify({charts: charts.length, front_members: reference.size, groups: new Set(reference.values()).size,
  points_drawn: charts.reduce((s, c) => s + c.drawn, 0), plots: charts.reduce((s, c) => s + c.plots, 0),
  regimes: [...new Set([...reference.keys()].map(regime))].sort(),
  problems, examples: {'Qwen3-8B GSM8K': show('Qwen/Qwen3-8B', 'GSM8K'), 'OLMo-2-32B GSM8K (dev GSM)': show('allenai/OLMo-2-0325-32B-Instruct', 'GSM8K')}}, null, 1));
process.exit(problems.length ? 1 : 0);
