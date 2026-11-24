// Named, reusable CAD models. Artwork belongs to the article, not the model.
const ROAD_SIGN_MODELS={
 '400x200':{file:'road-sign-400x200.glb',widthMm:400,heightMm:200,depthMm:25},
 '400x400':{file:'road-sign-400x400.glb',widthMm:400,heightMm:400,depthMm:25},
 '800x200':{file:'road-sign-800x200.glb',widthMm:800,heightMm:200,depthMm:25,editableWidth:true,cadWidthMm:800,cadHeightMm:200},
 'dia400':{file:'road-sign-dia400.glb',widthMm:450,heightMm:450,cadScale:1.125,depthMm:26,shape:'circle',centered:true,frontZMm:3},
};
const widthModels=new Map();
const roadSignModel=(product,sign)=>{const base=ROAD_SIGN_MODELS[product?.roadSignModel];if(!base)return null;const custom=(product.roadSignEditableText&&product.roadSupplementCustomSize)||product.roadSignCustomSize===true;if(!base.editableWidth&&!custom)return base;const width=Number(product.roadSignVariableWidth?sign?.widthMm??product.roadSignWidthMm:product.roadSignWidthMm)||base.widthMm,height=custom?Number(product.roadSignHeightMm)||base.heightMm:base.heightMm,model=custom&&height>350?ROAD_SIGN_MODELS['400x400']:base,key=product.roadSignModel+':'+width+':'+height;if(!widthModels.has(key))widthModels.set(key,{...model,widthMm:width,heightMm:height,cadWidthMm:model.cadWidthMm||model.widthMm,cadHeightMm:model.cadHeightMm||model.heightMm,editableWidth:true,editableHeight:Boolean(custom)});return widthModels.get(key);};
function withRoadSignModel(article,key){
 const model=roadSignModel({...article,roadSignModel:key});if(!model)return {...article,roadSignModel:undefined};
 if(article.roadSignEditableText)return require('./roadSupplement').withRoadSupplement(article);
 return {...article,roadSignModel:key,...(model.editableWidth?{roadSignWidthMm:article.roadSignWidthMm??model.widthMm}:{}),previewType:'dibond_sign',productType:'dibondskylt',flowType:'form',directAddToCart:false,
  fields:{dibond:true,quantity:true},format:model.shape==='circle'?`Ø ${model.widthMm} mm`:`${model.widthMm} × ${model.heightMm} mm`,
  dibondConfig:{...article.dibondConfig,minWidthMm:article.roadSignVariableWidth?50:model.widthMm,minHeightMm:model.heightMm,maxWidthMm:article.roadSignVariableWidth?3000:model.widthMm,maxHeightMm:model.heightMm,defaultWidthMm:model.widthMm,defaultHeightMm:model.heightMm,defaultCornerRadiusMm:model.shape==='circle'?model.widthMm/2:0,defaultFrameEnabled:false,defaultTextSizeMm:20,fixedDimensions:!article.roadSignVariableWidth}};
}
function installRoadSignArticles(catalog={}){
 const update='parking-road-sign-models-v6';if((catalog.productUpdates||[]).includes(update))return catalog;
 const categories=[...(catalog.categories||[])];
 let category=categories.find(c=>c.id==='parkeringsskylt'||/^parkeringsskylt(ar)?$/i.test(c.title||''));
 if(!category){category={id:'parkeringsskylt',title:'Parkeringsskylt',isImplemented:true,status:'open'};categories.push(category);}
 const articles=(catalog.articles||[]).map(article=>{if(article.roadSignModel!=='dia400')return article;const thumbnail=url=>!article.defaultSignArtwork&&String(url||'').startsWith('data:image/svg+xml')?url.replace(encodeURIComponent('\u00d8 400 mm'),encodeURIComponent('\u00d8 450 mm')):url;return withRoadSignModel({...article,name:String(article.name||'').replace(/\u00d8\s*400\s*mm/g,'\u00d8 450 mm'),image:thumbnail(article.image),images:article.images?.map(thumbnail)},'dia400');});
 for(const key of Object.keys(ROAD_SIGN_MODELS)){
  const id='jsf-road-sign-'+key;if(articles.some(a=>a.id===id))continue;
  const model=ROAD_SIGN_MODELS[key],thumbnailHeight=400*model.heightMm/model.widthMm;
  const format=model.shape==='circle'?`Ø ${model.widthMm} mm`:`${model.widthMm} × ${model.heightMm} mm`;
  const image='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 440">${model.shape==='circle'?'<circle cx="220" cy="220" r="200" fill="white" stroke="#777"/>':`<rect x="20" y="${(440-thumbnailHeight)/2}" width="400" height="${thumbnailHeight}" fill="white" stroke="#777" stroke-width="1"/>`}<text x="220" y="225" text-anchor="middle" font-family="Arial,sans-serif" font-size="18">${format}</text></svg>`);
  articles.push(withRoadSignModel({id,articleNumber:'',categoryId:category.id,name:`Parkeringsskylt – ${format}`,desc:'Parkeringsskylt med eget original.',productTypeLabel:'Parkeringsskylt',unitPrice:0,currency:'SEK',salesUnit:'st',isImplemented:true,storefrontOrderable:false,adminArchived:false,image,images:[image]},key));
 }
 if(!articles.some(article=>article.id==='jsf-road-sign-blank')){const image='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 440"><rect x="20" y="20" width="400" height="400" fill="white" stroke="#777"/></svg>');articles.push(withRoadSignModel({id:'jsf-road-sign-blank',name:'Skyltmall – eget original',desc:'Skylt utan motiv. Lägg till eget SVG- eller PDF-original.',categoryId:category.id,articleNumber:'',unitPrice:0,currency:'SEK',salesUnit:'st',isImplemented:true,storefrontOrderable:false,adminArchived:false,roadSignBlank:true,roadSignCustomSize:true,roadSignWidthMm:400,roadSignHeightMm:400,image,images:[image]},'400x200'));}
 if(!articles.some(a=>a.id==='jsf-road-sign-variable-width-200')){
 const image='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 240"><rect x="25" y="20" width="550" height="200" fill="white" stroke="#777"/></svg>');
 articles.push(withRoadSignModel({id:'jsf-road-sign-variable-width-200',articleNumber:'',name:'Dynamisk skylt – eget original – höjd 200 mm',desc:'Vit parkeringsskylt med valfri bredd och eget SVG- eller PDF-original.',categoryId:category.id,unitPrice:0,currency:'SEK',salesUnit:'st',isImplemented:true,storefrontOrderable:false,adminArchived:false,roadSignBlank:true,roadSignVariableWidth:true,roadSignWidthMm:550,productTypeLabel:'Parkeringsskylt',image,images:[image]},'800x200'));
 }
 return {...catalog,categories,articles,productUpdates:[...(catalog.productUpdates||[]),update]};
}
module.exports={ROAD_SIGN_MODELS,roadSignModel,withRoadSignModel,installRoadSignArticles};
