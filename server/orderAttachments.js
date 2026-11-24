const fs=require('fs/promises');
const path=require('path');
const crypto=require('crypto');
const {buyerOrderVisible}=require('../src/data/buyerOrders');
const MAX_FILE=10*1024*1024,MAX_TOTAL=20*1024*1024;
function validateAttachments(input=[]){
 if(!Array.isArray(input)||input.length>5)throw new Error('Bifoga högst 5 PDF-filer.');
 let total=0;
 return input.map(file=>{
  const match=/^data:application\/pdf;base64,([A-Za-z0-9+/]+={0,2})$/.exec(String(file?.dataUrl||''));
  if(!match||match[1].length>Math.ceil(MAX_FILE/3)*4)throw new Error('Välj en PDF-fil på högst 10 MB.');
  const bytes=Buffer.from(match[1],'base64');total+=bytes.length;
  if(!bytes.length||bytes.length>MAX_FILE||bytes.subarray(0,5).toString()!=='%PDF-'||bytes.toString('base64')!==match[1])throw new Error('Bilagan är inte en giltig PDF-fil.');
  if(total>MAX_TOTAL)throw new Error('Bilagorna får tillsammans vara högst 20 MB.');
  const name=String(file.name||'Bilaga.pdf').split(/[\\/]/).pop().replace(/[\x00-\x1f\x7f]/g,'').trim().slice(0,150)||'Bilaga.pdf';
  return {id:crypto.randomUUID(),name:name.toLowerCase().endsWith('.pdf')?name:name+'.pdf',size:bytes.length,mime:'application/pdf',bytes};
 });
}
function createOrderAttachments({app,readOrders,accountSession,blobFor,directory}){
 const local=id=>path.join(directory,id+'.pdf');
 async function remove(files){for(const file of files){try{const blob=await blobFor('order-attachments/'+file.id+'.pdf');if(blob)await blob.deleteIfExists();else await fs.unlink(local(file.id));}catch{}}}
 async function save(files){
  const written=[];
  try{for(const file of files){written.push(file);const blob=await blobFor('order-attachments/'+file.id+'.pdf');if(blob)await blob.uploadData(file.bytes,{blobHTTPHeaders:{blobContentType:'application/pdf'}});else{await fs.mkdir(directory,{recursive:true});await fs.writeFile(local(file.id),file.bytes);}}}
  catch(error){await remove(written);throw error;}
  return files.map(({bytes,...meta})=>meta);
 }
 app.get('/api/orders/:id/attachments/:attachmentId',async(req,res)=>{
  try{
   // Approved accounts can already view all orders in the order browser.
   const session=await accountSession(req);
   if(!session)return res.status(401).json({message:'Logga in igen för att öppna bilagan.'});
   const order=(await readOrders()).find(order=>order.id===req.params.id);
   if(order && session.role==='bestallare' && !buyerOrderVisible(order))return res.status(404).json({message:'Bilagan hittades inte.'});
   const file=order?.attachments?.find(file=>file.id===req.params.attachmentId);
   if(!file||!/^[-a-f0-9]{36}$/.test(file.id))return res.status(404).json({message:'Bilagan hittades inte.'});
   const blob=await blobFor('order-attachments/'+file.id+'.pdf');let bytes;
   if(blob){const response=await blob.download(),chunks=[];for await(const chunk of response.readableStreamBody)chunks.push(chunk);bytes=Buffer.concat(chunks);}else bytes=await fs.readFile(local(file.id));
   res.set({'Content-Type':'application/pdf','X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store','Content-Disposition':`${req.query.download==='1'?'attachment':'inline'}; filename="bilaga.pdf"; filename*=UTF-8''${encodeURIComponent(file.name).replace(/['()*]/g,c=>'%'+c.charCodeAt(0).toString(16))}`});
   res.send(bytes);
  }catch(error){res.status(error.code==='ENOENT'||error.statusCode===404?404:500).json({message:'Kunde inte hämta bilagan.'});}
 });
 return {save,remove};
}
module.exports={validateAttachments,createOrderAttachments};
