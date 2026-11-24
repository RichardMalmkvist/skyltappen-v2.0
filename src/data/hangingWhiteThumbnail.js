const UPDATE='white-hanging-0303-thumbnail-v2';
// 0301 and 0303 use the same example text and virtually the same proportions.
// Reuse the existing outlined artwork rather than patching only one UI view.
function installHangingWhiteThumbnail(catalog={}) {
 if((catalog.productUpdates||[]).includes(UPDATE))return catalog;
 const articles=catalog.articles||[];
 const source=articles.find(article=>String(article.articleNumber)==='0301');
 const target=articles.find(article=>String(article.articleNumber)==='0303');
 const sourceImages=source?.images||[];
 const primary=sourceImages[Number(source?.primaryImageIndex)||0]||source?.image;
 const card=sourceImages[Number(source?.cardImageIndex??source?.primaryImageIndex)||0]||source?.cardImage||primary;
 if(!target||!primary)return catalog;
 const images=target.images?.length?[...target.images]:[target.image||primary];
 const primaryIndex=Math.min(Math.max(Number(target.primaryImageIndex)||0,0),images.length-1);
 const cardIndex=Math.min(Math.max(Number(target.cardImageIndex??primaryIndex)||0,0),images.length-1);
 images[primaryIndex]=primary;images[cardIndex]=card;
 return {...catalog,articles:articles.map(article=>article===target?{...article,images,primaryImageIndex:primaryIndex,cardImageIndex:cardIndex,image:images[primaryIndex],cardImage:images[cardIndex]}:article),productUpdates:[...(catalog.productUpdates||[]),UPDATE]};
}
module.exports={installHangingWhiteThumbnail};
