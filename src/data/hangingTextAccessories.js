const UPDATE_KEY='hanging-white-text-accessories-v1';
const NUMBER_UPDATE_KEY='hanging-white-text-accessory-numbers-1130-1131-v1';
const SYMBOL_UPDATE_KEY='hanging-white-text-accessory-symbols-v1';
function hangingTextAccessoryDefinitions(){
 return [40,70].map(cap=>{
  const small=cap===40,width=small?1000:1500,height=small?150:200;
  const image='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 180"><rect width="600" height="180" fill="white"/><text x="28" y="115" font-family="Arial,sans-serif" font-size="76" font-weight="'+(small?700:400)+'" fill="#111">Entré</text></svg>');
  return {id:'jsf-hanging-text-'+cap,articleNumber:small?'1130':'1131',categoryId:'pendlade-vit',group:'Tillbehör',name:'Enbart text till befintlig pendlad skylt – '+cap+' mm',desc:'Svart självhäftande text till befintlig '+(small?'liten':'stor')+' vit pendlad skylt. Arial '+(small?'Bold':'Regular')+', texthöjd '+cap+' mm. Antalet avser textuppsättningar; beställ två för samma text på båda sidor.',format:cap+' mm texthöjd · Arial '+(small?'Bold':'Regular'),productType:'pendlad_skylt',productTypeLabel:'Tillbehör – enbart text',previewType:'hanging_sign',flowType:'form',directAddToCart:false,hangingSignTextOnly:true,hangingSignPreset:small?'hanging_1000':'hanging_1500',hangingSignSizeMm:width,hangingSignHeightMm:height,hangingSignSides:1,hangingSignTextMode:'single',hangingSignRules:{widthMm:width,heightMm:height,fontFamily:'Arial',fontWeight:small?700:400,textHeightMm:cap,textStartMm:small?130:190,sideStripeMm:0},fields:{hangingSignSymbols:true,customText:{label:'Text att beställa',placeholder:'Skriv text här',cartLabel:'Text'},quantity:{label:'Antal textuppsättningar'}},unitPrice:0,currency:'SEK',isImplemented:false,adminArchived:false,image,images:[image]};
 });
}
function installHangingTextAccessories(catalog={}){
 const updates=catalog.productUpdates||[],installed=updates.includes(UPDATE_KEY);
 if(installed&&updates.includes(NUMBER_UPDATE_KEY)&&updates.includes(SYMBOL_UPDATE_KEY))return catalog;
 const articles=[...(catalog.articles||[])];
 for(const article of hangingTextAccessoryDefinitions()){
  const index=articles.findIndex(existing=>existing.id===article.id);
  if(index<0&&!installed)articles.push(article);
  else if(!updates.includes(NUMBER_UPDATE_KEY)&&index>=0&&!String(articles[index].articleNumber||'').trim()&&!articles.some(existing=>existing.id!==article.id&&String(existing.articleNumber||'').trim()===article.articleNumber))articles[index]={...articles[index],articleNumber:article.articleNumber};
 }
 if(!updates.includes(SYMBOL_UPDATE_KEY))for(let i=0;i<articles.length;i++){
  const article=articles[i];
  if(article.hangingSignTextOnly&&!article.vinylText&&[1000,1500].includes(Number(article.hangingSignSizeMm||article.hangingSignRules?.widthMm)))articles[i]={...article,fields:{...article.fields,hangingSignSymbols:true}};
 }
 return {...catalog,articles,productUpdates:[...new Set([...updates,UPDATE_KEY,NUMBER_UPDATE_KEY,SYMBOL_UPDATE_KEY])]};
}
module.exports={hangingTextAccessoryDefinitions,installHangingTextAccessories};


