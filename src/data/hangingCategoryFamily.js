const UPDATE='hanging-category-family-v2';
const HANGING_PARENT='pendlade-skyltar';
const HANGING_CHILDREN=['pendlade-vit','pendlade-gron','pendlade-kombinerad','pendlade-tillbehor'];
function hangingThumbnail(product={}){
 const width=Number(product.hangingSignSizeMm)||1500,height=Number(product.hangingSignHeightMm)||140,green=/gron/.test(product.categoryId||''),mixed=Boolean(product.hangingSignBackBackgroundColor),double=product.hangingSignTextMode==='double',divider=product.hangingSignDivider,scale=1400/width,faceHeight=height*scale,cap=width>=1500?70:40,font=cap/.715*scale,x=width>=1500?190:130,arrowW=(width>=1500?110:60)*scale,arrowH=(width>=1500?80:50)*scale;
 const face=(y,colour,texts)=>'<g transform="translate(100 '+y+')"><path d="M112 -45V0M1288 -45V0" stroke="#666" stroke-width="2"/><rect width="1400" height="'+faceHeight+'" fill="'+colour+'" '+(colour==='white'?'stroke="#555" stroke-width="2"':'')+'/>'+(!divider?'<g transform="translate('+(30*scale)+' '+((faceHeight-arrowH)/2)+') scale('+(arrowW/110)+' '+(arrowH/80)+')"><path d="M100 40H12M38 14L12 40L38 66" fill="none" stroke="'+(colour==='white'?'#111':'white')+'" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/></g>':'')+texts.map((text,i)=>'<text x="'+(x*scale)+'" y="'+(texts.length===1?faceHeight/2+cap*scale*.4125:(i+.5)*faceHeight/texts.length+cap*scale*.4125)+'" fill="'+(colour==='white'?'#111':'white')+'" font-family="Arial" font-size="'+font+'" font-weight="'+(width>=1500?400:700)+'">'+text+'</text>').join('')+(divider?'<path d="M0 '+(faceHeight/2)+'H1400" stroke="#111" stroke-width="1.4"/>':'')+'</g>';
 const texts=green?['Utgång']:divider?['Kontaktcenter','1177 på telefon']:double?['Barn- och ungdoms-','medicinska mottagningen']:['Intensivvårdsavdelningen'];const y=mixed?200:(800-faceHeight)/2;
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="800" viewBox="0 0 1600 800">'+face(y,green?'#00843D':'white',texts)+(mixed?face(y+faceHeight+140,'#00843D',['Utgång']):'')+'</svg>');
}
function installHangingCategoryFamily(catalog={}){
 if((catalog.productUpdates||[]).includes(UPDATE))return catalog;
 const existing=catalog.categories||[],byId=new Map(existing.map(c=>[c.id,c]));
 const children=[['pendlade-vit','Pendlade skyltar - vit bakgrund'],['pendlade-gron','Pendlade utgångsskyltar - grön bakgrund'],['pendlade-kombinerad','Pendlade skyltar - grön och vit bakgrund'],['pendlade-tillbehor','Tillbehör']].map(([id,title])=>({isImplemented:true,status:'open',...byId.get(id),id,title,parentId:HANGING_PARENT}));
 const parent={isImplemented:true,status:'open',...byId.get(HANGING_PARENT),id:HANGING_PARENT,title:'Pendlade skyltar',parentId:null};
 const categories=[];let inserted=false;for(const category of existing){if([HANGING_PARENT,...HANGING_CHILDREN].includes(category.id)){if(!inserted){categories.push(parent,...children);inserted=true;}}else categories.push(category);}if(!inserted)categories.push(parent,...children);
 const articles=(catalog.articles||[]).map(article=>{const number=String(article.articleNumber),isGreen=['0401','0402','0403','0404'].includes(number),mixed=['0405','0406'].includes(number),accessory=article.hangingSignTextOnly||article.vinylText;if(accessory)return {...article,categoryId:'pendlade-tillbehor'};if(!isGreen&&!mixed)return article;
  const sides=Number(article.hangingSignSides)===2?'dubbelsidig':'enkelsidig';const next={...article,categoryId:mixed?'pendlade-kombinerad':'pendlade-gron',...(isGreen?{name:'Pendlad utgångsskylt – '+sides,desc:'Pendlad utgångsskylt – '+sides}:{} )};const image=hangingThumbnail(next);return {...next,image,cardImage:image,images:[image],primaryImageIndex:0,cardImageIndex:0};});
 return {...catalog,categories,articles,productUpdates:[...(catalog.productUpdates||[]),UPDATE]};
}
module.exports={HANGING_PARENT,HANGING_CHILDREN,hangingThumbnail,installHangingCategoryFamily};
