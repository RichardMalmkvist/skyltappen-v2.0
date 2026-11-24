// The pocket is a physical accessory, never printed artwork.
const A4_WIDTH_MM=210,A4_HEIGHT_MM=297;
function supportsAcrylicPocket(product={}){return Boolean(product.dibondConfig?.acrylicPocket)||String(product.articleNumber||'').trim()==='0701';}
function newAcrylicPocket(sign){return {enabled:true,xMm:Math.max(0,(Number(sign.widthMm)-A4_WIDTH_MM)/2),yMm:Math.max(0,Math.min(Number(sign.heightMm)-A4_HEIGHT_MM-24,280))};}
function acrylicPocketError(sign){
 const p=sign?.acrylicPocket;if(!p||p.enabled===false)return null;
 if(p.enabled!==true||![p.xMm,p.yMm].every(n=>n!==''&&n!=null&&Number.isFinite(Number(n)))||Number(p.xMm)<4||Number(p.yMm)<4||Number(p.xMm)+A4_WIDTH_MM>Number(sign.widthMm)-4||Number(p.yMm)+A4_HEIGHT_MM>Number(sign.heightMm)-4)return 'A4-fickan måste rymmas på skylten. Flytta fickan, öka skyltmåtten eller ta bort fickan.';
 return null;
}
function installAcrylicArticle(catalog={}){
 const locationUpdate='dibond-acrylic-0701-indoor-business-v1';
 if(!(catalog.productUpdates||[]).includes(locationUpdate))catalog={...catalog,
  categories:(catalog.categories||[]).map(c=>c.id==='verksamhetsskylt-inomhus'?{...c,isImplemented:true,status:'open'}:c),
  articles:(catalog.articles||[]).map(a=>String(a.articleNumber||'').trim()==='0701'?{...a,categoryId:'verksamhetsskylt-inomhus'}:a),
  productUpdates:[...(catalog.productUpdates||[]),locationUpdate]};
 const update='dibond-acrylic-0701-v1';if((catalog.productUpdates||[]).includes(update))return catalog;
 const articles=[...(catalog.articles||[])];
 if(!articles.some(a=>String(a.articleNumber||'').trim()==='0701')){
 const artwork='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 650"><rect x="2" y="2" width="416" height="646" rx="25" fill="white" stroke="#333" stroke-width="2"/><g font-family="Arial,sans-serif" text-anchor="middle" fill="#171717"><text x="210" y="65" font-size="30" font-weight="700">Medicinsk</text><text x="210" y="105" font-size="30" font-weight="700">vårdenhet C</text><text x="210" y="180" font-size="23" font-weight="700">Besökstider</text></g><path d="M35 140H385 M35 250H385" stroke="#171717" stroke-width="2"/><rect x="105" y="280" width="210" height="297" fill="#e9f5fa" stroke="#777"/><text x="210" y="425" font-family="Arial,sans-serif" font-size="18" text-anchor="middle">Vikt akryl A4</text></svg>';
 const image='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(artwork);
 articles.push({id:'jsf-dibond-acrylic-0701',articleNumber:'0701',categoryId:'verksamhetsskylt-inomhus',name:'Dibondskylt med vikt akryl A4',desc:'Dibond med vikt akrylficka (A4-format), egen text och symboler.',format:'420 × 650 mm',productType:'dibondskylt',productTypeLabel:'Dibondskylt med akrylficka',previewType:'dibond_sign',flowType:'form',directAddToCart:false,fields:{dibond:true,quantity:true},dibondConfig:{minWidthMm:30,minHeightMm:30,maxWidthMm:3000,maxHeightMm:3000,defaultWidthMm:420,defaultHeightMm:650,defaultTextSizeMm:34,defaultCornerRadiusMm:25,defaultFrameEnabled:false,acrylicPocket:true},unitPrice:2470,currency:'SEK',salesUnit:'st',isImplemented:true,adminArchived:false,image,images:[image]});
 }
 return {...catalog,articles,productUpdates:[...(catalog.productUpdates||[]),update]};
}
module.exports={A4_WIDTH_MM,A4_HEIGHT_MM,supportsAcrylicPocket,newAcrylicPocket,acrylicPocketError,installAcrylicArticle};
