const {directionPanelSigns}=require('./directionSigns');
const {POST_MM}=require('./outdoorBusinessSigns');
// Top of the cap to the visible opening in the supplied CAD assembly:
// 13.48 mm cap overhang + 35 mm cover + 30 mm horizontal rail.
const CAD_PANEL_TOP_MM=78.48;
function supportsOutdoorStand3D(product={}){return ['1001','1002','1101','1102','0901','1301','1401'].includes(String(product.articleNumber));}
function outdoorStandLayout(sign={}){
 const widthMm=Number(sign.widthMm),heightMm=Number(sign.outdoorSign?.totalHeightMm);
 if(!Number.isFinite(widthMm)||widthMm<=0||!Number.isFinite(heightMm)||heightMm<=0)return null;
 const panels=sign.outdoorSign?.kind==='direction'?directionPanelSigns(sign):[sign];
 if(panels.some(panel=>!Number.isFinite(Number(panel.heightMm))||Number(panel.heightMm)<=0))return null;
 const gap=Number(sign.outdoorSign?.panelGapMm??25);
 const occupied=panels.reduce((sum,panel)=>sum+Number(panel.heightMm),0)+Math.max(0,panels.length-1)*gap;
 // Retain older, tightly fitted configurations without extending below the posts.
 let topMm=Math.min(sign.outdoorSign?.profileStyle?160:CAD_PANEL_TOP_MM,Math.max(0,heightMm-occupied-30));
 const layout=panels.map(panel=>{const height=Number(panel.heightMm),item={sign:panel,topMm,heightMm:height,widthMm};topMm+=height+Number(sign.outdoorSign?.panelGapMm??25);return item;});
 return {widthMm:widthMm+POST_MM*2,heightMm,panelWidthMm:widthMm,panels:layout,doubleSided:Boolean(sign.outdoorSign?.doubleSided),profileStyle:Boolean(sign.outdoorSign?.profileStyle)};
}
module.exports={supportsOutdoorStand3D,outdoorStandLayout};
