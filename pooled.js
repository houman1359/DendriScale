'use strict';
window.DendriScalePooled = function(DATA,{el,se,shapeMark,methodIcon,methodLabel,outcome,openComparison}) {
 const byId=id=>document.getElementById(id);
 const modelName=m=>m.replace(/^allenai\//,'').replace(/^OLMo-/,'OLMo-');
 function metric(point){
  const label=point.ylabel,unit=point.yunit;
  if(/^GSM (correct|accuracy)/i.test(label))return {key:'GSM8K accuracy',family:'GSM',accuracy:true};
  if(/^MC (correct|macro accuracy)/i.test(label))return {key:'Multiple-choice accuracy',family:'MC',accuracy:true};
  if(/^(Correctly )?[Aa]nswered and stopped/.test(label))return {key:label.replace(/\s*\/\s*[\d,]+$/,''),family:'GSM',accuracy:true};
  if(/ accuracy/.test(label))return {key:label.replace(/\s*\/\s*[\d,]+$/,''),accuracy:true};
  return {key:label,unit:unit==='factor'?'ratio':unit==='nats_per_token'?'nats/token':unit};
 }
 function explicitN(point,m){
  const label=point.ylabel.match(/\/\s*([\d,]+)$/);
  if(label)return {n:Number(label[1].replaceAll(',','')),basis:'Recorded benchmark label'};
  if(!m.family)return null;
  const cohort=point.cohort.replace(/^exp_[^|]+\|/,'').replaceAll('_',' ');
  // Extract an explicit sample count, never infer it from the score magnitude.
  const forward=new RegExp('\\b'+m.family+'(?:8K)?[^\\d;|]{0,65}(\\d[\\d,]*)','i');
  const reverse=new RegExp('(\\d[\\d,]*)\\s*(?:-item\\s*|items?\\s*|\\s+)'+m.family+'\\b','i');
  const match=cohort.match(forward)||cohort.match(reverse)||cohort.match(/\bn\s*=\s*(\d[\d,]*)/i);
  if(match)return {n:Number(match[1].replaceAll(',','')),basis:'Explicit sample count in recorded cohort'};
  return null;
 }
 const candidates=[],seen=new Set();
 for(const panel of [...DATA.panels].sort((a,b)=>(a.xunit==='bytes'?0:1)-(b.xunit==='bytes'?0:1)))for(const point of panel.points){
  const bytes=point.whole_model_size?.registered_bytes??(point.xaxis==='whole_registered_bytes'&&point.xunit==='bytes'?point.x:null);
  if(!Number.isFinite(bytes)||bytes<=0||!Number.isFinite(point.y))continue;
  const id=JSON.stringify([point.id.replace(/__whole_percent$/,''),point.model,point.cohort,point.ylabel,bytes,point.y]);
  if(seen.has(id))continue;seen.add(id);
  const m=metric(point);
  candidates.push({...point,bytes,gb:bytes/1e9,metric:m,n:explicitN(point,m),panel_id:panel.id,point_id:point.id,
   method:point.method_style?.key||'unknown',modelKey:point.model.replace(/^allenai\//i,'').toLowerCase()});
 }
 // Propagate only unambiguous explicitly recorded counts within an experiment
 // and benchmark family. Conflicting sample sizes remain separate observations.
 const counts=new Map();
 for(const r of candidates)if(r.n){const key=r.experiment_id+'|'+r.metric.family;if(!counts.has(key))counts.set(key,new Set());counts.get(key).add(r.n.n);}
 const rows=candidates.map(r=>{
  let y=r.y,unit=r.metric.unit,key=r.metric.key,n=r.n;
  if(r.metric.accuracy){
   if(r.yunit==='fraction'){y=100*y;unit='%';}
   else if(r.yunit==='percent'){unit='%';}
   else {
    const possible=counts.get(r.experiment_id+'|'+r.metric.family);
    if(!n&&possible?.size===1)n={n:[...possible][0],basis:'Unambiguous explicit count in the same experiment and benchmark family'};
    if(n&&n.n>0&&y>=0&&y<=n.n){y=100*y/n.n;unit='%';}
    else {key=r.ylabel.replace(/\s*\/\s*[\d,]+$/,'')+' · raw counts (sample size unavailable)';unit='items';n=null;}
   }
  }
  return {...r,benchmark:key,displayY:y,displayUnit:unit,denominator:n};
 });
 const benchmarks=[...new Set(rows.map(r=>r.benchmark))].sort((a,b)=>(a==='GSM8K accuracy'?-1:b==='GSM8K accuracy'?1:a.localeCompare(b)));
 for(const key of benchmarks){const option=el('option',key);option.value=key;byId('pooledBenchmark').append(option);}
 const modelSize=name=>Number(name.match(/(?:^|[-/])(\d+(?:\.\d+)?)B(?:[-\s]|$)/i)?.[1]||Infinity);
 const models=[...new Map(rows.map(r=>[r.modelKey,modelName(r.model)])).entries()].sort((a,b)=>modelSize(a[1])-modelSize(b[1])||a[0].localeCompare(b[0]));
 const colors=['#0072B2','#B64A00','#006B57','#6842A0','#9E315E','#595959'];
 const modelStyles=new Map(models.map(([key,name],index)=>{
  const size=modelSize(name),sameSize=models.filter(([,other])=>modelSize(other)===size).length;
  const label=Number.isFinite(size)?size+'B'+(sameSize>1?'·'+String.fromCharCode(65+index):''):String.fromCharCode(65+index);
  return [key,{name,label,color:colors[index%colors.length]}];
 }));
 let highlighted=null;
 const modelColor=key=>byId('monochrome').checked?'#151515':modelStyles.get(key).color;
 function recolor(marker,color){for(const node of marker.children){if(node.getAttribute('fill')!=='white')node.setAttribute('fill',color);else if(node.getAttribute('stroke')!=='white')node.setAttribute('stroke',color);}return marker;}
 function modelMark(row,x,y,size=7){return recolor(shapeMark(row.method,x,y,size),modelColor(row.modelKey));}
 function applyHighlight(){
  for(const node of byId('pooledPlot').querySelectorAll('[data-model]'))node.style.opacity=highlighted&&node.dataset.model!==highlighted?'0.12':'1';
  for(const node of byId('pooledModelLegend').querySelectorAll('button'))node.setAttribute('aria-pressed',String((node.dataset.model||null)===highlighted));
  byId('pooledHighlight').textContent=highlighted?'Highlighted: '+modelStyles.get(highlighted).name+'. Other models are dimmed; points matching the filters remain plotted.':'';
 }
 function modelLegend(points){
  const container=byId('pooledModelLegend');container.replaceChildren();
  const present=new Set(points.map(r=>r.modelKey));if(!present.has(highlighted))highlighted=null;
  const all=el('button','Show all equally');all.type='button';all.addEventListener('click',()=>{highlighted=null;applyHighlight();});container.append(all);
  for(const [key,style] of modelStyles)if(present.has(key)){
   const button=el('button');button.type='button';button.className='pooled-model-key';button.dataset.model=key;
   const badge=el('span',style.label);badge.className='pooled-model-badge';badge.style.borderColor=modelColor(key);badge.style.color=modelColor(key);
   button.append(badge,el('span',style.name));button.addEventListener('click',()=>{highlighted=highlighted===key?null:key;applyHighlight();});container.append(button);
  }
 }

 for(const [key,label] of [['all','All models'],...models]){const option=el('option',label);option.value=key;byId('pooledModel').append(option);}
 function selected(row){
  byId('pooledDetail').textContent=JSON.stringify({candidate:row.label,model:row.model,benchmark:row.benchmark,
   absolute_registered_bytes:row.bytes,absolute_registered_GB:row.gb,score:row.displayY,score_unit:row.displayUnit,
   original_score:row.y,original_score_unit:row.yunit,sample_size:row.denominator,cohort:row.cohort,
   original_status:row.gate_status,conditions:row.conditions,limitations:row.limitations,source_hashes:row.source_hashes},null,2);
  byId('pooledDetails').open=true;byId('pooledOpen').hidden=false;byId('pooledOpen').onclick=()=>openComparison(row);
 }
 function selection(){
  const selectedModel=byId('pooledModel').value;
  const all=rows.filter(r=>r.benchmark===byId('pooledBenchmark').value&&(selectedModel==='all'||r.modelKey===selectedModel));
  const entered=byId('pooledMinimum').valueAsNumber,minimum=Number.isFinite(entered)?Math.min(100,Math.max(0,entered)):10;
  const percent=all.length>0&&all.every(r=>r.displayUnit==='%'),filtered=percent&&!byId('pooledShowLow').checked;
  return {all,minimum,percent,filtered,ps:filtered?all.filter(r=>r.displayY>=minimum):all};
 }
 function filterDescription({all,ps,minimum,filtered}){
  return filtered?(all.length-ps.length)+' below '+minimum+'% hidden.':'No score filter applied.';
 }
 function draw(){
  const state=selection(),{all,ps,minimum,percent}=state;
  byId('pooledMinimum').value=minimum;byId('pooledMinimum').disabled=!percent||byId('pooledShowLow').checked;
  byId('pooledShowLow').disabled=!percent;
  const svg=byId('pooledPlot');svg.replaceChildren();byId('pooledRows').replaceChildren();byId('pooledLegend').replaceChildren();
  modelLegend(ps);
  const modelCount=new Set(ps.map(r=>r.modelKey)).size,unit=all[0]?.displayUnit||'';
  byId('pooledCount').textContent='Showing '+ps.length+' of '+all.length+' recorded points across '+modelCount+' models. '+filterDescription(state)+' X = complete-model registered GB (10⁹ bytes).';
  if(!ps.length){applyHighlight();svg.append(se('text',{x:80,y:90},all.length?'No scores meet the minimum. Lower it or enable Show near-zero results.':'No recorded whole-model sizes for this selection.'));return;}
  const W=1100,H=540,L=100,R=30,T=30,B=75,log=byId('pooledLog').checked;
  const xmin=log?Math.min(...ps.map(r=>r.gb))*.85:0,xmax=Math.max(...ps.map(r=>r.gb))*1.08;
  let ymin=Math.min(...ps.map(r=>r.displayY)),ymax=Math.max(...ps.map(r=>r.displayY));const delta=ymax-ymin||Math.max(Math.abs(ymax)*.1,.01);
  ymin-=delta*.12;ymax+=delta*.12;if(unit==='%'){ymin=Math.max(0,ymin);ymax=Math.min(100,ymax);}
  const X=v=>L+((log?Math.log(v/xmin):v-xmin)/(log?Math.log(xmax/xmin):xmax-xmin))*(W-L-R);
  const Y=v=>H-B-(v-ymin)/(ymax-ymin)*(H-T-B);
  for(let i=0;i<=5;i++){
   const x=log?xmin*(xmax/xmin)**(i/5):xmin+(xmax-xmin)*i/5,y=ymin+(ymax-ymin)*i/5;
   svg.append(se('line',{x1:X(x),x2:X(x),y1:T,y2:H-B,stroke:'#e1e7ee'}),se('text',{x:X(x),y:H-B+25,'text-anchor':'middle','font-size':12,fill:'#526577'},Number(x.toPrecision(3))+' GB'),
    se('line',{x1:L,x2:W-R,y1:Y(y),y2:Y(y),stroke:'#e1e7ee'}),se('text',{x:L-10,y:Y(y)+4,'text-anchor':'end','font-size':12,fill:'#526577'},Number(y.toPrecision(4))));
  }
  svg.append(se('text',{x:(L+W-R)/2,y:H-20,'text-anchor':'middle','font-size':14},'Absolute whole-model size (GB)'+(log?' · log scale':'')),
   se('text',{x:23,y:H/2,transform:`rotate(-90 23 ${H/2})`,'text-anchor':'middle','font-size':14},byId('pooledBenchmark').value+' ('+unit+')'));
  for(const r of ps){
   const text=r.label+' · '+modelName(r.model)+' · '+r.gb.toFixed(3)+' GB · '+r.displayY.toFixed(3)+' '+unit+' · '+r.cohort;
   const group=se('g',{class:'pooled-point',role:'button',tabindex:0,'aria-label':text,'data-model':r.modelKey,'data-bytes':r.bytes,'data-score':r.displayY,'data-verdict':outcome(r),'data-point-id':r.id,'data-method':r.method,'data-model-label':modelStyles.get(r.modelKey).label});
   group.append(se('title',{},text),modelMark(r,X(r.gb),Y(r.displayY),7),se('circle',{cx:X(r.gb),cy:Y(r.displayY),r:11,fill:'transparent'}));
   group.addEventListener('click',()=>selected(r));group.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selected(r);}});svg.append(group);
   if(byId('pooledLabels').checked)svg.append(se('text',{x:X(r.gb)+10,y:Y(r.displayY)-9,'font-size':10,'font-weight':600,fill:modelColor(r.modelKey),stroke:'white','stroke-width':3,'paint-order':'stroke','pointer-events':'none','data-model':r.modelKey,class:'pooled-model-label'},modelStyles.get(r.modelKey).label));
  }
  for(const key of [...new Set(ps.map(r=>r.method))]){const label=el('span');label.className='method-key';const icon=methodIcon(key);for(const mark of icon.children)recolor(mark,'#595959');label.append(icon,el('span',methodLabel(key)));byId('pooledLegend').append(label);}
  applyHighlight();
  for(const r of [...ps].sort((a,b)=>a.gb-b.gb)){
   const tr=el('tr'),td=el('td'),button=el('button',r.label);button.addEventListener('click',()=>selected(r));td.append(button);
   tr.append(td,el('td',modelName(r.model)),el('td',r.gb.toFixed(3)),el('td',r.displayY.toFixed(3)+' '+unit),el('td',r.denominator?.n||'See protocol'),el('td',r.gate_status),el('td',r.cohort));byId('pooledRows').append(tr);
  }
 }
 for(const id of ['pooledBenchmark','pooledModel','pooledMinimum','pooledShowLow','pooledLog','pooledLabels'])byId(id).addEventListener('change',draw);
 byId('monochrome').addEventListener('change',draw);
 byId('pooledExport').addEventListener('click',()=>{
  const state=selection(),{ps}=state,copy=byId('pooledPlot').cloneNode(true),keys=[...new Set(ps.map(r=>r.method))],visibleModels=[...new Set(ps.map(r=>r.modelKey))],height=665+(keys.length+visibleModels.length)*30;
  copy.setAttribute('viewBox',`0 0 1100 ${height}`);copy.setAttribute('width',1100);copy.setAttribute('height',height);copy.setAttribute('xmlns','http://www.w3.org/2000/svg');copy.insertBefore(se('rect',{width:1100,height,fill:'white'}),copy.firstChild);
  copy.append(se('text',{x:100,y:563,'font-size':12},'All-model observations. Sample sizes and protocols vary; cohort details remain in the result table.'));
  copy.append(se('text',{x:100,y:583,'font-size':13},'Shape = compression method; color and label = original model.'));
  copy.append(se('text',{x:100,y:603,'font-size':12},'Showing '+ps.length+' of '+state.all.length+' recorded points. '+filterDescription(state)));
  for(const [i,key] of keys.entries())copy.append(recolor(shapeMark(key,111,634+i*30),'#595959'),se('text',{x:132,y:638+i*30,'font-size':13},methodLabel(key)));
  for(const [i,key] of visibleModels.entries()){
   const style=modelStyles.get(key),y=644+(keys.length+i)*30;
   copy.append(se('rect',{x:101,y:y-13,width:12,height:12,fill:modelColor(key)}),se('text',{x:132,y,'font-size':13},style.label+' · '+style.name));
  }
  if(highlighted)copy.append(se('text',{x:100,y:height-12,'font-size':12},'Highlighted model: '+modelStyles.get(highlighted).name+'; other models dimmed.'));
  const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)],{type:'image/svg+xml'})),a=el('a');a.href=url;a.download='all-models-'+byId('pooledBenchmark').value.replaceAll(' ','-')+'.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 draw();
};
