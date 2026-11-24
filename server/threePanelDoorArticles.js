function installThreePanelDoorArticles(catalog){
 const articles=[...(catalog.articles||[])],reference=articles.find(a=>String(a.articleNumber)==='0607');if(!reference)return catalog;let changed=false;
 for(const [number,name,price,mode] of [['0610','Taktil vårdrumsskylt med siffra och skjutbar lucka',2270,'room_number_status'],['0616','Rumsfunktionsskylt med två textytor och whiteboard',1725,'dual_whiteboard']]){
  if(articles.some(a=>String(a.articleNumber)===number))continue;
  articles.push({...reference,id:'door-'+number,articleNumber:number,name,desc:number==='0610'?'Taktil text och punktskrift, stor siffra samt skjutbar lucka – SMITTA.':'Två textytor, whiteboard och pennhållare.',unitPrice:price,format:'192 × 281,25 mm'+(number==='0616'?' (exkl. pennhållare)':''),image:'/product-'+number+'.png',images:['/product-'+number+'.png'],imageFit:'contain',imageScale:100,primaryImageIndex:0,cardImageIndex:0,productionFile:undefined,homepageFeaturedOrder:undefined,doorSignPreviewImage:'',doorSignTextConfig:{...reference.doorSignTextConfig,layoutMode:mode,previewHeightMm:281.25},fields:{...reference.fields,doorNumber:number==='0610',doorSymbol:number==='0616'},doorSignSharedFormVersion:2});changed=true;
 }
 const index=articles.findIndex(a=>String(a.articleNumber)==='0607');if(!articles[index].threePanelImageVersion){articles[index]={...articles[index],image:'/product-0607.png',images:['/product-0607.png'],primaryImageIndex:0,cardImageIndex:0,imageFit:'contain',imageScale:100,threePanelImageVersion:1};changed=true;}
 return changed?{...catalog,articles}:catalog;
}
module.exports={installThreePanelDoorArticles};
