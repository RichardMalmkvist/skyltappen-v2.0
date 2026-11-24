const fs=require('fs'),path=require('path');
const {sanitizeSvgSymbol}=require('./svgSymbol');
// Stable IDs keep already ordered signs printable even when the logo is inactive.
const definitions=[
 {id:'jsf-region-logo',name:'Region Jönköpings län',assetId:'2f7018a0-974c-4b7a-a2a0-df523d2c5cc1',file:'region-print.svg'},
 {id:'jsf-folktandvarden-logo',name:'Folktandvården – Region Jönköpings län',assetId:'7c68e701-28b8-4a87-a59c-5607e7a93ecd',file:'ftv-print.svg'}
];
const assets=new Map();
function readBuiltinDibondAsset(assetId){
 const definition=definitions.find(value=>value.assetId===assetId);if(!definition)return null;
 if(!assets.has(assetId)){
  const source=fs.readFileSync(path.join(__dirname,'../src/assets/logos',definition.file));
  const vector=sanitizeSvgSymbol(source);
  assets.set(assetId,{...vector,kind:'svg',mime:'image/svg+xml',data:Buffer.from(vector.svg)});
 }
 return assets.get(assetId);
}
function builtinDibondSymbols(){return definitions.map(value=>({id:value.id,name:value.name,image:'/api/dibond-symbols/images/'+value.assetId,aspectRatio:readBuiltinDibondAsset(value.assetId).aspectRatio,active:true,builtin:true}));}
function withBuiltinDibondSymbols(items=[]){
 const defaults=builtinDibondSymbols(),ids=new Set(defaults.map(value=>value.id));
 return [...items.filter(value=>!ids.has(value.id)),...defaults.map(value=>{
  const saved=items.find(item=>item.id===value.id);
  return {...value,...(saved?{name:saved.name,active:saved.active!==false}:{})};
 })];
}
module.exports={readBuiltinDibondAsset,builtinDibondSymbols,withBuiltinDibondSymbols};
