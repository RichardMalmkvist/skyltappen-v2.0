import {useId} from 'react';
import {hangingStackEntries} from '../../data/hangingStack';
import {roadAssemblyLayout} from '../../data/roadSignAssembly';
import {roadSignModel} from '../../data/roadSignModels';
import {poleHeight,isParkingPole} from '../../data/parkingPole';
import {newDibondSign} from '../../data/dibondHelpers';
import DibondPreview from '../products/DibondPreview';

export const hasRoadAssembly=group=>Boolean(roadSignModel(group.product)&&group.form?.hangingStack?.items?.length);

// Keep each description beside its physical panel, with enough room for small
// supplementary signs. Crop only the unused lower length of the pole.
export default function RoadAssemblyProof({group,showPrices}){
 const id='proof-pole-'+useId().replace(/:/g,'');
 const product=group.assemblyProduct||group.product;
 const form={...group.form,unitPrice:product.price??product.unitPrice};
 const layout=roadAssemblyLayout(hangingStackEntries(product,form),null,group.form.roadAssemblyTopMm??100);
 const last=layout.panels.at(-1),bottom=last?last.y+last.height:layout.height;
 const height=layout.pole?Math.min(layout.height,bottom+150):bottom;
 const scale=Math.min(230/layout.width,430/Math.max(1,height));
 let labelBottom=-12;
 const descriptions=layout.panels.map(panel=>{
  const top=Math.max((panel.y+panel.height/2)*scale-30,labelBottom+12);
  labelBottom=top+Math.max(60,Math.ceil(String(panel.product.desc||'').length/45)*19+76);
  return {entry:panel,top,format:roadSignModel(panel.product)?.shape==='circle'?`Ø${panel.width} mm`:`${panel.width} × ${panel.height} mm`};
 });
 if(layout.pole)descriptions.push({entry:layout.pole,top:Math.max(bottom*scale+14,labelBottom+12),format:`Ø60 × ${poleHeight(layout.pole.form)} mm`});
 const contentHeight=Math.max(height*scale,(descriptions.at(-1)?.top||0)+120);
 const price=entry=>Number(entry.form.unitPrice??entry.product.price??entry.product.unitPrice??0).toLocaleString('sv-SE',{style:'currency',currency:'SEK'});
 return <div className="proof-road-assembly" style={{height:contentHeight}}>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox={`-2 -2 ${layout.width+4} ${height+4}`} width={(layout.width+4)*scale} height={(height+4)*scale} aria-label="Skyltar monterade på stolpe">
   <defs><linearGradient id={id}><stop stopColor="#999da0"/><stop offset=".45" stopColor="#d5d8da"/><stop offset="1" stopColor="#999da0"/></linearGradient></defs>
   {layout.poleXs.map((x,index)=><rect key={index} data-road-pole={index} x={x-30} width="60" height={height} fill={`url(#${id})`}/>)}
   {layout.panels.map(panel=><g key={panel.id} transform={`translate(${panel.x} ${panel.y})`}><DibondPreview sign={panel.form.dibondSign||newDibondSign(panel.product)} product={panel.product} viewport={{x:0,y:0}}/></g>)}
  </svg>
  {descriptions.map(({entry,top,format})=><div className="proof-road-description" key={entry.id} style={{top}}>
   <div>{entry.product.name}</div><div>{format}</div>
   {isParkingPole(entry.product)?<div>Godstjocklek 4,2 mm</div>:entry.product.desc&&<div>{entry.product.desc}</div>}
   <div>Antal: {group.quantity*(isParkingPole(entry.product)?layout.poleCount:1)} st</div>
   {isParkingPole(entry.product)&&layout.poleCount===2&&<div>Stolpcentrum: {entry.form.poleLeftInsetMm??100} mm från vänster, {entry.form.poleRightInsetMm??100} mm från höger</div>}
   {showPrices&&<div>Pris: {price(entry)} / st exkl. moms</div>}
  </div>)}
 </div>;
}
