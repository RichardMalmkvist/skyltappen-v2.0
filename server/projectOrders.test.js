const test=require('node:test'),assert=require('node:assert/strict'),express=require('express'),fs=require('fs/promises'),os=require('os'),path=require('path');
const PDFDocument=require('pdfkit');
const {installProjectOrders}=require('./projectOrders');
const {buildProjectOrderCart}=require('./projectOrderItems');
const {attachOTBoards}=require('./otBoards');
const {installProjectOrderFiles,validateProjectOrderAssets}=require('./projectOrderFiles');
const {createArticleProductionStore,snapshotProductionFiles}=require('./articleProduction');
const {createProjectSignFileStore}=require('./projectSignFiles');
const {exportOrder}=require('./hangingSignPlotter');
const clone=value=>JSON.parse(JSON.stringify(value));
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="100mm" height="60mm" viewBox="0 0 100 60"><path d="M10 10H90V50H10Z" fill="#111111"/><rect x="1" y="1" width="98" height="58" fill="none" stroke="#ff00ff"/></svg>';
async function pdfBytes(){const doc=new PDFDocument({size:[300,200],margin:0});const chunks=[];const result=new Promise(resolve=>{doc.on('data',data=>chunks.push(data));doc.on('end',()=>resolve(Buffer.concat(chunks)));});doc.addSpotColor('CutContour',0,100,0,0);doc.rect(10,10,280,180).strokeColor('CutContour').stroke();doc.end();return result;}
async function fixture(run){
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'jsf-project-orders-'));
 const vectors=createArticleProductionStore({directory}),files=createProjectSignFileStore({directory});
 const original=await vectors.save({name:'skylt.svg',dataUrl:'data:image/svg+xml;base64,'+Buffer.from(svg).toString('base64'),cutColor:'#ff00ff'});
 const proof=await files.save({name:'korrektur.svg',dataUrl:'data:image/svg+xml;base64,'+Buffer.from(svg).toString('base64')});
 const bytes=await pdfBytes(),pdf=await files.save({name:'corel.pdf',dataUrl:'data:application/pdf;base64,'+bytes.toString('base64')},true);
 const catalog={articles:[{id:'a',articleNumber:'0704',name:'Katalogskylt',unitPrice:100,productType:'standard',productionFile:original}]};
 let projects=[{id:'p',number:'PRJ-1',reservedOrderNumber:'0026200-00',customer:'Testkund',signs:[
 {id:'own',kind:'catalog',articleId:'a',position:'S002',quantity:2,configuration:{customText:'Egen text',widthMm:300},unplaced:true},
 {id:'svg',kind:'svg',position:'S003',name:'Egen SVG',description:'Vinyl',widthMm:100,heightMm:60,quantity:2,price:125,material:'Vinyl',productionFile:original,proofFile:proof,notes:'Dörr 3',unplaced:true},
 {id:'pdf',kind:'svg',position:'S004',name:'Corel PDF',widthMm:100,heightMm:60,quantity:2,price:225,productionFile:pdf,proofFile:proof,unplaced:true}],drawings:[{id:'d',name:'Plan 1',markers:[{id:'placed',articleId:'a',position:'S001',quantity:1,text:'Entré',configuration:{customText:'Entré'},x:.2,y:.3,page:1}]}]}],orders=[],notifications=0;
 const app=express();app.use(express.json());
 const readOrders=async()=>clone(orders),staffAccess=async req=>['admin','personal'].includes(req.headers.role);
 const readAsset=installProjectOrderFiles(app,{readOrders,staffAccess,directory});
 installProjectOrders(app,{readProjects:async()=>clone(projects),writeProjects:async value=>{projects=clone(value);},readOrders,writeOrders:async value=>{orders=clone(value);},readCatalog:async()=>catalog,staffAccess,adminAccess:async req=>req.headers.role==='admin',accountSession:async()=>({id:'admin'}),readUsers:async()=>[],purchaserAccountId:()=>null,prepareOrderParts:async order=>[order],addOrderStatusNotification:()=>{notifications++;},reserveProjectOrderNumber:async project=>project.reservedOrderNumber,getNextSubmissionNumber:()=>42,getProjectDocumentDetails:()=>({customerReference:'REF'}),getProjectOrderer:project=>({customer:project.customer}),clearMissingProjectOrderLinks:()=>{},readAsset});
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));const base='http://127.0.0.1:'+server.address().port;
 const api=async(method,route,role='admin')=>{const response=await fetch(base+route,{method,headers:{role}});return {status:response.status,type:response.headers.get('Content-Type'),data:response.headers.get('Content-Type')?.includes('application/json')?await response.json():Buffer.from(await response.arrayBuffer())};};
 try{await run({api,catalog,readAsset,vectors,files,bytes,get projects(){return projects;},get orders(){return orders;},setProjects:value=>{projects=value;},notifications:()=>notifications});}
 finally{await new Promise(resolve=>server.close(resolve));assert.ok(path.resolve(directory).startsWith(path.join(os.tmpdir(),'jsf-project-orders-')));await fs.rm(directory,{recursive:true,force:true});}
}
test('one quote and order include drawing signs, standalone catalog, imported SVG and imported Corel PDF with correct totals',()=>fixture(async f=>{
 const quote=await f.api('GET','/api/projects/p/quote');assert.equal(quote.status,200);assert.equal(quote.data.quote.cart.length,4);assert.equal(quote.data.quote.orderTotal,1000);
 const result=await f.api('POST','/api/projects/p/create-order');assert.equal(result.status,201);const order=result.data.order;assert.equal(order.orderNumber,'0026200-00');assert.equal(order.cart.length,4);assert.equal(order.orderTotal,1000);assert.equal(order.orderDetails.customerReference,'REF');assert.equal(f.projects[0].orderId,order.id);
 assert.deepEqual(order.cart.map(item=>item.position),['S001','S002','S003','S004']);assert.equal(order.cart[0].drawingName,'Plan 1');assert.equal(order.cart[1].configuration.customText,'Egen text');assert.equal(order.cart[1].quantity,2);assert.equal(order.cart[3].format,'100 × 60 mm');assert.equal(order.cart[3].productionFile.storage,'project');assert.equal(order.cart[2].productionFile.storage,'article');assert.ok(order.cart[3].proofFile.id);
 f.projects[0].signs[2].name='Changed later';assert.equal(f.orders[0].cart[3].badgeName,'Corel PDF');assert.equal(f.notifications(),1);
}));
test('a project quote recovers the selected OT board name, location and price from its saved ID',()=>fixture(async f=>{
 const board={widthMm:420,heightMm:603,rows:[{text:'Mottagning',target:'A'}]};
 f.catalog.articles.push({id:'ot',articleNumber:'0810',name:'Pappersutskrift till OT-tavla',unitPrice:0});
 attachOTBoards(f.catalog,{folders:[{id:'ryhov',name:'Ryhov'}],items:[
  {id:'entry10',type:'ot',articleNumber:'0810',folderId:'ryhov',name:'Entré 10',board,unitPrice:475},
  {id:'entry12',type:'ot',articleNumber:'0810',folderId:'ryhov',name:'Entré 12',board,unitPrice:600}
 ]});
 f.setProjects([{...f.projects[0],drawings:[],signs:[
  {id:'legacy',articleId:'ot',position:'S038',quantity:2,configuration:{otBoard:board,otBoardId:'entry10'}},
  {id:'override',articleId:'ot',position:'S039',quantity:1,price:550,configuration:{otBoard:board,otBoardId:'entry12',otBoardName:'Entré 12'}}
 ]}]);
 const {status,data}=await f.api('GET','/api/projects/p/quote');
 assert.equal(status,200);
 assert.deepEqual(data.quote.cart.map(({otBoardName,otBoardLocation,unitPrice,lineTotal})=>[otBoardName,otBoardLocation,unitPrice,lineTotal]),[
  ['Entré 10','Ryhov',475,950],['Entré 12','Ryhov',550,550]
 ]);
 assert.equal(data.quote.orderTotal,1500);
}));
test('standalone-only projects and imported-only projects can create orders; concurrent requests never duplicate',()=>fixture(async f=>{
 f.setProjects([{...f.projects[0],drawings:[],signs:[f.projects[0].signs[2]]}]);
 const results=await Promise.all([f.api('POST','/api/projects/p/create-order'),f.api('POST','/api/projects/p/create-order')]);assert.deepEqual(results.map(x=>x.status).sort(),[201,409]);assert.equal(f.orders.length,1);assert.equal(f.orders[0].cart.length,1);assert.equal(f.orders[0].orderTotal,450);
}));
test('unknown catalog article, empty project or missing original stops order creation with clear validation',()=>fixture(async f=>{
 const base=clone(f.projects[0]);f.setProjects([{...base,drawings:[],signs:[{id:'x',kind:'catalog',articleId:'missing',position:'S001'}]}]);assert.equal((await f.api('POST','/api/projects/p/create-order')).status,400);
 f.setProjects([{...base,drawings:[],signs:[]}]);assert.equal((await f.api('POST','/api/projects/p/create-order')).status,400);
 f.setProjects([{...base,drawings:[],signs:[{...base.signs[2],productionFile:{id:'11111111-1111-1111-1111-111111111111',mime:'application/pdf'}}]}]);const missing=await f.api('POST','/api/projects/p/create-order');assert.equal(missing.status,400);assert.match(missing.data.message,/fil/);assert.equal(f.orders.length,0);assert.equal(f.projects[0].orderId,undefined);
}));
test('only admin creates orders and original access requires staff and a saved order item',()=>fixture(async f=>{
 for(const role of ['personal','bestallare','none'])assert.equal((await f.api('POST','/api/projects/p/create-order',role)).status,401);
 assert.equal((await f.api('GET','/api/projects/p/quote','personal')).status,200);assert.equal((await f.api('GET','/api/projects/p/quote','none')).status,401);
 const order=(await f.api('POST','/api/projects/p/create-order')).data.order;const route='/api/orders/'+order.id+'/project-original/3';
 assert.equal((await f.api('GET',route+'/proof','none')).status,403);assert.equal((await f.api('GET',route+'/proof','personal')).status,200);
 const original=await f.api('GET',route+'/production');assert.deepEqual(original.data,f.bytes);assert.equal((await f.api('GET',route.replace('/3','/0')+'/production')).status,404);assert.equal((await f.api('GET',route.replace(order.id,'missing')+'/production')).status,404);
 // The order keeps its files after the source project has gone.
 f.setProjects([]);assert.deepEqual((await f.api('GET',route+'/production')).data,f.bytes);
}));
test('Corel PDF exports preserve all original bytes and make a correctly numbered file per copy',()=>fixture(async f=>{
 const cart=buildProjectOrderCart(f.projects[0],f.catalog);const item=cart[3];
 const one=await exportOrder({orderNumber:'0026200-00',cart:[{...item,quantity:1}]},{readProjectFile:f.files.read},{});assert.equal(one.type,'application/pdf');assert.deepEqual(one.data,f.bytes);
 const two=await exportOrder({orderNumber:'0026200-00',cart:[item]},{readProjectFile:f.files.read},{});assert.equal(two.type,'application/zip');assert.match(two.data.toString('latin1'),/ex01-av2.pdf/);assert.match(two.data.toString('latin1'),/ex02-av2.pdf/);
 // ZIP local entries store the exact bytes; never flatten or re-render the Corel source.
 let offset=0,count=0;while(two.data.readUInt32LE(offset)===0x04034b50){const size=two.data.readUInt32LE(offset+18),nameLength=two.data.readUInt16LE(offset+26),extra=two.data.readUInt16LE(offset+28),start=offset+30+nameLength+extra;assert.deepEqual(two.data.subarray(start,start+size),f.bytes);count++;offset=start+size;}assert.equal(count,2);
 const svgExport=await exportOrder({orderNumber:'0026200-00',cart:[cart[2]]},{readProductionFile:f.vectors.read},{});assert.equal(svgExport.type,'application/pdf');assert.match(svgExport.data.toString('latin1'),/CutContour/);
}));
test('editing an order retains trusted immutable original/proof refs while forged checkout refs are discarded',()=>fixture(async f=>{
 const cart=buildProjectOrderCart(f.projects[0],f.catalog),old=cart[3];const changed=snapshotProductionFiles([{...old,quantity:5,productionFile:{id:'forged'},proofFile:{id:'fake'},previewType:'image'}],f.catalog,cart)[0];assert.deepEqual(changed.productionFile,old.productionFile);assert.deepEqual(changed.proofFile,old.proofFile);assert.equal(changed.previewType,'project_original');assert.equal(changed.quantity,5);
 const forged=snapshotProductionFiles([{id:'new',articleNumber:'Special',projectOriginal:true,proofFile:old.proofFile,productionFile:old.productionFile}],f.catalog)[0];assert.equal(forged.productionFile,null);assert.equal(forged.proofFile,null);assert.equal(forged.projectOriginal,false);
}));
