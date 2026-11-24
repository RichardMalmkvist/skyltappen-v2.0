const {test}=require('node:test'),assert=require('node:assert/strict');
const PDFKit=require('pdfkit'),{PDFDocument,PDFName}=require('pdf-lib');
const {placedArtworkPdf}=require('./signArtworkPdf');
const {placeArtwork,artworkBounds,signArtworkError}=require('../src/data/signArtwork');
const mm=n=>n*72/25.4;
const art={id:'11111111-2222-3333-4444-555555555555',widthMm:600,heightMm:400,mime:'application/pdf',preview:'/api/sign-artworks/11111111-2222-3333-4444-555555555555/preview'};
test('Placement preserves aspect ratio and limits movement and resizing to the surface',()=>{
 let sign={widthMm:600,heightMm:400,uploadedArtwork:art};sign=placeArtwork(sign,{widthMm:300,xMm:100,yMm:50});
 assert.deepEqual(artworkBounds(sign),{x:100,y:50,width:300,height:200});
 assert.equal(signArtworkError(art,600,400,sign.artworkPlacement),null);
 sign=placeArtwork(sign,{xMm:900,yMm:-20});assert.deepEqual(artworkBounds(sign),{x:300,y:0,width:300,height:200});
 assert.match(signArtworkError(art,600,400,{xMm:0,yMm:NaN,widthMm:200,heightMm:100}),/inom skyltytan/);
});
async function original(){const doc=new PDFKit({size:[mm(600),mm(400)],margin:0,compress:false}),parts=[];const ready=new Promise(resolve=>{doc.on('data',b=>parts.push(b));doc.on('end',()=>resolve(Buffer.concat(parts)));});doc.fontSize(20).text('Vector original',mm(20),mm(20));doc.addSpotColor('CutContour',0,100,0,0);doc.strokeColor('CutContour').lineWidth(.05).rect(mm(2),mm(2),mm(596),mm(396)).stroke();doc.end();return ready;}
test('Placed PDF retains vector text and CutContour, has sign dimensions and correct physical offset and scale',async()=>{
 const bytes=await original(),sign=placeArtwork({widthMm:600,heightMm:400,uploadedArtwork:art},{widthMm:300,xMm:100,yMm:50});
 const result=await placedArtworkPdf({mime:'application/pdf',bytes},sign,2,'Placed');
 const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');
 const source=pdfjs.getDocument({data:new Uint8Array(bytes),isEvalSupported:false}),placed=pdfjs.getDocument({data:new Uint8Array(result),isEvalSupported:false});
 const before=await source.promise,after=await placed.promise;
 assert.equal(after.numPages,2);const page=await after.getPage(1);assert.ok(Math.abs(page.view[2]-mm(600))<.01);assert.ok(Math.abs(page.view[3]-mm(400))<.01);
 const text0=(await(await before.getPage(1)).getTextContent()).items[0],text=(await page.getTextContent()).items[0];assert.equal(text.str,'Vector original');
 assert.ok(Math.abs(text.transform[4]-(text0.transform[4]*.5+mm(100)))<.01);
 assert.ok(Math.abs(text.transform[5]-(text0.transform[5]*.5+mm(150)))<.01);
 const document=await PDFDocument.load(result),xobjects=document.getPage(0).node.Resources().lookup(PDFName.of('XObject'));const form=document.context.lookup(xobjects.values()[0]);
 const colours=form.dict.lookup(PDFName.of('Resources')).lookup(PDFName.of('ColorSpace'));
 assert.ok(colours.values().some(value=>document.context.lookup(value).toString().includes('CutContour')));
 await source.destroy();await placed.destroy();
});
test('A complete original scaled to a smaller sign exports at the new sign dimensions',async()=>{
 const bytes=await original(),result=await placedArtworkPdf({mime:'application/pdf',bytes},{widthMm:300,heightMm:200,uploadedArtwork:art},1,'Smaller');
 const pdf=await PDFDocument.load(result),page=pdf.getPage(0);assert.ok(Math.abs(page.getWidth()-mm(300))<.01);assert.ok(Math.abs(page.getHeight()-mm(200))<.01);
});
