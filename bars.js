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
  if(/binary|1.bit.*bonsai|bonsai.*1.bit/i.test(p.label))return 'binary';
  if(p.method_style?.key==='external'&&/IQ\d|Q\d_|GPTQ|AWQ|quantiz/i.test(p.label))return 'control';
  return styles[p.method_style?.key]?p.method_style.key:'unknown';
 }
 function metric(p){
  const label=p.ylabel.replace(/\s*\(%\)\s*$/,'').replace(/\s*\/\s*[\d,]+$/,'');
  if(/^GSM(?:8K)? (correct|accuracy)/i.test(label)||/^GSM8K$/i.test(label))return 'GSM8K';
  if(/^MC (correct|macro accuracy)/i.test(label))return 'Multiple choice';
  return label;
 }
 function size(p){
  const bytes=p.whole_model_size?.registered_bytes;
  if(p.source_level==='external-reported')return {bytes:bytes??(p.xunit==='bytes'?p.x:null),basis:'published size'};
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
 const option=(value,text)=>{const o=el('option',text);o.value=value;return o;};
 const metrics=[...new Set(rows.map(r=>r.benchmark))].sort((a,b)=>a==='GSM8K'?-1:b==='GSM8K'?1:a.localeCompare(b));
 for(const m of metrics)byId('barsBenchmark').append(option(m,m));
 let page=0,lastRows=[];
 function eligible(){return rows.filter(r=>r.benchmark===byId('barsBenchmark').value&&
  (byId('barsSource').value==='all'||r.published===(byId('barsSource').value==='published')));}
 function protocols(){
  const previous=byId('barsProtocol').value,all=eligible(),cohorts=[...new Set(all.map(r=>r.cohort))];
  byId('barsProtocol').replaceChildren(option('*','All protocols · descriptive comparison only'));
  for(const c of cohorts.sort())byId('barsProtocol').append(option(c,c));
  byId('barsProtocol').value=cohorts.includes(previous)?previous:(cohorts.find(c=>/Qwen3.8-27B|whitepaper.*xhigh/i.test(c))||cohorts[0]||'*');
  page=0;draw();
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
  target.append(dl);byId('barsDetails').open=true;
 }
 function draw(){
  const cohort=byId('barsProtocol').value,search=byId('barsSearch').value.toLowerCase();
  const selected=eligible().filter(r=>(cohort==='*'||r.cohort===cohort)&&(!search||[r.model,r.label,styles[r.method][0]].join(' ').toLowerCase().includes(search)));
  selected.sort((a,b)=>a.model.localeCompare(b.model)||(a.size.bytes??Infinity)-(b.size.bytes??Infinity)||a.label.localeCompare(b.label));
  const pages=Math.max(1,Math.ceil(selected.length/18));page=Math.min(page,pages-1);lastRows=selected.slice(page*18,(page+1)*18);
  byId('barsCount').textContent=selected.length+' results · page '+(page+1)+' of '+pages;
  byId('barsPrevious').disabled=page===0;byId('barsNext').disabled=page===pages-1;
  byId('barsProtocolNote').textContent=cohort==='*'?'Different protocols are shown together for orientation only. Prompting, thinking budgets, sample counts and scoring differ; bar heights do not establish a matched comparison. Select a protocol for a matched view.':cohort+'. Published scores and our measurements retain their own provenance. Development pass marks are not certification on the Prism suite.';
  const svg=byId('barsPlot'),width=Math.max(1100,100+lastRows.length*180),height=740,top=130,bottom=425;
  svg.replaceChildren();svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.setAttribute('width',width);svg.setAttribute('height',height);
  svg.append(se('rect',{width,height,fill:'white'}),se('text',{x:64,y:28,fill:'#151515','font-size':20,'font-family':'sans-serif'},byId('barsBenchmark').value+' · score (%)'));
  svg.append(se('text',{x:64,y:50,fill:'#454545','font-size':12,'font-family':'sans-serif'},cohort==='*'?'Mixed protocols · descriptive only':cohort));
  const defs=se('defs',{}),mono=byId('monochrome').checked;svg.append(defs);
  const keys=[...new Set(lastRows.map(r=>r.method))];
  keys.forEach((key,i)=>{
   const [label,color,pattern]=styles[key],ink=mono?'#222222':color;
   const pat=se('pattern',{id:'bars-'+key,width:8,height:8,patternUnits:'userSpaceOnUse'});pat.append(se('rect',{width:8,height:8,fill:ink}));
   if(pattern==='dots')pat.append(se('circle',{cx:4,cy:4,r:1.3,fill:'white'}));
   else if(pattern!=='none')pat.append(se('path',{d:pattern==='horizontal'?'M0 4H8':pattern==='vertical'?'M4 0V8':pattern==='cross'?'M0 0L8 8M8 0L0 8':'M-2 2L2 -2M0 8L8 0M6 10L10 6',stroke:'white','stroke-width':1,opacity:0.75}));
   defs.append(pat);
   svg.append(se('rect',{x:64+(i%4)*225,y:67+Math.floor(i/4)*24,width:16,height:16,fill:'url(#bars-'+key+')'}),se('text',{x:86+(i%4)*225,y:80+Math.floor(i/4)*24,'font-size':12,fill:'#151515','font-family':'sans-serif'},label));
  });
  for(let value=0;value<=100;value+=20){const y=bottom-(bottom-top)*value/100;svg.append(se('line',{x1:64,x2:width-20,y1:y,y2:y,stroke:'#dce2e8'}),se('text',{x:53,y:y+4,'text-anchor':'end','font-size':12,fill:'#454545'},String(value)));}
  const wrap=(text,limit=25)=>{const lines=[];let line='';for(const word of text.split(/\s+/)){if(line.length+word.length+1>limit&&line){lines.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)lines.push(line);return lines;};
  lastRows.forEach((r,i)=>{
   const slot=(width-100)/Math.max(1,lastRows.length),x=64+slot*(i+.5),y=bottom-(bottom-top)*r.score/100;
   const g=se('g',{tabindex:0,role:'button','aria-label':r.label+', '+r.model+', '+r.score.toFixed(2)+'%, '+(r.size.bytes?(r.size.bytes/1e9).toFixed(3)+' GB · '+r.size.basis:r.size.basis),'data-method':r.method,'data-provenance':r.published?'published':'measured','data-size-basis':r.size.basis});
   g.append(se('title',{},r.label+' · '+r.model+'\n'+r.cohort+'\n'+r.conditions));
   g.append(se('rect',{x:x-38,y,width:76,height:Math.max(1,bottom-y),fill:'url(#bars-'+r.method+')',stroke:'#202b35','stroke-width':0.6}),se('text',{x,y:y-9,'text-anchor':'middle','font-size':15,'font-weight':650,fill:'#151515'},r.score.toFixed(1)));
   const lines=[...wrap(UI.modelName(r.model).replace(/^Qwen\//,'')).slice(0,2),...wrap(UI.candidateName(r.label)).slice(0,3)];
   lines.forEach((line,j)=>g.append(se('text',{x,y:448+j*16,'text-anchor':'middle','font-size':11,fill:'#202b35'},line)));
   g.append(se('text',{x,y:543,'text-anchor':'middle','font-size':13,'font-weight':650,fill:'#151515'},r.size.bytes?(r.size.bytes/1e9).toFixed(3)+' GB':'Size unavailable'));
   g.append(se('text',{x,y:560,'text-anchor':'middle','font-size':11,fill:'#454545'},r.size.basis));
   wrap(styles[r.method][0]).forEach((line,j)=>g.append(se('text',{x,y:585+j*15,'text-anchor':'middle','font-size':11,fill:'#151515'},line)));
   g.append(se('text',{x,y:628,'text-anchor':'middle','font-size':11,fill:'#454545'},r.published?'Published · not reproduced':'Measured here'));
   if(UI.allBenchmarksPass(r))g.append(se('text',{x,y:648,'text-anchor':'middle','font-size':11,fill:'#151515'},'✓ Five development gates'));
   g.addEventListener('click',()=>details(r));g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();details(r);}});svg.append(g);
  });
  svg.append(se('text',{x:64,y:689,'font-size':12,fill:'#454545'},'GB = decimal gigabytes. Registered, projected and published sizes are labeled separately. Colors + patterns identify methods.'));
  svg.append(se('text',{x:64,y:710,'font-size':12,fill:'#454545'},'Missing benchmark scores are not plotted as zero. Original verdicts and source details remain available on each bar.'));
  if(!lastRows.length)svg.append(se('text',{x:100,y:250,'font-size':18},'No recorded scores match these filters.'));
 }
 for(const id of ['barsBenchmark','barsSource'])byId(id).addEventListener('change',protocols);
 byId('barsProtocol').addEventListener('change',()=>{page=0;draw();});byId('barsSearch').addEventListener('input',()=>{page=0;draw();});
 byId('monochrome').addEventListener('change',draw);
 byId('barsPrevious').onclick=()=>{page--;draw();};byId('barsNext').onclick=()=>{page++;draw();};
 byId('barsExport').onclick=()=>{const copy=byId('barsPlot').cloneNode(true);copy.setAttribute('xmlns','http://www.w3.org/2000/svg');const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)],{type:'image/svg+xml'}));const a=el('a');a.href=url;a.download='dendriscale-benchmarks.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 protocols();
};
