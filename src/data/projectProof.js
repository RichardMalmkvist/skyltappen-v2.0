import {roadSignModel} from './roadSignModels';
import {isParkingPole,poleFormat} from './parkingPole';
import {hangingStackEntries,hangingStackFormat} from './hangingStack';
import {resolveOutdoorArticle,outdoorFormat} from './outdoorBusinessSigns';
import {decalArticleNumber} from './customDecalArticles';
import {getOTBoardSelection} from './otBoardSelection';
const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().filter(key=>value[key]!==undefined).map(key=>[key,stable(value[key])])):value;

export function projectProofGroups(project,articles=[]){
 const groups=new Map();
 for(const drawing of [...(project.drawings||[]),{id:'__standalone__',name:'Utan ritning',markers:project.signs||[]}])for(const [index,marker] of (drawing.markers||[]).entries()){
  const baseArticle=articles.find(article=>String(article.id)===String(marker.articleId))||articles.find(article=>String(article.articleNumber)===String(marker.articleNumber||marker.articleId));
  const original=resolveOutdoorArticle(baseArticle,marker.configuration?.dibondSign,articles);
  let product=marker.kind==='svg'?{id:'custom:'+marker.id,name:marker.name,desc:marker.description,material:marker.material,format:`${marker.widthMm} × ${marker.heightMm} mm`,price:marker.price,categoryId:'project-special',image:marker.proofImage}:original?{...original,name:marker.name||original.name,desc:marker.description??original.desc,material:marker.material||original.material,price:marker.price??original.price}:null;
  const configuration={...(marker.configuration||{})};delete configuration.quantity;delete configuration.notes;
  const form={...configuration,customText:configuration.customText||configuration.customTextLine1||configuration.doorHeading||marker.text||marker.signText||'',...(marker.price!==undefined?{unitPrice:marker.price}:{}),quantity:1};
  const ot = getOTBoardSelection(original, configuration);
  if (ot) {
   Object.assign(form,{otBoard:ot.board,otBoardName:ot.name,otBoardLocation:ot.location});
   if (marker.price == null && ot.unitPrice != null) form.unitPrice = ot.unitPrice;
  }
  if (product && (ot || form.elevatorBoard)) product={...product,previewType:ot?'ot_board':'elevator_board'};
  const stack=configuration.hangingStack?.items?.length?hangingStackEntries(original,configuration,articles):null;
  if(stack)form.hangingStack={...form.hangingStack,items:form.hangingStack.items.map((item,index)=>({...item,product:stack[index+1].product}))};
  if(stack&&product){const price=stack.reduce((sum,entry,index)=>sum+Number(index===0&&marker.price!==undefined?marker.price:entry.product?.price??entry.product?.unitPrice??0)*(isParkingPole(entry.product)?Number(entry.form.poleCount??1):1),0);product={...product,name:'Skyltpaket – '+stack.length+' skyltar',price,unitPrice:price};if(marker.price!==undefined)form.unitPrice=price;}
  const key=JSON.stringify(stable({articleId:product?.id||marker.articleId,configuration:form,text:marker.text||marker.signText||'',symbols:marker.symbols||''}));
  if(!groups.has(key))groups.set(key,{key,assemblyProduct:stack?{...original,price:marker.price??original?.price??original?.unitPrice,name:marker.name||original?.name,desc:marker.description??original?.desc}:undefined,product:product||null,articleNumber:(stack?stack.map(entry=>entry.product?.articleNumber||'?').join(' / '):decalArticleNumber(product||{},form))||marker.articleNumber||marker.articleId||'',form,quantity:0,locations:[],notes:[]});
  const group=groups.get(key),quantity=Number(marker.quantity??1);
  if(!Number.isSafeInteger(quantity)||quantity<1)throw new Error(`Ogiltigt antal för ${marker.position||marker.id}. Kontrollera projektets skyltlista.`);
  group.quantity+=quantity;
  group.locations.push({signKey:drawing.id==='__standalone__'?marker.id:`drawing:${drawing.id}:${marker.id}`,drawingId:drawing.id,markerId:marker.id,drawingName:drawing.name,position:marker.position||`S${String(marker.number||index+1).padStart(3,'0')}`,page:Number(marker.page||1),unplaced:drawing.id==='__standalone__'||marker.unplaced===true,quantity});
  const note=String(marker.notes||marker.configuration?.notes||'').trim();
  if(note&&!group.notes.includes(note))group.notes.push(note);
 }
 return [...groups.values()];
}

export function proofMarkers(drawing,page){
 return (drawing.markers||[]).flatMap((marker,index)=>{
  if(marker.unplaced===true||Number(marker.page||1)!==page)return [];
  if(![marker.x,marker.y].every(value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=1))throw new Error(`Placeringen för ${marker.position||marker.id} på ${drawing.name} är ogiltig.`);
  return [{...marker,position:marker.position||`S${String(marker.number||index+1).padStart(3,'0')}`}];
 });
}

