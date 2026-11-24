const {decalArticleNumber}=require('../src/data/customDecalArticles');
const SVGtoPDF=require('svg-to-pdfkit');
const {fonts,textCurves,measureText}=require('./productionText');
const HEADER_MM=8,mm=n=>n*72/25.4;
function productionLabel(order,sequence,item){
 const ref=order.orderNumber||order.submissionNumber||order.id;
 return ['Order '+ref,'Rad '+String(sequence).padStart(2,'0'),item.articleNumber?'Art. '+decalArticleNumber(item,item):''].filter(Boolean).join(' | ').replace(/[^\x20-\u017f]/g,'?').slice(0,160);
}
function labelLayer(doc){const layer=doc.ref({Type:'OCG',Name:new String('Print Data')});layer.end();return layer;}
function drawProductionLabel(doc,label,widthMm,{copy,quantity}={}){
 if(!label)return;
 const text=label+(quantity>1?' | Ex '+copy+'/'+quantity:''),size=Math.min(2.1,2.1*Math.max(1,widthMm-4)/Math.max(1,measureText(text,2.1,false).width));
 const body=textCurves(text,fonts.regular,size,2,5).body,w=mm(widthMm),h=mm(HEADER_MM);
 SVGtoPDF(doc,'<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="0 0 '+widthMm+' '+HEADER_MM+'"><g fill="#000000">'+body+'</g></svg>',0,0,{width:w,height:h,assumePt:true,colorCallback:()=>[[0,0,0,100],1]});
}
module.exports={HEADER_MM,productionLabel,labelLayer,drawProductionLabel};
