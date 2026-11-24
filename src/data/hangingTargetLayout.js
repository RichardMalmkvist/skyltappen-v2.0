const {hangingSymbolKind,isGreenHanging,greenTargetsEnabled}=require('./hangingTargetRules');
const KEYS=['hangingTargetPosition','hangingTargetRows','hangingTargetRowAssignments','hangingSignWithoutText'];
function hangingTargetFields(form={}) {
 const assignments={};for(const [id,row] of Object.entries(form.hangingTargetRowAssignments||{}))assignments[id]=Number(row)===2?2:1;
 return {hangingTargetPosition:form.hangingTargetPosition==='left'?'left':'right',hangingTargetRows:Number(form.hangingTargetRows)===2?2:1,hangingTargetRowAssignments:assignments,hangingSignWithoutText:Boolean(form.hangingSignWithoutText)};
}
function hangingSymbolRatio(asset={}) {
 try{
  let image=String(asset.image||'');
  if(image.startsWith('data:image/svg+xml')){const comma=image.indexOf(',');image=/;base64/i.test(image.slice(0,comma))?(typeof atob==='function'?atob(image.slice(comma+1)):Buffer.from(image.slice(comma+1),'base64').toString('utf8')):decodeURIComponent(image.slice(comma+1));}
  const viewBox=image.match(/viewBox\s*=\s*["']([^"']+)["']/i)?.[1]?.trim().split(/[\s,]+/).map(Number);
  if(viewBox?.length===4&&viewBox[2]>0&&viewBox[3]>0)return viewBox[2]/viewBox[3];
 }catch{}
 return 1;
}
function hangingTargetLayout(product,form,symbols=[],{strict=true}={}) {
 const errors=[],problem=message=>{if(strict)throw new Error(message);errors.push(message);};
 const options=hangingTargetFields(form),rules=product.hangingSignRules||{},width=Number(product.hangingSignSizeMm||rules.widthMm||1500),height=Number(product.hangingSignHeightMm||rules.heightMm||(width>=1500?200:150));
 const large=width>=1500,size=large?117:70,gap=Number(rules.symbolGapMm)||5,edge=Number(rules.symbolRightMm)||(large?190:125),start=Number(rules.textStartMm)||(large?190:130);
 const double=(product.hangingSignTextMode||form.hangingSignTextMode)==='double'||String(product.articleNumber)==='0305';
 const rows=double?options.hangingTargetRows:1;
 const singleLineHeight=large?140:93;
 const symbolTop=((double?Math.min(height,singleLineHeight):height)-size)/2;
 if(rows===2&&height<symbolTop+2*size+gap)problem('Målpunkterna får inte plats i två rader på denna skylt.');
 // Preview, validation and production share the same per-row target limit.
 if(symbols.length>48)problem('Använd högst 48 symboler eller målpunkter per skylt.');
 const maxTargets=large?9:10,targetCounts=Array(rows).fill(0);
 for(const symbol of symbols){if(hangingSymbolKind(symbol)!=='target')continue;const row=rows===2?(options.hangingTargetRowAssignments[symbol.id]||1)-1:0;if(++targetCounts[row]>maxTargets){problem('Använd högst '+maxTargets+' målpunkter i bredd per rad på denna skylt.');break;}}
 const items=[],cursors=[width-edge,width-edge],leftCursors=[start,start];
 const ordered=rows===2?[...symbols.filter(s=>hangingSymbolKind(s)!=='target'),...symbols.filter(s=>hangingSymbolKind(s)==='target')]:symbols;
 for(const symbol of ordered){
  const target=hangingSymbolKind(symbol)==='target',row=target&&rows===2?(options.hangingTargetRowAssignments[symbol.id]||1)-1:0;
  const w=size*(Number(symbol.ratio)||1),left=target&&options.hangingTargetPosition==='left';
  const x=left?leftCursors[row]:cursors[row]-w;
  if(left)leftCursors[row]=x+w+gap;else cursors[row]=x-gap;
  if(rows===2&&!target)cursors[1]=cursors[0];
  const y=symbolTop+row*(size+gap);
  if(x<4||x+w>width-4)problem('Målpunkterna får inte plats på skyltens bredd.');
  items.push({...symbol,x,y,width:w,height:size,row:row+1,left});
 }
 for(const a of items)for(const b of items)if(a!==b&&a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y)problem('Symbolerna och målpunkterna överlappar. Välj färre eller ändra rad.');
 const leftEnd=Math.max(start,...items.filter(i=>i.left).map(i=>i.x+i.width+gap));
 const rightStart=Math.min(width,...items.filter(i=>!i.left).map(i=>i.x-gap));
 return {items,textStart:leftEnd,textRight:rightStart,width,height,error:errors[0]};
}
function hangingWithoutTextError(form={},assets=[]) {
 if(!form.hangingSignWithoutText)return null;
 const ids=Array.isArray(form.hangingSignSymbols)?form.hangingSignSymbols:[];
 return ids.some(id=>hangingSymbolKind(assets.find(a=>a.id===id)||{id})==='target')?null:'Välj minst en målpunkt när skylten saknar text.';
}
function hangingTargetError(product,form,assets=[]) {
 const ids=Array.isArray(form.hangingSignSymbols)?form.hangingSignSymbols:form.hangingSignSymbol&&form.hangingSignSymbol!=='none'?[form.hangingSignSymbol]:[];
 const symbols=ids.map(id=>({...assets.find(a=>a.id===id),id})).filter(asset=>!isGreenHanging(product)||(greenTargetsEnabled(product)&&hangingSymbolKind(asset)==='target'));
 const missing=hangingWithoutTextError({...form,hangingSignSymbols:symbols.map(s=>s.id)},symbols);if(missing)return missing;
 try{hangingTargetLayout(product,form,symbols.map(a=>({...a,ratio:hangingSymbolRatio(a)})));return null;}catch(error){return error.message;}
}
module.exports={HANGING_TARGET_KEYS:KEYS,hangingTargetFields,hangingSymbolRatio,hangingTargetLayout,hangingWithoutTextError,hangingTargetError};
