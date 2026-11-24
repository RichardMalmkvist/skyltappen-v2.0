const UPDATE='dibond-0704-0706-size-ranges-v1';
const ranges=[['0704',50,300],['0705',300,600],['0706',600,900]];
function installDibondArticles(catalog={}){
 if((catalog.productUpdates||[]).includes(UPDATE))return catalog;
 const source=(catalog.articles||[]).find(a=>String(a.articleNumber).trim()==='0705');
 if(!source)return catalog;
 const articles=[...(catalog.articles||[])];
 for(const [articleNumber,minimum,maximum] of ranges){
  const index=articles.findIndex(a=>String(a.articleNumber).trim()===articleNumber);
  const existing=index>=0?articles[index]:null;
  if(!existing&&articleNumber!=='0704')continue;
  const article=existing||{...source,id:'jsf-dibond-0704',articleNumber,unitPrice:340,isImplemented:true,adminArchived:false};
  const updated={...article,previewType:'dibond_sign',productType:'dibondskylt',flowType:'form',directAddToCart:false,fields:{...article.fields,dibond:true,quantity:true},
   desc:`Dibondskylt, m\u00e5tt ${minimum}\u2013${maximum} mm`,format:`${minimum} \u00d7 ${minimum} \u2013 ${maximum} \u00d7 ${maximum} mm`,
   dibondConfig:{...article.dibondConfig,minWidthMm:minimum,minHeightMm:minimum,maxWidthMm:maximum,maxHeightMm:maximum,defaultWidthMm:minimum,defaultHeightMm:minimum,fixedDimensions:false,...(!existing?{defaultTextSizeMm:5}:{})}};
  if(index>=0)articles[index]=updated;else articles.push(updated);
 }
 return {...catalog,articles,productUpdates:[...(catalog.productUpdates||[]),UPDATE]};
}
module.exports={installDibondArticles};
