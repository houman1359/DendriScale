
'use strict';
(async function start() {
try {
const response = await fetch('data/snapshot.json');
if (!response.ok) throw new Error('Snapshot could not be loaded');
const DATA=await response.json(),byId=id=>document.getElementById(id);
byId('updated').textContent='Snapshot: '+new Date(DATA.updated_at_utc).toLocaleString(undefined,{timeZoneName:'short'});
const latest=DATA.highlights[0];
if(latest) {
  const gateNames={gsm:'GSM',mc:'Multiple choice',c4:'C4',copy512:'Copy 512',copy2048:'Copy 2048'};
  const failed=latest.failed_gates||[];
  const verdict=latest.passes?'Passes all five development gates.':'Fails full development gates'+(failed.length?': '+failed.map(k=>gateNames[k]||k).join(', '):'')+'.';
  const gsmDetail=failed.includes('gsm')?' GSM upper loss: '+(100*latest.gsm_upper_loss).toFixed(2)+' percentage points; limit: 5.':'';
  byId('latest').textContent='Latest complete battery: '+latest.arm+' · '+latest.factor.toFixed(3)+'× whole-model compression; GSM '+latest.GSM+'/1,024 and MC '+latest.MC+'/6,144. '+verdict+gsmDetail+' All '+DATA.highlights.length+' full-battery additions remain visible, including failures.';
}
const svgNS='http://www.w3.org/2000/svg';
// Presentation is independent of archived measurements and method classifications.
const METHOD_STYLES={
 dendritic:{color:'#0072B2',shape:'circle',shapeLabel:'Circle'},
 hybrid:{color:'#B64A00',shape:'square',shapeLabel:'Square'},
 control:{color:'#6842A0',shape:'triangle',shapeLabel:'Triangle'},
 dense:{color:'#006B57',shape:'diamond',shapeLabel:'Diamond'},
 teacher:{color:'#151515',shape:'cross',shapeLabel:'Cross'},
 unknown:{color:'#595959',shape:'hexagon',shapeLabel:'Open hexagon'}
};
function methodKey(point){return point.method_style?.key||'unknown';}
function methodStyle(key){return METHOD_STYLES[key]||METHOD_STYLES.unknown;}
function methodLabel(key){return DATA.method_palette[key]?.label||'Method not classified';}
function shapeMark(key,x,y,size=8){
 const style=methodStyle(key),color=byId('monochrome').checked?'#151515':style.color;
 const group=se('g',{'data-method':key,'data-shape':style.shape});
 let tag,attrs;
 if(style.shape==='circle'){tag='circle';attrs={cx:x,cy:y,r:size};}
 else if(style.shape==='square'){tag='rect';attrs={x:x-size,y:y-size,width:2*size,height:2*size};}
 else if(style.shape==='triangle'){tag='polygon';attrs={points:`${x},${y-size*1.2} ${x+size*1.1},${y+size} ${x-size*1.1},${y+size}`};}
 else if(style.shape==='diamond'){tag='polygon';attrs={points:`${x},${y-size*1.25} ${x+size*1.15},${y} ${x},${y+size*1.25} ${x-size*1.15},${y}`};}
 else if(style.shape==='cross'){
  const a=size*.36,b=size*1.2;tag='path';attrs={d:`M ${x-a} ${y-b} H ${x+a} V ${y-a} H ${x+b} V ${y+a} H ${x+a} V ${y+b} H ${x-a} V ${y+a} H ${x-b} V ${y-a} H ${x-a} Z`};
 }else{tag='polygon';attrs={points:Array.from({length:6},(_,i)=>`${x+size*Math.cos(i*Math.PI/3)},${y+size*Math.sin(i*Math.PI/3)}`).join(' ')};}
 group.append(se(tag,{...attrs,fill:style.shape==='hexagon'?'white':color,stroke:'white','stroke-width':5,'stroke-linejoin':'round'}));
 group.append(se(tag,{...attrs,fill:style.shape==='hexagon'?'white':color,stroke:'#151515','stroke-width':1.4,'stroke-linejoin':'round'}));
 return group;
}
function methodIcon(key){const icon=se('svg',{viewBox:'0 0 30 30',width:30,height:30,'aria-hidden':'true',focusable:'false',class:'method-icon'});icon.append(shapeMark(key,15,15,8));return icon;}
function visibleMethodKeys(points){return Object.keys(METHOD_STYLES).filter(key=>points.some(v=>methodKey(v)===key));}
try{byId('monochrome').checked=localStorage.getItem('dendriscale-monochrome')==='true';}catch(_){}

function el(tag,text){const x=document.createElement(tag);if(text!==undefined)x.textContent=text;return x;}
function se(tag,attrs,text){const x=document.createElementNS(svgNS,tag);for(const [k,v] of Object.entries(attrs))x.setAttribute(k,v);if(text!==undefined)x.textContent=text;return x;}
function opts(node,values){node.replaceChildren();for(const [value,label] of values){const o=el('option',label);o.value=value;node.append(o);}}
function num(v){if(v===null||v===undefined)return 'Not recorded';return new Intl.NumberFormat('en',{maximumSignificantDigits:7}).format(v);}
function cost(p,v){return p.xunit==='bytes'?num(v/2**30)+' GiB':p.xunit==='parameters'?num(v/1e6)+' M':p.xunit==='percent'?num(v)+'%':p.xunit==='factor'?num(v)+'×':num(v)+' '+p.xunit;}
function outcome(row){const text=String(row.gate_status||'').toLowerCase();return row.failed_gates?.length||/fail|reject|gate.stop/.test(text)?'failed':/all five.*pass|all.*gates pass|^pass/.test(text)?'passed':'other';}
function matchesOutcome(row,choice){return choice==='all'||outcome(row)===choice;}
function comparisonKind(row){
 const label=row.label.toLowerCase(),method=row.method.toLowerCase();
 if(label==='teacher reference')return {key:'teacher',group:'teacher',label:'Original teacher'};
 if(method.includes('dendritic'))return {key:method.includes('quant')?'hybrid':'dendritic',group:'dendritic',label:label.includes('q16')?'Dendritic attention + quantization':method};
 if(method.includes('dense'))return {key:'dense',group:'non-dendritic',label:method};
 if(/delete|deletion/.test(label))return {key:'control',group:'non-dendritic',label:'Quantization + layer removal; no dendritic cells'};
 if(/sparse|prun/.test(label))return {key:'control',group:'non-dendritic',label:'Quantization + sparsity/pruning; no dendritic cells'};
 if(/quant|int[2348]|awq|gptq/i.test(label+' '+method))return {key:'control',group:'non-dendritic',label:'Quantization only; no dendritic cells'};
 return {key:'unknown',group:'unknown',label:method};
}
const comparisons=(DATA.candidates||[]).filter(r=>r.source_level==='curated').map(r=>{
 const p=DATA.panels.find(p=>p.id===r.panel_id)?.points.find(p=>p.id===r.point_id);
 const size=p?.whole_model_size;
 return {...r,kind:comparisonKind(r),size,factor:size?size.original_registered_bytes/size.registered_bytes:null};
}).filter(r=>r.size&&r.measurements.some(m=>/^GSM/.test(m.benchmark)));
const comparisonCohorts=[...new Map(comparisons.map(r=>[r.model+' | '+r.cohort,{model:r.model,cohort:r.cohort}])).entries()];
opts(byId('comparisonCohort'),comparisonCohorts.map(([key,value])=>[key,value.model+' · '+value.cohort]));
const primaryComparison=comparisonCohorts.find(([,v])=>v.model==='allenai/OLMo-2-0325-32B-Instruct');
if(primaryComparison)byId('comparisonCohort').value=primaryComparison[0];
function openComparison(row){
 byId('model').value=row.model;byId('level').value=row.source_level;byId('gate').value='all';byId('onlyfront').checked=false;
 selectPanels();byId('panel').value=row.panel_id;selectDose();byId('method').value='all';draw();
 const panel=current(),point=panel.points.find(p=>p.id===row.point_id);if(point)detail(point,panel);
 byId('detail').scrollIntoView({block:'center'});
}
function comparisonTable(){
 const cohort=byId('comparisonCohort').value;
 const all=comparisons.filter(r=>r.model+' | '+r.cohort===cohort);
 const invalid=all.some(r=>r.model.includes('7B'));
 byId('comparisonNote').textContent=(all[0]?.cohort||'No matched measurements')+(invalid?' Historical 7B marker/stopping protocol is not a validated reasoning frontier; no passing-frontier cards are assigned.':' Development only; one seed/calibration where recorded. Largest compression is not a SOTA or speed claim.');
 byId('comparisonBest').replaceChildren();
 for(const [group,label] of [['dendritic','Largest passing dendritic model'],['non-dendritic','Largest passing non-dendritic model']]){
  const best=invalid?null:all.filter(r=>r.kind.group===group&&outcome(r)==='passed').sort((a,b)=>b.factor-a.factor)[0];
  const card=el('div');card.className='stat comparison-stat';card.dataset.group=group;
  card.append(el('span',label),el('b',best?best.factor.toFixed(3)+'×':'Not established'),el('span',best?best.label:'No validated passing artifact in this cohort'));
  if(best)card.dataset.candidate=best.id;byId('comparisonBest').append(card);
 }
 byId('comparisonRows').replaceChildren();
 for(const row of all.filter(r=>matchesOutcome(r,byId('comparisonGate').value)).sort((a,b)=>b.factor-a.factor)){
  const tr=el('tr');tr.dataset.group=row.kind.group;tr.dataset.verdict=outcome(row);
  const name=el('td'),button=el('button',row.label);button.addEventListener('click',()=>openComparison(row));name.append(button);
  const method=el('td'),badge=el('span');badge.className='method-badge';badge.append(methodIcon(row.kind.key),el('span',row.kind.label));method.append(badge);
  const score=pattern=>row.measurements.filter(m=>pattern.test(m.benchmark)).map(m=>num(m.value)+' · '+m.benchmark).join('; ')||'Not measured';
  tr.append(name,method,el('td',row.factor.toFixed(3)+'×'),el('td',(row.size.registered_bytes/1e9).toFixed(3)),el('td',score(/^GSM/)),el('td',score(/^MC/)),el('td',row.gate_status+(row.failed_gates.length?' · Failed: '+row.failed_gates.join(', '):'')));
  byId('comparisonRows').append(tr);
 }
}
function nondominated(ps,p){const sx=p.xdirection==='min'?1:-1,sy=p.ydirection==='min'?1:-1;return ps.filter(a=>!ps.some(b=>sx*b.x<=sx*a.x&&sy*b.y<=sy*a.y&&(sx*b.x<sx*a.x||sy*b.y<sy*a.y)));}
for(const [k,label] of [['experiments','experiments indexed'],['raw_metrics','recorded metrics'],['normalized_observations','size–score observations'],['multi_point_panels','panels with multiple points']]){const d=el('div');d.className='stat';d.append(el('b',num(DATA.summary[k])),el('span',label));byId('stats').append(d);}
opts(byId('model'),[...new Set(DATA.panels.map(p=>p.model))].sort().map(x=>[x,x]));
const preferred='allenai/OLMo-2-0325-32B-Instruct';if([...byId('model').options].some(x=>x.value===preferred))byId('model').value=preferred;
function selectPanels(){let ps=DATA.panels.filter(p=>p.model===byId('model').value&&p.source_level===byId('level').value);
 if(!ps.length){const fallback=DATA.panels.find(p=>p.model===byId('model').value);if(fallback){byId('level').value=fallback.source_level;ps=DATA.panels.filter(p=>p.model===fallback.model&&p.source_level===fallback.source_level);}}
 opts(byId('panel'),ps.map(p=>[p.id,p.ylabel+' · '+p.xlabel+(p.source_level==='registry-reported'?' · '+p.cohort:'')]));selectDose();}
function current(){return DATA.panels.find(p=>p.id===byId('panel').value);}
function selectDose(){const p=current();if(!p)return;const chosen=byId('method').value;opts(byId('method'),[['all','All methods'],...visibleMethodKeys(p.points).map(key=>[key,methodStyle(key).shapeLabel+' · '+methodLabel(key)])]);if([...byId('method').options].some(o=>o.value===chosen))byId('method').value=chosen;const doses=[...new Set(p.points.map(x=>x.dose).filter(x=>x!==null))].sort((a,b)=>a-b);opts(byId('dose'),[['all','All recorded doses'],...doses.map(x=>[String(x),num(x)])]);byId('dose').disabled=!doses.length;draw();}
function detail(v,p){byId('detail').textContent=JSON.stringify({candidate:v.label,method:methodLabel(methodKey(v)),marker_shape:methodStyle(methodKey(v)).shapeLabel,model:v.model,benchmark:p.ylabel,quality:v.y,size_axis:p.xlabel,size:v.x,size_unit:p.xunit,unique_positions:v.dose,presentations:v.presentations,resources:v.resources,whole_model_size:v.whole_model_size||"Not measured for this local or unmatched artifact",original_status:v.gate_status,conditions:v.conditions,limitations:v.limitations,uncertainty:v.uncertainty,full_gate_checks:v.full_gate_checks,source_hashes:v.source_hashes},null,2);}
function draw(){const p=current(),svg=byId('plot');svg.replaceChildren();byId('points').replaceChildren();if(!p)return;
 let ps=p.points.filter(v=>(byId('dose').value==='all'||String(v.dose)===byId('dose').value)&&(byId('teacher').checked||v.label!=='Teacher reference')&&(byId('method').value==='all'||methodKey(v)===byId('method').value)&&matchesOutcome(v,byId('gate').value));
 const fp=nondominated(ps,p),ids=new Set(fp.map(v=>v.id));if(byId('onlyfront').checked)ps=fp;
 byId('panelNote').textContent=p.cohort+' · '+p.source_level+' · '+ps.length+' observations. '+(p.xdirection==='min'?'Smaller size is better. ':'Larger compression is better. ')+(p.ydirection==='min'?'Lower score is better.':'Higher score is better.')+' '+(p.size_note||'Whole-model percentage is shown only when this exact cohort has an original-teacher byte reference.')+((p.model.includes('7B')&&p.source_level==='curated')?' Historical marker/stopping protocol: do not interpret as a validated reasoning frontier.':'');
 byId('xhead').textContent=p.xlabel;byId('yhead').textContent=p.ylabel;
 byId('methodLegend').replaceChildren();for(const key of visibleMethodKeys(ps)){const item=el('span');item.className='method-key';item.dataset.method=key;item.append(methodIcon(key),el('span',methodStyle(key).shapeLabel+' · '+methodLabel(key)));byId('methodLegend').append(item);}
 if(!ps.length){svg.append(se('text',{x:70,y:100},'No observations for this filter.'));return;}
 const W=1100,H=540,L=95,R=30,T=30,B=85,xv=ps.map(v=>v.x),yv=ps.map(v=>v.y);
 let xmin=Math.min(...xv),xmax=Math.max(...xv),ymin=Math.min(...yv),ymax=Math.max(...yv);
 let dx=xmax-xmin,dy=ymax-ymin;if(!dx)dx=Math.max(Math.abs(xmax)*.03,1);if(!dy)dy=Math.max(Math.abs(ymax)*.03,.01);
 xmin=Math.max(0,xmin-dx*.08);xmax+=dx*.08;ymin-=dy*.12;ymax+=dy*.12;
 const X=v=>L+(v-xmin)/(xmax-xmin)*(W-L-R),Y=v=>H-B-(v-ymin)/(ymax-ymin)*(H-T-B);
 for(let i=0;i<=5;i++){let x=xmin+(xmax-xmin)*i/5,y=ymin+(ymax-ymin)*i/5;
  svg.append(se('line',{x1:X(x),y1:T,x2:X(x),y2:H-B,stroke:'#e1e7ee'}),se('text',{x:X(x),y:H-B+26,'text-anchor':'middle','font-size':12,fill:'#526577'},cost(p,x)));
  svg.append(se('line',{x1:L,y1:Y(y),x2:W-R,y2:Y(y),stroke:'#e1e7ee'}),se('text',{x:L-12,y:Y(y)+4,'text-anchor':'end','font-size':12,fill:'#526577'},num(y)));}
 svg.append(se('text',{x:(W+L-R)/2,y:H-20,'text-anchor':'middle','font-size':14},p.xlabel),se('text',{x:20,y:(H+T-B)/2,transform:`rotate(-90 20 ${(H+T-B)/2})`,'text-anchor':'middle','font-size':14},p.ylabel));
 const sorted=[...fp].sort((a,b)=>a.x-b.x);if(sorted.length>1)svg.append(se('polyline',{points:sorted.map(v=>`${X(v.x)},${Y(v.y)}`).join(' '),fill:'none',stroke:'#39434e','stroke-width':1.5,'stroke-dasharray':'5 4'}));
 for(const v of ps){
 const key=methodKey(v),point=se('g',{class:'plot-point',tabindex:0,role:'button','aria-label':v.label+'; '+methodLabel(key)+'; '+methodStyle(key).shapeLabel+'; '+cost(p,v.x)+'; '+num(v.y)+(ids.has(v.id)?'; observed Pareto point':''),'data-point-id':v.id,'data-method':key,'data-shape':methodStyle(key).shape});
 point.append(se('title',{},v.label+'\n'+methodStyle(key).shapeLabel+' · '+methodLabel(key)+'\n'+cost(p,v.x)+' · '+num(v.y)));
 if(ids.has(v.id))point.append(se('circle',{cx:X(v.x),cy:Y(v.y),r:14,fill:'none',stroke:'white','stroke-width':6}),se('circle',{cx:X(v.x),cy:Y(v.y),r:14,fill:'none',stroke:'#151515','stroke-width':2,class:'pareto-ring'}));
 point.append(shapeMark(key,X(v.x),Y(v.y)),se('circle',{cx:X(v.x),cy:Y(v.y),r:16,fill:'transparent',class:'point-hit'}));
 point.addEventListener('click',()=>detail(v,p));point.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();detail(v,p);}});svg.append(point);
 }
 for(const v of [...ps].sort((a,b)=>a.x-b.x)){
 const key=methodKey(v),tr=el('tr'),td=el('td'),b=el('button',v.label);b.addEventListener('click',()=>detail(v,p));td.append(b);tr.append(td);
 const method=el('td'),badge=el('span');badge.className='method-badge';badge.append(methodIcon(key),el('span',methodStyle(key).shapeLabel+' · '+methodLabel(key)));method.append(badge);tr.append(method);
 for(const text of [cost(p,v.x),num(v.y),v.whole_model_size?num(v.whole_model_size.retained_percent)+'%':'Not measured',v.whole_model_size?num(v.whole_model_size.saved_percent)+'%':'Not measured',num(v.dose),v.gate_status,ids.has(v.id)?'Yes · ring':'No'])tr.append(el('td',text));byId('points').append(tr);
 }
}
function coverage(){const q=byId('search').value.toLowerCase(),rows=DATA.coverage.filter(r=>JSON.stringify(r).toLowerCase().includes(q));byId('coverage').replaceChildren();byId('coverageCount').textContent=rows.length+' of '+DATA.coverage.length+' experiments. '+DATA.coverage.filter(r=>r.paired_observations===0).length+' records have no conservative within-record size–score join; explicit curated/local mappings are additional.';
 for(const r of rows){const tr=el('tr');for(const x of [r.experiment_id,r.model,r.execution,r.numeric_metrics,r.paired_observations,[...r.reasons,r.next_action].join(' · ')])tr.append(el('td',String(x)));byId('coverage').append(tr);}}
