'use strict';
// Benchmark overview; archived observations and gate decisions remain unchanged.
// Point-score fronts are local to a model, evaluation protocol and byte basis.
// Published scores are references, never competitors in our measured fronts.
// The training regime a record's label carries: its training exposure (a count such as 67M or 4.19M, with
// "(N-stage)" when the label states stages) or "untrained"; null when the label records neither. Read from the label
// only, never inferred; fronts never join different regimes, and unrecorded regimes form their own group.
window.DendriScaleRegime = r => {
 const segments=String(r.label??'').split(' · ').filter(s=>!/^\s*[\d.]+ GB\s*$/.test(s));
 for(const s of segments){
  const m=s.match(/(?:^|[\s,(])(\d+(?:\.\d+)?M)(?=$|[\s,)+])/);
  if(m){const stage=s.match(/\b(\d+)-stage\b/);return m[1]+(stage?' ('+stage[1]+'-stage)':'');}
 }
 return segments.some(s=>/\buntrained\b/i.test(s))?'untrained':null;
};
window.DendriScaleBarFront = rows => {
 const family = r => ['teacher','dendritic','hybrid'].includes(r.method) ? r.method : 'control';
 const key = r => JSON.stringify([r.model,r.cohort,r.benchmark,r.direction||'max',r.scoreUnit||'%',r.size.basis,r.n,window.DendriScaleRegime(r),family(r)]);
 const eligible = rows.filter(r => Number.isFinite(r.size.bytes) && r.size.bytes > 0);
 const groups = new Map();
 for(const r of eligible.filter(r=>!r.published && family(r)!=='teacher')){
  const k=key(r);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r);
 }
 const dominates = (a,b) => {
  const gain=(a.score-b.score)*(b.direction==='min'?-1:1);
  return a.size.bytes<=b.size.bytes && gain>=0 && (a.size.bytes<b.size.bytes || gain>0);
 };
 return rows.filter(r => r.published || family(r)==='teacher' ||
  (eligible.includes(r) && !groups.get(key(r)).some(q=>dominates(q,r))));
};

// The empirical front of one chart across methods: our measured models of every method family together, within
// one cohort (evaluation set and protocol), one training regime and one byte convention, so projected ledgers never
// meet registered bytes, on one metric. A dominates B when it is no larger and at least as good, with one of the two strict, on
// unrounded bytes and scores. Original models, published references, external releases measured here (PrismML
// Bonsai, GGUF files) and models without whole-model bytes are never on it; ties stay.
window.DendriScaleExternal = r => ['ternary','binary','external'].includes(r.method) || /^External · /.test(String(r.label));
window.DendriScaleCrossFront = rows => {
 const family = r => ['teacher','dendritic','hybrid'].includes(r.method) ? r.method : 'control';
 const key = r => JSON.stringify([r.model,r.benchmark,r.cohort,r.direction||'max',r.scoreUnit||'%',r.size.basis,r.n,window.DendriScaleRegime(r)]);
 const dominates = (a,b) => {
  const gain=(a.score-b.score)*(b.direction==='min'?-1:1);
  return a.size.bytes<=b.size.bytes && gain>=0 && (a.size.bytes<b.size.bytes || gain>0);
 };
 const groups=new Map(),member=new Map();
 for(const r of rows){
  if(r.published||family(r)==='teacher'||window.DendriScaleExternal(r)||!(Number.isFinite(r.size.bytes)&&r.size.bytes>0))continue;
  const k=key(r);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r);
 }
 for(const [k,group] of groups)for(const r of group)if(!group.some(q=>dominates(q,r)))member.set(r,k);
 return {groups,member,key};
};

