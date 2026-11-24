const {roadSignModel}=require('./roadSignModels');
const {isParkingPole,poleError}=require('./parkingPole');
const {roadAssemblyLayout,roadAssemblyError}=require('./roadSignAssembly');
const isStackable=product=>Boolean(roadSignModel(product))||isParkingPole(product)||isHanging(product);
const MAX_STACK_SIGNS=8;
const isHanging=product=>product?.productType==='pendlad_skylt'||product?.previewType==='hanging_sign';
function withoutHangingStack(form={}){const {hangingStack,...rest}=form;return rest;}
function hangingStackEntries(product,form={},articles=[],{preferSaved=false}={}){
 return [{id:'primary',product,form:withoutHangingStack(form)},...(form.hangingStack?.items||[]).map(item=>({
  id:item.id,
  product:(preferSaved&&item.product)||articles.find(a=>String(a.id)===String(item.articleId))||item.product||null,
  form:withoutHangingStack(item.configuration||{})
 }))];
}
function hangingProductSnapshot(product){return Object.fromEntries(Object.entries(product||{}).filter(([key])=>['id','articleNumber','name','categoryId','productType','previewType','fields','unitPrice','price','format','roadSignModel','roadSignWidthMm','roadSignVariableWidth','roadSignHeightMm','roadSignCustomSize','roadSignBlank','roadSupplementCustomSize','roadSupplementLegacySizes','roadSignEditableText','roadSupplementVariant','dibondConfig','defaultSignArtwork'].includes(key)||key.startsWith('hangingSign')));}
function hangingDimensions(product={}){return {width:Number(product.hangingSignSizeMm||product.hangingSignRules?.widthMm)||1500,height:Number(product.hangingSignHeightMm||product.hangingSignRules?.heightMm)||140};}
function hangingStackFormat(product,form,articles=[]){if(roadSignModel(product)){const layout=roadAssemblyLayout(hangingStackEntries(product,form,articles),form.hangingStack?.gapMm??10,form.roadAssemblyTopMm??100);return layout.width+" × "+layout.height+" mm · "+layout.panels.length+" skyltar";}const entries=hangingStackEntries(product,form,articles),sizes=entries.map(e=>hangingDimensions(e.product));return Math.max(...sizes.map(s=>s.width))+' × '+(sizes.reduce((sum,s)=>sum+s.height,0)+(sizes.length-1)*Number(form.hangingStack?.gapMm??10))+' mm · '+entries.length+' skyltar';}
function repackHangingStack(entries,gapMm=10){const [first,...rest]=entries;return {product:first.product,form:{...withoutHangingStack(first.form),...(rest.length?{hangingStack:{gapMm,items:rest.map(entry=>({id:entry.id==='primary'?'part-'+Math.random().toString(36).slice(2):entry.id,articleId:entry.product.id,product:hangingProductSnapshot(entry.product),configuration:withoutHangingStack(entry.form)}))}}:{})}};}
function expandHangingStackMarkers(markers,articles=[]){return markers.flatMap(marker=>{
 const form=marker.configuration||{};if(!form.hangingStack?.items?.length)return [marker];
 const product=articles.find(a=>String(a.id)===String(marker.articleId)||String(a.articleNumber)===String(marker.articleId));
 const entries=hangingStackEntries(product,form,articles);
 if(roadSignModel(product)){
  const poles=entries.filter(e=>isParkingPole(e.product));
  if(poles.length>1)throw new Error('Använd en stolpe per skyltpaket.');
  if(poles.some(e=>poleError(e.form)))throw new Error('Ange en giltig stolphöjd.');
  const top=Number(form.roadAssemblyTopMm??100),layout=roadAssemblyLayout(entries,form.hangingStack.gapMm,top);
  const issue=roadAssemblyError(layout);if(issue)throw new Error(issue);
  if(!Number.isFinite(top)||top<0||(layout.pole&&layout.panels.some(p=>p.y+p.height>layout.height)))throw new Error('Skyltarna måste rymmas på stolpen.');
 }
 if(entries.some(e=>!e.product||(roadSignModel(product)?!roadSignModel(e.product)&&!isParkingPole(e.product):!isHanging(e.product))))throw new Error('Någon artikel i skyltpaketet saknas eller är inte en pendlad skylt.');
 return entries.map((entry,index)=>({...marker,id:index?marker.id+'::'+entry.id:marker.id,articleId:entry.product.id,...(isParkingPole(entry.product)?{quantity:Number(marker.quantity??1)*Number(entry.form.poleCount??1)}:{}),text:[entry.form.customText,entry.form.customTextLine1,entry.form.customTextLine2].filter(Boolean).join(' / '),configuration:{...entry.form,hangingPackageOrder:index+1,hangingPackageSize:entries.length},...(index?{price:undefined,name:undefined,description:undefined}:{}),notes:[marker.notes,'Skylt '+(index+1)+' av '+entries.length+' i samma upphängning'].filter(Boolean).join(' · ')}));
 });}
