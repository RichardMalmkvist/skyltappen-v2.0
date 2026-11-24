const UPDATE='namebadge-0207-flat-thumbnail-v1';
function installNameBadge0207Thumbnail(catalog={}) {
 if((catalog.productUpdates||[]).includes(UPDATE))return catalog;
 const articles=catalog.articles||[];
 const target=articles.find(article=>String(article.articleNumber).trim()==='0207');
 if(!target)return catalog;
 const images=target.images?.length?[...target.images]:[target.image||''];
 const primary=Math.min(Math.max(Number(target.primaryImageIndex)||0,0),images.length-1);
 const card=Math.min(Math.max(Number(target.cardImageIndex??primary)||0,0),images.length-1);
 const image='/namebadge-0207.svg';images[primary]=image;images[card]=image;
 return {...catalog,articles:articles.map(article=>article===target?{...article,images,image,cardImage:image,primaryImageIndex:primary,cardImageIndex:card}:article),productUpdates:[...(catalog.productUpdates||[]),UPDATE]};
}
module.exports={installNameBadge0207Thumbnail};
