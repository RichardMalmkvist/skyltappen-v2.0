import {cloneElement,useId} from 'react';
import {POST_MM,PANEL_TOP_MM} from '../../data/outdoorBusinessSigns';
export default function OutdoorStandPreview({sign,label,children}){
 const id='outdoor-post-'+useId().replace(/[^a-z0-9]/gi,''),w=Number(sign.widthMm),h=Number(sign.heightMm),total=w+POST_MM*2,height=Number(sign.outdoorSign.totalHeightMm)||1250;
 return <svg xmlns="http://www.w3.org/2000/svg" width={total+'mm'} height={height+'mm'} viewBox={`-5 -12 ${total+10} ${height+24}`} role="group" aria-label={label} style={{display:'block',width:'100%',height:'auto',overflow:'visible'}}>
  <defs><linearGradient id={id}><stop stopColor="#171717"/><stop offset=".4" stopColor="#535353"/><stop offset="1" stopColor="#202020"/></linearGradient></defs>
  {cloneElement(children,{x:POST_MM,y:PANEL_TOP_MM,width:w,height:h,style:{overflow:'visible'}})}
  <g data-outdoor-rails="true" pointerEvents="none" fill="#303030"><rect x={POST_MM} y={PANEL_TOP_MM-25} width={w} height="25"/><rect x={POST_MM} y={PANEL_TOP_MM+h} width={w} height="25"/></g>
  {[0,total-POST_MM].map(x=><g key={x} data-outdoor-post="true" pointerEvents="none"><rect x={x} y="0" width={POST_MM} height={height} fill={`url(#${id})`}/><ellipse cx={x+POST_MM/2} cy="0" rx={POST_MM/2} ry="10" fill="#3a3a3a" stroke="#8a8a8a" strokeWidth="2"/><path d={`M${x} 24q50 9 100 0`} fill="none" stroke="#777" strokeWidth="2"/></g>)}
 </svg>;
}