window.DendriScaleBars = function(DATA,{el,se,sizeNotes=[],benchmarkCoverage=null,variantAliases=null}) {
 const UI=window.DendriScaleUI,byId=id=>document.getElementById(id);
 const styles={teacher:['Original / teacher','#222222','none'],dendritic:['Dendritic','#0072B2','diagonal'],
  hybrid:['Dendritic + quantization','#E69F00','cross'],control:['Quantization / pruning / deletion','#CC79A7','dots'],
  dense:['Dense / low-rank replacement','#006B57','dots'],ternary:['Ternary (Prism)','#007B83','vertical'],
  binary:['Binary (Prism)','#A32972','diagonal'],external:['Other published method','#595959','dots'],unknown:['Method unspecified','#595959','dots']};
 function method(p){
  if(p.reference_role==='teacher'||p.method_style?.key==='teacher'||p.label==='Teacher reference'||p.method_style?.label==='Uncompressed teacher reference')return 'teacher';
  if(/ternary/i.test(p.label))return 'ternary';
  if(/binary|(?:1|one).bit.*bonsai|bonsai.*(?:1|one).bit/i.test(p.label))return 'binary';
  if(p.method_style?.key==='external'&&/IQ\d|Q\d_|GPTQ|AWQ|quantiz/i.test(p.label))return 'control';
  return styles[p.method_style?.key]?p.method_style.key:'unknown';
 }
 function metric(p){
  const label=p.ylabel.replace(/\s*\((?:%|nats\/token)\)\s*$/,'').replace(/\s*\/\s*[\d,]+$/,'');
  if(/^GSM(?:8K)? (correct|accuracy)/i.test(label)||/^GSM8K$/i.test(label))return 'GSM8K';
  if(/^MC (correct|macro accuracy)/i.test(label))return 'Multiple choice';
  if(/^(arc_challenge|arc_easy|boolq|piqa|hellaswag|winogrande) (correct|accuracy)$/i.test(label))return label.replace(/ (correct|accuracy)$/i,' accuracy');
  return label;
 }
 // Audited notes require the original observation and source hashes to match.
 // A layer-cost sibling may fold into a whole-model bar only for the same score.
 const pointById=new Map(DATA.panels.flatMap(panel=>panel.points).map(p=>[p.id,p]));
 const verifiedSizes=new Map(),duplicateReferences=new Set();
 for(const note of sizeNotes){
  const p=pointById.get(note.point_id);
  if(!p||!Number.isFinite(note.registered_bytes)||note.registered_bytes<=0
   ||p.xaxis!=='registered_unspecified'||p.xunit!=='bytes'||p.x!==note.registered_bytes
   ||p.method_style?.key!=='teacher'||note.source_metric!=='teacher_registered_bytes'
   ||!['experiment_id','model','cohort','label'].every(k=>p[k]===note[k])
   ||JSON.stringify(p.source_hashes)!==JSON.stringify(note.source_hashes))continue;
  verifiedSizes.set(p.id,{bytes:note.registered_bytes,basis:'registered model',note:note.note});
  for(const id of note.alias_point_ids||[]){
   const alias=pointById.get(id);
   if(alias?.xaxis==='site_registered_bytes'&&alias.method_style?.key==='teacher'&&['experiment_id','model','cohort','label','ylabel','y','yunit','execution'].every(k=>alias[k]===p[k])
    &&JSON.stringify(alias.source_hashes)===JSON.stringify(p.source_hashes))duplicateReferences.add(id);
  }
 }
 function size(p){
  if(verifiedSizes.has(p.id))return verifiedSizes.get(p.id);
  const bytes=p.whole_model_size?.registered_bytes;
  if(p.source_level==='external-reported')return {bytes:bytes??(p.xunit==='bytes'?p.x:null),basis:'published size'};
  if((p.size_basis==='published packed size'||/publisher-reported packed size/i.test(p.label))&&p.xunit==='bytes')return {bytes:p.x,basis:'published packed size'};
  // A qualified package export's every file, bound to the exported checkpoint; never pooled with ledger or registered bytes.
  if(p.xaxis==='artifact_file_bytes'&&p.xunit==='bytes')return {bytes:p.x,basis:'measured artifact'};
  if(p.xaxis==='projected_format_bytes')return {bytes:p.x,basis:'projected format'};
  if(p.xaxis==='weight_file_bytes')return {bytes:p.x,basis:'weight files'};
  if(bytes>0)return {bytes,basis:'registered model'};
  if(p.xaxis==='whole_registered_bytes'&&p.xunit==='bytes')return {bytes:p.x,basis:'registered model'};
  const note=p.xunit==='parameters'?`This record reports ${p.x.toLocaleString('en')} parameters, not a measured whole-model byte total. Precision, buffers and storage format must also be accounted for.`
   :/site|cell/.test(p.xaxis)?'This record measures one replacement layer or cell, not the complete model.'
   :'This historical record does not identify a verified whole-model byte total.';
  return {bytes:null,basis:'GB not recorded',note};
 }
 // Registrations that labeled one checkpoint differently display as one variant; the register keeps their labels.
 const aliasGroups=new Map();
 for(const g of variantAliases?.groups||[])for(const label of g.labels)aliasGroups.set(JSON.stringify([g.model,label]),g);
 const variantOf=p=>{
  const g=p.source_level==='external-reported'?null:aliasGroups.get(JSON.stringify([p.model,p.label]));
  return g&&g.id_prefixes.includes(p.id.replace(/__whole_percent$/,'').split('__')[0])?g.variant:p.label;
 };
 const seen=new Set(),rows=[];
 for(const panel of [...DATA.panels].sort((a,b)=>(a.xunit==='bytes'?0:1)-(b.xunit==='bytes'?0:1)))for(const p of panel.points){
  if(duplicateReferences.has(p.id))continue;
  if(p.source_level==='local'||p.execution!=='completed'||!Number.isFinite(p.y)||!['min','max'].includes(p.ydirection))continue;
  let y=p.y,n=null,scoreUnit='%';
  const rawLoss=p.ydirection==='min'&&['ratio','factor','nats/token','nats_per_token'].includes(p.yunit);
  if(rawLoss)scoreUnit=['ratio','factor'].includes(p.yunit)?'ratio':'nats/token';
  else if(p.yunit==='fraction')y*=100;
  else if(p.yunit!=='percent'){
   n=UI.countDenominator(p);
   if(!n){const m=p.ylabel.match(/\/\s*([\d,]+)$/);if(m)n=Number(m[1].replaceAll(',',''));}
   if(!n&&/^(GSM|MC) correct\b/i.test(p.ylabel)){
    const family=/^GSM/i.test(p.ylabel)?'GSM(?:8K)?':'MC',cohort=String(p.cohort||'');
    // Explicit cohort counts only; never derive n from the observed score or model name.
    const forward=new RegExp('\\b'+family+'\\s*(?:(?:train[- ]dev|train development|development|dev|test)\\s*)?[:=-]?\\s*(\\d[\\d,]*)\\b','i');
    const reverse=new RegExp('\\b(\\d[\\d,]*)\\s*'+family+'\\b(?!\\s*tasks)','i');
    const m=cohort.match(forward)||cohort.match(reverse)||cohort.match(/\bn\s*=\s*(\d[\d,]*)\b/i);
    if(m)n=Number(m[1].replaceAll(',',''));
   }
   if(!(n>0&&y>=0&&y<=n))continue;
   y=100*y/n;
  }
  if(!rawLoss&&(y<0||y>100))continue;
  const key=JSON.stringify([p.id.replace(/__whole_percent$/,''),p.model,p.cohort,p.ylabel,p.y]);
  if(seen.has(key))continue;seen.add(key);
  rows.push({...p,variant:variantOf(p),score:y,scoreUnit,direction:p.ydirection,n,benchmark:metric(p),size:size(p),method:method(p),published:p.source_level==='external-reported'});
 }
 const scoreLabel=r=>r.score.toFixed(r.scoreUnit==='nats/token'?3:2)+(r.scoreUnit==='%'?'%':r.scoreUnit==='ratio'?'×':' nats/token');
 function details(r){
  const target=byId('barsDetail');target.replaceChildren(el('h3',UI.candidateName(r.variant)),el('p',UI.modelName(r.model)));
  const dl=el('dl');dl.className='bar-facts';
  for(const [k,v] of [['Benchmark',r.benchmark+' · '+scoreLabel(r)],['Method',styles[r.method][0]],
   ['Model size',r.size.bytes>0?(r.size.bytes/1e9).toFixed(3)+' GB · '+r.size.basis:r.size.basis],['Measured artifact',UI.artifactText(r)],
   ['Size accounting',r.size.note],['Empirical front',r.published||r.method==='teacher'||window.DendriScaleExternal(r)?'Comparison only; never on our fronts':!(r.size.bytes>0)?'No whole-model size; cannot be on a front':cross.member.has(r)?'On the empirical '+metricName(r.benchmark)+'–size front in '+frontName(r)+' ('+bytesShort(r.size.basis)+'), all our methods together; descriptive, from point estimates':'Not on the empirical '+metricName(r.benchmark)+'–size front in '+frontName(r)],['Training regime',r.published||r.method==='teacher'?'':regimeText(r)],['Evidence',r.published?'Published result · not reproduced':'DendriScale measurement'],['Protocol',r.cohort],
   ['Sample size',r.n||'See benchmark protocol'],['Registered label',r.variant===r.label?'':r.label],['Original verdict',r.gate_status],['Conditions',r.conditions],['Limitations',r.limitations],['Source hashes',(r.source_hashes||[]).join(', ')]]){
   if((k==='Size accounting'||k==='Registered label'||k==='Measured artifact')&&!v)continue;
   dl.append(el('dt',k),el('dd',String(v||'Not recorded')));
  }
  target.append(dl);byId('barsDetails').showModal();
 }
 const primary=['MMLU-Redux','MuSR','GSM8K','HumanEval+','IFEval','BFCL v3'];
 const categories=[['primary','Prism main benchmarks'],['reasoning','More reasoning & knowledge'],['coding','More coding benchmarks'],['instruction','More instruction & tool benchmarks'],['vision','Vision & documents'],['summary','Published averages'],['fidelity','Language modeling & copy fidelity'],['diagnostics','Our additional benchmarks & diagnostics']];
 function category(m){
  if(primary.includes(m))return 'primary';
  if(/MATH|AIME|GPQA|LCR/i.test(m))return 'reasoning';
  if(/code|MBPP|SWE|Terminal/i.test(m) && !/smoke/i.test(m))return 'coding';
  if(/IFBench|BFCL|τ|tau/i.test(m))return 'instruction';
  if(/OCR|CharXiv|VQA|DocBench|MMMU|RealWorldQA/i.test(m))return 'vision';
  if(/Average/i.test(m))return 'summary';
  if(/^C4|^Copy/i.test(m))return 'fidelity';
  return 'diagnostics';
 }
 const friendly={'Multiple choice':'Multiple choice · six tasks','arc_challenge accuracy':'ARC Challenge','arc_easy accuracy':'ARC Easy','boolq accuracy':'BoolQ','piqa accuracy':'PIQA','hellaswag accuracy':'HellaSwag','winogrande accuracy':'WinoGrande'};
 const fronts=window.DendriScaleBarFront(rows);
 const cross=window.DendriScaleCrossFront(rows);
 window.DendriScaleBarData={rows,fronts,cross}; // read-only handle for tests; the page never reads it back
 // Charts are organized by original model: comparisons stay within one teacher.
 const modelOf=r=>UI.canonicalModelId(r.model);
 const preferredModels=['Qwen/Qwen3-8B','allenai/OLMo-2-0325-32B-Instruct','Qwen/Qwen3.8-27B','Qwen/Qwen3.6-27B',
  'allenai/OLMo-2-1124-7B-Instruct','allenai/OLMo-3-7B-Instruct','allenai/OLMo-2-0425-1B','Qwen/Qwen2.5-72B-Instruct'];
 const modelCounts=new Map();for(const r of fronts)modelCounts.set(modelOf(r),(modelCounts.get(modelOf(r))||0)+1);
 const rank=m=>{const i=preferredModels.indexOf(m);return i<0?preferredModels.length:i;};
 const modelList=[...modelCounts.keys()].sort((a,b)=>rank(a)-rank(b)||modelCounts.get(b)-modelCounts.get(a)||a.localeCompare(b));
 let selectedModel=modelList.includes('Qwen/Qwen3-8B')?'Qwen/Qwen3-8B':modelList[0];
 const prismBenchmarks=['MMLU-Redux','GPQA Diamond','MuSR','IFEval','IFBench','GSM8K','MATH-500','HumanEval+','MBPP+','BFCL v3'];
 const families={teacher:'Original models',dendritic:'Dendritic',hybrid:'Dendritic + quantization',control:'Non-dendritic',published:'Published · not reproduced'};
 const methodKey=r=>['teacher','dendritic','hybrid'].includes(r.method)?r.method:'control';
 const family=r=>r.published?'published':methodKey(r);
 // Publisher identity is separate from who measured a score. Locally evaluated
 // Bonsai checkpoints retain measured provenance; only reported scores get P.
 const isPrism=r=>['binary','ternary'].includes(r.method)||(r.published&&/^PrismML\b/.test(r.cohort));
 const prismColor='#6746A3';
 const evidenceLabel=r=>isPrism(r)?'PrismML · '+(r.published?'published, not reproduced':'measured here'):(r.published?'Published · not reproduced':'Measured by DendriScale');
 const familyOrder=Object.keys(families);
 const metrics=[...new Set(fronts.map(r=>r.benchmark))].sort((a,b)=>{
  const ac=category(a),bc=category(b);
  return categories.findIndex(x=>x[0]===ac)-categories.findIndex(x=>x[0]===bc)
   || (ac==='primary'?primary.indexOf(a)-primary.indexOf(b):a.localeCompare(b));
 });
 // Evidence labels refer to exact cohorts, including distinct published protocols.
 const cohortKeys=[...new Set(rows.map(r=>JSON.stringify([r.published,r.model,r.cohort])))].sort();
 const cohortCodes=new Map();let measuredCode=0,publishedCode=0;
 for(const k of cohortKeys)cohortCodes.set(k,JSON.parse(k)[0]?'P'+(++publishedCode):'E'+(++measuredCode));
 const code=r=>cohortCodes.get(JSON.stringify([r.published,r.model,r.cohort]));
 const shortModel=r=>UI.modelName(r.model).replace(/^Qwen\//,'').replace(/-Instruct$/,'').replace(/OLMo-2-(?:0325|1124|0425)-/,'OLMo 2 ');
 const sizeLabel=r=>r.size.bytes>0?(r.size.bytes/1e9).toFixed(2)+' GB':'GB not recorded';
 const sizeNote=r=>({'registered model':'','projected format':'projected','published size':'published','published packed size':'published size','weight files':'weight files','measured artifact':'artifact','size not measured':'','GB not recorded':''}[r.size.basis]??r.size.basis);
 const methodStyle=r=>{
  // One stable color/pattern for each requested compression family.
  if(r.method==='teacher')return styles.teacher;
  if(r.method==='dendritic')return styles.dendritic;
  if(r.method==='hybrid')return styles.hybrid;
  return ['Non-dendritic',styles.control[1],styles.control[2]];
 };
 let evidence='all',serial=0;
 const button=(text,fn)=>{const b=el('button',text);b.type='button';b.onclick=fn;return b;};
 // Keep category/color together, then order by whole-model GB across model names
 // and cohorts. Unknown sizes go last; labels only break equal-size ties.
 const sortSize=r=>Number.isFinite(r.size.bytes)&&r.size.bytes>0?r.size.bytes:Infinity;
 const compare=(a,b)=>familyOrder.indexOf(family(a))-familyOrder.indexOf(family(b))
  || familyOrder.indexOf(methodKey(a))-familyOrder.indexOf(methodKey(b))
  || Number(isPrism(a))-Number(isPrism(b))
  || sortSize(a)-sortSize(b) || shortModel(a).localeCompare(shortModel(b))
  || a.cohort.localeCompare(b.cohort) || a.variant.localeCompare(b.variant) || a.id.localeCompare(b.id);
 function download(svg,name){
  const copy=svg.cloneNode(true);copy.setAttribute('xmlns','http://www.w3.org/2000/svg');
  const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)],{type:'image/svg+xml'}));
  const a=el('a');a.href=url;a.download=name+'.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 function legend(){
  const root=byId('barsMethodLegend');root.replaceChildren();
  for(const key of ['teacher','dendritic','hybrid','control']){
   const item=el('span');item.className='bar-method-key';const swatch=el('span');swatch.className='bar-swatch '+styles[key][2];
   swatch.style.setProperty('--method-color',byId('monochrome').checked?'#222':styles[key][1]);
   swatch.style.setProperty('--pattern-ink',byId('monochrome').checked||key==='dendritic'?'#ffffff99':'#26374699');
   item.append(swatch,el('span',families[key]));root.append(item);
  }
  const prism=el('span');prism.className='bar-method-key';const swatch=el('span');swatch.className='bar-swatch dots';
  swatch.style.setProperty('--method-color',byId('monochrome').checked?'#222':prismColor);
  swatch.style.setProperty('--pattern-ink','#ffffffbb');
  prism.append(swatch,el('span','PrismML / Bonsai · method shown on each bar'));root.append(prism);
  const published=el('span','P · Published, not reproduced');published.className='bar-published-key';root.append(published);
  byId('benchmark-bars').dataset.monochrome=String(byId('monochrome').checked);
 }
 // A single chart per benchmark. Long charts wrap into aligned columns on wide
 // displays; every bar remains present, with one scale per benchmark and no carousel.
 function plot(svg,chosen,id,title,width){
  width=Math.max(240,Math.floor(width));
  const cols=chosen.length>24&&width>=1080?3:chosen.length>18&&width>=760?2:1;
  const gap=28,colWidth=(width-gap*(cols-1))/cols,compact=colWidth<680;
  const capacity=Math.ceil(chosen.length/cols),chunks=Array.from({length:cols},(_,i)=>chosen.slice(i*capacity,(i+1)*capacity)).filter(c=>c.length);
  const mono=byId('monochrome').checked,rowHeight=compact?84:54;
  const percent=chosen[0].scoreUnit==='%',direction=chosen[0].direction;
  const axisMin=percent?0:Math.min(0,...chosen.map(r=>r.score));
  const maximum=percent?100:Math.max(0,...chosen.map(r=>r.score));
  const power=10**Math.floor(Math.log10(maximum||1));
  const axisMax=percent?100:maximum>0?Math.ceil(maximum/power)*power:axisMin<0?0:1;
  const fraction=v=>(v-axisMin)/(axisMax-axisMin);
  const axisValue=v=>percent?String(v):Number(v.toPrecision(3)).toString();
  const unit=percent?'score (%)':chosen[0].scoreUnit==='ratio'?'ratio (×)':chosen[0].scoreUnit;
  const text=(x,y,value,extra={})=>se('text',{x,y,'font-family':'system-ui, sans-serif','font-size':12,fill:'#263746',...extra},value);
  const trim=(s,pixels,fs=12)=>{const n=Math.max(6,Math.floor(pixels/(fs*.56)));return s.length>n?s.slice(0,n-1)+'…':s;};
  const layouts=chunks.map((chunk,i)=>{
   let y=60,last=null;const entries=[];
   for(const r of chunk){
    const f=family(r);if(f!==last){entries.push({header:f,y,continued:chosen.indexOf(r)>0&&family(chosen[chosen.indexOf(r)-1])===f});y+=34;last=f;}
    entries.push({r,y});y+=rowHeight+(cross.member.has(r)?13:0);
   }
   return {x:i*(colWidth+gap),entries,height:y};
  });
  const height=Math.max(...layouts.map(l=>l.height))+58;
  svg.replaceChildren();svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.setAttribute('width',width);svg.setAttribute('height',height);
  svg.append(se('title',{},title+' · '+unit),se('desc',{},'Bars list each method family’s empirical size–score front, selected separately within each original model, cohort and byte convention. Bars with a ◆ line and a heavy outline are on the empirical front of all our methods together in their cohort and byte convention. Fronts are descriptive point estimates, not certified dominance. Published references remain separate evidence. GB labels state the whole-model size basis. E and P codes identify cohorts.'));
  svg.append(se('rect',{width,height,fill:'white'}));
  svg.append(text(0,16,trim(title,width,13),{'font-size':13,'font-weight':650}));
  svg.append(text(0,34,unit+' · '+(direction==='min'?'lower':'higher')+' is better',{'font-size':11,fill:'#526476'}));
  const defs=se('defs',{});svg.append(defs);
  for(const key of ['teacher','dendritic','hybrid','control'])for(const prism of [false,true]){
   const [label,color,pattern]=styles[key],ink=mono?'#222222':prism?prismColor:color,pat=se('pattern',{id:id+'-'+(prism?'prism-':'')+key,width:16,height:16,patternUnits:'userSpaceOnUse'});
   pat.append(se('rect',{width:16,height:16,fill:ink}));
   const patternInk=!prism&&(key==='hybrid'||key==='control')?'#263746':'white';
   if(pattern==='dots')pat.append(se('circle',{cx:8,cy:8,r:1.8,fill:mono?'white':patternInk,opacity:.75}));
   else if(pattern!=='none')pat.append(se('path',{d:pattern==='cross'?'M0 0L16 16M16 0L0 16':'M-4 4L4 -4M0 16L16 0M12 20L20 12',stroke:mono?'white':patternInk,'stroke-width':1,opacity:.45}));
   defs.append(pat);
  }
  for(const layout of layouts){
   const x=layout.x,barX=x+(compact?0:colWidth*.44),barWidth=compact?colWidth-55:colWidth*.56-59;
   for(const entry of layout.entries){
    const y=entry.y;
    if(entry.header){
     const color=mono?'#222222':entry.header==='published'?'#9D824B':styles[entry.header][1];
     svg.append(se('rect',{x,y:y-3,width:colWidth,height:25,rx:4,fill:color,'fill-opacity':.12}),
      se('rect',{x,y:y-3,width:6,height:25,rx:2,fill:color}));
     svg.append(text(x+13,y+13,families[entry.header]+(entry.continued?' · cont.':''),{'font-size':11,'font-weight':700}));
     continue;
    }
    const r=entry.r,prism=isPrism(r),[methodLabel,,pattern]=prism?styles[r.method]:methodStyle(r),key=(prism?'prism-':'')+methodKey(r),onFront=cross.member.has(r);
    const extra=onFront?13:0,yy=y+(compact?48+extra:7),labelWidth=compact?colWidth:colWidth*.44-16;
    const g=se('g',{tabindex:0,role:'button','aria-label':r.variant+', '+r.model+', '+scoreLabel(r)+', '+sizeLabel(r)+' · '+r.size.basis+', '+families[family(r)]+', '+code(r)+(onFront?', on the empirical '+metricName(r.benchmark)+'–size front in '+frontName(r)+' ('+bytesShort(r.size.basis)+')':''),'data-front':String(onFront),
     'data-point-id':r.id,'data-method':r.method,'data-family':family(r),'data-color-group':prism?'prism':methodKey(r),'data-provider':prism?'prism':'other','data-size-bytes':r.size.bytes??'','data-model':r.model,'data-provenance':r.published?'published':'measured','data-size-basis':r.size.basis,'data-cohort':r.cohort});
    g.append(se('title',{},r.variant+' · '+r.model+'\n'+methodLabel+' · '+sizeLabel(r)+' · '+r.size.basis+'\n'+code(r)+': '+r.cohort+'\n'+evidenceLabel(r)+'\n'+r.conditions));
    g.append(se('rect',{x,y:y-4,width:colWidth,height:rowHeight-5+extra,fill:'transparent',class:'bar-hit',rx:4}));
    const first=shortModel(r)+' · '+sizeLabel(r)+(sizeNote(r)?' '+sizeNote(r):'');
    g.append(text(x,y+10,trim(first,labelWidth,12),{'font-weight':650}));
    const second=UI.candidateName(r.variant)+(!r.size.bytes&&r.xunit==='parameters'?' · '+(r.x/1e9).toFixed(2)+'B parameters':'');
    g.append(text(x,y+26,trim(second,labelWidth,11),{'font-size':11,fill:'#526476'}));
    const publishedProtocol=r.published?r.cohort.replace(/^PrismML /,''):'';
    const tags=code(r)+(prism?' · PrismML'+(r.published?' published':' · measured here'):'')+(publishedProtocol?' · '+publishedProtocol:'')+(r.n?' · n='+r.n.toLocaleString('en'):'')+(UI.allBenchmarksPass(r)?' · ✓ Development gates':'');
    g.append(text(x,y+40,trim(tags,labelWidth,10),{'font-size':10,fill:prism&&!mono?prismColor:'#526476'}));
    // A front bar says which front it is on: the benchmark and the cohort.
    if(onFront)g.append(text(x,y+53,frontTag(r,Math.floor(labelWidth/5.6)),{'font-size':10,'font-weight':750,fill:mono?'#111111':'#1d2b38',class:'front-tag'}));
    g.append(se('rect',{x:barX,y:yy,width:barWidth,height:17,rx:2,fill:'#edf1f5'}));
    for(const tick of [25,50,75])g.append(se('line',{x1:barX+barWidth*tick/100,x2:barX+barWidth*tick/100,y1:yy,y2:yy+17,stroke:'#d6dee5','stroke-width':1}));
    g.append(se('rect',{x:barX+barWidth*fraction(Math.min(0,r.score)),y:yy,width:barWidth*Math.abs(fraction(r.score)-fraction(0)),height:17,rx:2,fill:'url(#'+id+'-'+key+')',stroke:onFront?'#111111':'#263746','stroke-width':onFront?2.6:r.published?1.2:.4,'stroke-dasharray':r.published?'4 2':'none',class:'score-bar'+(onFront?' front-bar':''),'data-score':r.score}));
    g.append(text(barX+barWidth+6,yy+13,(Math.abs(r.score)>=1e4?r.score.toExponential(1).replace('+',''):r.score.toFixed(r.scoreUnit==='nats/token'?3:2)),{'font-size':12,'font-weight':700}));
    if(!compact)g.append(text(barX,yy+31,methodLabel+(r.published?' · published':''),{'font-size':10,fill:prism&&!mono?prismColor:'#526476'}));
    g.addEventListener('click',()=>details(r));g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();details(r);}});svg.append(g);
   }
   const axisY=layout.height+7;
   for(const v of [0,25,50,75,100])svg.append(text(barX+barWidth*v/100,axisY,axisValue(axisMin+(axisMax-axisMin)*v/100),{'font-size':10,'text-anchor':v===0?'start':v===100?'end':'middle',fill:'#647585'}));
  }
 }
 // Size-score view of one chart: every measured result of the selected original model on whole-model GB (log scale),
 // as small multiples, one plot per cohort (evaluation set and protocol) and byte convention, so different
 // evaluation sets and projected ledgers versus registered bytes never share a plot. Within a plot each training
 // regime of our measured models has its own empirical front, drawn as a bold staircase through its members (filled
 // and labelled) and told apart by line style and a text label; dominated and unsuccessful models stay as hollow
 // markers, external releases measured in the cohort as context, the cohort's original model as a reference line.
 // Published references get a plot of their own. Shapes, line styles and text carry every distinction; colour only
 // repeats them.
 const MARK={dendritic:'circle',hybrid:'square',control:'triangle',dense:'diamond',ternary:'star',binary:'star',external:'star',teacher:'cross',unknown:'hexagon'};
 function mark(shape,x,y,s,attrs){
  if(shape==='circle')return se('circle',{cx:x,cy:y,r:s,...attrs});
  if(shape==='square')return se('rect',{x:x-s,y:y-s,width:2*s,height:2*s,...attrs});
  const pts=shape==='triangle'?[[0,-1.25],[1.15,1],[-1.15,1]]:shape==='diamond'?[[0,-1.35],[1.2,0],[0,1.35],[-1.2,0]]
   :shape==='star'?Array.from({length:10},(_,i)=>{const k=i%2?.55:1.35,a=-Math.PI/2+i*Math.PI/5;return [k*Math.cos(a),k*Math.sin(a)];})
   :shape==='cross'?[[-.38,-1.25],[.38,-1.25],[.38,-.38],[1.25,-.38],[1.25,.38],[.38,.38],[.38,1.25],[-.38,1.25],[-.38,.38],[-1.25,.38],[-1.25,-.38],[-.38,-.38]]
   :Array.from({length:6},(_,i)=>{const a=Math.PI/6+i*Math.PI/3;return [1.15*Math.cos(a),1.15*Math.sin(a)];});
  return se('polygon',{points:pts.map(([a,b])=>(x+a*s).toFixed(1)+','+(y+b*s).toFixed(1)).join(' '),...attrs});
 }
 const shortName=r=>String(r.variant).split(' · ').slice(0,2).join(' · ');
 const niceStep=span=>{const p=10**Math.floor(Math.log10(span||1)),f=span/p;return (f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*p;};
 // Byte conventions by name, so a projected ledger is never read as a measured file.
 const bytesName=b=>({'projected format':'projected ledger bytes, not a measured file','registered model':'registered bytes of the built model','weight files':'measured weight-file bytes','measured artifact':'measured complete-model storage, every file of a qualified export'}[b]||b);
 const bytesShort=b=>({'projected format':'ledger bytes','registered model':'registered bytes','weight files':'file bytes','measured artifact':'artifact bytes'}[b]||b);
 const metricName=b=>friendly[b]||b;
 const regimeText=r=>window.DendriScaleRegime(r)||'regime not recorded';
 const frontName=r=>'cohort '+code(r)+', '+regimeText(r);
 const oursSized=r=>!r.published&&r.method!=='teacher'&&!window.DendriScaleExternal(r)&&r.size.bytes>0;
 // What a front tag says: the metric and the cohort, in as many words as the space allows.
 const frontTag=(r,chars)=>{
  const m=metricName(r.benchmark),c=code(r)+', '+regimeText(r);
  return ['◆ On the empirical '+m+'–size front in cohort '+c,'◆ Empirical '+m+'–size front · '+c,'◆ Empirical size front · '+c].find(s=>s.length<=chars)||'◆ Front · '+c;
 };
 // Greedy word wrap with the truncation's width estimate; at most `max` lines, the last one cut with "…".
 const wrapText=(s,pixels,fs,max=Infinity)=>{
  const n=Math.max(8,Math.floor(pixels/(fs*.56))),lines=[];let line='';
  for(const w of String(s).split(' ')){const next=line?line+' '+w:w;if(next.length<=n||!line)line=next;else{lines.push(line);line=w;}}
  if(line)lines.push(line);
  const out=lines.slice(0,max).map(l=>l.length>n?l.slice(0,n-1)+'…':l);
  if(lines.length>max){const last=out[max-1];out[max-1]=(last.length>=n?last.slice(0,n-1):last)+'…';}
  return out;
 };
 function frontPanel(svg,items,id,benchmark,width){
  width=Math.max(240,Math.floor(width));
  svg.replaceChildren();
  if(!items.some(r=>(r.method!=='teacher'||r.published)&&r.size.bytes>0)){svg.setAttribute('width',0);svg.setAttribute('height',0);svg.setAttribute('aria-hidden','true');svg.style.display='none';return;}
  svg.style.display='';svg.removeAttribute('aria-hidden');
  const name=metricName(benchmark),title=se('title',{},name+' · size versus score · empirical fronts'),desc=se('desc',{},''),background=se('rect',{width,height:0,fill:'white'});
  svg.append(title,desc,background);
  const text=(x,y,value,extra={})=>se('text',{x,y,'font-family':'system-ui, sans-serif','font-size':11,fill:'#263746',...extra},value);
  const unsized=items.filter(r=>!r.published&&r.method!=='teacher'&&!(r.size.bytes>0)).length;
  // Header: what the plots and fronts are and how not to read them, wrapped to the card's width.
  const header=[
   ['Size vs. score · '+name+' · empirical fronts',12.5,650,'#263746'],
   ['One plot per cohort (one evaluation set and protocol) and byte convention: cohorts are never joined. In each plot, filled ◆ markers on a bold staircase form the empirical '+name+'–size front of our measured models, all methods together, for one training regime (the exposure and stages its labels record); regimes are told apart by line style and label.',10.5],
   ['Fronts use point estimates: descriptive, not a confidence-certified dominance relation. A staircase joins observed points only; it does not mean that sizes and scores between them are attainable, and it is not a fitted compression law.',10.5],
   ['Hollow: dominated or unsuccessful, kept visible. ext: external release measured in that cohort. P: published references, in a plot of their own. Neither is ever on our fronts. Dashed line: the original model in that cohort. '+(items[0].direction==='min'?'Lower':'Higher')+' is better.'+(unsized?' '+unsized+' of our results have no recorded whole-model size and are not drawn.':''),10.5]];
  let top=0;
  for(const [s,fs,weight=400,fill='#526476'] of header)for(const line of wrapText(s,width,fs)){top+=fs+(top?4:2);svg.append(text(0,top,line,{'font-size':fs,'font-weight':weight,fill}));}
  top+=16;
  // Plots: one per cohort and byte convention of our sized results. External releases measured in a cohort are
  // context in its first plot; the cohort's original model is its reference line; published references get a plot
  // of their own.
  const byCohort=new Map();
  for(const r of items){if(r.published)continue;const c=code(r);if(!byCohort.has(c))byCohort.set(c,[]);byCohort.get(c).push(r);}
  const plots=[];
  for(const [c,rs] of [...byCohort].sort((a,b)=>Number(a[0].slice(1))-Number(b[0].slice(1)))){
   const ours=rs.filter(oursSized),context=rs.filter(r=>r.method!=='teacher'&&!oursSized(r)&&r.size.bytes>0),teachers=rs.filter(r=>r.method==='teacher');
   const bases=[...new Set(ours.map(r=>r.size.basis))].sort();
   if(!bases.length&&!context.length)continue;
   (bases.length?bases:[null]).forEach((b,i)=>plots.push({code:c,cohort:rs[0].cohort,basis:b,rows:[...ours.filter(r=>r.size.basis===b),...(i?[]:context)],teachers}));
  }
  const published=items.filter(r=>r.published&&r.size.bytes>0);
  if(published.length)plots.push({code:null,cohort:null,basis:null,rows:published,teachers:[],published:true});
  const cols=width>=1000&&plots.length>1?2:1,gap=28,cellW=Math.floor((width-gap*(cols-1))/cols),summaries=[];
  for(let i=0;i<plots.length;i+=cols){
   let rowH=0;
   plots.slice(i,i+cols).forEach((p,j)=>{
    const g=se('g',{class:'front-plot',transform:'translate('+j*(cellW+gap)+' '+top+')','data-cohort':p.published?'published':p.code,'data-size-basis':p.basis||''});svg.append(g);
    const out=frontPlot(g,p,benchmark,cellW);summaries.push(out.summary);rowH=Math.max(rowH,out.height);
   });
   top+=rowH+(i+cols<plots.length?26:6);
  }
  desc.textContent=summaries.join(' ');
  svg.setAttribute('aria-label',name+' · size versus score. '+summaries.join(' '));
  svg.setAttribute('viewBox',`0 0 ${width} ${top}`);svg.setAttribute('width',width);svg.setAttribute('height',top);background.setAttribute('height',top);
 }
 // One plot of the panel: one cohort and byte convention (or the published references). Each training regime of our
 // measured models has its own staircase; members are numbered when there are more than four and listed in a key.
 function frontPlot(svg,p,benchmark,W){
  const mono=byId('monochrome').checked,ink=mono?'#222222':'#263746',name=metricName(benchmark);
  const plotted=p.rows,teachers=p.teachers,ref=plotted[0]||teachers[0];
  const text=(x,y,value,extra={})=>se('text',{x,y,'font-family':'system-ui, sans-serif','font-size':11,fill:'#263746',...extra},value);
  const fit=(s,pixels,fs)=>{const n=Math.max(8,Math.floor(pixels/(fs*.56)));return s.length>n?s.slice(0,n-1)+'…':s;};
  let hy=0;
  const heading=p.published?'Published references (P) · their own protocols, not reproduced · never on our fronts':p.code+' · '+(p.basis?bytesName(p.basis):'external releases measured here; no sized model of ours');
  for(const line of wrapText(heading,W,11.5,2)){hy+=hy?14:12;svg.append(text(0,hy,line,{'font-size':11.5,'font-weight':700,fill:ink,class:'front-plot-title'}));}
  if(!p.published)for(const line of wrapText('Cohort '+p.code+': '+p.cohort,W,10,2)){hy+=13;svg.append(text(0,hy,line,{'font-size':10,'font-style':'italic',fill:'#526476'}));}
  const compact=W<520,L=compact?42:54,R=12,T=hy+18,B=40,plotH=compact?200:Math.round(Math.min(300,Math.max(210,W*.42))),H=T+plotH+B;
  const sized=[...plotted,...teachers.filter(r=>r.size.bytes>0)].map(r=>r.size.bytes/1e9);
  let lo=Math.log10(Math.min(...sized)),hi=Math.log10(Math.max(...sized));
  if(hi-lo<.2){const mid=(hi+lo)/2;lo=mid-.1;hi=mid+.1;}
  const padX=(hi-lo)*.08;lo-=padX;hi+=padX;
  const percent=ref.scoreUnit==='%',scores=[...plotted,...teachers].map(r=>r.score);
  let ylo=Math.min(...scores),yhi=Math.max(...scores);
  if(yhi-ylo<(percent?2:1e-9)){const pad=percent?1:Math.max(Math.abs(yhi)*.05,1e-3);ylo-=pad;yhi+=pad;}
  // Extra headroom on the better side keeps room for the staircase tags above the best points.
  const padY=(yhi-ylo)*.08,up=ref.direction==='min'?1:1.8;ylo-=padY*(2.8-up);yhi+=padY*up;if(percent){ylo=Math.max(0,ylo);yhi=Math.min(100,yhi);}
  const X=b=>L+(Math.log10(b/1e9)-lo)/(hi-lo)*(W-L-R),Y=v=>T+(1-(v-ylo)/(yhi-ylo))*(H-T-B);
  const keys=[...new Set(plotted.filter(r=>oursSized(r)&&cross.member.has(r)).sort((a,b)=>a.size.bytes-b.size.bytes).map(r=>cross.member.get(r)))];
  const dashes=['none','9 4','2.5 3','11 3 2.5 3','4.5 2.5','13 3 2.5 3 2.5 3','18 5','1.5 6','18 4 2.5 4','2.5 3 9 3 9 3'],lineNames=['solid','dashed','dotted','dash-dot','short-dashed','dash-dot-dot','long-dashed','sparse-dotted','long-dash-dot','dot-dash-dash'];
  const members=k=>plotted.filter(r=>oursSized(r)&&cross.member.get(r)===k).sort((a,b)=>a.size.bytes-b.size.bytes||(a.direction==='min'?b.score-a.score:a.score-b.score));
  const lineName=i=>keys.length>1?lineNames[i%dashes.length]+' line':'';
  const summary=p.published?'Published references, never on our fronts: '+plotted.map(r=>UI.candidateName(r.variant)+', '+sizeLabel(r)+', '+scoreLabel(r)).join('; ')+'.'
   :'Cohort '+p.code+(p.basis?' ('+bytesShort(p.basis)+')':'')+': '+(keys.length?keys.map((k,i)=>{const m=members(k);
    return 'empirical '+name+'–size front for '+regimeText(m[0])+(keys.length>1?' ('+lineName(i)+')':'')+': '+m.map(r=>UI.candidateName(r.variant)+', '+sizeLabel(r)+', '+scoreLabel(r)).join('; ');}).join('. ')
    :'no sized model of ours')+'.';
  // GB ticks: the finest of these mantissa sets that gives at most seven ticks across the plot.
  const ticksFor=set=>{const out=[];for(let e=-2;e<=3;e++)for(const m of set){const v=+(m*10**e).toPrecision(3);if(Math.log10(v)>=lo&&Math.log10(v)<=hi)out.push(v);}return out;};
  const shownTicks=[[1,1.25,1.5,1.75,2,2.5,3,4,5,6,7,8,9],[1,1.5,2,3,5,7],[1,2,5],[1,3],[1]].map(ticksFor).find(t=>t.length<=7)||[];
  for(const v of shownTicks){const x=X(v*1e9);svg.append(se('line',{x1:x,x2:x,y1:T,y2:H-B,stroke:'#e6ecf1'}),text(x,H-B+14,String(v)+' GB',{'font-size':10,'text-anchor':'middle',fill:'#647585'}));}
  const step=niceStep((yhi-ylo)/(compact?4:5));
  for(let v=Math.ceil(ylo/step)*step;v<=yhi+1e-9;v+=step){const y=Y(v);svg.append(se('line',{x1:L,x2:W-R,y1:y,y2:y,stroke:'#e6ecf1'}),text(L-6,y+3,Number(v.toPrecision(4)).toString()+(percent?'%':''),{'font-size':10,'text-anchor':'end',fill:'#647585'}));}
  svg.append(se('rect',{x:L,y:T,width:W-L-R,height:H-T-B,fill:'none',stroke:'#c9d3dc'}));
  svg.append(text((L+W-R)/2,H-6,'Whole-model size (GB, log scale) · '+(percent?'score (%)':ref.scoreUnit),{'font-size':10.5,'text-anchor':'middle',fill:'#526476'}));
  // Labels avoid one another, every marker and the original-model labels, so no white label halo hides a point.
  const boxes=plotted.flatMap(r=>{const x=X(r.size.bytes),y=Y(r.score),tag=r.published?8:window.DendriScaleExternal(r)?18:0;
   return [[x-7,y-7,x+7,y+7],...(tag?[[x+6,y-15,x+8+tag,y-3]]:[])];});
  teachers.forEach((r,i)=>{
   const y=Y(r.score),value=fit('Original · '+shortModel(r)+(r.size.bytes>0?' · '+sizeLabel(r):'')+' · '+scoreLabel(r),W-L-R-10,10),ty=y-4-12*(i%2);
   svg.append(se('line',{x1:L,x2:W-R,y1:y,y2:y,stroke:ink,'stroke-width':1.3,'stroke-dasharray':'6 3',class:'front-reference'}));
   svg.append(text(L+5,ty,value,{'font-size':10,fill:ink,stroke:'white','stroke-width':3,'paint-order':'stroke'}));
   boxes.push([L+3,ty-10,L+9+value.length*5.9,ty+2],[L,y-1.5,W-R,y+1.5]);
   if(r.size.bytes>0){svg.append(mark('cross',X(r.size.bytes),y,5,{fill:ink,stroke:'white','stroke-width':1}));boxes.push([X(r.size.bytes)-6,y-6,X(r.size.bytes)+6,y+6]);}
  });
  const overlap=(a,b)=>Math.max(0,Math.min(a[2],b[2])-Math.max(a[0],b[0]))*Math.max(0,Math.min(a[3],b[3])-Math.max(a[1],b[1]));
  const label=(x,y,value,extra={},anchor=null,reach=16,rows=[0,-13,13,-26,26,-39,39,-52,52,-65,65])=>{
   // Candidates right then left of the point, moving outwards in 13 px rows; the first free one wins, otherwise
   // the one that covers the least.
   const w=value.length*6.3+6,h=11;let best=null;
   search:for(const dy of rows)for(const side of ['start','end']){
    const lx=side==='start'?x+9:x-9,x1=Math.min(Math.max(side==='start'?lx:lx-w,L+2),W-R-2-w),yy=Math.min(Math.max(y+4+dy,T+h-9),H-B-2);
    const box=[x1,yy-h,x1+w,yy],cost=boxes.reduce((s,b)=>s+overlap(box,b),0);
    if(!best||cost<best.cost)best={cost,x1,yy,box,side};
    if(cost===0)break search;
   }
   boxes.push(best.box);
   // A label pushed away from its point gets a hairline leader back to that point's marker.
   if(anchor){
    const [ax,ay]=anchor,b=best.box,nx=Math.min(Math.max(ax,b[0]),b[2]),ny=Math.min(Math.max(ay,b[1]),b[3]),len=Math.hypot(nx-ax,ny-ay);
    if(len>reach)svg.append(se('line',{x1:ax+(nx-ax)/len*8,y1:ay+(ny-ay)/len*8,x2:nx,y2:ny,stroke:ink,'stroke-width':.9,'stroke-opacity':.8,class:'front-leader'}));
   }
   // Left of a point the text ends at the box's right edge, so it meets its marker whatever its rendered width.
   return text(best.side==='end'?best.box[2]:best.x1,best.yy,value,{'font-size':10,'text-anchor':best.side,stroke:'white','stroke-width':3,'paint-order':'stroke',...extra});
  };
  // Each staircase joins its observed members only, in size order; each step is also an obstacle for the labels,
  // so no label halo cuts a staircase.
  keys.forEach((k,i)=>{
   const m=members(k);let d='M'+X(m[0].size.bytes).toFixed(1)+' '+Y(m[0].score).toFixed(1);
   m.slice(1).forEach((r,j)=>{const x0=X(m[j].size.bytes),y0=Y(m[j].score),x1=X(r.size.bytes),y1=Y(r.score);
    d+=' H'+x1.toFixed(1)+' V'+y1.toFixed(1);boxes.push([x0,y0-3,x1,y0+3],[x1-3,Math.min(y0,y1),x1+3,Math.max(y0,y1)]);});
   svg.append(se('path',{d,fill:'none',stroke:ink,'stroke-width':2.8,'stroke-dasharray':dashes[i%dashes.length],'stroke-linejoin':'round','stroke-linecap':'round',class:'front-staircase','data-group':i,'data-cohort':code(m[0]),'data-regime':regimeText(m[0]),'data-size-basis':m[0].size.basis,'data-members':JSON.stringify(m.map(r=>r.id))}));
  });
  const order=plotted.slice().sort((a,b)=>Number(cross.member.has(a))-Number(cross.member.has(b))||b.size.bytes-a.size.bytes);
  for(const r of order){
   const onFront=oursSized(r)&&cross.member.has(r),x=X(r.size.bytes),y=Y(r.score);
   const color=mono?'#222222':isPrism(r)?prismColor:(styles[r.method]||styles.unknown)[1];
   const attrs=onFront?{fill:color,stroke:'#111111','stroke-width':1.7}:r.published?{fill:'white',stroke:color,'stroke-width':1.4,'stroke-dasharray':'2 1.5'}:{fill:'white',stroke:mono?'#7a7a7a':color,'stroke-width':1.3,'stroke-opacity':.75};
   const status=onFront?'◆ On the empirical '+name+'–size front in '+frontName(r)+' ('+bytesShort(r.size.basis)+')':r.published?'Published reference · never on our fronts':window.DendriScaleExternal(r)?'External release measured here · never on our fronts'
    :'Not on the front: another model of ours in this cohort, regime ('+regimeText(r)+') and byte convention is no larger and at least as good, and strictly better in one';
   const g=se('g',{class:'front-point','data-point-id':r.id,'data-front':String(onFront),'data-published':String(r.published),'data-method':r.method,'data-size-basis':r.size.basis});
   g.append(se('title',{},r.variant+'\n'+sizeLabel(r)+' · '+r.size.basis+' · '+scoreLabel(r)+'\n'+code(r)+': '+r.cohort+'\n'+status+(r.gate_status?'\nVerdict: '+r.gate_status:'')));
   g.append(mark(MARK[r.method]||'hexagon',x,y,onFront?6.5:5,attrs));
   if(r.published)g.append(text(x+7,y-6,'P',{'font-size':10,'font-weight':750,fill:mono?'#222222':color}));
   else if(window.DendriScaleExternal(r))g.append(text(x+7,y-6,'ext',{'font-size':9.5,'font-weight':700,fill:mono?'#222222':color}));
   g.addEventListener('click',()=>details(r));svg.append(g);
  }
  // Published references: each named next to its marker (they are few and never on a front).
  if(p.published)for(const r of plotted.slice().sort((a,b)=>a.size.bytes-b.size.bytes))svg.append(label(X(r.size.bytes)+8,Y(r.score),fit(sizeLabel(r)+' · '+scoreLabel(r)+' · '+UI.candidateName(r.variant),Math.max(150,(W-L-R)*.55),10),{fill:mono?'#222222':isPrism(r)?prismColor:ink,class:'front-published-label'},[X(r.size.bytes),Y(r.score)],20));
  // At most four front members: label each with its GB and short name. More: number them. Either way the key under
  // the plot lists every member with its GB, score and full name (training dose included).
  const listed=keys.flatMap((k,i)=>members(k).map(r=>({r,k,i})));
  const direct=listed.length<=4;
  // Staircase tags first, beside each staircase's largest member, then the member labels.
  keys.forEach((k,i)=>{
   const m=members(k),last=m[m.length-1],x=X(last.size.bytes),y=Y(last.score);
   const tag=code(last)+' · '+regimeText(last)+' front'+(keys.length>1?' · '+lineNames[i%dashes.length]:'');
   svg.append(label(x,y-14,fit(tag,260,10),{'font-style':'italic',fill:ink,class:'front-group-label'},[x,y],16,[0,-13,-26,-39,-52,-65,13,26,39,52,65]));
  });
  // Numbered members whose markers coincide share one label, "◆5, 10".
  listed.forEach((e,j)=>{e.n=j+1;e.x=X(e.r.size.bytes);e.y=Y(e.r.score);});
  const spots=[];
  for(const e of listed){const s=!direct&&spots.find(s=>Math.abs(s.x-e.x)<5&&Math.abs(s.y-e.y)<5);if(s)s.all.push(e);else spots.push({x:e.x,y:e.y,all:[e]});}
  for(const {x,y,all} of spots){
   const e=all[0],value=direct?fit('◆ '+sizeLabel(e.r)+' · '+shortName(e.r),Math.max(140,(W-L-R)*.55),10):'◆'+all.map(e=>e.n).join(', ');
   svg.append(label(x,y,value,{'font-weight':direct?650:750,fill:ink,class:'front-label'},[x,y],11));
  }
  // Key under the plot: per staircase, a sample of its line style and what the front is (regime, metric, byte
  // convention), then each member's GB, score and full name, wrapped to at most two lines.
  let height=H;
  const blocks=[];
  // Sizes are compared unrounded: members whose GB rounds alike get enough digits to show their difference.
  const preciseSize=(r,m)=>{
   for(let d=2;d<=6;d++){const s=(r.size.bytes/1e9).toFixed(d);if(!m.some(q=>q!==r&&(q.size.bytes/1e9).toFixed(d)===s&&q.size.bytes!==r.size.bytes))return s+' GB';}
   return r.size.bytes.toLocaleString('en')+' bytes';
  };
  keys.forEach((k,i)=>{
   const m=members(k);
   blocks.push({head:true,i,text:code(m[0])+' · '+regimeText(m[0])+(keys.length>1?' · '+lineName(i):'')+' · empirical '+name+'–size front in this cohort and regime · '+bytesShort(m[0].size.basis),max:2});
   for(const e of listed.filter(e=>e.k===k))blocks.push({text:(direct?'◆ ':'◆'+e.n+'  ')+preciseSize(e.r,m)+' · '+scoreLabel(e.r)+' · '+UI.candidateName(e.r.variant),max:2});
  });
  if(blocks.length){
   const indent=36,top=H+10;let row=0;
   for(const b of blocks){
    const lines=wrapText(b.text,W-14-indent,10,b.max),y0=top+row*13+10;
    if(b.head)svg.append(se('line',{x1:2,x2:30,y1:y0-3.5,y2:y0-3.5,stroke:ink,'stroke-width':2.8,'stroke-dasharray':dashes[b.i%dashes.length],'stroke-linecap':'round',class:'front-key-swatch'}));
    lines.forEach((line,j)=>svg.append(text(indent+(j?10:0),y0+j*13,line,{'font-size':10,'font-weight':b.head?700:400,fill:b.head?ink:'#3a4c5c',class:'front-key'})));
    row+=lines.length;
   }
   height=top+row*13+6;
  }
  return {height,summary};
 }
 function card(benchmark,items,index,panelItems=items){
  const chosen=items.slice().sort(compare),root=el('article');root.className='benchmark-card';root.dataset.benchmark=benchmark;
  root.id='benchmark-'+index;
  const head=el('div');head.className='benchmark-card-heading';const title=el('h4',friendly[benchmark]||benchmark);
  const exportButton=button('Download chart ↓',()=>download(chart,'dendriscale-'+benchmark.replace(/[^a-z0-9]/gi,'-')));exportButton.className='quiet-button';
  const panelButton=button('Download front ↓',()=>download(panel,'dendriscale-front-'+benchmark.replace(/[^a-z0-9]/gi,'-')));panelButton.className='quiet-button';
  const downloads=el('span');downloads.className='benchmark-downloads';downloads.append(panelButton,exportButton);head.append(title,downloads);root.append(head);
  const measured=chosen.filter(r=>!r.published&&r.method!=='teacher'),published=chosen.filter(r=>r.published),teachers=chosen.filter(r=>!r.published&&r.method==='teacher');
  const onCross=measured.filter(r=>cross.member.has(r)).length;
  const note=el('p',[measured.length?measured.length+' per-family front '+(measured.length===1?'model':'models')+' · '+onCross+' on the empirical '+metricName(benchmark)+'–size front of their cohort, all methods together (◆)':null,published.length?published.length+' published references':null,teachers.length?teachers.length+' '+(teachers.length===1?'original':'originals'):null].filter(Boolean).join(' · '));note.className='bar-summary small muted';root.append(note);
  const coverage=benchmarkCoverage?.benchmarks?.find(x=>x.benchmark===benchmark&&(!x.models||x.models.includes(selectedModel)));
  if(coverage){
   const status=el('div');status.className='bar-evaluation-status';status.dataset.status=coverage.status;
   status.append(el('strong',coverage.label),el('span',coverage.summary));
   const detail=el('details');detail.append(el('summary','Evaluation coverage & next work'));
   const list=el('ul');for(const item of coverage.items||[])list.append(el('li',item));
   detail.append(list,el('p','Status checked '+new Date(benchmarkCoverage.updated_at_utc).toLocaleString()+'. Pending evaluations are not scores.'));status.append(detail);root.append(status);
  } else if(!fronts.some(r=>modelOf(r)===selectedModel&&r.benchmark===benchmark&&!r.published&&r.method!=='teacher')) {const empty=el('p','Our compressed models have not yet been evaluated on this benchmark.');empty.className='bar-missing small';root.append(empty);}
  if(chosen.some(r=>!r.size.bytes)){const missing=el('p','GB not recorded: these historical references contain parameter counts or layer-only costs, not a verified whole-model byte measurement. Open a bar for the recorded detail.');missing.className='bar-missing small';root.append(missing);}
  const panel=se('svg',{role:'img',class:'benchmark-front-panel'});root.append(panel);
  const chart=se('svg',{role:'group','aria-label':benchmark+' benchmark bars',class:'benchmark-chart'});root.append(chart);
  const protocolKeys=[...new Map(chosen.map(r=>[code(r),r])).entries()];
  const protocols=el('details');protocols.className='bar-protocols';protocols.append(el('summary',protocolKeys.length+' evaluation '+(protocolKeys.length===1?'protocol':'protocols')+' · view conditions'));
  const dl=el('dl');dl.className='bar-protocol-list';
  for(const [label,r] of protocolKeys){dl.append(el('dt',label),el('dd',(r.published?'Published, not reproduced. ':'Measured. ')+UI.modelName(r.model)+' — '+r.cohort));}
  protocols.append(dl);root.append(protocols);
  const id='benchmark-chart-'+(++serial);let lastWidth=0;
  const redraw=width=>{if(Math.abs(width-lastWidth)<1)return;lastWidth=width;frontPanel(panel,panelItems,id+'-front',benchmark,width);plot(chart,chosen,id,benchmark,width);};
  return {root,redraw,chart};
 }
 function modelSwitcher(){
  const root=byId('barsModels');root.replaceChildren();
  const label=el('span','Original model');label.className='model-switcher-label';root.append(label);
  for(const m of modelList){
   const b=button(UI.modelName(m).replace(/-Instruct$/,''),()=>{selectedModel=m;draw();});
   b.setAttribute('aria-pressed',String(m===selectedModel));b.dataset.model=m;
   b.title=modelCounts.get(m)+' charted results';root.append(b);
  }
 }
 // One row per charted variant of the selected model; cells hold every measured or published score for that
 // benchmark, including dominated ones, so an empty cell always means not measured.
 function coverageGrid(charted){
  const root=byId('barsCoverage');root.replaceChildren();
  const labels=new Set(charted.map(r=>r.variant));
  const items=rows.filter(r=>modelOf(r)===selectedModel&&labels.has(r.variant)&&(evidence==='all'||r.published===(evidence==='published')));
  if(!items.length)return;
  // Our 1,024-item development GSM is not Prism's GSM8K protocol: it gets its own column.
  const devGSM='GSM · our dev set (1,024)';
  const column=r=>r.benchmark==='GSM8K'&&!r.published&&r.n===1024?devGSM:r.benchmark;
  const extra=[...new Set(items.map(column))].filter(m=>!prismBenchmarks.includes(m));
  // Other protocols of a Prism benchmark (e.g. BFCL v3 · function-calling mode) go last, away from Prism's columns.
  const variantOfPrism=m=>prismBenchmarks.some(x=>m.startsWith(x+' · '));
  const bench=[...prismBenchmarks,...extra.sort((a,b)=>(b===devGSM)-(a===devGSM)||variantOfPrism(a)-variantOfPrism(b)||metrics.indexOf(a)-metrics.indexOf(b))];
  const variants=new Map();
  for(const r of items.slice().sort(compare)){
   const k=JSON.stringify([family(r),r.variant]);if(!variants.has(k))variants.set(k,{r,cells:new Map()});
   const cells=variants.get(k).cells,c=column(r);if(!cells.has(c))cells.set(c,[]);cells.get(c).push(r);
  }
  const table=el('table');table.className='coverage-grid';
  const head=el('tr');head.append(el('th','Model variant'),el('th','Size'));
  for(const b of bench){const th=el('th',friendly[b]||b);th.scope='col';if(prismBenchmarks.includes(b))th.className='prism-benchmark';if(variantOfPrism(b))th.title='Not PrismML\'s protocol: compare models within this column only';head.append(th);}
  const thead=el('thead');thead.append(head);table.append(thead);
  const body=el('tbody');let missing=0,filled=0;
  for(const {r,cells} of variants.values()){
   const tr=el('tr');tr.dataset.family=family(r);tr.dataset.provider=isPrism(r)?'prism':'other';
   const name=el('th',UI.candidateName(r.variant));name.scope='row';
   const tag=el('span',isPrism(r)?evidenceLabel(r):families[family(r)]);tag.className='coverage-family';name.append(tag);
   tr.append(name,el('td',sizeLabel(r)));
   for(const b of bench){
    const found=cells.get(b),td=el('td');
    if(!found){td.textContent='—';td.className='coverage-missing';td.title='Not measured yet';missing+=prismBenchmarks.includes(b);}
    else{
     filled+=prismBenchmarks.includes(b);
     td.textContent=[...new Set(found.map(x=>scoreLabel(x)+(x.published?' P':'')))].join(' · ');
     td.title=found.map(x=>code(x)+(x.published?' published':' measured')+': '+x.cohort).join('\n');
     if(found.every(x=>x.published))td.className='coverage-published';
    }
    tr.append(td);
   }
   body.append(tr);
  }
  table.append(body);
  const wrap=el('div');wrap.className='coverage-scroll';wrap.append(table);
  const title=el('h3','Benchmark coverage · '+UI.modelName(selectedModel));
  const note=el('p',filled+' of '+(filled+missing)+' Prism-benchmark cells are filled. — means not measured yet, never a zero. P marks a published score that we have not reproduced. Hover a cell for its protocol.');
  note.className='small muted';
  const box=el('details');box.open=true;box.className='coverage-box';box.append(el('summary','Coverage grid: what is measured and what is missing'),note,wrap);
  root.append(title,box);
 }
 let observer;
 function draw(){
  observer?.disconnect();
  const query=byId('barsSearch').value.trim().toLowerCase();
  const filtered=fronts.filter(r=>modelOf(r)===selectedModel&&(evidence==='all'||r.published===(evidence==='published'))&&(!query||[r.model,r.variant,r.label,r.benchmark,families[family(r)],styles[r.method][0]].join(' ').toLowerCase().includes(query)));
  // The size-score panels show every measured result of the model (dominated and unsuccessful ones too).
  const scope=rows.filter(r=>modelOf(r)===selectedModel&&(evidence==='all'||r.published===(evidence==='published')));
  const root=byId('barsGrid'),jump=byId('barsJump');root.replaceChildren();jump.replaceChildren();legend();modelSwitcher();coverageGrid(filtered);
  byId('barsCount').textContent=UI.modelName(selectedModel)+' · '+filtered.length+' bars · '+new Set(filtered.map(r=>r.benchmark)).size+' benchmarks. Other original models: use the buttons above. Full experiment history in Size vs. quality below.';
  const cards=[];
  for(const [id,title] of categories){
   const names=metrics.filter(m=>category(m)===id&&filtered.some(r=>r.benchmark===m));if(!names.length)continue;
   const section=el('section');section.className='benchmark-category';section.id='benchmarks-'+id;section.append(el('h3',title));
   const grid=el('div');grid.className='benchmark-card-grid';
   for(const m of names){const c=card(m,filtered.filter(r=>r.benchmark===m),metrics.indexOf(m),scope.filter(r=>r.benchmark===m));grid.append(c.root);cards.push(c);}
   section.append(grid);root.append(section);
   if(id==='primary')for(const m of names){const a=el('a',m);a.href='#benchmark-'+metrics.indexOf(m);jump.append(a);}
   else{const a=el('a',title.replace(/^More /,''));a.href='#benchmarks-'+id;jump.append(a);}
  }
  const lookup=new Map(cards.map(c=>[c.chart,c]));
  observer=new ResizeObserver(entries=>{for(const entry of entries)lookup.get(entry.target)?.redraw(entry.contentRect.width);});
  for(const c of cards){c.redraw(c.root.clientWidth-2*parseFloat(getComputedStyle(c.root).paddingLeft));observer.observe(c.chart);}
  if(!filtered.length)root.append(el('p','No overview results match this search. Search the complete register below for other measured candidates. Missing scores are never shown as zero.'));
 }
 for(const b of document.querySelectorAll('.evidence-buttons [data-evidence]'))b.onclick=()=>{evidence=b.dataset.evidence;for(const x of document.querySelectorAll('.evidence-buttons button'))x.setAttribute('aria-pressed',String(x===b));draw();};
 byId('barsSearch').addEventListener('input',draw);
 byId('barsMonochrome').checked=byId('monochrome').checked;
 byId('barsMonochrome').onchange=()=>{byId('monochrome').checked=byId('barsMonochrome').checked;byId('monochrome').dispatchEvent(new Event('change'));};
 byId('monochrome').addEventListener('change',()=>{byId('barsMonochrome').checked=byId('monochrome').checked;draw();});
 byId('barsClose').onclick=()=>byId('barsDetails').close();
 byId('barsDetails').onclick=e=>{if(e.target===byId('barsDetails'))byId('barsDetails').close();};
 draw();
};
