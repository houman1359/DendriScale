
'use strict';
(async function start() {
try {
const response = await fetch('data/snapshot.json');
if (!response.ok) throw new Error('Snapshot could not be loaded');
const DATA=await response.json(),byId=id=>document.getElementById(id);
byId('updated').textContent='Snapshot: '+new Date(DATA.updated_at_utc).toLocaleString(undefined,{timeZoneName:'short'});
const latest=DATA.highlights[0];
if(latest) byId('latest').textContent='Latest complete battery: '+latest.factor.toFixed(3)+'× whole-model compression; GSM '+latest.GSM+'/1,024 and MC '+latest.MC+'/6,144. '+(latest.passes?'Passes all five development gates.':'Fails GSM: upper loss '+(100*latest.gsm_upper_loss).toFixed(2)+' percentage points against a 5-point limit.');
const svgNS='http://www.w3.org/2000/svg';
function el(tag,text){const x=document.createElement(tag);if(text!==undefined)x.textContent=text;return x;}
function se(tag,attrs,text){const x=document.createElementNS(svgNS,tag);for(const [k,v] of Object.entries(attrs))x.setAttribute(k,v);if(text!==undefined)x.textContent=text;return x;}
function opts(node,values){node.replaceChildren();for(const [value,label] of values){const o=el('option',label);o.value=value;node.append(o);}}
function num(v){if(v===null||v===undefined)return 'Not recorded';return new Intl.NumberFormat('en',{maximumSignificantDigits:7}).format(v);}
function cost(p,v){return p.xunit==='bytes'?num(v/2**30)+' GiB':p.xunit==='parameters'?num(v/1e6)+' M':p.xunit==='percent'?num(v)+'%':p.xunit==='factor'?num(v)+'×':num(v)+' '+p.xunit;}
function nondominated(ps,p){const sx=p.xdirection==='min'?1:-1,sy=p.ydirection==='min'?1:-1;return ps.filter(a=>!ps.some(b=>sx*b.x<=sx*a.x&&sy*b.y<=sy*a.y&&(sx*b.x<sx*a.x||sy*b.y<sy*a.y)));}
for(const [k,label] of [['experiments','experiments indexed'],['raw_metrics','recorded metrics'],['normalized_observations','size–score observations'],['multi_point_panels','panels with multiple points']]){const d=el('div');d.className='stat';d.append(el('b',num(DATA.summary[k])),el('span',label));byId('stats').append(d);}
opts(byId('model'),[...new Set(DATA.panels.map(p=>p.model))].sort().map(x=>[x,x]));
const preferred='allenai/OLMo-2-0325-32B-Instruct';if([...byId('model').options].some(x=>x.value===preferred))byId('model').value=preferred;
function selectPanels(){let ps=DATA.panels.filter(p=>p.model===byId('model').value&&p.source_level===byId('level').value);
 if(!ps.length){const fallback=DATA.panels.find(p=>p.model===byId('model').value);if(fallback){byId('level').value=fallback.source_level;ps=DATA.panels.filter(p=>p.model===fallback.model&&p.source_level===fallback.source_level);}}
 opts(byId('panel'),ps.map(p=>[p.id,p.ylabel+' · '+p.xlabel+(p.source_level==='registry-reported'?' · '+p.cohort:'')]));selectDose();}
function current(){return DATA.panels.find(p=>p.id===byId('panel').value);}
function selectDose(){const p=current();if(!p)return;const doses=[...new Set(p.points.map(x=>x.dose).filter(x=>x!==null))].sort((a,b)=>a-b);opts(byId('dose'),[['all','All recorded doses'],...doses.map(x=>[String(x),num(x)])]);byId('dose').disabled=!doses.length;draw();}
function detail(v,p){byId('detail').textContent=JSON.stringify({candidate:v.label,method:v.method_style?.label,model:v.model,benchmark:p.ylabel,quality:v.y,size_axis:p.xlabel,size:v.x,size_unit:p.xunit,unique_positions:v.dose,presentations:v.presentations,resources:v.resources,whole_model_size:v.whole_model_size||"Not measured for this local or unmatched artifact",original_status:v.gate_status,conditions:v.conditions,limitations:v.limitations,uncertainty:v.uncertainty,full_gate_checks:v.full_gate_checks,source_hashes:v.source_hashes},null,2);}
function draw(){const p=current(),svg=byId('plot');svg.replaceChildren();byId('points').replaceChildren();if(!p)return;
 let ps=p.points.filter(v=>(byId('dose').value==='all'||String(v.dose)===byId('dose').value)&&(byId('teacher').checked||v.label!=='Teacher reference'));
 const fp=nondominated(ps,p),ids=new Set(fp.map(v=>v.id));if(byId('onlyfront').checked)ps=fp;
 byId('panelNote').textContent=p.cohort+' · '+p.source_level+' · '+ps.length+' observations. '+(p.xdirection==='min'?'Smaller size is better. ':'Larger compression is better. ')+(p.ydirection==='min'?'Lower score is better.':'Higher score is better.')+' '+(p.size_note||'Whole-model percentage is shown only when this exact cohort has an original-teacher byte reference.')+((p.model.includes('7B')&&p.source_level==='curated')?' Historical marker/stopping protocol: do not interpret as a validated reasoning frontier.':'');
 byId('xhead').textContent=p.xlabel;byId('yhead').textContent=p.ylabel;
 byId('methodLegend').replaceChildren();const present=new Set(ps.map(v=>v.method_style.key));for(const [key,style] of Object.entries(DATA.method_palette)){if(!present.has(key))continue;const item=el('span'),dot=el('i');dot.className='dot';dot.style.background=style.color;item.append(dot,el('span',style.label));byId('methodLegend').append(item);}
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
 for(const v of ps){const dot=se('circle',{cx:X(v.x),cy:Y(v.y),r:ids.has(v.id)?6:4.5,fill:v.method_style.color,stroke:ids.has(v.id)?'#222222':'white','stroke-width':ids.has(v.id)?2:1,tabindex:0,role:'button','aria-label':v.label});dot.append(se('title',{},v.label+'\n'+v.method_style.label+'\n'+cost(p,v.x)+' · '+num(v.y)));dot.addEventListener('click',()=>detail(v,p));dot.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();detail(v,p);}});svg.append(dot);}
 for(const v of [...ps].sort((a,b)=>a.x-b.x)){const tr=el('tr'),td=el('td'),b=el('button',v.label);b.addEventListener('click',()=>detail(v,p));b.style.borderLeft='5px solid '+v.method_style.color;td.append(b);tr.append(td);for(const text of [v.method_style.label,cost(p,v.x),num(v.y),v.whole_model_size?num(v.whole_model_size.retained_percent)+'%':'Not measured',v.whole_model_size?num(v.whole_model_size.saved_percent)+'%':'Not measured',num(v.dose),v.gate_status,ids.has(v.id)?'Yes':'No'])tr.append(el('td',text));byId('points').append(tr);}
}
function coverage(){const q=byId('search').value.toLowerCase(),rows=DATA.coverage.filter(r=>JSON.stringify(r).toLowerCase().includes(q));byId('coverage').replaceChildren();byId('coverageCount').textContent=rows.length+' of '+DATA.coverage.length+' experiments. '+DATA.coverage.filter(r=>r.paired_observations===0).length+' records have no conservative within-record size–score join; explicit curated/local mappings are additional.';
 for(const r of rows){const tr=el('tr');for(const x of [r.experiment_id,r.model,r.execution,r.numeric_metrics,r.paired_observations,[...r.reasons,r.next_action].join(' · ')])tr.append(el('td',String(x)));byId('coverage').append(tr);}}
