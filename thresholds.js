'use strict';
// Visual allowances only. Recorded full-suite verdicts remain in presentation.js.
// Scope and frozen tolerances are documented in METHODS.md; never borrow a
// teacher or tolerance from another model, cohort, or local diagnostic.
window.DendriScaleThresholds = (() => {
 const cohort='Curated: Current original H100 BF16/eager teacher: GSM948/1024, MC5292/6144. Same frozen full-development cohort after adaptive prefix selection.';
 const specs={
  'GSM correct / 1024':{teacher:948,loss:.05*1024,direction:'max',unit:'items',confidence:true},
  'MC correct / 6144':{teacher:5292,loss:.02*6144,direction:'max',unit:'items',confidence:false},
  'C4 NLL':{teacher:2.4649791930097593,loss:.1,direction:'min',unit:'nats/token',confidence:true},
  'Copy512 perplexity ratio':{teacher:1,loss:.25,direction:'min',unit:'ratio',confidence:false},
  'Copy2048 perplexity ratio':{teacher:1,loss:.5,direction:'min',unit:'ratio',confidence:false}
 };
 const unavailable=reason=>({available:false,reason});
 function forPanel(panel,multiplier=1){
  if(!panel || panel.model!=='allenai/OLMo-2-0325-32B-Instruct' || panel.cohort!==cohort || panel.source_level!=='curated')
   return unavailable('No verified threshold mapping for this evaluation cohort. Recorded pass verdicts still apply.');
  const spec=specs[panel.ylabel];
  if(!spec || panel.yunit!==spec.unit || panel.ydirection!==spec.direction)
   return unavailable('No separate gate for this readout. The recorded suite gates GSM, MC macro, C4 and the two copy lengths.');
  const teachers=panel.points.filter(p=>p.label==='Teacher reference');
  if(!teachers.length || teachers.some(p=>p.y!==spec.teacher))
   return unavailable('A matching teacher score is required to draw this threshold.');
  if(![1,1.25,1.5].includes(multiplier))return unavailable('Unknown exploratory tolerance.');
  const sign=spec.direction==='max'?-1:1;
  return {available:true,...spec,recorded:spec.teacher+sign*spec.loss,exploratory:spec.teacher+sign*spec.loss*multiplier,multiplier};
 }
 function forPooled(data,rows,multiplier=1){
  if(!rows.length)return unavailable('No displayed results to map to an evaluation threshold.');
  const scope=new Set(rows.map(p=>JSON.stringify([p.model,p.cohort,p.source_level,p.ylabel,p.displayUnit])));
  if(scope.size!==1)return unavailable('No shared threshold across these models or evaluation cohorts. Choose a matched comparison above.');
  const row=rows[0],panel=data.panels.find(p=>p.id===row.panel_id),band=forPanel(panel,multiplier);
  if(!band.available)return band;
  if(row.displayUnit===band.unit)return band;
  if(row.displayUnit==='%' && band.unit==='items'){
   const n=row.denominator?.n;
   if(!n || rows.some(p=>p.denominator?.n!==n))return unavailable('A consistent recorded sample size is required for a percentage threshold.');
   return {...band,recorded:100*band.recorded/n,exploratory:100*band.exploratory/n,teacher:100*band.teacher/n,loss:100*band.loss/n,unit:'%'};
  }
  return unavailable('No compatible score units for this threshold.');
 }
 const number=v=>Number(v.toFixed(4)).toLocaleString('en',{maximumFractionDigits:4});
 function description(band,shown=true){
  if(!shown)return 'Threshold shading is off. Full-suite pass labels still use recorded verdicts.';
  if(!band.available)return band.reason;
  return 'Solid shading: recorded score allowance '+(band.direction==='max'?'≥ ':'≤ ')+number(band.recorded)+' '+band.unit+'. '+
   (band.multiplier>1?'Hatched extension: exploratory +'+Math.round(100*(band.multiplier-1))+'% allowance, '+(band.direction==='max'?'≥ ':'≤ ')+number(band.exploratory)+' '+band.unit+'. ':'')+
   (band.confidence?'The actual gate also requires the paired 95% confidence bound; a point in the band can still fail. ':'This band covers this benchmark only. ')+
   'Check marks and the pass-only filter always use the original five-gate verdict.';
 }
 function draw(svg,se,band,{Y,L,T,right,bottom,monochrome=false,id='threshold'}){
  if(!band.available)return;
  const group=se('g',{class:'threshold-shading','pointer-events':'none','data-direction':band.direction,'data-recorded':band.recorded,'data-exploratory':band.exploratory});
  const defs=se('defs',{}),pattern=se('pattern',{id:id+'Hatch',width:8,height:8,patternUnits:'userSpaceOnUse'});
  pattern.append(se('path',{d:'M -2 2 L 2 -2 M 0 8 L 8 0 M 6 10 L 10 6',stroke:monochrome?'#858585':'#ba822f','stroke-width':.6}));defs.append(pattern);group.append(defs);
  const clamp=y=>Math.max(T,Math.min(bottom,y)),recorded=clamp(Y(band.recorded)),exploratory=clamp(Y(band.exploratory));
  const y=band.direction==='max'?T:recorded,h=band.direction==='max'?recorded-T:bottom-recorded;
  group.append(se('rect',{class:'recorded-band',x:L,y,width:right-L,height:Math.max(0,h),fill:monochrome?'#eeeeee':'#e9f3fa'}));
  if(band.multiplier>1){
   const attrs={x:L,y:Math.min(recorded,exploratory),width:right-L,height:Math.abs(recorded-exploratory)};
   group.append(se('rect',{...attrs,fill:monochrome?'#f8f8f8':'#fff4df'}),se('rect',{...attrs,class:'exploratory-band',fill:'url(#'+id+'Hatch)'}));
  }
  for(const [kind,value,label,dash] of [['recorded',band.recorded,'Recorded allowance','7 3'],...(band.multiplier>1?[['exploratory',band.exploratory,'Explore +'+Math.round(100*(band.multiplier-1))+'%','2 3']]:[])]){
   const yy=Y(value);if(yy<T || yy>bottom)continue;
   const color=monochrome?'#444':kind==='recorded'?'#346484':'#8b5c12';
   group.append(se('line',{class:kind+'-threshold',x1:L,y1:yy,x2:right,y2:yy,stroke:color,'stroke-width':1.2,'stroke-dasharray':dash,'data-threshold':value}));
   // Opposite sides keep close thresholds legible, including narrow zooms.
   const labelY=kind==='recorded'?Math.max(T+13,yy-6):Math.min(bottom-3,yy+14);
   group.append(se('text',{class:'threshold-label',x:right-8,y:labelY,'text-anchor':'end','font-size':11,fill:color,stroke:'white','stroke-width':3,'paint-order':'stroke'},label+' '+number(value)+' '+band.unit));
  }
  group.append(se('title',{},description(band)));svg.append(group);
 }
 return {forPanel,forPooled,description,draw};
})();