function candidateRegister(){
 const all=DATA.candidates||[],q=byId('candidateSearch').value.toLowerCase();
 const rows=all.filter(r=>JSON.stringify(r).toLowerCase().includes(q)&&matchesOutcome(r,byId('candidateGate').value));
 byId('candidates').replaceChildren();byId('candidateCount').textContent=rows.length+' of '+all.length+' candidate/cohort records; '+all.filter(r=>outcome(r)==='failed').length+' explicitly failed or stopped. No pass requirement for inclusion.';
 for(const r of rows){const tr=el('tr'),name=el('td'),button=el('button',r.label);
  button.addEventListener('click',()=>{if(!r.panel_id){byId('detail').textContent=JSON.stringify(r,null,2);byId('detail').scrollIntoView({block:'center'});return;}
   byId('model').value=r.model;byId('level').value=r.source_level;byId('gate').value='all';byId('onlyfront').checked=false;selectPanels();byId('panel').value=r.panel_id;selectDose();byId('method').value='all';draw();const p=current(),point=p.points.find(v=>v.id===r.point_id);if(point)detail(point,p);byId('explorer').scrollIntoView({block:'start'});});
  name.append(button);tr.append(name,el('td',r.model+' · '+r.source_level));
  tr.append(el('td',r.sizes.map(s=>s.label+': '+cost({xunit:s.unit},s.value)).join(' · ')));
  tr.append(el('td',r.measurements.length?r.measurements.map(m=>m.benchmark+': '+num(m.value)).join(' · '):'Capability not yet measured'));
  const status=el('td',r.gate_status+(r.failed_gates.length?' · Failed: '+r.failed_gates.join(', '):''));status.dataset.verdict=outcome(r);tr.append(status);byId('candidates').append(tr);
 }
}
byId('model').addEventListener('change',selectPanels);byId('level').addEventListener('change',selectPanels);byId('panel').addEventListener('change',selectDose);for(const id of ['dose','teacher','onlyfront','method','monochrome','gate'])byId(id).addEventListener('change',draw);byId('search').addEventListener('input',coverage);
byId('candidateSearch').addEventListener('input',candidateRegister);byId('candidateGate').addEventListener('change',candidateRegister);
byId('monochrome').addEventListener('change',()=>{try{localStorage.setItem('dendriscale-monochrome',String(byId('monochrome').checked));}catch(_){}});
byId('export').addEventListener('click',()=>{const copy=byId('plot').cloneNode(true);
 const keys=[...byId('methodLegend').children].map(item=>item.dataset.method),height=610+keys.length*32;
 copy.setAttribute('viewBox',`0 0 1100 ${height}`);copy.setAttribute('width','1100');copy.setAttribute('height',String(height));
 copy.insertBefore(se('rect',{x:0,y:0,width:1100,height,fill:'white'}),copy.firstChild);
 copy.append(se('text',{x:95,y:565,fill:'#151515','font-size':15,'font-family':'sans-serif'},'Method = shape + color. Outer ring / dashed line = observed Pareto front.'));
 for(const [i,key] of keys.entries()){copy.append(shapeMark(key,108,592+i*32),se('text',{x:132,y:597+i*32,fill:'#151515','font-size':15,'font-family':'sans-serif'},methodStyle(key).shapeLabel+' · '+methodLabel(key)));}
copy.setAttribute('xmlns',svgNS);const blob=new Blob([new XMLSerializer().serializeToString(copy)],{type:'image/svg+xml'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download=(current()?.id||'pareto')+'.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
const params=new URLSearchParams(location.search);
for(const id of ['model','level']) if(params.has(id)&&[...byId(id).options].some(o=>o.value===params.get(id))) byId(id).value=params.get(id);
selectPanels();
if(params.has('panel')&&[...byId('panel').options].some(o=>o.value===params.get('panel'))){byId('panel').value=params.get('panel');selectDose();}
coverage();candidateRegister();comparisonTable();
byId('comparisonCohort').addEventListener('change',comparisonTable);byId('comparisonGate').addEventListener('change',comparisonTable);byId('monochrome').addEventListener('change',comparisonTable);
for(const id of ['model','level','panel']) byId(id).addEventListener('change',()=>{const q=new URLSearchParams();for(const key of ['model','level','panel'])q.set(key,byId(key).value);history.replaceState(null,'','?'+q.toString());});
byId('loadError').hidden=true;
document.body.dataset.ready='true';

} catch(error) { document.getElementById('loadError').hidden=false; document.getElementById('loadError').textContent='Could not load the dashboard. Serve this folder over HTTP, or try reloading the page.'; console.error(error); }
})();