byId('model').addEventListener('change',selectPanels);byId('level').addEventListener('change',selectPanels);byId('panel').addEventListener('change',selectDose);for(const id of ['dose','teacher','onlyfront'])byId(id).addEventListener('change',draw);byId('search').addEventListener('input',coverage);
byId('export').addEventListener('click',()=>{const copy=byId('plot').cloneNode(true);copy.setAttribute('xmlns',svgNS);const blob=new Blob([new XMLSerializer().serializeToString(copy)],{type:'image/svg+xml'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download=(current()?.id||'pareto')+'.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
const params=new URLSearchParams(location.search);
for(const id of ['model','level']) if(params.has(id)&&[...byId(id).options].some(o=>o.value===params.get(id))) byId(id).value=params.get(id);
selectPanels();
if(params.has('panel')&&[...byId('panel').options].some(o=>o.value===params.get('panel'))){byId('panel').value=params.get('panel');selectDose();}
coverage();
for(const id of ['model','level','panel']) byId(id).addEventListener('change',()=>{const q=new URLSearchParams();for(const key of ['model','level','panel'])q.set(key,byId(key).value);history.replaceState(null,'','?'+q.toString());});
byId('loadError').hidden=true;
document.body.dataset.ready='true';

} catch(error) { document.getElementById('loadError').hidden=false; document.getElementById('loadError').textContent='Could not load the dashboard. Serve this folder over HTTP, or try reloading the page.'; console.error(error); }
})();
