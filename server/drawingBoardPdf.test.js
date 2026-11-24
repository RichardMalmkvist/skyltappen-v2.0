const test=require('node:test'),assert=require('node:assert/strict'),express=require('express');
const {installDrawingLibrary,makeDrawingBoardPdf,cleanBoard,drawingBoardLabel}=require('./drawingLibrary');
const {elevatorArtwork}=require('./elevatorPdf');
const ot={type:'ot',name:'OT test',board:{widthMm:770,heightMm:1385,title:'Avdelningar',targetTitle:'M\u00e5lpunkt',showFloor:true,columns:1,targetBackground:true,lineStyle:'solid',rows:[{text:'Akutmottagningen',target:'G',floor:'2'}]}};
const elevator={type:'elevator',name:'Hiss G',floorCopies:2,cabinCopies:1,board:{widthMm:420,heightMm:485,liftLetter:'G',floors:[{heading:'Plan 2',text:'Utg\u00e5ng',highlightLine:0},{heading:'Plan 1',text:'Entr\u00e9',highlightLine:-1}]}};
function checkPdf(pdf,count,w,h){
 const raw=pdf.toString('latin1');assert.equal(pdf.subarray(0,5).toString(),'%PDF-');assert.equal((raw.match(/\/Type \/Page\b/g)||[]).length,count);
 const boxes=[...raw.matchAll(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/g)];assert.equal(boxes.length,count);
 for(const b of boxes){assert.ok(Math.abs(Number(b[1])*25.4/72-w)<.01);assert.ok(Math.abs(Number(b[2])*25.4/72-h)<.01);}
 assert.ok(raw.includes('/Name (Print Data)'),'same Print Data layer as orders');
 assert.equal(raw.includes('/Type /Font'),false,'letters must be vector outlines');
}
test('OT copies are separate pages use the order production label area above the paper',async()=>{
 const {pdf,filename}=await makeDrawingBoardPdf({...ot,quantity:3});checkPdf(pdf,3,770,1393);assert.equal(filename,'OT-test-3st.pdf');
});
test('elevator copy pages keep exact paper size and per-floor markers, with cabin version unmarked',async()=>{
 const {pdf}=await makeDrawingBoardPdf(elevator);checkPdf(pdf,3,420,493);
 const board=cleanBoard(elevator.board),first=elevatorArtwork(board,'Hiss G',0).body,second=elevatorArtwork(board,'Hiss G',1).body,cabin=elevatorArtwork(board,'Hiss G',-1).body;
 assert.equal((first.match(/data-elevator-marker/g)||[]).length,1);assert.notEqual(first,second);assert.ok(!cabin.includes('data-elevator-marker'));assert.ok(cabin.includes('#00b86b'));
});
test('invalid counts and unsupported boards reject',async()=>{
 for(const quantity of [0,-1,1.5,1001,undefined])await assert.rejects(makeDrawingBoardPdf({...ot,quantity}));
 for(const [floorCopies,cabinCopies] of [[0,0],[-1,1],[1.5,0],[1000,1]])await assert.rejects(makeDrawingBoardPdf({...elevator,floorCopies,cabinCopies}));
 await assert.rejects(makeDrawingBoardPdf({type:'file'}));await assert.rejects(makeDrawingBoardPdf({...ot,quantity:1,board:{...ot.board,widthMm:99}}));
});
test('PDF endpoint enforces access, returns PDF/error responses and never writes the library',async()=>{
 const app=express();app.use(express.json());let writes=0,reads=0;
 installDrawingLibrary(app,{canAccess:async req=>!!req.headers['x-test-role'],canEdit:async req=>req.headers['x-test-role']==='admin',read:async()=>{reads++;return {items:[],folders:[]}},write:async()=>{writes++}});
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const url='http://127.0.0.1:'+server.address().port+'/api/drawing-library/export-pdf';
 const post=(role,body)=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...(role?{'x-test-role':role}:{})},body:JSON.stringify(body)});
 try{
  assert.equal((await post(null,{...ot,quantity:1})).status,403);assert.equal((await post('staff',{...ot,quantity:1})).status,403);
  const invalid=await post('admin',{...ot,quantity:0});assert.equal(invalid.status,400);assert.ok((await invalid.json()).message);
  const good=await post('admin',{...ot,quantity:2});assert.equal(good.status,200);assert.equal(good.headers.get('content-type'),'application/pdf');assert.match(good.headers.get('content-disposition'),/attachment/);checkPdf(Buffer.from(await good.arrayBuffer()),2,770,1393);
  assert.equal(reads,0);assert.equal(writes,0);
 }finally{await new Promise(resolve=>server.close(resolve));}
});

test('production labels identify location, board and article',()=>{
 assert.equal(drawingBoardLabel({location:'Varnamo sjukhus',name:'Huvudentre del 1',articleNumber:'0810'}),'Varnamo sjukhus | Huvudentre del 1 | Art. 0810');
});

test('production start saves the order snapshot of each linked board once and preserves library settings',async()=>{
 let library={folders:[],items:[{...ot,id:'ot',folderId:'entrance',articleNumber:'0810',unitPrice:570},{...elevator,id:'lift'}]};
 let writes=0;
 const {syncProjectBoardsOnProductionStart:sync}=installDrawingLibrary(express(),{
  read:async()=>structuredClone(library),write:async next=>{library=next;writes++;}
 });
 const updatedOT={...ot.board,rows:[{text:'Ny mottagning',target:'B',floor:'1'}]};
 const updatedLift={...elevator.board,floors:[{heading:'Plan 2',text:'Ny entré'}]};
 const projectOrder={id:'order-1',projectId:'p',source:'project',status:'godkänd',cart:[
  {otBoardId:'ot',otBoard:updatedOT,unitPrice:200},
  {configuration:{elevatorBoardId:'lift',elevatorBoard:updatedLift},quantity:7},
  {otBoardId:'missing',otBoard:updatedOT},
  {otBoard:{uploadedArtwork:{id:'original'}}}
 ]};
 const started={...projectOrder,status:'påbörjad'};
 await sync({status:'ny'},projectOrder);
 await sync({status:'godkänd'},{...started,source:'manual'});
 assert.equal(writes,0);
 await sync(projectOrder,started);
 assert.equal(writes,1);
 assert.deepEqual(library.items[0].board,updatedOT);
 assert.equal(library.items[0].folderId,'entrance');
 assert.equal(library.items[0].unitPrice,570);
 assert.deepEqual(library.items[1].board,cleanBoard(updatedLift));
 assert.equal(library.items[1].floorCopies,2);
 library.items[0].board=ot.board;
 await sync(projectOrder,started);
 await sync(started,{...started,status:'klar'});
 assert.equal(writes,1);
 assert.deepEqual(library.items[0].board,ot.board);
});

test('conflicting versions of one board cannot partly update the drawing library',async()=>{
 let writes=0;
 const {syncProjectBoardsOnProductionStart:sync}=installDrawingLibrary(express(),{
  read:async()=>({folders:[],items:[{...ot,id:'ot'}]}),write:async()=>{writes++;}
 });
 const board={...ot.board,rows:[{text:'Ny entré',target:'B'}]};
 await assert.rejects(sync({status:'godkänd'},{id:'o',projectId:'p',source:'project',status:'påbörjad',
  cart:[{otBoardId:'ot',otBoard:ot.board},{otBoardId:'ot',otBoard:board}]
 }),{status:409});
 assert.equal(writes,0);
});
