const {isBadgeItem}=require('./badgeProduction');
const {isStorefrontArticle}=require('./catalogVisibility');

function guestCatalog(catalog={}) {
 const categories=(catalog.categories||[]).filter(category=>(category.status||(category.isImplemented?'open':'closed'))==='open');
 const openIds=new Set(categories.map(category=>category.id));
 const articles=(catalog.articles||[]).filter(article=>isBadgeItem(article)&&isStorefrontArticle(article)&&article.isImplemented&&!article.adminArchived&&openIds.has(article.categoryId));
 const categoryIds=new Set(articles.map(article=>article.categoryId));
 return {...catalog,articles,categories:categories.filter(category=>categoryIds.has(category.id))};
}

// Resolve against the saved catalog, never trust a cart's claimed product type.
function guestCanOrder(item,catalog) {
 if(!item)return false;
 const articles=guestCatalog(catalog).articles;
 const ids=[item.articleId,item.badgeId].filter(value=>value!=null&&String(value)!=='').map(String);
 const number=String(item.articleNumber||'').trim();
 if(!ids.length&&!number)return false;
 return articles.some(article=>ids.every(id=>id===String(article.id))&&(!number||number===String(article.articleNumber||'').trim()));
}

module.exports={guestCatalog,guestCanOrder};
