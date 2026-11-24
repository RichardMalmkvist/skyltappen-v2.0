const PROFILE_SPECS=[
 {articleNumber:'1301',withPosts:true,widthMm:950,heightMm:2500,panelHeightMm:260,headingHeightMm:360,price:17500,categoryId:'profilskylt'},
 {articleNumber:'1302',withPosts:false,widthMm:950,heightMm:260,panelHeightMm:260,price:690,categoryId:'profilskylt'},
 {articleNumber:'1401',withPosts:true,widthMm:1400,heightMm:3230,panelHeightMm:420,headingHeightMm:500,price:20000,categoryId:'profilskylt-storre'},
 {articleNumber:'1402',withPosts:false,widthMm:1400,heightMm:420,panelHeightMm:420,price:800,categoryId:'profilskylt-storre'}
];
const profileSpec=product=>PROFILE_SPECS.find(spec=>spec.articleNumber===String(product?.articleNumber));
function profilePanel(widthMm,heightMm,heading=false){return {widthMm,heightMm,frameEnabled:false,cornerRadiusMm:0,cornerRadiusAuto:false,separatorEnabled:false,separatorOffsetYMm:0,symbols:[],lines:[{text:'',sizeMm:heading?70:50,bold:true,firstLineBottomMm:heading?120:90,offsetXMm:0,offsetYMm:0,lineGapMm:10,align:'center'}]};}
function newProfileDetails(product){
 const spec=profileSpec(product);if(!spec)return {};
 const panel=profilePanel(spec.widthMm,spec.withPosts?spec.headingHeightMm:spec.heightMm,spec.withPosts);
 return {...panel,outdoorSign:{kind:'direction',profileStyle:true,withPosts:spec.withPosts,doubleSided:product.profileSignConfig?.doubleSided===true,totalHeightMm:spec.withPosts?spec.heightMm:0,panelGapMm:30},directionPanels:spec.withPosts?Array.from({length:4},()=>profilePanel(spec.widthMm,spec.panelHeightMm)):[]};
}
function profileImage(spec){
 const w=spec.widthMm,total=spec.withPosts?w+200:w,h=spec.withPosts?spec.heightMm:spec.heightMm;let y=160;
 const panels=spec.withPosts?[spec.headingHeightMm,...Array(4).fill(spec.panelHeightMm)]:[spec.heightMm];
 const fields=panels.map((ph,index)=>{const py=spec.withPosts?y:0;y+=ph+30;return `<rect x="${spec.withPosts?100:0}" y="${py}" width="${w}" height="${ph}" fill="white" stroke="#999" stroke-width="2"/><text x="${total/2}" y="${py+ph/2}" dominant-baseline="central" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="${index===0&&spec.withPosts?80:48}">Egen text</text>${spec.withPosts?`<path d="M100 ${py-15}H${w+100}M100 ${py+ph+15}H${w+100}" stroke="#333" stroke-width="30"/>`:''}`;}).join('');
 const stand=spec.withPosts?`<defs><linearGradient id="post"><stop stop-color="#171717"/><stop offset=".45" stop-color="#555"/><stop offset="1" stop-color="#171717"/></linearGradient></defs><rect width="100" height="${h}" rx="12" fill="url(#post)"/><rect x="${total-100}" width="100" height="${h}" rx="12" fill="url(#post)"/><path d="M100 40H${total-100}L${total-80} 130H80Z" fill="#3e3e3e" stroke="#999" stroke-width="3"/>`:'';
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-5 -12 ${total+10} ${h+24}">${fields}${stand}</svg>`);
}
function profileArticles(replacementDoubleSided=true){return PROFILE_SPECS.map(spec=>{
 const image=profileImage(spec),large=spec.articleNumber.startsWith('14');
 return {id:'jsf-profile-'+spec.articleNumber,articleNumber:spec.articleNumber,categoryId:spec.categoryId,name:spec.withPosts?(large?'Profilskylt större med stolpar':'Profilskylt med stolpar'):'Byte av enskild profilskylt',desc:spec.withPosts?'Profilskylt med redigerbara skyltfält, egen text, symboler och streck.'+(large?' Invändigt förstärkt för ökad stabilitet.':''):'Enskilt skyltfält till befintlig profilskylt, med egen text, symboler och streck.',extraLine:spec.withPosts||replacementDoubleSided?'Dubbelsidig':'Enkelsidig',format:`${spec.withPosts?spec.widthMm+200:spec.widthMm} × ${spec.heightMm} mm`,previewType:'dibond_sign',productType:'dibondskylt',productTypeLabel:large?'Profilskylt större':'Profilskylt',flowType:'form',directAddToCart:false,fields:{dibond:true,quantity:true},dibondConfig:{fixedDimensions:false,minWidthMm:100,minHeightMm:50,maxWidthMm:2800,maxHeightMm:3000,defaultWidthMm:spec.widthMm,defaultHeightMm:spec.withPosts?spec.headingHeightMm:spec.heightMm,defaultTextSizeMm:70,defaultCornerRadiusMm:0,defaultFrameEnabled:false},profileSignConfig:{doubleSided:spec.withPosts||Boolean(replacementDoubleSided),maxTotalHeightMm:4000},unitPrice:spec.price,currency:'SEK',salesUnit:'st',isImplemented:true,adminArchived:false,image,images:[image]};
 });}
function installProfileArticles(catalog={},replacementDoubleSided=true){
 if(typeof replacementDoubleSided!=='boolean')throw new Error('Ange utförande för byteskyltarna.');
 const update='profile-signs-1301-1402-v1';if((catalog.productUpdates||[]).includes(update))return catalog;
 const categories=[...(catalog.categories||[])];
 for(const [id,title] of [['profilskylt','Profilskylt'],['profilskylt-storre','Profilskylt - större']]){const index=categories.findIndex(c=>c.id===id);if(index>=0)categories[index]={...categories[index],isImplemented:true,status:'open'};else categories.push({id,title,isImplemented:true,status:'open',isCustom:false});}
 const articles=[...(catalog.articles||[])];for(const article of profileArticles(replacementDoubleSided))if(!articles.some(a=>String(a.articleNumber)===article.articleNumber))articles.push(article);
 return {...catalog,categories,articles,productUpdates:[...(catalog.productUpdates||[]),update]};
}
module.exports={PROFILE_SPECS,profileSpec,profilePanel,newProfileDetails,profileArticles,installProfileArticles};
