'use strict';
// Display helpers only. Archived labels, measurements and verdicts stay intact.
window.DendriScaleUI = (() => {
  const node = (tag, text, className) => {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  const modelName = name => String(name).replace(/^allenai\//, '');
  const candidateName = label => String(label)
    .replace(/_/g, ' ')
    .replace(/\bspan4 exit4k\b/gi, '4-FFN span · 4,096-update recovery')
    .replace(/\bspan4 independent\b/gi, '4 independent FFN cells')
    .replace(/\bspan4 exit\b/gi, '4-FFN span · exit fit')
    .replace(/\bdelete(\d+)/gi, 'Layer removal · $1')
    .replace(/\bcoverage(\d+)\b/gi, '$1-FFN coverage')
    .replace(/\bbanks(\d+)\b/gi, '$1 cores')
    .replace(/\b(bf16|fp32|int[2348]|qkvo|gptq|awq|gsm|mc)\b/gi, word => word.toUpperCase())
    .replace(/\bFFNs?(\d+)/gi, (match, number) => match.replace(number, ' ' + number))
    .replace(/\s+/g, ' ').trim();
  const metricName = label => String(label)
    .replace(/^GSM correct \/ ([\d,]+)/, 'GSM8K · correct / $1')
    .replace(/^MC correct \/ ([\d,]+)/, 'Multiple choice · correct / $1')
    .replace(/^Copy(\d+)/, 'Copy $1')
    .replace(/^C4 NLL$/, 'C4 · language-model loss');
  const axisName = panel => {
    if (panel.xunit === 'percent') return 'Whole-model size retained (%)';
    if ((panel.xaxis || panel.points?.[0]?.xaxis) === 'whole_registered_bytes') return 'Whole-model size (GB)';
    if (panel.xunit === 'bytes') return panel.xlabel.replace(/\s*\(bytes\)/gi, '').replace(/\s*bytes\s*$/i, '').trim() + ' (GB)';
    return panel.xlabel;
  };
  const number = value => Number.isFinite(value)
    ? new Intl.NumberFormat('en', {maximumSignificantDigits: 5}).format(value) : 'Not measured';
  const tick = value => Number.isFinite(value)
    ? new Intl.NumberFormat('en', {maximumSignificantDigits: 3}).format(value) : '';
  const verdictName = state => ({passed: 'Passed', failed: 'Failed / stopped', other: 'Recorded result', reference: 'Teacher reference'}[state] || state);
  const tickCost = (panel, value) => panel.xunit === 'bytes' ? tick(value / 1e9) + ' GB'
    : panel.xunit === 'parameters' ? tick(value / 1e6) + ' M'
    : panel.xunit === 'percent' ? tick(value) + '%'
    : panel.xunit === 'factor' ? tick(value) + '×' : tick(value);
  function ticks(min, max, count = 5) {
    const rough = (max - min) / count, power = 10 ** Math.floor(Math.log10(rough));
    if (!Number.isFinite(power) || power <= 0) return [];
    const step = [1, 2, 2.5, 5, 10].find(v => v * power >= rough) * power;
    const values = [];
    for (let value = Math.ceil(min / step) * step; value <= max + step * 1e-9; value += step) values.push(value);
    return values;
  }
  function badge(state, original) {
    const element = node('span', verdictName(state), 'badge ' + state);
    element.title = original || verdictName(state);
    return element;
  }
  const passLabel = 'Passes all benchmarks';
  const passScope = 'All five recorded development gates pass: GSM8K, multiple choice, C4, copy 512 and copy 2048. Within the recorded tolerances and evaluation cohort.';
  function allBenchmarksPass(point) {
    if (!point || point.source_level !== 'curated' || point.execution !== 'completed'
      || point.label === 'Teacher reference' || point.method_style?.key === 'teacher'
      || point.failed_gates?.length || /fail|reject|gate.stop/i.test(point.gate_status || '')) return false;
    const checks = point.full_gate_checks;
    if (checks != null) return ['gsm', 'mc', 'c4', 'copy512', 'copy2048'].every(key => checks[key] === true)
      && Object.values(checks).every(value => value === true);
    // Older curated batteries carry an explicit whole-suite verdict instead.
    // A generic positive/pass verdict or a partial checks object is insufficient.
    return /^All five (?:(?:full|fresh|original) )*development gates pass$/i.test(point.gate_status || '');
  }
  // Bind register rows to their exact observation; labels alone are not identities.
  function candidatePoint(data, row) {
    const panel = data.panels.find(panel => panel.id === row.panel_id);
    const point = panel?.points.find(point => point.id === row.point_id);
    return point && point.model === row.model && point.cohort === row.cohort
      && point.source_level === row.source_level ? point : null;
  }
  function passBadge() {
    const element = node('span', '✓ ' + passLabel, 'all-pass-badge');
    element.title = passScope;
    return element;
  }
  function passMark(target, se, x, y) {
    const attrs = {d: `M ${x-2.7} ${y} l 1.8 1.8 l 3.6 -3.6`, fill: 'none',
      'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'pointer-events': 'none', 'aria-hidden': 'true'};
    target.append(se('path', {...attrs, stroke: 'white', 'stroke-width': 1.5,
      class: 'all-pass-mark', 'data-center-x': x, 'data-center-y': y}));
  }
  // Zoom the axes only: coordinates, verdicts and the complete table stay intact.
  function chartZoom(focusButton, resetButton, note, redraw) {
    let scope, window, crowded;
    const contains = (x, y) => !window || (x >= window.xmin && x <= window.xmax && y >= window.ymin && y <= window.ymax);
    const reset = () => { window = null; };
    focusButton.addEventListener('click', () => { if (crowded) { window = crowded; redraw(); } });
    resetButton.addEventListener('click', () => { reset(); redraw(); });
    function view(full, points, key) {
      if (scope !== key) { reset(); scope = key; }
      const eligible = points.filter(p => !p.reference), dx = full.xmax-full.xmin, dy = full.ymax-full.ymin;
      let cluster = [];
      for (const p of eligible) {
        const near = eligible.filter(q => Math.hypot((p.x-q.x)/dx*975, (p.y-q.y)/dy*425) <= 50);
        if (near.length > cluster.length) cluster = near;
      }
      crowded = null;
      if (cluster.length >= 3) {
        const xs = cluster.map(p => p.x), ys = cluster.map(p => p.y);
        const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
        const px = Math.max((x1-x0)*.18, dx*.003), py = Math.max((y1-y0)*.18, dy*.003);
        crowded = {xmin: x0-px, xmax: x1+px, ymin: y0-py, ymax: y1+py};
      }
      focusButton.disabled = !crowded || !!window;
      resetButton.hidden = !window;
      note.hidden = !window;
      note.textContent = window ? `Zoomed view · ${points.filter(p => contains(p.x,p.y)).length} of ${points.length} points. The result table still includes all filtered results.` : '';
      return window || full;
    }
    return {view, contains, reset, get active() {return !!window;}, get description() {return note.textContent;}};
  }
  function result(container, {title, subtitle, state, status, allPass = false, stats = [], facts = [], raw}) {
    container.replaceChildren();
    const heading = node('div', undefined, 'detail-heading');
    heading.append(node('h3', candidateName(title)), allPass ? passBadge() : badge(state, status));
    container.append(heading, node('p', subtitle, 'detail-meta'));
    if (allPass) container.append(node('p', passScope, 'pass-scope'));
    if (stats.length) {
      const grid = node('div', undefined, 'detail-stats');
      for (const [label, value] of stats) {
        const item = node('div', undefined, 'detail-stat');
        item.append(node('span', label), node('b', value));grid.append(item);
      }
      container.append(grid);
    }
    const list = node('dl', undefined, 'detail-facts');
    for (const [label, value] of facts) if (value !== null && value !== undefined && value !== '') {
      list.append(node('dt', label), node('dd', String(value)));
    }
    container.append(list);
    const details = node('details', undefined, 'raw-record');
    details.append(node('summary', 'Full record & source hashes'), node('pre', JSON.stringify(raw, null, 2)));
    container.append(details);
  }
  const empty = container => container.replaceChildren(node('p', 'Select a point or table row to see its performance, size, and evidence.', 'empty-state'));
  let tip;
  function tooltip(target, title, description) {
    if (!tip) {tip = node('div', undefined, 'chart-tooltip');tip.hidden = true;tip.setAttribute('role', 'tooltip');document.body.append(tip);}
    const show = event => {
      tip.replaceChildren(node('b', candidateName(title)), node('span', description));tip.hidden = false;
      const box = target.getBoundingClientRect();
      const x = Number.isFinite(event.clientX) ? event.clientX : box.right;
      const y = Number.isFinite(event.clientY) ? event.clientY : box.top;
      tip.style.left = Math.max(8, Math.min(innerWidth - tip.offsetWidth - 8, x + 14)) + 'px';
      tip.style.top = Math.max(8, Math.min(innerHeight - tip.offsetHeight - 8, y - tip.offsetHeight - 12)) + 'px';
    };
    target.addEventListener('pointerenter', show);target.addEventListener('pointermove', show);target.addEventListener('focus', show);
    for (const event of ['pointerleave', 'blur', 'click']) target.addEventListener(event, () => {tip.hidden = true;});
    target.addEventListener('keydown', event => {if (event.key === 'Escape') tip.hidden = true;});
  }
  return {modelName, candidateName, metricName, axisName, number, tick, tickCost, ticks, badge, result, empty, tooltip,
    allBenchmarksPass, candidatePoint, passBadge, passMark, passLabel, passScope, chartZoom};
})();
