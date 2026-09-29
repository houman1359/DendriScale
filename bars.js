'use strict';
// Benchmark bars are an additional view. They do not alter observations or gates.
window.DendriScaleBars = function(DATA,{el,se}) {
 const UI=window.DendriScaleUI,byId=id=>document.getElementById(id);
 const styles={teacher:['Original / teacher','#222222','none'],dendritic:['Dendritic','#0072B2','diagonal'],
  hybrid:['Dendritic + quantization','#B64A00','cross'],control:['Quantization / pruning / deletion','#6842A0','horizontal'],
  dense:['Dense / low-rank replacement','#006B57','dots'],ternary:['Ternary (Prism)','#007B83','vertical'],
  binary:['Binary (Prism)','#A32972','diagonal'],external:['Other published method','#595959','dots'],unknown:['Method unspecified','#595959','dots']};
 function method(p){
  if(p.method_style?.key==='teacher'||p.label==='Teacher reference')return 'teacher';
  if(/ternary/i.test(p.label))return 'ternary';
  if(/binary|(?:1|one).bit.*bonsai|bonsai.*(?:1|one).bit/i.test(p.label))return 'binary';
  if(p.method_style?.key==='external'&&/IQ\d|Q\d_|GPTQ|AWQ|quantiz/i.test(p.label))return 'control';
  return styles[p.method_style?.key]?p.method_style.key:'unknown';
 }
 function metric(p){
  const label=p.ylabel.replace(/\s*\(%\)\s*$/,'').replace(/\s*\/\s*[\d,]+$/,'');
  if(/^GSM(?:8K)? (correct|accuracy)/i.test(label)||/^GSM8K$/i.test(label))return 'GSM8K';
  if(/^MC (correct|macro accuracy)/i.test(label))return 'Multiple choice';
  if(/^(arc_challenge|arc_easy|boolq|piqa|hellaswag|winogrande) (correct|accuracy)$/i.test(label))return label.replace(/ (correct|accuracy)$/i,' accuracy');
  return label;
 }
 function size(p){
  const bytes=p.whole_model_size?.registered_bytes;
  if(p.source_level==='external-reported')return {bytes:bytes??(p.xunit==='bytes'?p.x:null),basis:'published size'};
  if(/publisher-reported packed size/i.test(p.label)&&p.xunit==='bytes')return {bytes:p.x,basis:'published packed size'};
  if(p.xaxis==='projected_format_bytes')return {bytes:p.x,basis:'projected format'};
  if(p.xaxis==='weight_file_bytes')return {bytes:p.x,basis:'weight files'};
  if(bytes>0)return {bytes,basis:'registered model'};
  if(p.xaxis==='whole_registered_bytes'&&p.xunit==='bytes')return {bytes:p.x,basis:'registered model'};
  return {bytes:null,basis:'size not measured'};
 }
 const seen=new Set(),rows=[];
 for(const panel of [...DATA.panels].sort((a,b)=>(a.xunit==='bytes'?0:1)-(b.xunit==='bytes'?0:1)))for(const p of panel.points){
  if(p.source_level==='local'||p.execution!=='completed'||!Number.isFinite(p.y)||p.ydirection!=='max')continue;
  let y=p.y,n=null;
  if(p.yunit==='fraction')y*=100;
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
  if(y<0||y>100)continue;
  const key=JSON.stringify([p.id.replace(/__whole_percent$/,''),p.model,p.cohort,p.ylabel,p.y]);
  if(seen.has(key))continue;seen.add(key);
  rows.push({...p,score:y,n,benchmark:metric(p),size:size(p),method:method(p),published:p.source_level==='external-reported'});
 }
 function details(r){
  const target=byId('barsDetail');target.replaceChildren(el('h3',UI.candidateName(r.label)),el('p',UI.modelName(r.model)));
  const dl=el('dl');dl.className='bar-facts';
  for(const [k,v] of [['Benchmark',r.benchmark+' · '+r.score.toFixed(2)+'%'],['Method',styles[r.method][0]],
   ['Model size',r.size.bytes>0?(r.size.bytes/1e9).toFixed(3)+' GB · '+r.size.basis:r.size.basis],
   ['Evidence',r.published?'Published result · not reproduced':'DendriScale measurement'],['Protocol',r.cohort],
   ['Sample size',r.n||'See benchmark protocol'],['Original verdict',r.gate_status],['Conditions',r.conditions],['Limitations',r.limitations],['Source hashes',(r.source_hashes||[]).join(', ')]]){
   dl.append(el('dt',k),el('dd',String(v||'Not recorded')));
  }
  target.append(dl);byId('barsDetails').showModal();
 }
 const categories=[['reasoning','Reasoning & mathematics'],['knowledge','Knowledge & understanding'],['coding','Coding'],['instruction','Instructions & tool use'],['vision','Vision & documents'],['summary','Published averages'],['diagnostics','Stopping & diagnostics']];
 function category(m){
  if(/GSM|MATH|AIME|MuSR/i.test(m))return 'reasoning';
  if(/code|HumanEval|MBPP|SWE|Terminal/i.test(m))return 'coding';
  if(/IFEval|IFBench|BFCL|τ|tau/i.test(m))return 'instruction';
  if(/OCR|CharXiv|VQA|DocBench|MMMU|RealWorldQA/i.test(m))return 'vision';
  if(/Average/i.test(m))return 'summary';
  if(/MMLU|GPQA|LCR|Multiple choice|boolq|piqa|hellaswag|arc_|winogrande/i.test(m))return 'knowledge';
  return 'diagnostics';
 }
 const friendly={'Multiple choice':'General knowledge · six tasks','arc_challenge accuracy':'ARC Challenge','arc_easy accuracy':'ARC Easy','boolq accuracy':'BoolQ','piqa accuracy':'PIQA','hellaswag accuracy':'HellaSwag','winogrande accuracy':'WinoGrande'};
 const metrics=[...new Set(rows.map(r=>r.benchmark))].sort((a,b)=>(a==='GSM8K'?-1:b==='GSM8K'?1:a==='Multiple choice'?-1:b==='Multiple choice'?1:a.localeCompare(b)));
 const states=new Map();let evidence='all',serial=0;
 const button=(text,fn)=>{const b=el('button',text);b.type='button';b.onclick=fn;return b;};
 const order=['teacher','dendritic','hybrid','control','dense','ternary','binary','external','unknown'];
 function compare(a,b){return UI.modelName(a.model).localeCompare(UI.modelName(b.model))||order.indexOf(a.method)-order.indexOf(b.method)||(a.size.bytes??Infinity)-(b.size.bytes??Infinity)||a.label.localeCompare(b.label);}
 function defaultCohort(groups){
  // Deterministic presentation choice, never based on passing, quality or score.
  return [...groups].sort((a,b)=>{
   const priority=x=>/Native-first BF16|staged BF16 ladder/.test(x[0])?-1:x[1].some(r=>/Qwen3-8B/.test(r.model))?0:x[1].some(r=>/OLMo.*32B/.test(r.model))?1:2;
   return priority(a)-priority(b)||b[1].length-a[1].length||a[0].localeCompare(b[0]);
  })[0]?.[0];
 }
 function download(svg,name){const copy=svg.cloneNode(true);copy.setAttribute('xmlns','http://www.w3.org/2000/svg');const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)],{type:'image/svg+xml'}));const a=el('a');a.href=url;a.download=name+'.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function legend(){
  const root=byId('barsMethodLegend');root.replaceChildren();
  for(const key of order.filter(k=>rows.some(r=>r.method===k))){const item=el('span');item.className='bar-method-key';const swatch=el('span');swatch.className='bar-swatch '+styles[key][2];swatch.style.setProperty('--method-color',byId('monochrome').checked?'#222':styles[key][1]);item.append(swatch,el('span',styles[key][0]));root.append(item);}
 }
 function plot(svg,chosen,id,title,cohort){
  const width=Math.max(530,chosen.length*136+64),height=470,top=54,bottom=240,mono=byId('monochrome').checked;
  svg.replaceChildren();svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.setAttribute('width',width);svg.setAttribute('height',height);
  svg.append(se('rect',{width,height,fill:'white'}),se('text',{x:40,y:22,'font-family':'sans-serif','font-size':14,fill:'#263746'},title+' · score (%)'));
  const defs=se('defs',{});svg.append(defs);
  for(const key of new Set(chosen.map(r=>r.method))){
   const [label,color,pattern]=styles[key],ink=mono?'#222222':color,pat=se('pattern',{id:id+'-'+key,width:8,height:8,patternUnits:'userSpaceOnUse'});
   pat.append(se('rect',{width:8,height:8,fill:ink}));
   if(pattern==='dots')pat.append(se('circle',{cx:4,cy:4,r:1.3,fill:'white'}));
   else if(pattern!=='none')pat.append(se('path',{d:pattern==='horizontal'?'M0 4H8':pattern==='vertical'?'M4 0V8':pattern==='cross'?'M0 0L8 8M8 0L0 8':'M-2 2L2 -2M0 8L8 0M6 10L10 6',stroke:'white','stroke-width':1,opacity:.75}));
   defs.append(pat);
  }
  for(let value=0;value<=100;value+=25){const y=bottom-(bottom-top)*value/100;svg.append(se('line',{x1:40,x2:width-10,y1:y,y2:y,stroke:'#dce2e8'}),se('text',{x:33,y:y+4,'text-anchor':'end','font-size':11,fill:'#526476'},String(value)));}
  const wrap=(text,limit=19)=>{const lines=[];let line='';for(const word of text.split(/\s+/)){if(line.length+word.length+1>limit&&line){lines.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)lines.push(line);return lines;};
  chosen.forEach((r,i)=>{
   const slot=(width-55)/Math.max(1,chosen.length),x=40+slot*(i+.5),y=bottom-(bottom-top)*r.score/100,sizeLabel=r.size.bytes?(r.size.bytes/1e9).toFixed(2)+' GB':'Size unavailable';
   const g=se('g',{tabindex:0,role:'button','aria-label':r.label+', '+r.model+', '+r.score.toFixed(2)+'%, '+sizeLabel+' · '+r.size.basis,'data-method':r.method,'data-model':r.model,'data-provenance':r.published?'published':'measured','data-size-basis':r.size.basis});
   g.append(se('title',{},r.label+' · '+r.model+'\n'+cohort+'\n'+r.conditions));
   g.append(se('rect',{x:x-28,y,width:56,height:Math.max(1,bottom-y),fill:'url(#'+id+'-'+r.method+')',stroke:'#202b35','stroke-width':.6}),se('text',{x,y:y-8,'text-anchor':'middle','font-size':15,'font-weight':650,fill:'#151515'},r.score.toFixed(1)));
   const label=(text,yy,fs=11,weight=400)=>g.append(se('text',{x,y:yy,'text-anchor':'middle','font-size':fs,'font-weight':weight,fill:'#263746'},text));
   wrap(UI.modelName(r.model)).slice(0,2).forEach((t,j)=>label(t,258+j*14,11,650));
   wrap(UI.candidateName(r.label)).slice(0,3).forEach((t,j)=>label(t,293+j*14));
   label(sizeLabel,346,13,650);label(r.size.basis,362,10);
   wrap(styles[r.method][0]).slice(0,2).forEach((t,j)=>label(t,386+j*14,10));
   if(UI.allBenchmarksPass(r))label('✓ Development gates',423,10,650);
   g.addEventListener('click',()=>details(r));g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();details(r);}});svg.append(g);
  });
  svg.append(se('text',{x:40,y:453,'font-size':10,fill:'#526476'},'Whole-model GB · click a bar for full labels, protocol and evidence.'));
 }
 function card(metric,published,items){
  const key=metric+'|'+published,groups=new Map();for(const r of items){if(!groups.has(r.cohort))groups.set(r.cohort,[]);groups.get(r.cohort).push(r);}
  const st=states.get(key)||{cohort:defaultCohort(groups),page:0};states.set(key,st);if(!groups.has(st.cohort)){st.cohort=defaultCohort(groups);st.page=0;}
  const root=el('article');root.className='benchmark-card';root.dataset.benchmark=metric;root.dataset.evidence=published?'published':'measured';
  const head=el('div');head.className='benchmark-card-heading';const title=el('h4',friendly[metric]||metric),badge=el('span',published?'Published · not reproduced':'Measured by DendriScale');badge.className='badge '+(published?'published-badge':'neutral');head.append(title,badge);root.append(head);
  const chart=se('svg',{role:'group','aria-label':metric+' benchmark bars'}),scroll=el('div');scroll.className='plot-scroll';scroll.append(chart);
  const note=el('p');note.className='bar-cohort small';const controls=el('div');controls.className='bar-card-controls';
  const prev=button('←',()=>{st.page--;render();}),next=button('→',()=>{st.page++;render();}),count=el('span');count.className='small muted';prev.setAttribute('aria-label','Previous results for '+metric);next.setAttribute('aria-label','Next results for '+metric);
  const exportButton=button('SVG ↓',()=>download(chart,'dendriscale-'+metric.replace(/[^a-z0-9]/gi,'-')));exportButton.className='quiet-button';
  controls.append(count,prev,next,exportButton);
  const protocolChoices=el('details');protocolChoices.className='bar-protocols';protocolChoices.append(el('summary',groups.size+' evaluation '+(groups.size===1?'group':'groups')+' · protocol details'));
  const choices=el('div');choices.className='protocol-buttons';
  for(const [cohort,rs] of groups){const b=button(UI.modelName(rs[0].model)+' · '+rs.length+' results — '+cohort,()=>{st.cohort=cohort;st.page=0;render();});b.dataset.cohort=cohort;choices.append(b);}protocolChoices.append(choices);root.append(note,scroll,controls,protocolChoices);
  function render(){const all=groups.get(st.cohort).slice().sort(compare),pages=Math.max(1,Math.ceil(all.length/12));st.page=Math.max(0,Math.min(st.page,pages-1));
   note.textContent=[...new Set(all.map(r=>UI.modelName(r.model)))].join(' · ');note.title=st.cohort;
   const protocolText=el('span',st.cohort);protocolText.className='bar-protocol-preview';note.append(protocolText);
   root.dataset.cohort=st.cohort;count.textContent=all.length+' results'+(pages>1?' · page '+(st.page+1)+'/'+pages:'');prev.hidden=next.hidden=pages===1;prev.disabled=!st.page;next.disabled=st.page===pages-1;
   for(const b of choices.children)b.setAttribute('aria-pressed',String(b.dataset.cohort===st.cohort));
   plot(chart,all.slice(st.page*12,(st.page+1)*12),'benchmark-'+(++serial),metric,st.cohort);
  }render();return root;
 }
 function draw(){
  const query=byId('barsSearch').value.toLowerCase(),filtered=rows.filter(r=>(evidence==='all'||r.published===(evidence==='published'))&&(!query||[r.model,r.label,r.benchmark,styles[r.method][0]].join(' ').toLowerCase().includes(query)));
  const root=byId('barsGrid'),jump=byId('barsJump');root.replaceChildren();jump.replaceChildren();legend();
  byId('barsCount').textContent=filtered.length+' recorded scores · '+new Set(filtered.map(r=>r.benchmark)).size+' benchmarks. Comparison groups keep their original evaluation protocols.';
  for(const [id,title] of categories){const names=metrics.filter(m=>category(m)===id&&filtered.some(r=>r.benchmark===m));if(!names.length)continue;
   const section=el('section');section.className='benchmark-category';section.id='benchmarks-'+id;section.append(el('h3',title));const grid=el('div');grid.className='benchmark-card-grid';
   for(const m of names)for(const published of [false,true]){const selected=filtered.filter(r=>r.benchmark===m&&r.published===published);if(selected.length)grid.append(card(m,published,selected));}
   section.append(grid);root.append(section);const a=el('a',title);a.href='#benchmarks-'+id;jump.append(a);
  }
  if(!filtered.length)root.append(el('p','No recorded results match this search. Missing benchmark scores are never shown as zero.'));
 }
 for(const b of document.querySelectorAll('[data-evidence]'))b.onclick=()=>{evidence=b.dataset.evidence;for(const x of document.querySelectorAll('.evidence-buttons button'))x.setAttribute('aria-pressed',String(x===b));draw();};
 byId('barsSearch').addEventListener('input',draw);
 byId('barsMonochrome').checked=byId('monochrome').checked;
 byId('barsMonochrome').onchange=()=>{byId('monochrome').checked=byId('barsMonochrome').checked;byId('monochrome').dispatchEvent(new Event('change'));};
 byId('monochrome').addEventListener('change',()=>{byId('barsMonochrome').checked=byId('monochrome').checked;draw();});
 byId('barsClose').onclick=()=>byId('barsDetails').close();
 byId('barsDetails').onclick=e=>{if(e.target===byId('barsDetails'))byId('barsDetails').close();};
 draw();
};
