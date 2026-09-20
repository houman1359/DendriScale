'use strict';
// Allocation illustrations only. Registered weights are not peak runtime memory.
window.DendriScaleMemory = (()=>{
 const NS='http://www.w3.org/2000/svg';
 const svg=(tag,attrs,text)=>{const node=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))node.setAttribute(k,v);if(text!==undefined)node.textContent=text;return node;};
 const colors=['#e6f1f7','#fce8cd','#e9e0f4','#dcece2','#f4dce4'];
 const ranges=[[0,1,'1 H100'],[1,2,'2 H100s'],[2,3,'3 H100s'],[3,4,'4 H100s'],[4,Infinity,'5+ H100s']];
 const settings=()=>{
  const capacity=Number(document.getElementById('gpuCapacity').value),reserve=Number(document.getElementById('gpuReserve').value);
  return {capacity,reserve,usable:(capacity-reserve)*1e9,valid:Number.isFinite(capacity)&&Number.isFinite(reserve)&&capacity>reserve&&reserve>=0,
   enabled:document.getElementById('gpuBands').checked,mono:document.getElementById('monochrome').checked};
 };
 function estimate(bytes){const s=settings();return s.valid&&Number.isFinite(bytes)&&bytes>0?Math.max(1,Math.ceil(bytes/s.usable)):null;}
 function bands(root,{prefix,left,right,top,height,bytesToX}){
  const s=settings();if(!s.enabled||!s.valid)return false;
  const defs=svg('defs',{});root.append(defs);
  ranges.forEach(([lo,hi,label],i)=>{
   const a=bytesToX(lo*s.usable),b=bytesToX(hi*s.usable);
   if(Number.isNaN(a)||Number.isNaN(b))return;
   const x=Math.max(left,Math.min(a,b)),end=Math.min(right,Math.max(a,b));if(end<=x)return;
   const id=prefix+'-memory-'+i,pattern=svg('pattern',{id,width:10,height:10,patternUnits:'userSpaceOnUse'});
   pattern.append(svg('rect',{width:10,height:10,fill:s.mono?'#f3f3f3':colors[i]}));
   if(i===1||i===3)pattern.append(svg('path',{d:'M0 10 L10 0',stroke:'#8895a1','stroke-opacity':.28,'stroke-width':.8}));
   if(i===2||i===4)pattern.append(svg('circle',{cx:3,cy:3,r:i===4?1.4:.8,fill:'#8895a1','fill-opacity':.35}));
   if(i===3)pattern.append(svg('path',{d:'M0 0 L10 10',stroke:'#8895a1','stroke-opacity':.28,'stroke-width':.8}));
   defs.append(pattern);root.append(svg('rect',{x,y:top,width:end-x,height,fill:`url(#${id})`,class:'memory-band','data-gpus':label}));
   if(end-x>65)root.append(svg('text',{x:x+7,y:top+14,'font-size':10,fill:'#475361',class:'memory-band-label'},label+'*'));
  });return true;
 }
 function legend(root,x,y){
  const s=settings();if(!s.enabled||!s.valid)return;
  ranges.forEach((range,i)=>{const xx=x+i*117;root.append(svg('rect',{x:xx,y:y-11,width:15,height:12,fill:s.mono?'#ededed':colors[i],stroke:'#8895a1'}),svg('text',{x:xx+21,y,'font-size':11,fill:'#475361'},range[2]+'*'));});
 }
 function description(){const s=settings();return s.valid?`H100 bands: ${s.capacity} GB/card − ${s.reserve} GB/card reserve. Counts use registered whole-model bytes; estimates assume ideal sharding, exclude measured KV/cache/activation/workspace costs, and are not verified run requirements.`:'Memory reserve must be nonnegative and smaller than card capacity.';}
 function panel(root,p,points,view){
  const originals=[...new Set(points.map(x=>x.whole_model_size?.original_registered_bytes).filter(Boolean))];
  const all=points.length&&points.every(x=>x.whole_model_size);
  let map=null;
  if(all&&originals.length===1&&p.xunit==='percent')map=bytes=>view.X(100*bytes/originals[0]);
  else if(all&&p.xunit==='bytes'&&points.every(x=>x.x===x.whole_model_size.registered_bytes))map=bytes=>view.X(bytes);
  else if(all&&originals.length===1&&p.xunit==='factor'&&points.every(x=>Math.abs(x.x-originals[0]/x.whole_model_size.registered_bytes)<1e-6))map=bytes=>view.X(originals[0]/bytes);
  document.getElementById('panelMemoryNote').textContent=map?description():'H100 bands unavailable: this panel does not have a verified whole-model byte mapping. Local cell bytes and ambiguous checkpoint sizes are not runtime memory.';
  if(map)bands(root,{...view,prefix:'detail',bytesToX:map});
 }
 function init(redraw){
  const update=()=>{document.getElementById('memoryNote').textContent=description();redraw();document.dispatchEvent(new Event('dendriscale-memory'));};
  for(const id of ['gpuBands','gpuCapacity','gpuReserve'])document.getElementById(id).addEventListener('change',update);
  document.getElementById('memoryNote').textContent=description();
 }
 return {bands,panel,estimate,settings,description,init,legend};
})();
