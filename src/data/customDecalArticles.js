const {outdoorArticleNumber}=require('./outdoorBusinessSigns');
const UPDATE='custom-decals-0730-0734-v1';
const specs=[['0730','A5',210,148.5,260],['0731','A4',297,210,345],['0732','A3',420,297,430],['0733','A2',594,420,605],['0734','A1',840,594,1005]];
function customDecalArticles(categoryId='inomhusskyltar'){
 return specs.map(([articleNumber,paper,width,height,unitPrice])=>{
  const image='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><rect x="2" y="2" width="${width-4}" height="${height-4}" rx="23" fill="white" stroke="#171717" stroke-width="4"/><text x="${width/2}" y="${height/2-4}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${height*.11}" font-weight="700">Dekal med egen</text><text x="${width/2}" y="${height/2+height*.12}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${height*.11}" font-weight="700">text</text></svg>`);
  return {id:`jsf-custom-decal-${articleNumber}`,articleNumber,categoryId,name:`Dekal med egen text \u2013 ${paper}`,desc:'Dekal med egen text och symboler.',format:`${paper} \u00b7 ${width} \u00d7 ${height} mm`,
   productType:'dekal',productTypeLabel:'Dekal',previewType:'dibond_sign',flowType:'form',directAddToCart:false,fields:{dibond:true,quantity:true},
   dibondConfig:{fixedDimensions:false,minWidthMm:30,minHeightMm:30,maxWidthMm:3000,maxHeightMm:3000,defaultWidthMm:width,defaultHeightMm:height,defaultTextSizeMm:15,defaultCornerRadiusMm:25},
   unitPrice,currency:'SEK',salesUnit:'st',isImplemented:true,adminArchived:false,image,images:[image]};
 });
}
function installCustomDecalArticles(catalog={}){
 const placement='custom-decals-under-indoor-v1';
 if((catalog.productUpdates||[]).includes(placement))return enableCustomDecalSizes(catalog);
 let categories=[...(catalog.categories||[])];
 const found=categories.find(c=>c.id==='inomhusskyltar');
 if(found)categories[categories.indexOf(found)]={...found,isImplemented:true,status:'open'};
 else categories.push({id:'inomhusskyltar',title:'Inomhusskyltar',isImplemented:true,status:'open',isCustom:false});
 const numbers=new Set(specs.map(row=>row[0]));
 const articles=(catalog.articles||[]).map(article=>numbers.has(String(article.articleNumber).trim())?{...article,categoryId:'inomhusskyltar',indoorGroup:'decals'}:article);
 for(const article of customDecalArticles())if(!articles.some(a=>String(a.articleNumber).trim()===article.articleNumber||a.id===article.id))articles.push({...article,indoorGroup:'decals'});
 // Remove only the unused root category installed by the previous version.
 if((catalog.productUpdates||[]).includes(UPDATE)&&!articles.some(a=>a.categoryId==='dekaler'))categories=categories.filter(c=>c.id!=='dekaler');
 return enableCustomDecalSizes({...catalog,categories,articles,productUpdates:[...new Set([...(catalog.productUpdates||[]),UPDATE,placement])]});
}
function enableCustomDecalSizes(catalog){
 const update='custom-decals-variable-spec-v1';
 if((catalog.productUpdates||[]).includes(update))return catalog;
 return {...catalog,articles:(catalog.articles||[]).map(article=>specs.some(row=>row[0]===String(article.articleNumber).trim())?{...article,dibondConfig:{...article.dibondConfig,fixedDimensions:false,minWidthMm:30,minHeightMm:30,maxWidthMm:3000,maxHeightMm:3000}}:article),productUpdates:[...(catalog.productUpdates||[]),update]};
}
function decalArticleNumber(product={},form={}){
 const outdoor=outdoorArticleNumber(product,form.dibondSign||form.configuration?.dibondSign);if(outdoor)return outdoor;
 const base=String(product.articleNumber||'').replace(/\s+spec$/i,'').trim();
 const standard=specs.find(row=>row[0]===base);
 if(!standard||product.previewType!=='dibond_sign')return product.articleNumber||'';
 const sign=form.dibondSign||form.configuration?.dibondSign;
 if(!sign||![sign.widthMm,sign.heightMm].every(value=>Number.isFinite(Number(value))&&Number(value)>0))return base;
 return Math.abs(Number(sign.widthMm)-standard[2])>.001||Math.abs(Number(sign.heightMm)-standard[3])>.001?base+' spec':base;
}
module.exports={customDecalArticles,installCustomDecalArticles,decalArticleNumber};
