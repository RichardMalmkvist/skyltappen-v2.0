const {profileSpec,newProfileDetails}=require('./profileSigns');
const {DIRECTION_SPECS,newDirectionDetails,directionPanelHeight,directionSignError}=require('./directionSigns');
const SPECS=[['1001',true,false,7700],['1002',true,true,8000],['1003',false,false,2000],['1004',false,true,2200],['1005',false,false,0],['1006',false,true,0]];
const POST_MM=100,PANEL_TOP_MM=50;
function outdoorSpec(product={}){const profile=profileSpec(product);if(profile)return [profile.articleNumber,profile.withPosts,product.profileSignConfig?.doubleSided===true,profile.price];return [...SPECS,...DIRECTION_SPECS,['0901',true,false,8800]].find(row=>row[0]===String(product.articleNumber||'').trim());}
function newOutdoorSign(product={}){const row=outdoorSpec(product);if(profileSpec(product))return newProfileDetails(product).outdoorSign;return row?{withPosts:row[1],doubleSided:row[2],totalHeightMm:row[0]==='0901'?2100:row[0].startsWith('11')?1500:1250}:null;}
function outdoorArticleNumber(product={},sign){const row=outdoorSpec(product);if(!row)return '';if(row[0]==='0901'||profileSpec(product))return row[0];const double=sign?.outdoorSign?.doubleSided??row[2];return row[0].startsWith('11')?(['1105','1106'].includes(row[0])?(double?'1106':'1105'):row[1]?(double?'1102':'1101'):(double?'1104':'1103')):(['1005','1006'].includes(row[0])?(double?'1006':'1005'):(row[1]?(double?'1002':'1001'):(double?'1004':'1003')));}
function resolveOutdoorArticle(product,sign,articles=[]){
 if(!product||!outdoorSpec(product))return product;
 const number=outdoorArticleNumber(product,sign);if(number===String(product.articleNumber))return product;
 const variant=articles.find(a=>String(a.articleNumber||'').trim()===number);
 return variant||{...product,id:'jsf-outdoor-'+number,articleNumber:number,unitPrice:[...SPECS,...DIRECTION_SPECS].find(row=>row[0]===number)[3]};
}
function outdoorSignError(sign={}){
 const o=sign?.outdoorSign;if(o===undefined)return null;
 const directionError=directionSignError(sign);if(directionError)return directionError;
 if(!o||typeof o.withPosts!=='boolean'||typeof o.doubleSided!=='boolean')return 'Välj enkel- eller dubbelsidig skylt.';
 if(o.withPosts){const h=Number(o.totalHeightMm);if(o.totalHeightMm===''||!Number.isFinite(h)||h<100||h>(o.profileStyle?4000:3000)||(o.kind==='direction'?directionPanelHeight(sign):Number(sign.heightMm))+(o.profileStyle?160:PANEL_TOP_MM)+30>h||Number(sign.widthMm)+POST_MM*2>3000)return 'Skyltfältet måste rymmas mellan stolparna. Öka totalhöjden eller minska skyltfältets mått.';}
 return null;
}
function outdoorFormat(sign){const o=sign?.outdoorSign;if(o?.kind==='direction')return (o.withPosts?(Number(sign.widthMm)+POST_MM*2)+' × '+o.totalHeightMm+' mm · ':'')+(1+(sign.directionPanels?.length||0))+' skyltfält · Bredd '+sign.widthMm+' mm';return o?.withPosts?`${Number(sign.widthMm)+POST_MM*2} × ${o.totalHeightMm} mm · Skyltfält ${sign.widthMm} × ${sign.heightMm} mm`:`${sign.widthMm} × ${sign.heightMm} mm`;}
function outdoorOrderFields(sign){const o=sign?.outdoorSign;return o?[{key:'outdoorSides',label:'Utförande',value:o.doubleSided?'Dubbelsidig – samma motiv på båda sidor':'Enkelsidig'},{key:'outdoorDimensions',label:o.withPosts?'Stolpställning och skyltfält':'Skyltfält',value:outdoorFormat(sign)}]:[];}
function outdoorInitialDetails(product){if(!outdoorSpec(product))return {};if(profileSpec(product))return newProfileDetails(product);if(String(product.articleNumber).startsWith('11'))return newDirectionDetails(product);if(String(product.articleNumber)==='0901')return {outdoorSign:newOutdoorSign(product),frameEnabled:false,separatorEnabled:false,symbols:[],lines:[{text:'',sizeMm:70,bold:true,firstLineBottomMm:150,offsetXMm:0,offsetYMm:0,lineGapMm:4}]};return {outdoorSign:newOutdoorSign(product),frameEnabled:false,separatorEnabled:true,separatorOffsetYMm:15,symbols:[{id:'region-default',symbolId:'jsf-region-logo',name:'Region Jönköpings län',image:'/api/dibond-symbols/images/2f7018a0-974c-4b7a-a2a0-df523d2c5cc1',aspectRatio:4.018332855915211,sizeMm:100,xMm:820,yMm:315}],lines:[{text:'',sizeMm:70,bold:true,firstLineBottomMm:150,offsetXMm:0,offsetYMm:0,lineGapMm:4}]};}
function outdoorArticles(){return SPECS.map(([articleNumber,withPosts,doubleSided,unitPrice])=>{
 const decal=['1005','1006'].includes(articleNumber);
 const panel='<rect x="100" y="50" width="1300" height="470" fill="white" stroke="#777" stroke-width="2"/><text x="180" y="205" font-family="Arial,sans-serif" font-size="88" font-weight="700">Regionfastigheter</text><path d="M180 295H1320" stroke="#777" stroke-width="2"/>';
 const posts='<defs><linearGradient id="p"><stop stop-color="#171717"/><stop offset=".45" stop-color="#555"/><stop offset="1" stop-color="#1c1c1c"/></linearGradient></defs><path d="M100 35H1400M100 535H1400" stroke="#292929" stroke-width="28"/><rect width="100" height="1250" rx="10" fill="url(#p)"/><rect x="1400" width="100" height="1250" rx="10" fill="url(#p)"/>';
 const image='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+(withPosts?'0 0 1500 1250':'95 45 1310 480')+'">'+panel+(withPosts?posts:'')+'</svg>');
 return {id:'jsf-outdoor-'+articleNumber,articleNumber,categoryId:'verksamhetsskylt-utomhus',name:decal?'Byte av dekal på bef. skylt':withPosts?'Verksamhetsskylt med stolpar':'Byte av verksamhetsskylt',extraLine:doubleSided?'Dubbelsidig':'Enkelsidig',desc:decal?'Dekal till befintlig verksamhetsskylt med valfria mått, egen text, symboler och streck.':withPosts?'Verksamhetsskylt med egen text och stolpställning.':'Byte av skyltfält i befintlig stolpställning, med egen text.',format:withPosts?'1500 × 1250 mm · Skyltfält 1300 × 470 mm':'1300 × 470 mm',previewType:'dibond_sign',productType:decal?'dekal':'dibondskylt',productTypeLabel:decal?'Dekal till verksamhetsskylt':'Verksamhetsskylt utomhus',flowType:'form',directAddToCart:false,fields:{dibond:true,quantity:true},dibondConfig:{fixedDimensions:false,minWidthMm:decal?30:100,minHeightMm:decal?30:100,maxWidthMm:withPosts?2800:3000,maxHeightMm:3000,defaultWidthMm:1300,defaultHeightMm:470,defaultTextSizeMm:70,defaultCornerRadiusMm:0,defaultFrameEnabled:false},unitPrice,currency:'SEK',salesUnit:'st',isImplemented:!decal,adminArchived:false,image,images:[image]};
 });}
function installOutdoorArticles(catalog={}){
 const update='outdoor-business-1005-1006-decals-v2';if((catalog.productUpdates||[]).includes(update))return catalog;
 const categories=[...(catalog.categories||[])],index=categories.findIndex(c=>c.id==='verksamhetsskylt-utomhus');
 if(index>=0)categories[index]={...categories[index],isImplemented:true,status:'open'};else categories.push({id:'verksamhetsskylt-utomhus',title:'Verksamhetsskylt - utomhus',isImplemented:true,status:'open',isCustom:false});
 const articles=[...(catalog.articles||[])];for(const article of outdoorArticles())if(!articles.some(a=>String(a.articleNumber||'').trim()===article.articleNumber))articles.push(article);
 return {...catalog,categories,articles,productUpdates:[...(catalog.productUpdates||[]),update]};
}
module.exports={POST_MM,PANEL_TOP_MM,outdoorSpec,newOutdoorSign,outdoorArticleNumber,resolveOutdoorArticle,outdoorSignError,outdoorFormat,outdoorOrderFields,outdoorInitialDetails,outdoorArticles,installOutdoorArticles};
