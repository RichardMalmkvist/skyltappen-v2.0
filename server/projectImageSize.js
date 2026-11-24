const sax=require('sax');
const round=(value,raster)=>raster&&Math.abs(value-Math.round(value))<.1?Math.round(value):Math.round(value*1000)/1000;
function size(width,height,raster=false){
 if(![width,height].every(n=>Number.isFinite(n)&&n>=1&&n<=5000))return {};
 return {widthMm:round(width,raster),heightMm:round(height,raster)};
}
function svgSize(bytes){
 let root;const parser=sax.parser(true);parser.onopentag=node=>{if(!root)root=node.attributes;};parser.write(bytes.toString('utf8')).close();
 const physical=value=>{const match=/^\s*([\d.]+)\s*(mm|cm|in|pt|pc)\s*$/i.exec(String(value));return match?Number(match[1])*({mm:1,cm:10,in:25.4,pt:25.4/72,pc:25.4/6}[match[2].toLowerCase()]):NaN;};
 return size(physical(root?.width),physical(root?.height));
}
function pngSize(bytes,width,height){
 for(let offset=8;offset+12<=bytes.length;){
  const length=bytes.readUInt32BE(offset),end=offset+12+length;if(end>bytes.length)break;
  if(bytes.toString('ascii',offset+4,offset+8)==='pHYs'&&length===9&&bytes[offset+16]===1){
   const x=bytes.readUInt32BE(offset+8),y=bytes.readUInt32BE(offset+12);if(x&&y)return size(width*1000/x,height*1000/y,true);
  }
  offset=end;
 }
 return {};
}
function jpegSize(bytes,width,height){
 let density=null,exif=null,orientation=1;
 for(let offset=2;offset+4<=bytes.length;){
  if(bytes[offset]!==255)break;const marker=bytes[offset+1];if(marker===218||marker===217)break;
  const length=bytes.readUInt16BE(offset+2),start=offset+4,end=offset+2+length;if(length<2||end>bytes.length)break;
  if(marker===224&&length>=16&&bytes.toString('ascii',start,start+5)==='JFIF\0'){
   const unit=bytes[start+7],x=bytes.readUInt16BE(start+8),y=bytes.readUInt16BE(start+10);if(x&&y&&[1,2].includes(unit))density=size(width*(unit===1?25.4:10)/x,height*(unit===1?25.4:10)/y,true);
  }
  if(marker===225&&length>=16&&bytes.toString('ascii',start,start+6)==='Exif\0\0'){
   try{
    const tiff=bytes.subarray(start+6,end),little=tiff.toString('ascii',0,2)==='II';
    if(!little&&tiff.toString('ascii',0,2)!=='MM')throw new Error('TIFF');
    const u16=at=>little?tiff.readUInt16LE(at):tiff.readUInt16BE(at),u32=at=>little?tiff.readUInt32LE(at):tiff.readUInt32BE(at);
    const first=u32(4),count=u16(first);let x,y,unit=2;
    for(let i=0;i<Math.min(count,256);i++){
     const at=first+2+i*12,tag=u16(at),type=u16(at+2),items=u32(at+4);
     if(items!==1)continue;
     if(type===3&&tag===0x128)unit=u16(at+8);
     if(type===3&&tag===0x112)orientation=u16(at+8);
     if(type===5&&[0x11a,0x11b].includes(tag)){const position=u32(at+8),denominator=u32(position+4),value=denominator?u32(position)/denominator:0;if(tag===0x11a)x=value;else y=value;}
    }
    if(x&&y&&[2,3].includes(unit))exif=size(width*(unit===2?25.4:10)/x,height*(unit===2?25.4:10)/y,true);
   }catch{/* Missing or malformed resolution is not a physical measurement. */}
  }
  offset=end;
 }
 const result=exif?.widthMm?exif:density||{};
 return [5,6,7,8].includes(orientation)&&result.widthMm?{widthMm:result.heightMm,heightMm:result.widthMm}:result;
}
function projectImageSize(bytes,mime,width,height){return mime==='image/svg+xml'?svgSize(bytes):mime==='image/png'?pngSize(bytes,width,height):mime==='image/jpeg'?jpegSize(bytes,width,height):{};}
module.exports={projectImageSize};
