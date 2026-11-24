import {useEffect,useRef,useState} from 'react';
import './WhiteboardDrawing.css';

export default function WhiteboardDrawing({area,pixelScale=1,surface=null}){
 const canvas=useRef(null),strokes=useRef([]),current=useRef(null),frame=useRef(null),[hasInk,setHasInk]=useState(false);
 useEffect(()=>{
  const node=canvas.current;if(!node)return;
  const redraw=()=>{
   const ctx=node.getContext('2d');if(!ctx)return;
   ctx.clearRect(0,0,node.width,node.height);ctx.strokeStyle='#161616';ctx.fillStyle='#161616';ctx.lineWidth=Math.max(1,node.width*.006);ctx.lineCap='round';ctx.lineJoin='round';
   const point=p=>[p.x*node.width,p.y*node.height];
   for(const stroke of strokes.current){
    if(!stroke.length)continue;const first=point(stroke[0]);
    if(stroke.length===1){ctx.beginPath();ctx.arc(first[0],first[1],ctx.lineWidth/2,0,Math.PI*2);ctx.fill();continue;}
    ctx.beginPath();ctx.moveTo(...first);
    for(let i=1;i<stroke.length;i++){const previous=point(stroke[i-1]),next=point(stroke[i]);ctx.quadraticCurveTo(...previous,(previous[0]+next[0])/2,(previous[1]+next[1])/2);}
    ctx.lineTo(...point(stroke[stroke.length-1]));ctx.stroke();
   }
  };
  node.redrawWhiteboard=redraw;
  const resize=()=>{const box=node.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,3);const width=Math.max(1,Math.round(box.width*dpr)),height=Math.max(1,Math.round(box.height*dpr));if(node.width!==width||node.height!==height){node.width=width;node.height=height;}redraw();};
  resize();const observer=typeof ResizeObserver==='function'?new ResizeObserver(resize):null;observer?.observe(node);window.addEventListener('resize',resize);
  return()=>{observer?.disconnect();window.removeEventListener('resize',resize);if(frame.current!==null)cancelAnimationFrame(frame.current);delete node.redrawWhiteboard;};
 },[]);
 const paint=()=>{if(frame.current===null)frame.current=requestAnimationFrame(()=>{frame.current=null;canvas.current?.redrawWhiteboard?.();});};
 const point=event=>{const box=canvas.current.getBoundingClientRect();return {x:(event.clientX-box.left)/(box.width||1),y:(event.clientY-box.top)/(box.height||1)};};
 const finish=()=>{current.current=null;paint();};
 return <div className="jsf-whiteboard-demo" data-has-ink={hasInk} style={{left:`${area.x*100}%`,top:`${area.y*100}%`,width:`${area.width*100}%`,height:`${area.height*100}%`,'--wb-pixel':`calc(var(--jsf-preview-pixel,1px) / ${pixelScale})`}}>
  {hasInk&&surface}
  <canvas ref={canvas} style={surface?{position:'relative',background:'transparent'}:undefined} aria-label="Whiteboardyta att rita på" role="img"
   onPointerDown={event=>{if(event.button!==0||event.isPrimary===false)return;event.preventDefault();const stroke=[point(event)];strokes.current.push(stroke);current.current={id:event.pointerId,stroke};setHasInk(true);event.currentTarget.setPointerCapture?.(event.pointerId);paint();}}
   onPointerMove={event=>{const drawing=current.current;if(!drawing||drawing.id!==event.pointerId)return;const samples=event.nativeEvent.getCoalescedEvents?.()||[];for(const sample of samples.length?samples:[event])drawing.stroke.push(point(sample));paint();}}
   onPointerUp={event=>{if(!current.current||current.current.id!==event.pointerId)return;current.current.stroke.push(point(event));finish();if(event.currentTarget.hasPointerCapture?.(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);}}
   onPointerCancel={finish} onLostPointerCapture={()=>{if(current.current)finish();}}/>
  {hasInk&&<button type="button" className="jsf-whiteboard-clear" onPointerDown={event=>event.stopPropagation()} onClick={()=>{strokes.current=[];current.current=null;setHasInk(false);paint();}}>Sudda</button>}
 </div>;
}
