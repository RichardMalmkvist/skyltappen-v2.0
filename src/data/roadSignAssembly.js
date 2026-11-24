const {roadSignModel}=require('./roadSignModels');
const {isParkingPole,poleHeight}=require('./parkingPole');
// Measured between the front faces in Inventor's "flera ihop.glb".
const ROAD_SIGN_GAP_MM=.5;
function roadAssemblyLayout(entries,_legacyGapMm,topMm=100){
 const gapMm=ROAD_SIGN_GAP_MM;
 const pole=entries.find(e=>isParkingPole(e.product));
 const signs=entries.filter(e=>roadSignModel(e.product));
 const width=Math.max(60,...signs.map(e=>roadSignModel(e.product,e.form?.dibondSign).widthMm));
 let y=pole?Number(topMm):0;
 const panels=signs.map(entry=>{const model=roadSignModel(entry.product,entry.form?.dibondSign),panel={...entry,width:model.widthMm,height:entry.form.dibondSign?.roadSupplement?Number(entry.form.dibondSign.heightMm):model.heightMm,x:(width-model.widthMm)/2,y};y+=panel.height+Number(gapMm);return panel;});
 const poleCount=pole?.form.poleCount===2||pole?.form.poleCount==='2'?2:1;
 const left=Number(pole?.form.poleLeftInsetMm??100),right=Number(pole?.form.poleRightInsetMm??100);
 const poleXs=!pole?[]:poleCount===2?[Number.isFinite(left)?left:100,width-(Number.isFinite(right)?right:100)]:[width/2];
 return {width,height:pole?poleHeight(pole.form):Math.max(1,y-Number(gapMm)),pole,poleCount,poleXs,panels};
}
function roadAssemblyError(layout){
 if(!layout.pole)return null;
 const count=Number(layout.pole.form.poleCount??1);
 if(![1,2].includes(count))return 'Välj en eller två stolpar.';
 if(count===2){const left=Number(layout.pole.form.poleLeftInsetMm??100),right=Number(layout.pole.form.poleRightInsetMm??100);
  if(![left,right].every(n=>Number.isFinite(n)&&n>=30)||left+right+60>layout.width)return 'Stolparnas centrum måste ligga minst 30 mm innanför ytterkanterna och minst 60 mm från varandra.';
 }
 return null;
}
module.exports={roadAssemblyLayout,roadAssemblyError,ROAD_SIGN_GAP_MM};
