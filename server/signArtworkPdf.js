const {PDFDocument,degrees}=require('pdf-lib');
const {artworkBounds}=require('../src/data/signArtwork');
const {makeArticleProductionPdf}=require('./articleProduction');
const mm=value=>Number(value)*72/25.4;

// Embed the original page as a PDF form, retaining vectors, fonts and spot colours.
// Only its placement matrix changes; the preview PNG is never used for production.
async function placedArtworkPdf(asset,sign,quantity,title,label){
 const b=artworkBounds(sign),w=Number(sign.widthMm),h=Number(sign.heightMm);
 const full=b.x===0&&b.y===0&&Math.abs(b.width-w)<.001&&Math.abs(b.height-h)<.001&&Math.abs(w-sign.uploadedArtwork.widthMm)<.001&&Math.abs(h-sign.uploadedArtwork.heightMm)<.001;
 if(asset.mime==='application/pdf'&&full)return asset.bytes;
 if(asset.mime!=='application/pdf'&&full)return makeArticleProductionPdf(asset,quantity,title,{label});
 const sourceBytes=asset.mime==='application/pdf'?asset.bytes:await makeArticleProductionPdf(asset,1,title);
 const source=await PDFDocument.load(sourceBytes),sourcePage=source.getPage(0),rotation=((sourcePage.getRotation().angle%360)+360)%360;
 const blank={widthMm:w,heightMm:h,svg:`<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="white"/></svg>`};
 const result=await PDFDocument.load(await makeArticleProductionPdf(blank,quantity,title,{label}));
 const embedded=await result.embedPage(sourcePage),x=mm(b.x),y=mm(h-b.y-b.height),width=mm(b.width),height=mm(b.height);
 for(const page of result.getPages()){
  const options=rotation===90?{x,y:y+height,width:height,height:width,rotate:degrees(270)}:rotation===180?{x:x+width,y:y+height,width,height,rotate:degrees(180)}:rotation===270?{x:x+width,y,width:height,height:width,rotate:degrees(90)}:{x,y,width,height};
  page.drawPage(embedded,options);
 }
 return Buffer.from(await result.save());
}
module.exports={placedArtworkPdf};
