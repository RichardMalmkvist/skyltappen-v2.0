// One-time installation. Later catalog edits and archived states are retained.
const UPDATE_KEY='door-accessories-0613-0619-0622-v1';
const svgImage=svg=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
const magnetBody='<path d="M172 14l11-4v14l-11 4z" fill="#999" stroke="#333" stroke-width=".18"/><rect x=".5" y=".5" width="171" height="81" rx="6" fill="white" stroke="#333" stroke-width=".18"/>';
const magnetSVG='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 184 83">'+magnetBody+'<text x="12" y="58" font-family="Arial,sans-serif" font-size="12" fill="#111">Anna Andersson</text><text x="12" y="71" font-family="Arial,sans-serif" font-size="8" font-style="italic" fill="#111">Titel</text></svg>';
function doorAccessoryDefinitions() {
 const base={categoryId:'dorrskyltar',group:'Tillbehör',doorAccessory:true,productType:'dorrskylt_tillbehor',productTypeLabel:'Tillbehör till dörrskylt',currency:'SEK',isImplemented:true,adminArchived:false};
 return [
  {...base,id:'jsf-door-accessory-0613',articleNumber:'0613',name:'Magnetskylt med lyftflik',desc:'Magnetskylt med lyftflik (kräver skylt med whiteboard)',format:'172 × 82 mm',widthMm:172,heightMm:82,unitPrice:310,flowType:'form',previewType:'badge',directAddToCart:false,fields:{name:{label:'Namn',placeholder:'Anna Andersson',maxLength:200},title:{label:'Titel',placeholder:'Titel',maxLength:200},quantity:true},image:svgImage(magnetSVG)},
  {...base,id:'jsf-door-accessory-0619',articleNumber:'0619',name:'Folieplatta bakom dörrskyltar',desc:'Folieplatta bakom dörrskyltar vid montering på glas',format:'Storlek anpassas till dörrskylt',unitPrice:170,flowType:'direct',previewType:'image',directAddToCart:true,fields:{quantity:true},image:svgImage('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 184 83"><rect x="2" y="12" width="178" height="57" fill="white" stroke="#444" stroke-width=".18"/></svg>')},
  {...base,id:'jsf-door-accessory-0622',articleNumber:'0622',name:'Whiteboardplatta',desc:'Whiteboardplatta (byts ut på befintlig skylt)',format:'180 × 89 mm',widthMm:180,heightMm:89,unitPrice:245,flowType:'direct',previewType:'image',directAddToCart:true,fields:{quantity:true},image:svgImage('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 184 93"><rect x="2" y="2" width="180" height="89" fill="white" stroke="#333" stroke-width=".18"/><text x="92" y="48" text-anchor="middle" transform="rotate(-12 92 48)" font-family="Arial,sans-serif" font-style="italic" font-size="11" fill="#111">WHITEBOARD</text></svg>')}
 ];
}
function installBaseDoorAccessories(catalog={}) {
 if((catalog.productUpdates||[]).includes(UPDATE_KEY))return catalog;
 const definitions=doorAccessoryDefinitions();
 const articles=[...(catalog.articles||[])];
 for(const definition of definitions){
  const index=articles.findIndex(article=>String(article.articleNumber||'').trim()===definition.articleNumber);
  const current=index<0?{}:articles[index];
  const next={...current,...definition,id:current.id||definition.id,...(current.image||current.images?.length?{image:current.image||current.images[0],images:current.images||[current.image]}:{}),...(current.isImplemented!=null?{isImplemented:current.isImplemented}:{}),...(current.adminArchived!=null?{adminArchived:current.adminArchived}:{})};
  if(!next.images?.length)next.images=[next.image||definition.image];
  if(index<0)articles.push(next);else articles[index]=next;
 }
 const categories=[...(catalog.categories||[])];
 if(!categories.some(category=>category.id==='dorrskyltar'))categories.push({id:'dorrskyltar',title:'Dörrskyltar',status:'open',isImplemented:true});
 return {...catalog,categories,articles,productUpdates:[...(catalog.productUpdates||[]),UPDATE_KEY]};
}
function installDoorAccessories(catalog={}) {
 const base=installBaseDoorAccessories(catalog);
 const updateKey='door-accessories-thin-outlines-v1';
 if((base.productUpdates||[]).includes(updateKey))return base;
 const replacements=new Map(doorAccessoryDefinitions().map(article=>[
  article.image.replaceAll(encodeURIComponent('stroke-width=".18"'),encodeURIComponent('stroke-width=".8"')),
  article.image
 ]));
 const replaceImage=image=>replacements.get(image)||image;
 // Upgrade only our original generated pictures. Uploaded images and catalog edits stay intact.
 const articles=(base.articles||[]).map(article=>{
  if(!['0613','0619','0622'].includes(String(article.articleNumber).trim()))return article;
  return {...article,image:replaceImage(article.image),
   ...(article.cardImage?{cardImage:replaceImage(article.cardImage)}:{}),
   ...(Array.isArray(article.images)?{images:article.images.map(replaceImage)}:{})};
 });
 return {...base,articles,productUpdates:[...(base.productUpdates||[]),updateKey]};
}
module.exports={installDoorAccessories,magnetBody};
