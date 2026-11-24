import {useId} from 'react';
import {hangingStackEntries} from '../../data/hangingStack';
import {roadAssemblyLayout} from '../../data/roadSignAssembly';
import {newDibondSign} from '../../data/dibondHelpers';
import DibondPreview from './DibondPreview';
export default function RoadStackPreview({product,form,articles=[],maxWidth=600}){
 const id=useId().replace(/:/g,''),layout=roadAssemblyLayout(hangingStackEntries(product,form,articles),form.hangingStack?.gapMm??10,form.roadAssemblyTopMm??100);
 return <svg xmlns="http://www.w3.org/2000/svg" viewBox={`-5 -5 ${layout.width+10} ${layout.height+10}`} style={{width:'100%',maxWidth,maxHeight:600,display:'block',margin:'auto'}} aria-label="Parkeringsskyltar på samma stolpe">
 <defs><linearGradient id={id}><stop stopColor="#85898b"/><stop offset=".4" stopColor="#d5d8da"/><stop offset="1" stopColor="#8b9093"/></linearGradient></defs>
 {layout.poleXs.map((x,index)=><rect key={index} data-road-pole={index} x={x-30} width="60" height={layout.height} fill={`url(#${id})`}/>)}
 {layout.panels.map((panel,index)=><g key={panel.id} data-road-part={index} transform={`translate(${panel.x} ${panel.y})`}><DibondPreview sign={panel.form.dibondSign||newDibondSign(panel.product)} product={panel.product} viewport={{x:0,y:0}}/></g>)}
 </svg>;
}
