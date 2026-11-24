function outdoorOtArticle(categoryId='orienteringstavla'){
 const image='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1740 2100"><path d="M50 0V2100M1690 0V2100" stroke="#202020" stroke-width="100"/><path d="M100 35H1640M100 1365H1640" stroke="#202020" stroke-width="30"/><rect x="100" y="50" width="1540" height="1300" fill="white" stroke="#888" stroke-width="2"/><text x="870" y="250" text-anchor="middle" font-family="Arial,sans-serif" font-size="100">Egen text</text></svg>');
 return {id:'jsf-outdoor-0901',articleNumber:'0901',categoryId,name:'OT-tavla med stolpar',desc:'Komplett orienteringstavla med stolpar och redigerbar skyltyta.',extraLine:'Enkelsidig',format:'1740 × 2100 mm · Skyltfält 1540 × 1300 mm',previewType:'dibond_sign',productType:'dibondskylt',productTypeLabel:'OT-tavla med stolpar',flowType:'form',directAddToCart:false,fields:{dibond:true,quantity:true},dibondConfig:{fixedDimensions:false,minWidthMm:100,minHeightMm:100,maxWidthMm:2800,maxHeightMm:3000,defaultWidthMm:1540,defaultHeightMm:1300,defaultTextSizeMm:70,defaultCornerRadiusMm:0,defaultFrameEnabled:false},unitPrice:8800,currency:'SEK',salesUnit:'st',isImplemented:true,adminArchived:false,image,images:[image]};
}
function installOutdoorOtArticle(catalog={}){
 const update='outdoor-ot-0901-v1';if((catalog.productUpdates||[]).includes(update))return catalog;
 const categories=[...(catalog.categories||[])];let category=categories.find(c=>c.id==='orienteringstavla');
 if(!category){category={id:'orienteringstavla',title:'Orienteringstavla',isImplemented:true,status:'open',isCustom:false};categories.push(category);}
 const articles=[...(catalog.articles||[])];if(!articles.some(a=>String(a.articleNumber)==='0901'))articles.push(outdoorOtArticle(category.id));
 return {...catalog,categories,articles,productUpdates:[...(catalog.productUpdates||[]),update]};
}
module.exports={outdoorOtArticle,installOutdoorOtArticle};
