import {useEffect,useId,useRef,useState} from "react";
import "./SlidingRoomSignPreview.css";

// Reuse the photographed frame, hatch, text and material; each color is one continuous field.
const ORIGINAL_POSITION=1;
export default function SlidingRoomSignPreview({articleNumber="0609",windowOnly=false,photo=null,interactive=true,position:controlledPosition,onPositionChange}){
 const infection=String(articleNumber).padStart(4,"0")==="0614";
 const [localPosition,setLocalPosition]=useState(ORIGINAL_POSITION),svg=useRef(null),drag=useRef(null),frame=useRef(null),pending=useRef(ORIGINAL_POSITION);
 const position=controlledPosition??localPosition;
 const setPosition=value=>{setLocalPosition(value);onPositionChange?.(value);};
 const unique=useId().replace(/:/g,''),id=name=>`room-slide-${unique}-${name}`;
 const image=`${process.env.PUBLIC_URL||''}/sliding-sign-${infection?"0614":"0609"}.webp`;
 const {width,height,left,right,top,bottom,sourcePanelLeft}=infection?{width:1327,height:692,left:88,right:1231,top:70,bottom:615,sourcePanelLeft:566}:{width:1306,height:679,left:84,right:1228,top:66,bottom:612,sourcePanelLeft:562};
 const photograph=photo?{href:photo.src,x:left-photo.window[0]*(right-left)/photo.window[2],y:top-photo.window[1]*(bottom-top)/photo.window[3],width:photo.size[0]*(right-left)/photo.window[2],height:photo.size[1]*(bottom-top)/photo.window[3]}:{href:image,width,height};
 const sourcePanelWidth=541,panelWidth=(right-left)/2,travel=panelWidth;
 const clamp=value=>Math.max(0,Math.min(1,value));
 const queue=value=>{pending.current=clamp(value);if(frame.current===null)frame.current=requestAnimationFrame(()=>{frame.current=null;setPosition(pending.current);});};
 const finish=()=>{drag.current=null;if(frame.current!==null){cancelAnimationFrame(frame.current);frame.current=null;}setPosition(pending.current);};
 useEffect(()=>()=>{if(frame.current!==null)cancelAnimationFrame(frame.current);},[]);
 const state=position<.15?(infection?'Smittvarning dold':'Ledigt'):position>.65?(infection?'SMITTA visas':'Upptaget'):'Luckan är delvis öppen';
 return <div className="jsf-sliding-room-sign" style={windowOnly?{maxWidth:'none',height:'100%'}:undefined}>
  <svg ref={svg} viewBox={windowOnly?`${left} ${top} ${right-left} ${bottom-top}`:`0 0 ${width} ${height}`} preserveAspectRatio={windowOnly?'none':'xMidYMid meet'} style={windowOnly?{height:'100%'}:undefined} aria-label={infection?"Rumsskylt med skjutbar lucka, SMITTA":"Rumsskylt med skjutbar lucka, Upptaget och Ledigt"} role="group">
   <defs>
    <clipPath id={id('window')}><rect x={left} y={top} width={right-left} height={bottom-top}/></clipPath>
    <clipPath id={id('frame')}><path clipRule="evenodd" d={`M0 0H${width}V${height}H0Z M${left} ${top}H${right}V${bottom}H${left}Z`}/></clipPath>
    <clipPath id={id('hatch')}><rect x={sourcePanelLeft} y={top} width={sourcePanelWidth} height={bottom-top}/></clipPath>
    <clipPath id={id('photo-text')}>{infection?<rect x="220" y="145" width="310" height="350"/>:<rect x="140" y="295" width="422" height="78"/>}</clipPath>
    <clipPath id={id('text-end')}><rect x="562" y="295" width="94" height="78"/></clipPath>
    <filter id={id('text-alpha')} colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
     <feColorMatrix type="matrix" values={infection?"1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 -4 0 0 1.3":"1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 4 0 0 -1"}/>
    </filter>
    <linearGradient id={id('left-edge')} gradientUnits="userSpaceOnUse" x1={left} x2={left+60}><stop stopColor="white"/><stop offset="1" stopColor="black"/></linearGradient>
    <linearGradient id={id('right-edge')} gradientUnits="userSpaceOnUse" x1={right-60} x2={right}><stop stopColor="black"/><stop offset="1" stopColor="white"/></linearGradient>
    <mask id={id('edge-shadows')} maskUnits="userSpaceOnUse" x={left} y={top} width={right-left} height={bottom-top}>
     <rect x={left} y={top} width="60" height={bottom-top} fill={`url(#${id('left-edge')})`}/>
     <rect x={right-60} y={top} width="60" height={bottom-top} fill={`url(#${id('right-edge')})`}/>
    </mask>
   </defs>
   <g clipPath={`url(#${id('window')})`}>
    <g data-seamless-room-fields="true" pointerEvents="none">
     {/* Each entire field comes from a single photographic sample: no internal joins. */}
     <svg x={left} y={top} width={panelWidth} height={bottom-top} viewBox={`${infection?145:130} ${top} 10 ${bottom-top}`} preserveAspectRatio="none">
      <image {...photograph}/>
     </svg>
     <svg x={left+panelWidth} y={top} width={panelWidth} height={bottom-top} viewBox={`${infection?1145:1120} ${top} 10 ${bottom-top}`} preserveAspectRatio="none">
      <image {...photograph}/>
     </svg>
     <image {...photograph} mask={`url(#${id('edge-shadows')})`}/>
     <image data-original-room-photo="true" {...photograph} clipPath={`url(#${id('photo-text')})`} filter={`url(#${id('text-alpha')})`}/>
     {!infection&&<g fill="#ddd6d6" fontFamily="Arial, sans-serif" fontSize="84">
      <text x="143" y="363" clipPath={`url(#${id('text-end')})`}>UPPTAGET</text><text x="942" y="363" textAnchor="middle">LEDIGT</text>
     </g>}
    </g>
    <g className="jsf-sliding-room-hatch" role={interactive?'slider':undefined} tabIndex={interactive?0:undefined} aria-label="Skjutbar vit lucka" aria-valuemin={interactive?0:undefined} aria-valuemax={interactive?100:undefined} aria-valuenow={interactive?Math.round(position*100):undefined} aria-valuetext={interactive?state:undefined} aria-orientation={interactive?'horizontal':undefined}
     transform={`translate(${left+position*travel},0) scale(${panelWidth/sourcePanelWidth},1) translate(${-sourcePanelLeft},0)`}
     onPointerDown={event=>{
      if(!interactive||event.button!==0||event.isPrimary===false)return;
      event.preventDefault();
      const bounds=svg.current.getBoundingClientRect();pending.current=position;
      drag.current={id:event.pointerId,x:event.clientX,start:position,ratio:(windowOnly?right-left:width)/(bounds.width||width)};
      event.currentTarget.setPointerCapture?.(event.pointerId);
     }}
     onPointerMove={event=>{const g=drag.current;if(g&&g.id===event.pointerId)queue(g.start+(event.clientX-g.x)*g.ratio/travel);}}
     onPointerUp={event=>{if(drag.current?.id!==event.pointerId)return;finish();if(event.currentTarget.hasPointerCapture?.(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);}}
     onPointerCancel={finish} onLostPointerCapture={()=>{if(drag.current)finish();}}
     onKeyDown={event=>{
      if(!interactive)return;
      const directions={ArrowLeft:-.05,ArrowRight:.05,ArrowDown:-.05,ArrowUp:.05};let next;
      if(event.key==='Home')next=0;else if(event.key==='End')next=1;else if(event.key in directions)next=clamp(position+directions[event.key]);else return;
      event.preventDefault();pending.current=next;setPosition(next);
     }}>
     <image {...photograph} clipPath={`url(#${id('hatch')})`} draggable="false"/>
     <rect className="jsf-sliding-room-focus" x={sourcePanelLeft+3} y={top+3} width={sourcePanelWidth-6} height={bottom-top-6} fill="none" stroke="#555" strokeWidth="3" strokeDasharray="8 6"/>
    </g>
   </g>
   {!windowOnly&&<image className="jsf-sliding-room-frame" {...photograph} clipPath={`url(#${id('frame')})`} draggable="false"/>}
  </svg>
 </div>;
}
