const MAX_DIRECTION_PANELS=10;
const DIRECTION_SPECS=[['1101',true,false,7700],['1102',true,true,8000],['1103',false,false,2000],['1104',false,true,2200],['1105',false,false,0],['1106',false,true,0]];
const isDirectionSign=product=>DIRECTION_SPECS.some(row=>row[0]===String(product?.articleNumber||'').trim());
function stripDirectionPanel(sign={}){const {outdoorSign,directionPanels,...panel}=sign;return panel;}
function directionPanelSigns(sign={}){return [stripDirectionPanel(sign),...(Array.isArray(sign.directionPanels)?sign.directionPanels:[]).map(stripDirectionPanel)];}
function directionPanelHeight(sign={}){return directionPanelSigns(sign).reduce((sum,p)=>sum+Number(p.heightMm),0)+Math.max(0,directionPanelSigns(sign).length-1)*Number(sign.outdoorSign?.panelGapMm??25);}
function newDirectionPanel(widthMm=1500,heightMm=170){return {widthMm,heightMm,frameEnabled:false,cornerRadiusMm:0,cornerRadiusAuto:false,separatorEnabled:false,separatorOffsetYMm:0,symbols:[],lines:[{text:'',sizeMm:70,bold:false,firstLineBottomMm:110,offsetXMm:-100,offsetYMm:0,lineGapMm:4,align:'left'},{text:'',sizeMm:35,bold:false,firstLineBottomMm:105,offsetXMm:550,offsetYMm:0,lineGapMm:4,align:'right'}]};}
function newDirectionDetails(product){const spec=DIRECTION_SPECS.find(row=>row[0]===String(product?.articleNumber));if(!spec)return {};if(['1105','1106'].includes(spec[0]))return {...newDirectionPanel(),outdoorSign:{withPosts:false,doubleSided:spec[2]}};return {...newDirectionPanel(),outdoorSign:{kind:'direction',withPosts:spec[1],doubleSided:spec[2],totalHeightMm:1500,panelGapMm:25},directionPanels:spec[1]?[newDirectionPanel()]:[]};}
function packDirectionPanels(sign,panels){const next={...stripDirectionPanel(panels[0]),outdoorSign:{...sign.outdoorSign},directionPanels:panels.slice(1).map(stripDirectionPanel)};if(next.outdoorSign.withPosts)next.outdoorSign.totalHeightMm=Math.max(Number(next.outdoorSign.totalHeightMm)||1500,directionPanelHeight(next)+(next.outdoorSign.profileStyle?190:105));return next;}
function updateDirectionPanel(sign,index,panel){const panels=directionPanelSigns(sign).map((old,i)=>({...old,...(i===index?stripDirectionPanel(panel):{}),widthMm:panel.widthMm}));return packDirectionPanels(sign,panels);}
function directionSignError(sign){
 if(sign?.outdoorSign?.kind!=='direction')return null;
 if(!Array.isArray(sign.directionPanels)||sign.directionPanels.length>=MAX_DIRECTION_PANELS)return 'Använd 1–10 skyltfält.';
 const gap=sign.outdoorSign.panelGapMm??25;if(gap===''||!Number.isFinite(Number(gap))||Number(gap)<0||Number(gap)>300)return 'Ange ett mellanrum mellan 0 och 300 mm.';
 if(sign.directionPanels.some(p=>!p||typeof p!=='object'||p.directionPanels||p.outdoorSign))return 'Ogiltiga skyltfält.';
 for(const panel of directionPanelSigns(sign)){
  if(![panel.widthMm,panel.heightMm].every(v=>v!==''&&Number.isFinite(Number(v)))||Number(panel.widthMm)!==Number(sign.widthMm)||Number(panel.heightMm)<50||Number(panel.heightMm)>3000)return 'Alla skyltfält ska ha samma bredd och en höjd mellan 50 och 3000 mm.';
 }
 return null;
}
function directionArticles(categoryId='hanvisningsskylt'){
 const specs=DIRECTION_SPECS;
 return specs.map(([articleNumber,withPosts,doubleSided,unitPrice])=>{
  const decal=['1105','1106'].includes(articleNumber);const panel='<rect x="100" y="50" width="1500" height="170" fill="white" stroke="#777" stroke-width="3"/><text x="200" y="165" font-family="Arial,sans-serif" font-size="75">← Hänvisning</text>';
  const posts='<rect x="0" width="100" height="1500" fill="#333"/><rect x="1600" width="100" height="1500" fill="#333"/><path d="M100 35H1600M100 230H1600M100 425H1600" stroke="#333" stroke-width="25"/><rect x="100" y="245" width="1500" height="170" fill="white" stroke="#777" stroke-width="3"/><text x="200" y="360" font-family="Arial,sans-serif" font-size="75">← Hänvisning</text>';
  const image='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+(withPosts?'0 -10 1700 1520':'95 45 1510 180')+'">'+panel+(withPosts?posts:'')+'</svg>');
  return {id:'jsf-direction-'+articleNumber,articleNumber,categoryId,name:decal?'Hänvisningsdekal – egen text':withPosts?'Hänvisningsskylt med stolpar':'Byte av hänvisningsskylt',extraLine:doubleSided?'Dubbelsidig':'Enkelsidig',desc:decal?'Dekal med valfria mått, egen text, streck och symboler.':'Hänvisningsskylt med egen text och separata skyltfält.',format:withPosts?'1700 × 1500 mm · Skyltfält 1500 × 170 mm':'1500 × 170 mm',previewType:'dibond_sign',productType:decal?'dekal':'dibondskylt',productTypeLabel:decal?'Dekal':'Hänvisningsskylt',flowType:'form',directAddToCart:false,fields:{dibond:true,quantity:true},dibondConfig:{minWidthMm:decal?30:100,minHeightMm:decal?30:50,maxWidthMm:withPosts?2800:3000,maxHeightMm:3000,defaultWidthMm:1500,defaultHeightMm:170,defaultTextSizeMm:70,defaultCornerRadiusMm:0,defaultFrameEnabled:false},unitPrice,currency:'SEK',salesUnit:'st',isImplemented:!decal,adminArchived:false,image,images:[image]};
 });
}
function installDirectionArticles(catalog={}){const update='direction-signs-1105-1106-decals-v2';if((catalog.productUpdates||[]).includes(update))return catalog;const categories=[...(catalog.categories||[])];const found=categories.find(c=>c.id==='hanvisningsskylt'||/^hänvisningsskylt$/i.test(c.title||''));const id=found?.id||'hanvisningsskylt';if(found)categories[categories.indexOf(found)]={...found,isImplemented:true,status:'open'};else categories.push({id,title:'Hänvisningsskylt',isImplemented:true,status:'open',isCustom:false});const articles=[...(catalog.articles||[])];for(const article of directionArticles(id))if(!articles.some(a=>String(a.articleNumber||'').trim()===article.articleNumber))articles.push(article);return {...catalog,categories,articles,productUpdates:[...(catalog.productUpdates||[]),update]};}
module.exports={MAX_DIRECTION_PANELS,DIRECTION_SPECS,isDirectionSign,stripDirectionPanel,directionPanelSigns,directionPanelHeight,newDirectionPanel,newDirectionDetails,packDirectionPanels,updateDirectionPanel,directionSignError,directionArticles,installDirectionArticles};
