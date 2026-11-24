// Missing flags preserve the existing storefront behaviour.
function isStorefrontArticle(article){return Boolean(article)&&article.storefrontOrderable!==false;}
function isProofOnlyItem(item,catalog={}){
 if(!item)return false;
 const ids=[item.articleId,item.badgeId].filter(value=>value!=null).map(String);
 const number=String(item.articleNumber||'').trim().replace(/\s+spec$/i,'');
 return (catalog.articles||[]).some(article=>!isStorefrontArticle(article)&&(ids.includes(String(article.id))||(number&&number===String(article.articleNumber||'').trim())));
}
function hasProofOnlyItems(cart,catalog){return (cart||[]).some(item=>isProofOnlyItem(item,catalog)||(item.hangingStack?.items||item.configuration?.hangingStack?.items||[]).some(part=>isProofOnlyItem({...part,articleNumber:part.product?.articleNumber},catalog)));}
function storefrontCatalog(catalog={}){
 const articles=(catalog.articles||[]).filter(isStorefrontArticle).map(article=>{
  if(!Array.isArray(article.elevatorBoards))return article;
  const elevatorBoards=article.elevatorBoards.map(board=>({...board,options:Object.fromEntries(Object.entries(board.options||{}).map(([key,option])=>[key,option&&isProofOnlyItem(option,catalog)?null:option]))})).filter(board=>Object.values(board.options).some(Boolean));
  return {...article,elevatorBoards};
 });
 return {...catalog,articles};
}
module.exports={isStorefrontArticle,isProofOnlyItem,hasProofOnlyItems,storefrontCatalog};
