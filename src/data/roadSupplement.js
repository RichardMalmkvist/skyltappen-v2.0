const ROAD_SUPPLEMENT_HEIGHTS=[200,300,350];
const isRoadSupplement=product=>product?.roadSignEditableText===true;
const ROAD_SUPPLEMENT_STYLES={blue:{background:'#0b4697',border:'#ffffff',text:'#ffffff',rx:20,ry:20},yellow:{background:'#FFD100',border:'#CE252B',text:'#000000',rx:18.3,ry:15}};
const roadSupplementStyle=value=>ROAD_SUPPLEMENT_STYLES[value?.roadSupplementVariant]||ROAD_SUPPLEMENT_STYLES.blue;
const roadSupplementFont=value=>value?.roadSupplementVariant==='yellow'?require('./tratexSvart'):require('./tratexVit');
function roadSupplementError(sign){
 if(!sign?.roadSupplement)return null;
 if(sign.roadSupplementCustomSize){if(![sign.widthMm,sign.heightMm].every(value=>Number(value)>=50&&Number(value)<=3000))return 'Ange mått mellan 50 och 3000 mm.';}
 else if(Number(sign.widthMm)!==400||!ROAD_SUPPLEMENT_HEIGHTS.includes(Number(sign.heightMm)))return 'Välj höjd 200, 300 eller 350 mm för tilläggstavlan.';
 if(sign.uploadedArtwork)return null;
 for(const line of sign.lines||[]){const error=roadSupplementFont(sign).tratexTextError(line.text);if(error)return error;}
 return null;
}
// Millimetre geometry: the blue field grows, while the white keyline retains its weight.
function roadSupplementSurface(width,height,sign){
 const w=Number(width),h=Number(height),style=roadSupplementStyle(sign);
 // SVG strokes are centred on the path: a 7.5 mm inset puts the outside of
 // the 15 mm keyline exactly on the finished edge, without clipping its width.
 return `<rect width="${w}" height="${h}" fill="${style.background}"/><rect x="7.5" y="7.5" width="${w-15}" height="${h-15}" rx="${style.rx}" ry="${style.ry}" fill="none" stroke="${style.border}" stroke-width="15"/>`;
}
function withRoadSupplement(article){
 const custom=article.roadSupplementCustomSize===true,w=custom?Number(article.roadSignWidthMm)||400:400,h=custom?Number(article.roadSignHeightMm)||200:200,legacy=article.roadSupplementLegacySizes===true&&w===400&&h===200;
 return {...article,roadSignEditableText:true,roadSignModel:'400x200',defaultSignArtwork:article.defaultSignArtwork,format:custom?`${w} × ${h} mm`:'400 × 200 / 300 / 350 mm',dibondConfig:{...article.dibondConfig,minWidthMm:w,maxWidthMm:w,minHeightMm:h,maxHeightMm:legacy?350:custom?h:350,defaultWidthMm:w,defaultHeightMm:h,defaultTextSizeMm:35,defaultFrameEnabled:false,defaultCornerRadiusMm:0,fixedDimensions:custom&&!legacy}};
}
function installRoadSupplement(catalog){
 const update='dynamic-road-supplement-v1',previewUpdate='dynamic-blue-road-preview-v1',updates=catalog.productUpdates||[];
 if(updates.includes(update)&&updates.includes(previewUpdate))return catalog;
 const articles=(catalog.articles||[]).map(original=>{
  const article=original.id==='article-1794949481677'&&!updates.includes(update)?withRoadSupplement({...original,defaultSignArtwork:undefined}):original;
  if(!isRoadSupplement(article)||article.roadSupplementVariant==='yellow'||article.image||article.images?.some(Boolean))return article;
  const image='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200">${roadSupplementSurface(400,200,{roadSupplementVariant:'blue'})}</svg>`);
  return {...article,image,images:[image],primaryImageIndex:0,cardImageIndex:0};
 });
 if(!articles.some(isRoadSupplement))return catalog;
 return {...catalog,articles,productUpdates:[...new Set([...updates,update,previewUpdate])]};
}
function installYellowRoadSupplement(catalog){
 const update='dynamic-yellow-road-supplement-v1';if((catalog.productUpdates||[]).includes(update))return catalog;
 const id='jsf-road-supplement-yellow',articles=[...(catalog.articles||[])];
 if(!articles.some(article=>article.id===id)){
  const image='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200">${roadSupplementSurface(400,200,{roadSupplementVariant:'yellow'})}</svg>`);
  articles.push(withRoadSupplement({id,name:'Dynamisk tilläggstavla – gul',desc:'Gul tilläggstavla med egen svart text i Tratex svart.',articleNumber:'',categoryId:'parkeringsskylt',roadSupplementVariant:'yellow',previewType:'dibond_sign',productType:'dibondskylt',productTypeLabel:'Parkeringsskylt',fields:{dibond:true,quantity:true},flowType:'form',directAddToCart:false,unitPrice:0,currency:'SEK',salesUnit:'st',isImplemented:true,storefrontOrderable:false,adminArchived:false,image,images:[image]}));
 }
 return {...catalog,articles,productUpdates:[...(catalog.productUpdates||[]),update]};
}
function installRoadSupplementSizes(catalog){
 const update='dynamic-road-separate-sizes-v1';if((catalog.productUpdates||[]).includes(update))return catalog;
 const articles=[...(catalog.articles||[])];
 for(const [variant,id] of [['blue','article-1794949481677'],['yellow','jsf-road-supplement-yellow']]){
  const index=articles.findIndex(article=>article.id===id);if(index<0)continue;
  const source=articles[index];if(source.roadSupplementCustomSize)continue;
  for(const height of ROAD_SUPPLEMENT_HEIGHTS){
   const nextId=height===200?id:`jsf-road-supplement-${variant}-${height}`;
   if(height!==200&&articles.some(article=>article.id===nextId))continue;
   const image='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 ${height}">${roadSupplementSurface(400,height,{roadSupplementVariant:variant})}</svg>`);
   const article=withRoadSupplement({...source,id:nextId,name:`Dynamisk tilläggstavla – ${variant==='blue'?'blå':'gul'} – 400 × ${height} mm`,roadSupplementVariant:variant,roadSupplementCustomSize:true,roadSignWidthMm:400,roadSignHeightMm:height,roadSupplementLegacySizes:height===200,unitPrice:height===200?source.unitPrice:0,articleNumber:height===200?source.articleNumber:'',...(height===200?{}:{defaultSignArtwork:undefined}),image,images:[image],primaryImageIndex:0,cardImageIndex:0});
   if(height===200)articles[index]=article;else articles.push(article);
  }
 }
 return {...catalog,articles,productUpdates:[...(catalog.productUpdates||[]),update]};
}
module.exports={ROAD_SUPPLEMENT_HEIGHTS,isRoadSupplement,roadSupplementError,roadSupplementSurface,withRoadSupplement,installRoadSupplement,installYellowRoadSupplement,installRoadSupplementSizes,roadSupplementStyle,roadSupplementFont};
