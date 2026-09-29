'use strict';
// Benchmark overview; archived observations and gate decisions remain unchanged.
// Point-score fronts are local to a model, evaluation protocol and byte basis.
// Published scores are references, never competitors in our measured fronts.
window.DendriScaleBarFront = rows => {
 const family = r => ['teacher','dendritic','hybrid'].includes(r.method) ? r.method : 'control';
 const key = r => JSON.stringify([r.model,r.cohort,r.benchmark,r.direction||'max',r.scoreUnit||'%',r.size.basis,r.n,family(r)]);
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

window.DendriScaleBars = function(DATA,{el,se,sizeNotes=[],benchmarkCoverage=null}) {
 const UI=window.DendriScaleUI,byId=id=>document.getElementById(id);
 const styles={teacher:['Original / teacher','#222222','none'],dendritic:['Dendritic','#0072B2','diagonal'],
  hybrid:['Dendritic + quantization','#E69F00','cross'],control:['Quantization / pruning / deletion','#CC79A7','dots'],
  dense:['Dense / low-rank replacement','#006B57','dots'],ternary:['Ternary (Prism)','#007B83','vertical'],
  binary:['Binary (Prism)','#A32972','diagonal'],external:['Other published method','#595959','dots'],unknown:['Method unspecified','#595959','dots']};
 function method(p){
  if(p.method_style?.key==='teacher'||p.label==='Teacher reference'||p.method_style?.label==='Uncompressed teacher reference')return 'teacher';
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
  if(/publisher-reported packed size/i.test(p.label)&&p.xunit==='bytes')return {bytes:p.x,basis:'published packed size'};
  if(p.xaxis==='projected_format_bytes')return {bytes:p.x,basis:'projected format'};
  if(p.xaxis==='weight_file_bytes')return {bytes:p.x,basis:'weight files'};
  if(bytes>0)return {bytes,basis:'registered model'};
  if(p.xaxis==='whole_registered_bytes'&&p.xunit==='bytes')return {bytes:p.x,basis:'registered model'};
  const note=p.xunit==='parameters'?`This record reports ${p.x.toLocaleString('en')} parameters, not a measured whole-model byte total. Precision, buffers and storage format must also be accounted for.`
   :/site|cell/.test(p.xaxis)?'This record measures one replacement layer or cell, not the complete model.'
   :'This historical record does not identify a verified whole-model byte total.';
  return {bytes:null,basis:'GB not recorded',note};
 }
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
  rows.push({...p,score:y,scoreUnit,direction:p.ydirection,n,benchmark:metric(p),size:size(p),method:method(p),published:p.source_level==='external-reported'});
 }
 const scoreLabel=r=>r.score.toFixed(r.scoreUnit==='nats/token'?3:2)+(r.scoreUnit==='%'?'%':r.scoreUnit==='ratio'?'×':' nats/token');
 function details(r){
  const target=byId('barsDetail');target.replaceChildren(el('h3',UI.candidateName(r.label)),el('p',UI.modelName(r.model)));
  const dl=el('dl');dl.className='bar-facts';
  for(const [k,v] of [['Benchmark',r.benchmark+' · '+scoreLabel(r)],['Method',styles[r.method][0]],
   ['Model size',r.size.bytes>0?(r.size.bytes/1e9).toFixed(3)+' GB · '+r.size.basis:r.size.basis],
   ['Size accounting',r.size.note],['Evidence',r.published?'Published result · not reproduced':'DendriScale measurement'],['Protocol',r.cohort],
   ['Sample size',r.n||'See benchmark protocol'],['Original verdict',r.gate_status],['Conditions',r.conditions],['Limitations',r.limitations],['Source hashes',(r.source_hashes||[]).join(', ')]]){
   if(k==='Size accounting'&&!v)continue;
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
  if(/IFBench|τ|tau/i.test(m))return 'instruction';
  if(/OCR|CharXiv|VQA|DocBench|MMMU|RealWorldQA/i.test(m))return 'vision';
  if(/Average/i.test(m))return 'summary';
  if(/^C4|^Copy/i.test(m))return 'fidelity';
  return 'diagnostics';
 }
 const friendly={'Multiple choice':'Multiple choice · six tasks','arc_challenge accuracy':'ARC Challenge','arc_easy accuracy':'ARC Easy','boolq accuracy':'BoolQ','piqa accuracy':'PIQA','hellaswag accuracy':'HellaSwag','winogrande accuracy':'WinoGrande'};
 const fronts=window.DendriScaleBarFront(rows);
 const families={teacher:'Original models',dendritic:'Dendritic',hybrid:'Dendritic + quantization',control:'Non-dendritic',published:'Published · not reproduced'};
 const methodKey=r=>['teacher','dendritic','hybrid'].includes(r.method)?r.method:'control';
 const family=r=>r.published?'published':methodKey(r);
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
 const sizeNote=r=>({'registered model':'','projected format':'projected','published size':'published','published packed size':'published size','weight files':'weight files','size not measured':'','GB not recorded':''}[r.size.basis]??r.size.basis);
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
  || sortSize(a)-sortSize(b) || shortModel(a).localeCompare(shortModel(b))
  || a.cohort.localeCompare(b.cohort) || a.label.localeCompare(b.label) || a.id.localeCompare(b.id);
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
  const published=el('span','P · Published, not reproduced');published.className='bar-published-key';root.append(published);
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
    entries.push({r,y});y+=rowHeight;
   }
   return {x:i*(colWidth+gap),entries,height:y};
  });
  const height=Math.max(...layouts.map(l=>l.height))+58;
  svg.replaceChildren();svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.setAttribute('width',width);svg.setAttribute('height',height);
  svg.append(se('title',{},title+' · '+unit),se('desc',{},'Our point-score Pareto fronts, selected separately within each model, method family, protocol and byte basis. All published references remain separate evidence. GB labels state the whole-model size basis. E and P codes identify protocols.'));
  svg.append(se('rect',{width,height,fill:'white'}));
  svg.append(text(0,16,trim(title,width,13),{'font-size':13,'font-weight':650}));
  svg.append(text(0,34,unit+' · '+(direction==='min'?'lower':'higher')+' is better',{'font-size':11,fill:'#526476'}));
  const defs=se('defs',{});svg.append(defs);
  for(const key of ['teacher','dendritic','hybrid','control']){
   const [label,color,pattern]=styles[key],ink=mono?'#222222':color,pat=se('pattern',{id:id+'-'+key,width:16,height:16,patternUnits:'userSpaceOnUse'});
   pat.append(se('rect',{width:16,height:16,fill:ink}));
   const patternInk=key==='hybrid'||key==='control'?'#263746':'white';
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
    const r=entry.r,[methodLabel,,pattern]=methodStyle(r),key=methodKey(r);
    const yy=y+(compact?48:7),labelWidth=compact?colWidth:colWidth*.44-16;
    const g=se('g',{tabindex:0,role:'button','aria-label':r.label+', '+r.model+', '+scoreLabel(r)+', '+sizeLabel(r)+' · '+r.size.basis+', '+families[family(r)]+', '+code(r),
     'data-point-id':r.id,'data-method':r.method,'data-family':family(r),'data-color-group':methodKey(r),'data-size-bytes':r.size.bytes??'','data-model':r.model,'data-provenance':r.published?'published':'measured','data-size-basis':r.size.basis,'data-cohort':r.cohort});
    g.append(se('title',{},r.label+' · '+r.model+'\n'+methodLabel+' · '+sizeLabel(r)+' · '+r.size.basis+'\n'+code(r)+': '+r.cohort+'\n'+(r.published?'Published · not reproduced':'Measured by DendriScale')+'\n'+r.conditions));
    g.append(se('rect',{x,y:y-4,width:colWidth,height:rowHeight-5,fill:'transparent',class:'bar-hit',rx:4}));
    const first=shortModel(r)+' · '+sizeLabel(r)+(sizeNote(r)?' '+sizeNote(r):'');
    g.append(text(x,y+10,trim(first,labelWidth,12),{'font-weight':650}));
    const second=UI.candidateName(r.label)+(!r.size.bytes&&r.xunit==='parameters'?' · '+(r.x/1e9).toFixed(2)+'B parameters':'');
    g.append(text(x,y+26,trim(second,labelWidth,11),{'font-size':11,fill:'#526476'}));
    const publishedProtocol=r.published?r.cohort.replace(/^PrismML /,''):'';
    const tags=code(r)+(publishedProtocol?' · '+publishedProtocol:'')+(r.n?' · n='+r.n.toLocaleString('en'):'')+(UI.allBenchmarksPass(r)?' · ✓ Development gates':'');
    g.append(text(x,y+40,tags,{'font-size':10,fill:'#526476'}));
    g.append(se('rect',{x:barX,y:yy,width:barWidth,height:17,rx:2,fill:'#edf1f5'}));
    for(const tick of [25,50,75])g.append(se('line',{x1:barX+barWidth*tick/100,x2:barX+barWidth*tick/100,y1:yy,y2:yy+17,stroke:'#d6dee5','stroke-width':1}));
    g.append(se('rect',{x:barX+barWidth*fraction(Math.min(0,r.score)),y:yy,width:barWidth*Math.abs(fraction(r.score)-fraction(0)),height:17,rx:2,fill:'url(#'+id+'-'+key+')',stroke:'#263746','stroke-width':.4,class:'score-bar','data-score':r.score}));
    g.append(text(barX+barWidth+6,yy+13,(Math.abs(r.score)>=1e4?r.score.toExponential(1).replace('+',''):r.score.toFixed(r.scoreUnit==='nats/token'?3:2)),{'font-size':12,'font-weight':700}));
    if(!compact)g.append(text(barX,yy+31,methodLabel+(r.published?' · published':''),{'font-size':10,fill:'#526476'}));
    g.addEventListener('click',()=>details(r));g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();details(r);}});svg.append(g);
   }
   const axisY=layout.height+7;
   for(const v of [0,25,50,75,100])svg.append(text(barX+barWidth*v/100,axisY,axisValue(axisMin+(axisMax-axisMin)*v/100),{'font-size':10,'text-anchor':v===0?'start':v===100?'end':'middle',fill:'#647585'}));
  }
 }
 function card(benchmark,items,index){
  const chosen=items.slice().sort(compare),root=el('article');root.className='benchmark-card';root.dataset.benchmark=benchmark;
  root.id='benchmark-'+index;
  const head=el('div');head.className='benchmark-card-heading';const title=el('h4',friendly[benchmark]||benchmark);
  const exportButton=button('Download chart ↓',()=>download(chart,'dendriscale-'+benchmark.replace(/[^a-z0-9]/gi,'-')));exportButton.className='quiet-button';head.append(title,exportButton);root.append(head);
  const measured=chosen.filter(r=>!r.published&&r.method!=='teacher'),published=chosen.filter(r=>r.published),teachers=chosen.filter(r=>!r.published&&r.method==='teacher');
  const note=el('p',[measured.length?measured.length+' measured Pareto '+(measured.length===1?'model':'models'):null,published.length?published.length+' published references':null,teachers.length?teachers.length+' '+(teachers.length===1?'original':'originals'):null].filter(Boolean).join(' · '));note.className='bar-summary small muted';root.append(note);
  const coverage=benchmarkCoverage?.benchmarks?.find(x=>x.benchmark===benchmark);
  if(coverage){
   const status=el('div');status.className='bar-evaluation-status';status.dataset.status=coverage.status;
   status.append(el('strong',coverage.label),el('span',coverage.summary));
   const detail=el('details');detail.append(el('summary','Evaluation coverage & next work'));
   const list=el('ul');for(const item of coverage.items||[])list.append(el('li',item));
   detail.append(list,el('p','Status checked '+new Date(benchmarkCoverage.updated_at_utc).toLocaleString()+'. Pending evaluations are not scores.'));status.append(detail);root.append(status);
  } else if(!fronts.some(r=>r.benchmark===benchmark&&!r.published&&r.method!=='teacher')) {const empty=el('p','Our compressed models have not yet been evaluated on this benchmark.');empty.className='bar-missing small';root.append(empty);}
  if(chosen.some(r=>!r.size.bytes)){const missing=el('p','GB not recorded: these historical references contain parameter counts or layer-only costs, not a verified whole-model byte measurement. Open a bar for the recorded detail.');missing.className='bar-missing small';root.append(missing);}
  const chart=se('svg',{role:'group','aria-label':benchmark+' benchmark bars',class:'benchmark-chart'});root.append(chart);
  const protocolKeys=[...new Map(chosen.map(r=>[code(r),r])).entries()];
  const protocols=el('details');protocols.className='bar-protocols';protocols.append(el('summary',protocolKeys.length+' evaluation '+(protocolKeys.length===1?'protocol':'protocols')+' · view conditions'));
  const dl=el('dl');dl.className='bar-protocol-list';
  for(const [label,r] of protocolKeys){dl.append(el('dt',label),el('dd',(r.published?'Published, not reproduced. ':'Measured. ')+UI.modelName(r.model)+' — '+r.cohort));}
  protocols.append(dl);root.append(protocols);
  const id='benchmark-chart-'+(++serial);let lastWidth=0;
  const redraw=width=>{if(Math.abs(width-lastWidth)<1)return;lastWidth=width;plot(chart,chosen,id,benchmark,width);};
  return {root,redraw,chart};
 }
 let observer;
 function draw(){
  observer?.disconnect();
  const query=byId('barsSearch').value.trim().toLowerCase();
  const filtered=fronts.filter(r=>(evidence==='all'||r.published===(evidence==='published'))&&(!query||[r.model,r.label,r.benchmark,families[family(r)],styles[r.method][0]].join(' ').toLowerCase().includes(query)));
  const root=byId('barsGrid'),jump=byId('barsJump');root.replaceChildren();jump.replaceChildren();legend();
  byId('barsCount').textContent=filtered.length+' bars · '+new Set(filtered.map(r=>r.benchmark)).size+' benchmarks · all selected bars shown. Full experiment history in Size vs. quality below.';
  const cards=[];
  for(const [id,title] of categories){
   const names=metrics.filter(m=>category(m)===id&&filtered.some(r=>r.benchmark===m));if(!names.length)continue;
   const section=el('section');section.className='benchmark-category';section.id='benchmarks-'+id;section.append(el('h3',title));
   const grid=el('div');grid.className='benchmark-card-grid';
   for(const m of names){const c=card(m,filtered.filter(r=>r.benchmark===m),metrics.indexOf(m));grid.append(c.root);cards.push(c);}
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
