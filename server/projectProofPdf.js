const PDFDocument=require('pdfkit'),crypto=require('crypto');
const fail=message=>{throw Object.assign(new Error(message),{status:400});};
function png(data,maxBytes=10*1024*1024){
 const match=/^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/.exec(String(data));
 if(!match||match[1].length>Math.ceil(maxBytes/3)*4)fail('Korrektursidan kunde inte läsas. Försök skapa PDF-filen igen.');
 const bytes=Buffer.from(match[1],'base64');
 if(bytes.length<33||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')fail('Ogiltig korrekturbild.');
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
 if(width<1||height<1||width>5000||height>5000||width*height>16000000)fail('Korrekturbilden är för stor.');
 return {bytes,width,height};
}
async function makeProjectProofPdf(pages,proof){
 if(!Array.isArray(pages)||pages.length<1||pages.length>100)fail('Korrekturet måste innehålla 1–100 sidor.');
 let total=0;const images=pages.map(page=>{const image=png(page);total+=image.bytes.length;if(total>24*1024*1024)fail('Korrekturet är för stort. Dela upp det i flera korrektur.');if(Math.abs(image.width/image.height-297/210)>.02)fail('Korrektursidorna ska vara A4 liggande.');return image;});
 const doc=new PDFDocument({autoFirstPage:false,info:{Title:`${proof.proofNumber} · Version ${proof.version} · ${proof.projectName}`,Creator:'JSF Flow',Subject:'Sparad korrekturversion'}}),chunks=[];
 const done=new Promise((resolve,reject)=>{doc.on('data',chunk=>chunks.push(chunk));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);});done.catch(()=>{});
 try{for(const image of images){doc.addPage({size:'A4',layout:'landscape',margin:0});doc.image(image.bytes,0,0,{width:doc.page.width,height:doc.page.height});}doc.end();return await done;}catch(error){doc.destroy(error);throw Object.assign(new Error('Kunde inte skapa korrektur-PDF. Försök igen.'),{status:400});}
}
function validateProofArtwork(items,keys){
 if(!Array.isArray(items)||items.length>1000)fail('Ogiltiga skyltbilder i korrekturet.');
 const seen=new Set(),covered=new Set();let total=0;
 for(const item of items){if(!keys.includes(item.signKey)||seen.has(item.signKey))fail('Skyltbilden saknar en vald skylt.');seen.add(item.signKey);if(!Array.isArray(item.signKeys)||!item.signKeys.length||item.signKeys[0]!==item.signKey)fail('Ogiltig skyltgrupp.');for(const key of item.signKeys){if(!keys.includes(key)||covered.has(key))fail('Ogiltigt skyltval i PDF-filen.');covered.add(key);}total+=png(item.image).bytes.length;if(total>24*1024*1024)fail('Skyltbilderna är för stora. Dela upp korrekturet.');}
 if(covered.size!==keys.length)fail('Alla valda skyltar måste finnas med i PDF-filen.');
 return items;
}
module.exports={makeProjectProofPdf,validateProofArtwork,pdfHash:bytes=>crypto.createHash('sha256').update(bytes).digest('hex')};
