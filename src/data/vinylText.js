const UPDATE='indoor-black-vinyl-text-v1';
function vinylTextSettings(form={},product={}){
 return {text:String(form.customText||'').trim().normalize('NFC'),heightMm:Number(form.vinylTextHeightMm??product.defaultVinylTextHeightMm??40),fontWeight:Number(form.vinylFontWeight??product.defaultVinylFontWeight??400)};
}
function vinylTextError(form,product){
 const {text,heightMm,fontWeight}=vinylTextSettings(form,product);
 if(!text)return 'Skriv texten som ska skäras ut.';
 if(text.length>300||/[\r\n]/.test(text))return 'Skriv en textrad med högst 300 tecken.';
 if(!Number.isFinite(heightMm)||heightMm<1||heightMm>500)return 'Välj en texthöjd mellan 1 och 500 mm.';
 if(![400,700].includes(fontWeight))return 'Välj Arial Regular eller Arial Bold.';
 return null;
}
function vinylTextArticle(){
 const image='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 180"><rect width="600" height="180" fill="white"/><text x="28" y="115" font-family="Arial,sans-serif" font-size="74" fill="#111">Folietext</text></svg>');
 return {id:'jsf-indoor-black-vinyl-text',articleNumber:'',categoryId:'inomhusskyltar',group:'Tillbehör',name:'Svart folietext',desc:'Svart självhäftande folietext med egen text. Välj texthöjd i mm och Arial Regular eller Bold. Antal avser kompletta textuppsättningar.',format:'Valfri texthöjd · Arial Regular / Bold',productType:'pendlad_skylt',productTypeLabel:'Svart folietext',previewType:'hanging_sign',vinylText:true,hangingSignTextOnly:true,hangingSignSides:1,flowType:'form',directAddToCart:false,fields:{customText:{label:'Text',placeholder:'Skriv din text',maxLength:300},vinylTextOptions:true,quantity:{label:'Antal textuppsättningar'}},defaultVinylTextHeightMm:40,defaultVinylFontWeight:400,unitPrice:0,currency:'SEK',isImplemented:false,adminArchived:false,image,images:[image]};
}
function installVinylText(catalog={}){
 if((catalog.productUpdates||[]).includes(UPDATE))return catalog;
 const article=vinylTextArticle();
 return {...catalog,articles:(catalog.articles||[]).some(item=>item.id===article.id)?catalog.articles:[...(catalog.articles||[]),article],productUpdates:[...(catalog.productUpdates||[]),UPDATE]};
}
module.exports={vinylTextSettings,vinylTextError,vinylTextArticle,installVinylText};
