const SVGtoPDF=require('svg-to-pdfkit');
const {createDibondImageReader}=require('./dibondProduction');
const {parkingSvg,parkingConfig,parkingSymbolsError,isParking}=require('../src/data/parkingSign');
const {fonts,textCurves}=require('./productionText');
const {makeArticleProductionPdf}=require('./articleProduction');
function parkingProductionSvg(product){return parkingSvg(product,product,{production:true,cut:true,symbols:false,curves:(line,c)=>textCurves(line.text,fonts.bold,c.textHeightMm,line.x,line.baseline).body});}
async function makeParkingPdf(product,quantity,title,options={}){
 const error=parkingSymbolsError(product,product);if(error)throw new Error(error);
 const c=parkingConfig(product),svg=parkingProductionSvg(product),readImage=options.readImage||createDibondImageReader(),images=new Map();
 for(const symbol of product.parkingSymbols||[])if(!images.has(symbol.image))images.set(symbol.image,await readImage(symbol.image));
 const drawPrint=(doc,{headerMm})=>{doc.save().translate(0,headerMm*72/25.4).scale(72/25.4);for(const symbol of product.parkingSymbols||[]){const asset=images.get(symbol.image),w=Number(symbol.sizeMm)*Number(symbol.aspectRatio||1),h=Number(symbol.sizeMm),x=Number(symbol.xMm),y=Number(symbol.yMm);if(asset?.kind==='svg'){const fitted=asset.svg.replace(/width="[^"]+"/,'width="'+w+'"').replace(/height="[^"]+"/,'height="'+h+'"');SVGtoPDF(doc,fitted,x,y,{assumePt:true,width:w,height:h,preserveAspectRatio:'xMidYMid meet',warningCallback:message=>{throw new Error('Symbolen kunde inte exporteras: '+message);}});}else doc.image(asset,x,y,{fit:[w,h],align:'center',valign:'center'});}doc.restore();};
 return makeArticleProductionPdf({svg,widthMm:Number(c.widthMm),heightMm:Number(c.heightMm),cutColor:'#ec2a90'},quantity,title,{...options,drawPrint});
}
module.exports={isParking,parkingProductionSvg,makeParkingPdf};
