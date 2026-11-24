const fs=require('fs/promises'),path=require('path'),crypto=require('crypto'),sax=require('sax');
const PDFDocument=require('pdfkit'),SVGtoPDF=require('svg-to-pdfkit');
const {sanitizeSvgSymbol}=require('./svgSymbol');
const {HEADER_MM,drawProductionLabel}=require('./productionLabel');
const MAX_BYTES=5*1024*1024,mm=n=>n*72/25.4;
const validId=id=>/^[a-f0-9-]{36}$/.test(String(id||''));
const hasProductionFile=item=>validId(item?.productionFile?.id);
const fail=message=>{throw Object.assign(new Error(message),{validation:true});};
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const physicalSvg=(svg,size)=>svg.replace(/width="[^"]+"/,'width="'+size.widthMm+'mm"').replace(/height="[^"]+"/,'height="'+size.heightMm+'mm"');
function dimensions(source){
 let attrs;const parser=sax.parser(true);parser.onopentag=node=>{if(!attrs)attrs=node.attributes;};parser.write(source).close();
 const physical=value=>{const match=/^\s*([0-9.]+)\s*(mm|cm|in|pt)\s*$/.exec(String(value));return match?Number(match[1])*({mm:1,cm:10,in:25.4,pt:25.4/72}[match[2]]):NaN;};
 const widthMm=physical(attrs?.width),heightMm=physical(attrs?.height);
 if(![widthMm,heightMm].every(n=>Number.isFinite(n)&&n>=1&&n<=5000))fail('SVG-originalet måste ha bredd och höjd i mm, cm, tum eller punkter, mellan 1 och 5000 mm. Exportera från Corel med riktiga dokumentmått.');
 return {widthMm,heightMm};
}
function splitArtwork(svg,cutColor){
 const parser=sax.parser(true),stack=[];let root;const shapes=new Set(['path','rect','circle','ellipse','polygon','polyline','line']);let cutCount=0;
 parser.onopentag=n=>{const node={tag:n.name,attrs:n.attributes,children:[]};if(stack.length)stack.at(-1).children.push(node);else root=node;stack.push(node);};parser.onclosetag=()=>stack.pop();parser.write(svg).close();
 const color=value=>{const v=String(value||'').toLowerCase();return /^#[0-9a-f]{3}$/.test(v)?'#'+[...v.slice(1)].map(c=>c+c).join(''):v;};
 function render(node,layer,inherited={},inDefs=false){
  const attrs={...node.attrs},paint={...inherited,...attrs},defs=inDefs||node.tag==='defs';
  if(shapes.has(node.tag)&&!defs){
   const cutting=cutColor&&color(paint.stroke)===color(cutColor);
   if(layer==='cut'&&!cutting)return '';
   if(layer==='print'&&cutting){attrs.stroke='none';if((paint.fill||'black')==='none')return '';}
   if(layer==='cut'){cutCount++;attrs.fill='none';attrs.stroke='#ec2a90';}
  }
  const children=node.children.map(child=>render(child,layer,paint,defs)).join('');
  if(!shapes.has(node.tag)&&node.tag!=='svg'&&node.tag!=='defs'&&!children)return '';
  return '<'+node.tag+Object.entries(attrs).map(([key,value])=>' '+key+'="'+esc(value)+'"').join('')+'>'+children+'</'+node.tag+'>';
 }
 const printSvg=render(root,'print'),cutSvg=cutColor?render(root,'cut'):null;
 return {printSvg,cutSvg,cutCount};
}
function parseOriginal({name,dataUrl,cutColor=null}={}){
 const match=/^data:image\/svg\+xml(?:;charset=[\w-]+)?;base64,([A-Za-z0-9+/]+={0,2})$/i.exec(String(dataUrl||''));
 if(!match||match[1].length>Math.ceil(MAX_BYTES/3)*4)fail('Välj ett SVG-original från Corel på högst 5 MB.');
 const bytes=Buffer.from(match[1],'base64');if(bytes.length>MAX_BYTES)fail('Produktionsoriginalet får vara högst 5 MB.');
 const source=bytes.toString('utf8'),vector=sanitizeSvgSymbol(source,{maxBytes:MAX_BYTES,maxElements:30000}),size=dimensions(source);
 if(cutColor!==null&&!/^#[0-9a-f]{6}$/i.test(String(cutColor)))fail('Välj en giltig färg för skärlinjen.');
 const normalizedColor=cutColor?String(cutColor).toLowerCase():null,art=splitArtwork(vector.svg,normalizedColor);
 if(normalizedColor&&!art.cutCount)fail('Ingen skärlinje med den valda färgen hittades i originalet. Välj rätt skärlinjefärg eller avmarkera skärlinje.');
 return {svg:physicalSvg(vector.svg,size),...size,cutColor:normalizedColor,cutCount:art.cutCount,name:String(name||'Produktionsoriginal.svg').split(/[\\/]/).pop().replace(/[\x00-\x1f\x7f]/g,'').slice(0,150),mime:'image/svg+xml',size:bytes.length};
}
function createArticleProductionStore({blobFor=async()=>null,directory=__dirname}={}){
 const local=(id,ext)=>path.join(directory,'article-production-files',id+'.'+ext);
 async function put(id,ext,data,mime){const blob=await blobFor('article-production-files/'+id+'.'+ext);if(blob)await blob.uploadData(Buffer.from(data),{blobHTTPHeaders:{blobContentType:mime}});else{await fs.mkdir(path.dirname(local(id,ext)),{recursive:true});await fs.writeFile(local(id,ext),data);}}
 async function get(id,ext){const blob=await blobFor('article-production-files/'+id+'.'+ext);return blob?await blob.downloadToBuffer():await fs.readFile(local(id,ext));}
 return {
  async save(input){const parsed=parseOriginal(input),id=crypto.randomUUID(),{svg,...details}=parsed,meta={id,...details,uploadedAt:new Date().toISOString()};await put(id,'svg',svg,'image/svg+xml');await put(id,'json',JSON.stringify(meta),'application/json');return meta;},
  async read(id){if(!validId(id))fail('Produktionsoriginalet saknas.');const [info,bytes]=await Promise.all([get(id,'json'),get(id,'svg')]);const meta=JSON.parse(info.toString('utf8')),vector=sanitizeSvgSymbol(bytes,{maxBytes:MAX_BYTES,maxElements:30000});return {...meta,svg:physicalSvg(vector.svg,meta)};},
 };
}
function resolveArticle(item,catalog){return (catalog.articles||[]).find(a=>String(a.id)===String(item.articleId||item.badgeId))||(catalog.articles||[]).find(a=>String(a.articleNumber||'')===String(item.articleNumber||'')&&String(item.articleNumber||''));}
function productionFileFor(item,catalog){return item.productionFile||resolveArticle(item,catalog)?.productionFile;}
function snapshotProductionFiles(cart,catalog,previous=[]){
 return cart.map(item=>{
  if(!item)return item;
  const article=resolveArticle(item,catalog),old=previous.find(saved=>saved.id&&saved.id===item.id);
  const sameArticle=old&&((old.articleId||old.badgeId) ? String(old.articleId||old.badgeId)===String(item.articleId||item.badgeId) : old.articleNumber&&old.articleNumber===item.articleNumber);
  const file=sameArticle&&hasProductionFile(old)?old.productionFile:article?.productionFile;
  // Catalog metadata wins over arbitrary references supplied in a checkout body.
  const projectOriginal=sameArticle&&old.projectOriginal===true;
  return {...item,productionFile:hasProductionFile({productionFile:file})?{...file}:null,...(old?.projectOriginal||item.projectOriginal?{projectOriginal:Boolean(projectOriginal),proofFile:projectOriginal&&old.proofFile?{...old.proofFile}:null,...(projectOriginal?{previewType:'project_original'}:{})}:{})};
 });
}
async function makeArticleProductionPdf(asset,quantity,title,{label,drawPrint}={}){
 if(!Number.isInteger(quantity)||quantity<1||quantity>1000)fail('Antalet måste vara mellan 1 och 1000.');
 const {widthMm:w,heightMm:h}=asset,header=label?HEADER_MM:0,art=splitArtwork(asset.svg,asset.cutColor);
 const doc=new PDFDocument({autoFirstPage:false,pdfVersion:'1.6',info:{Title:title,Creator:'JSF Flow',Subject:'Fast produktionsoriginal, 1:1'}}),chunks=[];
 const done=new Promise((resolve,reject)=>{doc.on('data',part=>chunks.push(part));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);});done.catch(()=>{});
 try{
  const print=doc.ref({Type:'OCG',Name:new String('Print Data')});print.end();const layers=[print];let cut;
  if(art.cutCount){cut=doc.ref({Type:'OCG',Name:new String('CutContour')});cut.end();layers.push(cut);doc.addSpotColor('CutContour',0,100,0,0);}
  doc._root.data.OCProperties={OCGs:layers,D:{Order:layers,ON:layers}};
  function draw(svg,cutting){
   const sized=svg.replace(/width="[^"]+"/,'width="'+mm(w)+'"').replace(/height="[^"]+"/,'height="'+mm(h)+'"'),lineWidth=doc.lineWidth;
   if(cutting)doc.lineWidth=function(){return lineWidth.call(doc,0);};
   try{SVGtoPDF(doc,sized,0,mm(header),{assumePt:true,width:mm(w),height:mm(h),colorCallback:(color,raw)=>cutting&&raw?.toLowerCase()==='#ec2a90'?['CutContour',1]:color,warningCallback:message=>fail('Produktionsoriginalet kunde inte exporteras: '+message)});}finally{doc.lineWidth=lineWidth;}
  }
  for(let copy=1;copy<=quantity;copy++){
   doc.addPage({size:[mm(w),mm(h+header)],margin:0});doc.page.dictionary.data.TrimBox=[0,0,mm(w),mm(h)];doc.page.resources.data.Properties={PrintData:print,...(cut?{CutContour:cut}:{})};
   doc.addContent('/OC /PrintData BDC');drawProductionLabel(doc,label,w,{copy,quantity});draw(art.printSvg,false);if(drawPrint)drawPrint(doc,{headerMm:header});doc.addContent('EMC');
   if(cut){doc.addContent('/OC /CutContour BDC');draw(art.cutSvg,true);doc.addContent('EMC');}
  }
  doc.end();return await done;
 }catch(error){doc.destroy(error);throw error;}
}
function installArticleProduction(app,{adminAccess,staffAccess,...options}){
 const store=createArticleProductionStore(options);
 app.get('/api/article-production-files/:id/pdf',async(req,res)=>{
  try{
   if(!await staffAccess(req))return res.status(403).json({message:'Du har inte behörighet att hämta produktionsoriginal.'});
   let asset;try{asset=await store.read(req.params.id);}catch(error){return res.status(404).json({message:'Produktionsoriginalet hittades inte.'});}
   const name=asset.name.replace(/\.svg$/i,'')+'.pdf';
   const bytes=await makeArticleProductionPdf(asset,1,name);
   res.set({'Content-Type':'application/pdf','Content-Disposition':"attachment; filename=\"produktionsoriginal.pdf\"; filename*=UTF-8''"+encodeURIComponent(name),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}).send(bytes);
  }catch(error){res.status(error.validation?400:500).json({message:error.validation?error.message:'Kunde inte skapa produktionsoriginalet som PDF.'});}
 });
 app.post('/api/admin/article-production-files',async(req,res)=>{try{if(!await adminAccess(req))return res.status(403).json({message:'Du har inte behörighet att lägga till produktionsoriginal.'});const file=await store.save(req.body);res.status(201).json({file});}catch(error){res.status(error.validation?400:500).json({message:error.validation?error.message:'Kunde inte spara produktionsoriginalet.'});}});
 app.get('/api/article-production-files/:id',async(req,res)=>{try{if(!await staffAccess(req))return res.status(403).json({message:'Du har inte behörighet att hämta produktionsoriginal.'});const asset=await store.read(req.params.id);res.set({'Content-Type':'image/svg+xml','Content-Disposition':"attachment; filename=\"produktionsoriginal.svg\"; filename*=UTF-8''"+encodeURIComponent(asset.name),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}).send(asset.svg);}catch(error){res.status(404).json({message:'Produktionsoriginalet hittades inte.'});}});
 return store;
}
module.exports={parseOriginal,splitArtwork,hasProductionFile,productionFileFor,snapshotProductionFiles,createArticleProductionStore,makeArticleProductionPdf,installArticleProduction};
