const {readBuiltinDibondAsset}=require('./dibondBuiltinSymbols');
const fs=require('fs/promises'),path=require('path');
const {sanitizeSvgSymbol}=require('./svgSymbol');
const missing=error=>error.code==='ENOENT'||error.statusCode===404;
async function readDibondSymbolAsset(id,{blobFor=async()=>null,directory=__dirname}={}){
 if(!/^[a-f0-9-]{36}$/.test(String(id)))throw Object.assign(new Error('Ogiltig symbolbild.'),{statusCode:404});
 const builtin=readBuiltinDibondAsset(id);if(builtin)return builtin;
 async function stored(ext){
  const key='dibond-symbol-assets/'+id+'.'+ext;
  const blob=await blobFor(key);
  try{return blob?await blob.downloadToBuffer():await fs.readFile(path.join(directory,key));}
  catch(error){if(missing(error))return null;throw error;}
 }
 const vector=await stored('svg');
 if(vector){const asset=sanitizeSvgSymbol(vector);return {...asset,kind:'svg',mime:'image/svg+xml',data:Buffer.from(asset.svg)};}
 const data=await stored('png');
 if(!data)throw Object.assign(new Error('Symbolbilden hittades inte.'),{statusCode:404});
 if(data.length>300*1024||data.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw new Error('Ogiltig symbolbild.');
 return {kind:'png',mime:'image/png',data};
}
module.exports={readDibondSymbolAsset};
