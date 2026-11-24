// One-time, additive catalog installation. Later changes in administration win.
const UPDATE='aluminium-custom-text-1230-1236-v1';
const specifications=[
 ['1230',100,60,600,400,1600],
 ['1231',600,400,1000,500,2500],
 ['1232',1000,1000,1000,1000,2875],
 ['1233',1000,1000,1500,1000,3100],
 ['1234',1500,1000,2000,1000,4000],
 ['1235',297,210,297,210,0,'A4'],
 ['1236',210,148,210,148,0,'A5'],
];
function aluminiumArticles(categoryId='aluminiumskyltar'){
 return specifications.map(([articleNumber,width,height,maxWidth,maxHeight,unitPrice,paper])=>{
  const caption=paper?'Plan aluminium':'4-kantsbockad plåt';
  const artwork=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 280"><rect x="15" y="15" width="370" height="250" rx="2" fill="white" stroke="#333" stroke-width="1.5"/><text x="200" y="131" font-family="Arial,sans-serif" font-size="23" font-weight="700" text-anchor="middle">${caption}</text><text x="200" y="162" font-family="Arial,sans-serif" font-size="23" font-weight="700" text-anchor="middle">med egen text</text></svg>`;
  const image='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(artwork);
  return {id:`jsf-aluminium-${articleNumber}`,articleNumber,categoryId,
   name:paper?`Plan aluminium – ${paper}, egen text`:'4-kantsbockad plåt – egen text',
   desc:paper?'Plan aluminium med egen text och symboler.':'4-kantsbockad plåt med egen text och symboler.',
   format:paper?`${paper} · ${width} × ${height} mm`:`Max ${maxWidth} × ${maxHeight} mm`,
   productType:'dibondskylt',productTypeLabel:paper?'Aluminiumskylt':'Kantbockad aluminiumskylt',previewType:'dibond_sign',
   dibondConfig:{maxWidthMm:maxWidth,maxHeightMm:maxHeight,defaultWidthMm:width,defaultHeightMm:height,defaultTextSizeMm:articleNumber==='1230'?6:15,fixedDimensions:Boolean(paper)},
   flowType:'form',directAddToCart:false,doorSignTextEnabled:false,fields:{dibond:true,quantity:true},
   unitPrice,currency:'SEK',salesUnit:'st',isImplemented:!paper,adminArchived:false,image,images:[image]};
 });
}
function correctAluminium1231(catalog){
 const update='aluminium-1231-max-1000x500-v1';
 if((catalog.productUpdates||[]).includes(update))return catalog;
 return {...catalog,articles:(catalog.articles||[]).map(article=>{
  if(String(article.articleNumber||'').trim()!=='1231'||article.previewType!=='dibond_sign')return article;
  return {...article,format:'Max 1000 \u00d7 500 mm',dibondConfig:{...article.dibondConfig,maxWidthMm:1000,maxHeightMm:500,defaultWidthMm:Math.min(Number(article.dibondConfig?.defaultWidthMm)||600,1000),defaultHeightMm:Math.min(Number(article.dibondConfig?.defaultHeightMm)||400,500)}};
 }),productUpdates:[...(catalog.productUpdates||[]),update]};
}
function installAluminiumArticles(catalog={}){
 catalog=correctAluminium1231(catalog);
 if((catalog.productUpdates||[]).includes(UPDATE))return catalog;
 const categories=[...(catalog.categories||[])];
 const found=categories.find(c=>c.id==='aluminiumskyltar'||/^aluminiumskyltar$/i.test(String(c.title||'').trim()));
 const categoryId=found?.id||'aluminiumskyltar';
 if(found)categories[categories.indexOf(found)]={...found,isImplemented:true,status:'open'};
 else categories.push({id:categoryId,title:'Aluminiumskyltar',isImplemented:true,status:'open',isCustom:false});
 const articles=[...(catalog.articles||[])];
 for(const article of aluminiumArticles(categoryId)){
  if(!articles.some(existing=>existing.id===article.id||String(existing.articleNumber||'').trim()===article.articleNumber))articles.push(article);
 }
 return {...catalog,categories,articles,productUpdates:[...(catalog.productUpdates||[]),UPDATE]};
}
// Resolve by article number as well, so existing catalog entries and saved
// project signs receive the corrected finish without replacing customer data.
function isFoldedAluminium(product={}){
 return /^123[0-4]$/.test(String(product.articleNumber||'').trim())||/^jsf-aluminium-123[0-4]$/.test(String(product.id||product.articleId||product.badgeId||''));
}
module.exports={aluminiumArticles,installAluminiumArticles,isFoldedAluminium};
