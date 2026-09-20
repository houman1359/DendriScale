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
 const models=[...new Map(rows.map(r=>[r.modelKey,modelName(r.model)])).entries()];
 for(const [key,label] of [['all','All models'],...models]){const option=el('option',label);option.value=key;byId('pooledModel').append(option);}
 function selected(row){
  byId('pooledDetail').textContent=JSON.stringify({candidate:row.label,model:row.model,benchmark:row.benchmark,
   absolute_registered_bytes:row.bytes,absolute_registered_GB:row.gb,score:row.displayY,score_unit:row.displayUnit,
   original_score:row.y,original_score_unit:row.yunit,sample_size:row.denominator,cohort:row.cohort,
   original_status:row.gate_status,conditions:row.conditions,limitations:row.limitations,source_hashes:row.source_hashes},null,2);
  byId('pooledDetails').open=true;byId('pooledOpen').hidden=false;byId('pooledOpen').onclick=()=>openComparison(row);
 }
 function draw(){
  const selectedModel=byId('pooledModel').value;
  const ps=rows.filter(r=>r.benchmark===byId('pooledBenchmark').value&&(selectedModel==='all'||r.modelKey===selectedModel));
  const svg=byId('pooledPlot');svg.replaceChildren();byId('pooledRows').replaceChildren();byId('pooledLegend').replaceChildren();
  const modelCount=new Set(ps.map(r=>r.modelKey)).size,unit=ps[0]?.displayUnit||'';
  byId('pooledCount').textContent=ps.length+' recorded points across '+modelCount+' models. All outcomes included. X = complete-model registered GB (10⁹ bytes).';
  if(!ps.length){svg.append(se('text',{x:80,y:90},'No recorded whole-model sizes for this selection.'));return;}
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
   const group=se('g',{class:'pooled-point',role:'button',tabindex:0,'aria-label':text,'data-model':r.modelKey,'data-bytes':r.bytes,'data-score':r.displayY,'data-verdict':outcome(r),'data-point-id':r.id});
   group.append(se('title',{},text),shapeMark(r.method,X(r.gb),Y(r.displayY),7),se('circle',{cx:X(r.gb),cy:Y(r.displayY),r:11,fill:'transparent'}));
   group.addEventListener('click',()=>selected(r));group.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selected(r);}});svg.append(group);
   if(byId('pooledLabels').checked)svg.append(se('text',{x:X(r.gb)+10,y:Y(r.displayY)-9,'font-size':10,fill:'#334a5c'},r.model.match(/(?:^|[-/])(\d+(?:\.\d+)?)B(?:[-\s]|$)/i)?.[1]+'B'));
  }
  for(const key of [...new Set(ps.map(r=>r.method))]){const label=el('span');label.className='method-key';label.append(methodIcon(key),el('span',methodLabel(key)));byId('pooledLegend').append(label);}
  for(const r of [...ps].sort((a,b)=>a.gb-b.gb)){
   const tr=el('tr'),td=el('td'),button=el('button',r.label);button.addEventListener('click',()=>selected(r));td.append(button);
   tr.append(td,el('td',modelName(r.model)),el('td',r.gb.toFixed(3)),el('td',r.displayY.toFixed(3)+' '+unit),el('td',r.denominator?.n||'See protocol'),el('td',r.gate_status),el('td',r.cohort));byId('pooledRows').append(tr);
  }
 }
 for(const id of ['pooledBenchmark','pooledModel','pooledLog','pooledLabels'])byId(id).addEventListener('change',draw);
 byId('monochrome').addEventListener('change',draw);
 byId('pooledExport').addEventListener('click',()=>{
  const copy=byId('pooledPlot').cloneNode(true),keys=[...new Set(rows.filter(r=>r.benchmark===byId('pooledBenchmark').value).map(r=>r.method))],height=610+keys.length*30;
  copy.setAttribute('viewBox',`0 0 1100 ${height}`);copy.setAttribute('width',1100);copy.setAttribute('height',height);copy.setAttribute('xmlns','http://www.w3.org/2000/svg');copy.insertBefore(se('rect',{width:1100,height,fill:'white'}),copy.firstChild);
  copy.append(se('text',{x:100,y:563,'font-size':12},'All-model observations. Sample sizes and protocols vary; cohort details remain in the result table.'));
  for(const [i,key] of keys.entries())copy.append(shapeMark(key,111,590+i*30),se('text',{x:132,y:594+i*30,'font-size':13},methodLabel(key)));
  const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)],{type:'image/svg+xml'})),a=el('a');a.href=url;a.download='all-models-'+byId('pooledBenchmark').value.replaceAll(' ','-')+'.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 draw();
};
