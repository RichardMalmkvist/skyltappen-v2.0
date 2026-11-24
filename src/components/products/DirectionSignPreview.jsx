import {useId} from 'react';
import DibondPreview from './DibondPreview';
import {directionPanelSigns,directionPanelHeight,updateDirectionPanel} from '../../data/directionSigns';
export default function DirectionSignPreview({sign,product,label,onChange}){
 const id='direction-'+useId().replace(/[^a-z0-9]/gi,''),panels=directionPanelSigns(sign),width=Number(sign.widthMm),posts=sign.outdoorSign.withPosts,postWidth=posts?100:0,top=posts?(sign.outdoorSign.profileStyle?160:50):0,total=width+postWidth*2,height=posts?Number(sign.outdoorSign.totalHeightMm):directionPanelHeight(sign),gap=Number(sign.outdoorSign.panelGapMm??25),rail=30;let y=top;
 return <svg xmlns="http://www.w3.org/2000/svg" viewBox={`-5 -12 ${total+10} ${height+24}`} width={total+'mm'} height={height+'mm'} role="group" aria-label={label} style={{display:'block',width:'100%',height:'auto',overflow:'visible'}}>
 <defs><linearGradient id={id}><stop stopColor="#171717"/><stop offset=".4" stopColor="#535353"/><stop offset="1" stopColor="#202020"/></linearGradient></defs>
 {panels.map((panel,index)=>{const currentY=y;y+=Number(panel.heightMm)+gap;return <g key={index} data-direction-panel={index}><DibondPreview panelOnly selectionScope={sign} selectionPanel={index} viewport={{x:postWidth,y:currentY}} sign={panel} product={product} label={'Skyltfält '+(index+1)} onChange={onChange?next=>onChange(updateDirectionPanel(sign,index,next)):undefined}/>{posts&&<g pointerEvents="none" fill="#303030"><rect x={postWidth} y={currentY-rail} width={width} height={rail}/><rect x={postWidth} y={currentY+Number(panel.heightMm)} width={width} height={rail}/></g>}</g>;})}
 {posts&&sign.outdoorSign.profileStyle&&<path data-profile-canopy="true" d={`M100 40H${total-100}L${total-80} 130H80Z`} fill="#3c3c3c" stroke="#777" strokeWidth="2" pointerEvents="none"/>}
 {posts&&[0,total-100].map(x=><g key={x} pointerEvents="none" data-direction-post="true"><rect x={x} width="100" height={height} fill={`url(#${id})`}/><ellipse cx={x+50} cy="0" rx="50" ry="10" fill="#3a3a3a" stroke="#8a8a8a" strokeWidth="2"/></g>)}
 </svg>;
}
