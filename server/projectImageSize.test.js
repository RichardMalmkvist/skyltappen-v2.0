const test=require('node:test'),assert=require('node:assert/strict');
const {projectImageSize}=require('./projectImageSize');
const {parseProjectFile}=require('./projectSignFiles');
test('SVG physical units are preserved; viewBox and pixels are not treated as millimetres',async()=>{
 const svg=(w,h)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 800 600"><rect width="800" height="600"/></svg>`);
 assert.deepEqual(projectImageSize(svg('40cm','300mm'),'image/svg+xml'),{widthMm:400,heightMm:300});
 assert.deepEqual(projectImageSize(svg('800px','600px'),'image/svg+xml'),{});
 assert.deepEqual(projectImageSize(svg('800','600'),'image/svg+xml'),{});
 const file=await parseProjectFile({name:'proof.svg',dataUrl:'data:image/svg+xml;base64,'+svg('400mm','300mm').toString('base64')});assert.equal(file.widthMm,400);assert.equal(file.heightMm,300);assert.match(file.bytes.toString(),/viewBox="0 0 800 600"/);
});
test('PNG physical resolution determines millimetres; unspecified resolution requires manual input',()=>{
 const header=Buffer.from('89504e470d0a1a0a','hex'),chunk=Buffer.alloc(21);chunk.writeUInt32BE(9);chunk.write('pHYs',4);chunk.writeUInt32BE(11811,8);chunk.writeUInt32BE(11811,12);chunk[16]=1;
 const bytes=Buffer.concat([header,chunk]);assert.deepEqual(projectImageSize(bytes,'image/png',4724,3543),{widthMm:400,heightMm:300});
 chunk[16]=0;assert.deepEqual(projectImageSize(Buffer.concat([header,chunk]),'image/png',4724,3543),{});
 assert.deepEqual(projectImageSize(header,'image/png',4724,3543),{});
});
test('JPEG JFIF DPI or pixels-per-centimetre determines physical size',()=>{
 const make=(unit,density)=>{const body=Buffer.alloc(14);body.write('JFIF\0');body[5]=1;body[6]=1;body[7]=unit;body.writeUInt16BE(density,8);body.writeUInt16BE(density,10);return Buffer.concat([Buffer.from([255,216,255,224,0,16]),body,Buffer.from([255,217])]);};
 assert.deepEqual(projectImageSize(make(1,300),'image/jpeg',4724,3543),{widthMm:400,heightMm:300});
 assert.deepEqual(projectImageSize(make(2,100),'image/jpeg',4000,3000),{widthMm:400,heightMm:300});
 assert.deepEqual(projectImageSize(make(0,1),'image/jpeg',4000,3000),{});
});
test('truncated or invalid density metadata does not invent a physical size',()=>{
 for(const bytes of [Buffer.alloc(0),Buffer.from([255,216,255,225,255,255])])assert.deepEqual(projectImageSize(bytes,'image/jpeg',100,100),{});
 assert.deepEqual(projectImageSize(Buffer.from('89504e470d0a1a0a0000','hex'),'image/png',100,100),{});
});
test('JPEG EXIF resolution and rotated orientation are respected for both byte orders',()=>{
 for(const little of [true,false]){
  const tiff=Buffer.alloc(78),u16=(n,at)=>little?tiff.writeUInt16LE(n,at):tiff.writeUInt16BE(n,at),u32=(n,at)=>little?tiff.writeUInt32LE(n,at):tiff.writeUInt32BE(n,at);
  tiff.write(little?'II':'MM');u16(42,2);u32(8,4);u16(4,8);
  for(const [at,tag,type,value] of [[10,0x11a,5,62],[22,0x11b,5,70],[34,0x128,3,2],[46,0x112,3,6]]){u16(tag,at);u16(type,at+2);u32(1,at+4);if(type===3)u16(value,at+8);else u32(value,at+8);}
  u32(300,62);u32(1,66);u32(300,70);u32(1,74);
  const payload=Buffer.concat([Buffer.from('Exif\0\0'),tiff]),header=Buffer.from([255,216,255,225,0,0]);header.writeUInt16BE(payload.length+2,4);
  assert.deepEqual(projectImageSize(Buffer.concat([header,payload,Buffer.from([255,217])]),'image/jpeg',4724,3543),{widthMm:300,heightMm:400});
 }
});
