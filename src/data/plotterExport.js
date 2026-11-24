import {getHangingSignSymbolAssets} from './hangingSignSymbols';
import {getDoorSignSymbolById} from './doorSignSymbols';
import {getCatalogArticles} from './catalogStore';
export const canExportHangingSign = item => item?.productType === 'pendlad_skylt' || item?.previewType === 'hanging_sign' || Boolean(item?.hangingSignPreset);
export const canExportDibond = item => item?.productType === 'dibondskylt' || item?.previewType === 'dibond_sign' || Boolean(item?.dibondSign || item?.configuration?.dibondSign);
export const canExportDoor = item => item?.doorSignTextEnabled!==false&&(item?.previewType==='door_sign'||item?.productType==='dorrskylt'||item?.doorSignTextEnabled===true);
export const canExportFixed = item => Boolean((item?.productionFile||getCatalogArticles().find(article=>String(article.id)===String(item?.articleId||item?.badgeId)||(item?.articleNumber&&article.articleNumber===item.articleNumber))?.productionFile)?.id);
export const canExportParking = item => item?.previewType === "parking_sign" || Boolean(item?.parkingSignConfig);
export const canExportOT = item => Boolean(item?.otBoard||item?.configuration?.otBoard);
export const canExportProduction = item => canExportParking(item) || canExportHangingSign(item) || canExportDibond(item) || canExportDoor(item) || canExportOT(item) || canExportFixed(item);
export const hasBothProductionFiles = item => canExportFixed(item)&&(canExportParking(item)||canExportHangingSign(item)||canExportDibond(item)||canExportDoor(item)||canExportOT(item));

export async function downloadPlotterExport(order, adminPassword, itemIndex, productionKind='all') {
  const items=(order.cart||[]).filter((item,index)=>productionKind!=='original'&&(itemIndex===undefined||index===itemIndex)&&canExportHangingSign(item));
  const assets=new Map();
  for(const item of items){
    const form={...item,...item.configuration};
    for(const asset of getHangingSignSymbolAssets(form))assets.set(String(asset.id),asset);
    for(const asset of [...(item.configuration?.hangingSignSymbolAssets||[]),...(item.hangingSignSymbolAssets||[])])assets.set(String(asset.id),asset);
  }
  const doorSymbolAssets=[];
  (order.cart||[]).forEach((item,index)=>{
    if(productionKind==='original')return;
    if(itemIndex!==undefined&&itemIndex!==index)return;
    const form={...item,...item.configuration};
    if(!canExportDoor(form)||!form.doorUseSymbol||form.doorSymbolImage)return;
    const symbol=getDoorSignSymbolById(form.doorSymbol);
    if(symbol?.image)doorSymbolAssets.push({itemIndex:index,id:form.doorSymbol,image:symbol.image});
  });
  const response=await fetch(`/api/orders/${encodeURIComponent(order.id)}/plotter-export`,{
    method:'POST',headers:{'Content-Type':'application/json','x-admin-password':adminPassword},
    body:JSON.stringify({...(itemIndex===undefined?{}:{itemIndex}),productionKind,symbolAssets:[...assets.values()],...(doorSymbolAssets.length?{doorSymbolAssets}:{})}),
  });
  if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.message||(response.status===404?'Produktionsfunktionen hittades inte. Starta om servern efter att uppdateringen har lagts in.':'Kunde inte skapa produktionsfilen (serverfel '+response.status+').'));}
  if(!/application\/(pdf|zip)/i.test(response.headers.get('Content-Type')||''))throw new Error('Servern skickade ingen produktionsfil. Starta om servern och uppdatera sidan.');
  const blob=await response.blob();
  const filename=response.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1]||'GoSign.pdf';
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename;
  document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
