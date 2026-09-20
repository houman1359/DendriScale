'use strict';
// One record per candidate/cohort. Unmatched costs never acquire a model factor.
window.DendriScaleOverview = function(DATA, helpers) {
 const {el,se,methodIcon,shapeMark,outcome,openComparison}=helpers;
 const byId=id=>document.getElementById(id);
 const pointIndex=new Map(DATA.panels.flatMap(panel=>panel.points.map(point=>[panel.id+'|'+point.id,point])));
 const classify=model=>{
  const match=model.match(/(?:^|[-/\s])(\d+(?:\.\d+)?)b(?:[-\s/,]|$)/i);
  return match?Number(match[1]):null;
 };
 const rows=(DATA.candidates||[]).map(row=>{
  const point=pointIndex.get(row.panel_id+'|'+row.point_id),size=point?.whole_model_size;
  const explicit=row.sizes.find(s=>s.axis==='whole_compression'&&s.unit==='factor'&&Number.isFinite(s.value)&&s.value>0);
  const factor=size?size.original_registered_bytes/size.registered_bytes:explicit?.value;
  return {...row,originalBytes:size?.original_registered_bytes,registeredBytes:size?.registered_bytes,scale:classify(row.model),factor:Number.isFinite(factor)&&factor>0?factor:null,
   methodKey:point?.method_style?.key||(/dendritic/i.test(row.method)?'hybrid':'unknown')};
 });
 // These requested tiers remain visible even before a measured candidate exists.
 const scales=[...new Set([1,7,32,72,128,...rows.map(r=>r.scale).filter(x=>x!==null)])].sort((a,b)=>a-b);
 if(rows.some(r=>r.scale===null))scales.push(null);
 const pending=(DATA.scale_campaign||[]);
 for(const entry of pending){const tr=el('tr');for(const value of [entry.scale_b+'B',entry.model,entry.status,entry.next])tr.append(el('td',value));byId('scaleCampaign').append(tr);}
 function show(row){
  byId('overviewDetail').closest('details').open=true;
  byId('overviewDetail').textContent=JSON.stringify({candidate:row.label,model:row.model,cohort:row.cohort,
   whole_model_compression:row.factor,estimated_H100_weight_fit_count:window.DendriScaleMemory.estimate(row.registeredBytes),memory_estimate_assumptions:window.DendriScaleMemory.description(),method:row.method,measurements:row.measurements,
   original_status:row.gate_status,failed_gates:row.failed_gates,sizes:row.sizes,
   source_hashes:row.source_hashes},null,2);
  const link=byId('overviewOpen');link.hidden=!row.panel_id;
  link.onclick=()=>openComparison(row);
 }
 const models=[...new Set(rows.map(r=>r.model))].sort();
 for(const [value,label] of [['all','All models'],...models.map(m=>[m,m])]){
  const option=el('option',label);option.value=value;byId('overviewModel').append(option);
 }
 function draw(){
  const query=byId('overviewSearch').value.toLowerCase(),choice=byId('overviewVerdict').value;
  const filtered=rows.filter(r=>(byId('overviewModel').value==='all'||r.model===byId('overviewModel').value)&&
   (choice==='all'||outcome(r)===choice)&&JSON.stringify([r.label,r.model,r.cohort,r.method,r.measurements]).toLowerCase().includes(query));
  const visibleScales=byId('overviewModel').value==='all'?scales:[classify(byId('overviewModel').value)];
  const svg=byId('overviewPlot');svg.replaceChildren();
  const W=1200,L=110,R=820,top=60,lane=104,H=top+visibleScales.length*lane+55;
  const measured=filtered.filter(r=>r.factor!==null),max=Math.max(10,...measured.map(r=>r.factor));
  const min=Math.min(1,...measured.map(r=>r.factor));
  const X=value=>L+Math.log(value/min)/Math.log(max/min)*(R-L);
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
  for(const tick of [...new Set([min,1,2,3,4,6,8,10,max])].sort((a,b)=>a-b)){
   if(tick<min||tick>max)continue;
   svg.append(se('line',{x1:X(tick),x2:X(tick),y1:top-12,y2:H-50,stroke:'#dbe2ea'}),
    se('text',{x:X(tick),y:top-24,'text-anchor':'middle',class:'overview-label'},tick.toFixed(tick%1?1:0)+'×'));
  }
  svg.append(se('text',{x:(L+R)/2,y:18,'text-anchor':'middle',class:'overview-label'},'Whole-model compression · logarithmic scale'),
   se('text',{x:935,y:24,'text-anchor':'middle',class:'overview-label'},'Local / unmatched size'),
   se('text',{x:1110,y:24,'text-anchor':'middle',class:'overview-label'},'Awaiting quality'));
  let count=0;
  for(const [index,scale] of visibleScales.entries()){
   const y=top+index*lane,label=scale===null?'Other':scale+'B';
   svg.append(se('rect',{x:0,y:y-12,width:W,height:lane,fill:index%2?'#f5f7fa':'#fff'}));
   const originals=[...new Set(rows.filter(r=>r.scale===scale).map(r=>r.originalBytes).filter(Boolean))];
   if(originals.length===1)window.DendriScaleMemory.bands(svg,{prefix:'overview-'+index,left:L,right:R,top:y-12,height:lane,bytesToX:bytes=>X(originals[0]/bytes)});
   // Repaint guides over each band; status is position and text, never color alone.
   for(const tick of [1,2,4,6,10].filter(t=>t>=min&&t<=max))svg.append(se('line',{x1:X(tick),x2:X(tick),y1:y-12,y2:y+lane-12,stroke:'#e0e7ee'}));
   svg.append(se('text',{x:10,y:y+17,'font-size':20,'font-weight':700},label));
   for(const [status,offset,text] of [['passed',22,'Pass'],['failed',46,'Fail'],['other',70,'Other']]){
    svg.append(se('text',{x:74,y:y+offset+4,'text-anchor':'end','font-size':10,fill:'#526577'},text));
    const band=filtered.filter(r=>r.scale===scale&&outcome(r)===status);
    const buckets=new Map();
    for(const row of band){
     const awaiting=!row.measurements.length;
     const baseX=awaiting?1110:row.factor===null?935:X(row.factor);
     const inventory=awaiting||row.factor===null;
     const x=inventory?baseX-60+(band.filter(r=>awaiting?!r.measurements.length:r.measurements.length&&r.factor===null).indexOf(row)%16)*8:baseX;
     const key=Math.round(x/7),number=buckets.get(key)||0;buckets.set(key,number+1);
     // Vertical displacement only: numerical compression coordinates stay exact.
     const yy=y+offset+(number%3-1)*6;
     const marker=se('g',{class:'overview-point',tabindex:0,role:'button','data-candidate':row.id,
      'data-size-kind':awaiting?'pending':row.factor===null?'unmatched':'whole',
      'aria-label':`${label}; ${row.label}; ${row.factor===null?'whole-model size unmeasured':row.factor.toFixed(3)+' times compression'}; ${row.gate_status}`});
     marker.append(shapeMark(row.methodKey,x,yy,5),se('title',{},row.label+'\n'+row.model+'\n'+row.cohort+'\n'+row.measurements.map(m=>m.benchmark+': '+m.value).join('\n')));
     marker.addEventListener('click',()=>show(row));marker.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show(row);}});
     svg.append(marker);count++;
    }
   }
   if(!filtered.some(r=>r.scale===scale)){
    const status=pending.find(r=>r.scale_b===scale)?.status||'No recorded candidate in this filter';
    svg.append(se('text',{x:L,y:y+31,'font-size':12,fill:'#526577'},status));
   }
  }
  window.DendriScaleMemory.legend(svg,L,H-12);
  byId('overviewCount').textContent=count+' of '+rows.length+' candidate/cohort records shown. '+measured.length+
   ' have a measured whole-model factor; other scopes and missing quality use the separate columns. Each point retains all recorded benchmarks in its details.';
  byId('overviewLegend').replaceChildren();
  for(const key of [...new Set(filtered.map(r=>r.methodKey))]){
   const item=el('span');item.className='method-key';item.append(methodIcon(key),el('span',DATA.method_palette[key]?.label||'Unclassified'));byId('overviewLegend').append(item);
  }
 }
 document.addEventListener('dendriscale-memory',draw);
 byId('overviewModel').addEventListener('change',draw);byId('overviewVerdict').addEventListener('change',draw);
 byId('overviewSearch').addEventListener('input',draw);byId('monochrome').addEventListener('change',draw);
 byId('overviewMono').addEventListener('change',()=>{byId('monochrome').checked=byId('overviewMono').checked;byId('monochrome').dispatchEvent(new Event('change'));});
 byId('monochrome').addEventListener('change',()=>{byId('overviewMono').checked=byId('monochrome').checked;});
 byId('overviewMono').checked=byId('monochrome').checked;
 draw();
};
