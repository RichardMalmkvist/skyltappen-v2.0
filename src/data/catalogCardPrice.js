const {isAreaPriced}=require('./areaPricing');
function amount(value){
 if(value==null||typeof value==='boolean'||String(value).trim()==='')return null;
 const price=Number(value);return Number.isFinite(price)&&price>=0?price:null;
}
function getCatalogCardPrice(product={},articles=[]){
 const options=product.previewType==='elevator_catalog_entry'?(product.elevatorBoards||[]).flatMap(board=>Object.values(board.options||{})):[];
 if(options.length){
  const prices=options.map(option=>{
   const article=articles.find(a=>option.articleId&&String(a.id)===String(option.articleId))||articles.find(a=>option.articleNumber&&String(a.articleNumber)===String(option.articleNumber));
   return article?amount(article.unitPrice??article.price):amount(option.unitPrice);
  }).filter(price=>price!==null);
  return prices.length?{amount:Math.min(...prices),unit:'st',from:true}:null;
 }
 if(product.previewType==='elevator_catalog_entry')return null;
 const area=isAreaPriced(product),price=amount(area?(product.pricePerM2??product.unitPrice??product.price):(product.unitPrice??product.price));
 return price===null?null:{amount:price,unit:area?'m²':'st',from:false};
}
module.exports={getCatalogCardPrice};
