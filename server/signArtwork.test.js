const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs/promises'),os=require('os'),path=require('path');
const PDFDocument=require('pdfkit');
const {createSignArtworkStore,installSignArtwork}=require('./signArtwork');
const {exportOrder}=require('./hangingSignPlotter');
const {buildProjectOrderItems}=require('./projectOrderGrouping');
const {freezeCustomSigns}=require('./projectProofSnapshot');
const {validateProjectConfiguration}=require('../src/data/hangingStack');
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="600mm" height="400mm" viewBox="0 0 600 400"><rect width="600" height="400" fill="white"/><path d="M20 20H580V380H20Z" fill="#155ba0"/></svg>';
const input={name:'Corel.svg',dataUrl:'data:image/svg+xml;base64,'+Buffer.from(svg).toString('base64')};
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
async function fixture(action){const directory=await fs.mkdtemp(path.join(os.tmpdir(),'jsf-artwork-'));try{await action(createSignArtworkStore({directory}),directory);}finally{if(path.dirname(directory)===os.tmpdir())await fs.rm(directory,{recursive:true,force:true});}}
function product(art,articleNumber='0901'){return {articleNumber,previewType:'dibond_sign',productType:'dibondskylt',quantity:1,dibondSign:{widthMm:600,heightMm:400,lines:[],uploadedArtwork:art}};}
test('SVG preview, project configuration and frozen proof retain the original through order production',()=>fixture(async(store,directory)=>{
 const art=await store.save(input);assert.equal(art.widthMm,600);assert.equal(art.heightMm,400);assert.match((await store.read(art.id)).preview,/^data:image\/svg/);
 const article={id:'a',articleNumber:'0901',previewType:'dibond_sign',unitPrice:8800};
 const marker={id:'s',articleId:'a',quantity:1,configuration:{dibondSign:product(art).dibondSign}};
 validateProjectConfiguration(marker.configuration);
 const [item]=buildProjectOrderItems([marker],[article]);assert.equal(item.dibondSign.uploadedArtwork.id,art.id);
 const frozen=await freezeCustomSigns({signs:[marker],drawings:[]},{directory},[article]);assert.equal(frozen.length,1);assert.match(Buffer.from(frozen[0].production.data,'base64').toString(),/155ba0/);
 const result=await exportOrder({orderNumber:'TEST',cart:[item]},{artworkStore:store});assert.equal(result.type,'application/pdf');
 const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs'),task=pdfjs.getDocument({data:new Uint8Array(result.data),isEvalSupported:false});
 try{const pdf=await task.promise;assert.equal(pdf.numPages,1);const page=await pdf.getPage(1);assert.ok(Math.abs(page.view[2]-600*72/25.4)<.01);}finally{await task.destroy();}
 await store.validate({...item,dibondSign:{...item.dibondSign,widthMm:601}});
 await assert.rejects(store.validate({...item,dibondSign:{...item.dibondSign,artworkPlacement:{xMm:500,yMm:0,widthMm:200,heightMm:200}}}),/inom skyltytan/);
 await assert.rejects(store.save({...input,dataUrl:'data:image/svg+xml;base64,'+Buffer.from(svg.replace('<path','<script>alert(1)</script><path')).toString('base64')}));
}));
test('PDF remains byte-for-byte unchanged in production, with no generated blank sign alongside it',()=>fixture(async(store)=>{
 const doc=new PDFDocument({size:[600*72/25.4,400*72/25.4]}),parts=[];const bytes=await new Promise((resolve,reject)=>{doc.on('data',b=>parts.push(b));doc.on('end',()=>resolve(Buffer.concat(parts)));doc.on('error',reject);doc.text('Corel original');doc.end();});
 const art=await store.save({name:'Corel.pdf',dataUrl:'data:application/pdf;base64,'+bytes.toString('base64'),preview:png});
 for(const number of ['0901','0705','1230']){const result=await exportOrder({orderNumber:'TEST',cart:[product(art,number)]},{artworkStore:store});assert.equal(result.type,'application/pdf');assert.deepEqual(result.data,bytes);}
 const ot={articleNumber:'0810',previewType:'ot_board',quantity:1,otBoard:{widthMm:600,heightMm:400,uploadedArtwork:art}};
 assert.deepEqual((await exportOrder({cart:[ot]},{artworkStore:store})).data,bytes);
 await assert.rejects(store.validate({...ot,otBoard:{...ot.otBoard,uploadedArtwork:{...art,id:'00000000-0000-0000-0000-000000000000',preview:'/api/sign-artworks/00000000-0000-0000-0000-000000000000/preview'}}}),/hittades/);
}));
test('Upload requires an approved account and the saved preview is served as an inert image',()=>fixture(async(store,directory)=>{
 const express=require('express'),app=express();app.use(express.json());installSignArtwork(app,{directory,accountSession:async req=>req.headers.authorization?{id:'user'}:null});const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));const base='http://127.0.0.1:'+server.address().port;
 try{assert.equal((await fetch(base+'/api/sign-artworks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)})).status,401);const response=await fetch(base+'/api/sign-artworks',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'test'},body:JSON.stringify(input)});assert.equal(response.status,201);const {artwork}=await response.json(),preview=await fetch(base+artwork.preview);assert.equal(preview.status,200);assert.match(preview.headers.get('Content-Security-Policy'),/sandbox/);}finally{await new Promise(resolve=>server.close(resolve));}
}));
