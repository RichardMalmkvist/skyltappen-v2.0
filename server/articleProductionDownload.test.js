const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs/promises'),path=require('path'),os=require('os'),express=require('express');
const {installArticleProduction}=require('./articleProduction');
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="186mm" height="95mm" viewBox="0 0 186 95"><path fill="#e73a40" d="M0 0H186V95H0Z"/><rect x="1" y="1" width="184" height="93" fill="none" stroke="#ec2a90" stroke-width="0.1"/></svg>';
async function fixture(run){
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'jsf-article-pdf-'));const app=express();app.use(express.json());
 const store=installArticleProduction(app,{directory,staffAccess:async req=>['admin','personal'].includes(req.headers.role),adminAccess:async req=>req.headers.role==='admin'});
 const file=await store.save({name:'original-0609.svg',dataUrl:'data:image/svg+xml;base64,'+Buffer.from(svg).toString('base64'),cutColor:'#ec2a90'});
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 try{await run({store,file,url:'http://127.0.0.1:'+server.address().port});}
 finally{await new Promise(resolve=>server.close(resolve));assert.ok(path.resolve(directory).startsWith(path.join(os.tmpdir(),'jsf-article-pdf-')));await fs.rm(directory,{recursive:true,force:true});}
}
test('article original PDF is one page at physical size with Print Data and CutContour spot colour',()=>fixture(async({url,file})=>{
 const response=await fetch(url+'/api/article-production-files/'+file.id+'/pdf',{headers:{role:'admin'}});assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/application\/pdf/);assert.match(response.headers.get('content-disposition'),/original-0609\.pdf/);assert.equal(response.headers.get('cache-control'),'private, no-store');
 const bytes=Buffer.from(await response.arrayBuffer()),source=bytes.toString('latin1');assert.match(source,/CutContour/);assert.match(source,/\/Separation/);assert.match(source,/Print Data/);
 const task=(await import('pdfjs-dist/legacy/build/pdf.mjs')).getDocument({data:new Uint8Array(bytes),isEvalSupported:false});try{const doc=await task.promise;assert.equal(doc.numPages,1);const page=await doc.getPage(1),view=page.getViewport({scale:1});assert.ok(Math.abs(view.width*25.4/72-186)<.001);assert.ok(Math.abs(view.height*25.4/72-95)<.001);}finally{await task.destroy();}
}));
test('access follows staff permissions and the existing SVG download remains available',()=>fixture(async({url,file})=>{
 const route=url+'/api/article-production-files/'+file.id;
 assert.equal((await fetch(route+'/pdf')).status,403);assert.equal((await fetch(route+'/pdf',{headers:{role:'bestallare'}})).status,403);
 assert.equal((await fetch(route+'/pdf',{headers:{role:'personal'}})).status,200);
 const original=await fetch(route,{headers:{role:'admin'}});assert.equal(original.status,200);assert.match(await original.text(),/stroke="#ec2a90"/);
 assert.equal((await fetch(url+'/api/article-production-files/missing/pdf',{headers:{role:'admin'}})).status,404);
}));
test('original without a cut path remains a print-only PDF',()=>fixture(async({url,store})=>{
 const file=await store.save({name:'print.svg',dataUrl:'data:image/svg+xml;base64,'+Buffer.from(svg).toString('base64'),cutColor:null});
 const response=await fetch(url+'/api/article-production-files/'+file.id+'/pdf',{headers:{role:'admin'}});assert.equal(response.status,200);assert.doesNotMatch(Buffer.from(await response.arrayBuffer()).toString('latin1'),/CutContour/);
}));
