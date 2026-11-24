const fs=require('fs/promises'),path=require('path'),crypto=require('crypto');
const {sanitizeSvgSymbol}=require('./svgSymbol');
const {projectImageSize}=require('./projectImageSize');
const MAX_BYTES=5*1024*1024;
const fail=message=>{throw Object.assign(new Error(message),{validation:true});};

async function parseProjectFile(input={},production=false){
  const match=/^data:(image\/png|image\/jpeg|image\/svg\+xml|application\/pdf)(?:;charset=[\w-]+)?;base64,([A-Za-z0-9+/]+={0,2})$/i.exec(String(input.dataUrl||''));
  if(!match||match[2].length>Math.ceil(MAX_BYTES/3)*4)fail('Välj en fil på högst 5 MB.');
  const mime=match[1].toLowerCase();let bytes=Buffer.from(match[2],'base64');
  if(bytes.length>MAX_BYTES)fail('Filen får vara högst 5 MB.');
  const name=String(input.name||'skylt').split(/[\\/]/).pop().replace(/[\x00-\x1f\x7f]/g,'').slice(0,150);
  if(production){
    if(mime!=='application/pdf'||bytes.subarray(0,5).toString()!=='%PDF-')fail('Välj en produktionsfil i SVG eller PDF.');
    const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
    const task=getDocument({data:new Uint8Array(bytes),disableFontFace:true,useSystemFonts:false});
    try{
      const document=await task.promise;
      if(document.numPages!==1)fail('Produktionsfilen ska innehålla en sida per skylt.');
      const page=await document.getPage(1),viewport=page.getViewport({scale:1});
      const widthMm=viewport.width*25.4/72,heightMm=viewport.height*25.4/72;
      if(![widthMm,heightMm].every(n=>Number.isFinite(n)&&n>=1&&n<=5000))fail('PDF-filens mått måste vara mellan 1 och 5000 mm.');
      return {bytes,mime,name,widthMm:Math.round(widthMm*1000)/1000,heightMm:Math.round(heightMm*1000)/1000};
    }catch(error){if(error.validation)throw error;fail('PDF-filen kunde inte läsas. Exportera en PDF utan lösenord från Corel.');}
    finally{await task.destroy();}
  }
  if(mime==='image/svg+xml'){
    const vector=sanitizeSvgSymbol(bytes,{maxBytes:MAX_BYTES,maxElements:30000});
    const dimensions=projectImageSize(bytes,mime);
    const svg=dimensions.widthMm?vector.svg.replace(/width="[^"]+"/,'width="'+dimensions.widthMm+'mm"').replace(/height="[^"]+"/,'height="'+dimensions.heightMm+'mm"'):vector.svg;
    bytes=Buffer.from(svg);return {bytes,mime,name,...dimensions};
  }
  if(!['image/png','image/jpeg'].includes(mime))fail('Välj en korrekturbild i PNG, JPG eller SVG.');
  // PDFKit reads the real PNG/JPEG headers rather than trusting the name or MIME.
  const PDFDocument=require('pdfkit'),document=new PDFDocument({autoFirstPage:false});
  let dimensions={};
  try{
    const image=document.openImage(bytes);
    if(!image||image.width<1||image.height<1||image.width>16000||image.height>16000||image.width*image.height>40000000)fail('Korrekturbilden är för stor. Använd högst 40 megapixlar.');
    const actual=bytes.subarray(0,8).toString('hex')==='89504e470d0a1a0a'?'image/png':bytes[0]===255&&bytes[1]===216?'image/jpeg':null;
    if(actual!==mime)fail('Bildens filformat stämmer inte med innehållet.');
    dimensions=projectImageSize(bytes,mime,image.width,image.height);
  }catch(error){if(error.validation)throw error;fail('Bildfilen kunde inte läsas. Välj en giltig PNG- eller JPG-bild.');}
  finally{document.destroy();}
  return {bytes,mime,name,...dimensions};
}

function createProjectSignFileStore({directory=__dirname,blobFor=async()=>null}={}){
  const local=(id,ext)=>path.join(directory,'project-sign-files',id+'.'+ext);
  async function put(id,ext,bytes,mime){const blob=await blobFor('project-sign-files/'+id+'.'+ext);if(blob)await blob.uploadData(Buffer.from(bytes),{blobHTTPHeaders:{blobContentType:mime}});else{await fs.mkdir(path.dirname(local(id,ext)),{recursive:true});await fs.writeFile(local(id,ext),bytes);}}
  async function get(id,ext){const blob=await blobFor('project-sign-files/'+id+'.'+ext);return blob?await blob.downloadToBuffer():await fs.readFile(local(id,ext));}
  return {
    async save(input,production=false){
      const {bytes,...details}=await parseProjectFile(input,production),id=crypto.randomUUID(),meta={id,...details,size:bytes.length,uploadedAt:new Date().toISOString()};
      await put(id,'bin',bytes,meta.mime);await put(id,'json',JSON.stringify(meta),'application/json');return meta;
    },
    async read(id){
      if(!/^[a-f0-9-]{36}$/.test(String(id||'')))fail('Filen saknas.');
      const [meta,bytes]=await Promise.all([get(id,'json'),get(id,'bin')]);return {...JSON.parse(meta.toString('utf8')),bytes};
    }
  };
}
module.exports={createProjectSignFileStore,parseProjectFile};