function validateProjectConfiguration(configuration){
 if(!configuration||typeof configuration!=='object'||Array.isArray(configuration))throw new Error('Ogiltiga produktuppgifter.');
 const stack=configuration.hangingStack;
 if(stack!==undefined&&(!stack||!Array.isArray(stack.items)||stack.items.length>MAX_STACK_SIGNS-1||!Number.isFinite(Number(stack.gapMm))||Number(stack.gapMm)<0||Number(stack.gapMm)>500))throw new Error('Skyltpaketet får innehålla högst 8 skyltar och ett mellanrum på 0–500 mm.');
 const entries=[configuration,...(stack?.items||[]).map(item=>{
  if(!item||typeof item.id!=='string'||!item.id||typeof item.articleId!=='string'||!item.articleId||!item.configuration||typeof item.configuration!=='object'||Array.isArray(item.configuration)||item.configuration.hangingStack)throw new Error('Ogiltig skylt i skyltpaketet.');
  if(item.product&&JSON.stringify(item.product).length>12000)throw new Error('Artikeluppgifterna i skyltpaketet är för stora.');
  return item.configuration;
 })];
 if(stack&&new Set(stack.items.map(i=>i.id)).size!==stack.items.length)throw new Error('Skyltpaketet innehåller dubbla skylt-id.');
 let imageLength=0;
 for(const form of entries){const {hangingSignSymbolAssets,hangingStack,...base}=form;
  for(const key of ['elevatorBoard','elevatorSourceBoard','otBoard','otSourceBoard']){
   const board=base[key];
   if(!board||board.uploadedArtwork)continue;
   if(JSON.stringify(board).length>100000)throw new Error('Tavlans produktuppgifter är för stora.');
   delete base[key];
  }
  if(JSON.stringify(base).length>12000)throw new Error('Skyltens produktuppgifter är för stora.');
  if(hangingSignSymbolAssets!==undefined){if(!Array.isArray(hangingSignSymbolAssets)||hangingSignSymbolAssets.length>48)throw new Error('Använd högst 48 symbolbilder per skylt.');
   for(const asset of hangingSignSymbolAssets){if(!asset||typeof asset.image!=='string'||asset.image.length>7*1024*1024)throw new Error('En symbolbild är för stor eller ogiltig. Använd en bild under 5 MB.');imageLength+=asset.image.length;}
  }
 }
 if(imageLength>28*1024*1024)throw new Error('Symbolbilderna i skylten eller skyltpaketet är för stora tillsammans. Minska bildernas filstorlek.');
}
module.exports={MAX_STACK_SIGNS,isStackable,isHanging,withoutHangingStack,hangingStackEntries,hangingProductSnapshot,hangingDimensions,hangingStackFormat,repackHangingStack,expandHangingStackMarkers,validateProjectConfiguration};
