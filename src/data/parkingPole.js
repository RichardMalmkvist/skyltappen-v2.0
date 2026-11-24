const isParkingPole=product=>product?.previewType==='parking_pole';
const poleHeight=form=>Number(form?.poleHeightMm??3150);
function poleError(form={}){const height=poleHeight(form);return Number.isFinite(height)&&height>=100&&height<=6000?null:'Ange en stolphöjd mellan 100 och 6000 mm.';}
const poleFormat=form=>`Ø60 × ${poleHeight(form)} mm · Godstjocklek 4,2 mm`;
function withParkingPole(article){return {...article,previewType:'parking_pole',productType:'stolpe',productTypeLabel:'Galvaniserad stolpe',fields:{poleHeight:true,quantity:true},flowType:'form',directAddToCart:false,destinationSignVariant:undefined};}
function installParkingPole(catalog={}){
 const update='parking-pole-1503-3d-v2',current=(catalog.articles||[]).find(a=>String(a.articleNumber)==='1503');if((catalog.productUpdates||[]).includes(update)&&current?.previewType==='parking_pole'&&current?.productType==='stolpe'&&current?.fields?.poleHeight)return catalog;
 const articles=[...(catalog.articles||[])];
 if(!articles.some(a=>a.id==='jsf-parking-pole-1503'||String(a.articleNumber)==='1503'))articles.push({id:'jsf-parking-pole-1503',articleNumber:'1503',categoryId:'parkeringsskylt',name:'Galvaniserad stolpe till skylt',desc:'Galvaniserat järnrör. Ø60 mm, godstjocklek 4,2 mm. Anpassningsbar höjd.',format:poleFormat({}),previewType:'parking_pole',productType:'stolpe',productTypeLabel:'Galvaniserad stolpe',fields:{poleHeight:true,quantity:true},flowType:'form',directAddToCart:false,unitPrice:1250,currency:'SEK',salesUnit:'st',isImplemented:true,storefrontOrderable:true,adminArchived:false,image:'/parking-pole.svg',images:['/parking-pole.svg']});
 const index=articles.findIndex(a=>String(a.articleNumber)==='1503'),existing=articles[index];
 articles[index]=withParkingPole({...existing,categoryId:'parkeringsskylt',format:poleFormat({}),unitPrice:existing.unitPrice??1250,isImplemented:true,storefrontOrderable:existing.storefrontOrderable!==false,adminArchived:existing.adminArchived===true});
 return {...catalog,articles,productUpdates:[...new Set([...(catalog.productUpdates||[]),update])]};
}
module.exports={isParkingPole,poleHeight,poleError,poleFormat,installParkingPole,withParkingPole};