export function proofFormat(product,form){
 if(isParkingPole(product))return poleFormat(form);
 const sign=form.dibondSign;
 const board=form.otBoard||form.elevatorBoard;
 if(form.hangingStack?.items?.length)return hangingStackFormat(product,form);
 return sign?.outdoorSign?outdoorFormat(sign):sign?`${sign.widthMm} × ${sign.heightMm} mm`:board?`${board.widthMm} × ${Number(board.heightMm)+(form.elevatorBoard&&form.elevatorOrderMode==='complete'?100:0)} mm`:form.format||product?.format||'';
}

function proofCategory(product,categories){
 const id=String(product?.categoryId||'');
 if(id==='dorrskyltar'||(!id&&product?.productType==='dorrskylt'))return {id:'doors',label:'Dörrskyltar',rank:0};
 if(/^pendlade/.test(id)||(!id&&product?.productType==='pendlad_skylt'))return {id:'hanging',label:'Pendlade skyltar',rank:1};
 const category=categories.find(category=>String(category.id)===id);
 const labels={'project-special':'Specialskyltar',inomhusskyltar:'Inomhusskyltar',namnbrickor:'Namnbrickor',dorropnare:'Dörröppnare','taktila-piktogram':'Taktila piktogram',taktilapiktogram:'Taktila piktogram'};
 return {id:id||'other',label:category?.title||category?.name||labels[id]||(id?id.replace(/[-_]/g,' '):'Övriga produkter'),rank:2};
}

export function proofAnnotations(values=[]){
 const rooms=[],notes=[],seenRooms=new Set();
 for(const value of values)for(const raw of String(value).split(/\r\n|\r|\n/)){
  const line=raw.trim();if(!line)continue;
  const match=/^(?:rumsnummer|rumsnr\.?|rum(?:\s*nr\.?)?)(?:\s*[:#]\s*|\s+)(.+)$/i.exec(line);
  const candidates=match?match[1].split(/\s*[,;]\s*/).map(value=>value.trim()):[];
  if(candidates.length&&candidates.every(value=>/^[\p{L}\p{N}][\p{L}\p{N}._/-]*$/u.test(value))){
   for(const room of candidates){const key=room.toLocaleLowerCase('sv');if(!seenRooms.has(key)){rooms.push(room);seenRooms.add(key);}}
  }else if(!notes.includes(line))notes.push(line);
 }
 return {rooms,notes};
}

export function proofLocationLines(locations){
 const drawings=new Map();
 for(const location of locations){
  const key=JSON.stringify([location.drawingId,location.page,location.unplaced]);
  if(!drawings.has(key))drawings.set(key,{...location,positions:[]});
  drawings.get(key).positions.push(location.position);
 }
 return [...drawings.values()].map(location=>`${location.positions.join(', ')} · ${location.unplaced?'Utan placering':`${location.drawingName}, sida ${location.page}`}`);
}

// A design appears once. Long metadata receives a full page instead of repeated artwork.
export function projectProofPages(groups,categories=[]){
 const sections=new Map();
 for(const group of groups){
  const category=proofCategory(group.product,categories);
  if(!sections.has(category.id))sections.set(category.id,{...category,groups:[]});
  const quantity=group.locations.reduce((sum,location)=>sum+location.quantity,0);
  sections.get(category.id).groups.push({...group,quantity});
 }
 return [...sections.values()].sort((a,b)=>a.rank-b.rank||a.label.localeCompare(b.label,'sv')).flatMap(section=>{
  const sorted=[...section.groups].sort((a,b)=>String(a.articleNumber).localeCompare(String(b.articleNumber),'sv',{numeric:true}));
  const pages=[];let current=[];
  const flush=()=>{if(current.length){pages.push({categoryId:section.id,label:section.label,groups:current});current=[];}};
  const needsFullPage=group=>Boolean(roadSignModel(group.product)&&group.form?.hangingStack?.items?.length)||proofLocationLines(group.locations).join(' ').length+(group.notes||[]).join(' ').length>550||group.locations.length>12;
  const articleGroups=new Map();
  for(const group of sorted){
   const number=String(group.articleNumber);
   if(!articleGroups.has(number))articleGroups.set(number,[]);
   articleGroups.get(number).push(group);
  }
  for(const article of articleGroups.values()){
   // Keep a whole article together when it fits on one normal product page.
   if(article.length<=4&&!article.some(needsFullPage)&&current.length+article.length>4)flush();
   for(const group of article){
    if(needsFullPage(group)){flush();pages.push({categoryId:section.id,label:section.label,groups:[group],spacious:true});}
    else{current.push(group);if(current.length===4)flush();}
   }
  }
  flush();return pages;
 });
}
