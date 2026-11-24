import useSignEditorSelection from './useSignEditorSelection';
import {dibondSeparators} from '../../data/dibondSeparators';
import {useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {dibondItemBounds,moveDibondItem,resizeDibondItem} from '../../data/dibondManipulation';
import {dibondLayout} from '../../data/dibondHelpers';

export default function DibondInteraction({sign,onChange,selectionScope=sign,selectionPanel=0}) {
 const dragListeners=useRef(()=>{});
 const root=useRef(null),gesture=useRef(null),frame=useRef(null),pending=useRef(null),callback=useRef(onChange),measureHandle=useRef(()=>{});
 callback.current=onChange;
 const [selection,select]=useSignEditorSelection(selectionScope);
 const selected=selection?.panel===selectionPanel?selection:null;
 const setSelected=useCallback(value=>select(value?{...value,panel:selectionPanel}:null),[select,selectionPanel]);
 const [handle,setHandle]=useState(8);
 const width=Number(sign.widthMm),height=Number(sign.heightMm);
 const layout=dibondLayout(sign);
 const items=(sign.uploadedArtwork?[{kind:'artwork',index:0}]:[...(sign.lines||[]).map((_,index)=>({kind:'text',index})),...(sign.symbols||[]).map((_,index)=>({kind:'symbol',index})),...(sign.acrylicPocket?.enabled?[{kind:'pocket',index:0}]:[]),...dibondSeparators(sign).map(line=>({kind:'separator',index:line.index}))]).map(item=>({...item,bounds:dibondItemBounds(sign,item.kind,item.index,layout)})).filter(item=>item.bounds);
 const active=selected&&items.find(item=>item.kind===selected.kind&&item.index===selected.index);
 useLayoutEffect(()=>{
  const svg=root.current.ownerSVGElement;
  const measure=()=>{
   const screenWidth=svg.getBoundingClientRect().width;if(screenWidth<=0)return;
   const matrix=root.current.getScreenCTM?.(),scale=matrix&&Math.hypot(matrix.a,matrix.b);
   const next=scale>0?10/scale:10*width/screenWidth;setHandle(current=>Math.abs(current-next)>.001?next:current);
  };
  measureHandle.current=measure;
  // CSS transforms do not trigger ResizeObserver on the SVG itself.
  const fitted=svg.closest('.jsf-fitted-preview-content');
  const transformObserver=fitted&&typeof MutationObserver==='function'?new MutationObserver(measure):null;
  transformObserver?.observe(fitted,{attributes:true,attributeFilter:['style','class']});
  const deselect=event=>{if(!event.target.closest?.('[data-dibond-editor]'))setSelected(null);};
  measure();const observer=typeof ResizeObserver==='function'?new ResizeObserver(measure):null;observer?.observe(svg);window.addEventListener('resize',measure);svg.addEventListener('pointerdown',deselect);
  return()=>{measureHandle.current=()=>{};transformObserver?.disconnect();observer?.disconnect();window.removeEventListener('resize',measure);svg.removeEventListener('pointerdown',deselect);};
 },[width,setSelected]);
 useEffect(()=>()=>{dragListeners.current();if(frame.current!==null)cancelAnimationFrame(frame.current);},[]);
 const flush=()=>{if(frame.current!==null){cancelAnimationFrame(frame.current);frame.current=null;}if(pending.current){const next=pending.current;pending.current=null;callback.current(next());}};
 const queue=next=>{pending.current=next;if(frame.current===null)frame.current=requestAnimationFrame(flush);};
 const point=event=>{
  const svg=root.current.ownerSVGElement,matrix=root.current.getScreenCTM?.()||svg.getScreenCTM?.();
  if(matrix&&svg.createSVGPoint){const p=svg.createSVGPoint();p.x=event.clientX;p.y=event.clientY;return p.matrixTransform(matrix.inverse());}
  const box=svg.getBoundingClientRect();return {x:(event.clientX-box.left)*width/(box.width||width),y:(event.clientY-box.top)*height/(box.height||height)};
 };
 const start=(event,item,mode)=>{
  if(event.button!==0||event.isPrimary===false)return;
  event.preventDefault();event.stopPropagation();flush();measureHandle.current();setSelected({kind:item.kind,index:item.index});
  gesture.current={...item,mode,original:sign,start:point(event),id:event.pointerId,target:event.currentTarget};
  dragListeners.current();window.addEventListener('pointermove',update);window.addEventListener('pointerup',finish);window.addEventListener('pointercancel',cancel);dragListeners.current=()=>{window.removeEventListener('pointermove',update);window.removeEventListener('pointerup',finish);window.removeEventListener('pointercancel',cancel);};
 };
 const update=event=>{
  const g=gesture.current;if(!g||g.id!==event.pointerId)return;const p=point(event),dx=p.x-g.start.x,dy=p.y-g.start.y;
  const scale=Math.max(.01,1+(dx*g.bounds.width+dy*g.bounds.height)/Math.max(1,g.bounds.width**2+g.bounds.height**2));
  queue(()=>g.mode==='move'?moveDibondItem(g.original,g.kind,g.index,dx,dy):resizeDibondItem(g.original,g.kind,g.index,scale));
 };
 const release=g=>{if(g?.target.hasPointerCapture?.(g.id))g.target.releasePointerCapture(g.id);};
 const finish=event=>{const g=gesture.current;if(!g||(event&&g.id!==event.pointerId))return;if(event)update(event);gesture.current=null;dragListeners.current();flush();release(g);};
 const cancel=()=>{const g=gesture.current;if(!g)return;gesture.current=null;dragListeners.current();pending.current=null;if(frame.current!==null){cancelAnimationFrame(frame.current);frame.current=null;}callback.current(g.original);release(g);};
 const name=item=>item.kind==='artwork'?'originalet':item.kind==='pocket'?'akrylficka A4':item.kind==='separator'?(item.index===0?'strecket':`streck ${item.index+1}`):`${item.kind==='text'?'textblock':'symbol'} ${item.index+1}`;
 const keyMove=(event,item,resize=false)=>{
  if(event.key==='Escape'){event.preventDefault();cancel();setSelected(null);return;}
  const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]},d=directions[event.key];if(!d)return;event.preventDefault();event.stopPropagation();
  if(resize){const size=item.kind==='artwork'?item.bounds.width:Number(item.kind==='text'?sign.lines[item.index].sizeMm:sign.symbols[item.index].sizeMm),delta=(event.shiftKey?5:.5)*(event.key==='ArrowUp'||event.key==='ArrowRight'?1:-1);onChange(resizeDibondItem(sign,item.kind,item.index,(size+delta)/size));}
  else onChange(moveDibondItem(sign,item.kind,item.index,d[0]*(event.shiftKey?10:1),d[1]*(event.shiftKey?10:1)));
 };
 return <g ref={root} data-dibond-editor="true" onPointerMove={update} onPointerUp={finish} onPointerCancel={cancel}>
  {items.map(item=>{const b=item.bounds;return <g key={`${item.kind}-${item.index}`} role="button" tabIndex={0} aria-label={`Flytta ${name(item)}`} onFocus={()=>{measureHandle.current();setSelected({kind:item.kind,index:item.index});}} onPointerDown={event=>start(event,item,'move')} onKeyDown={event=>keyMove(event,item)} style={{cursor:'default',touchAction:'none',userSelect:'none',outline:'none'}}><rect x={b.x-handle*.25} y={b.y-handle*.25} width={Math.max(b.width,handle)+handle*.5} height={Math.max(b.height,handle)+handle*.5} fill="transparent"/></g>;})}
  {active&&<g data-dibond-selection="true">
   <rect x={active.bounds.x-handle*.2} y={active.bounds.y-handle*.2} width={active.bounds.width+handle*.4} height={active.bounds.height+handle*.4} fill="none" stroke="#96938e" strokeWidth="1" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" pointerEvents="none"/>
   {active.kind!=='separator'&&active.kind!=='pocket'&&<g role="button" tabIndex={0} aria-label={`Ändra storlek på ${name(active)}`} onPointerDown={event=>start(event,active,'resize')} onKeyDown={event=>keyMove(event,active,true)} style={{cursor:'default',touchAction:'none',outline:'none'}}>
    <rect x={active.bounds.x+active.bounds.width-handle*1.2} y={active.bounds.y+active.bounds.height-handle*1.2} width={handle*2.4} height={handle*2.4} fill="transparent"/>
    <rect data-dibond-resize-handle="true" x={active.bounds.x+active.bounds.width-handle/2} y={active.bounds.y+active.bounds.height-handle/2} width={handle} height={handle} rx={handle*.1} fill="white" stroke="#4d4b48" strokeWidth="1" vectorEffect="non-scaling-stroke"/>
   </g>}
  </g>}
 </g>;
}
