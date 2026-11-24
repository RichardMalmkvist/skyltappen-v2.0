import {useLayoutEffect,useRef,useState} from "react";
import {createCarouselMotion} from "./carouselMotion";
import "./ProductArcCarousel.css";

export default function ProductArcCarousel({products=[],onOpen}) {
 const initial=Math.min(2,Math.max(0,products.length-1));
 const [selected,setSelected]=useState(initial),[isDragging,setIsDragging]=useState(false);
 const [motion]=useState(()=>createCarouselMotion(initial));
 const stage=useRef(null),gesture=useRef(null),dragged=useRef(false),step=useRef(310);
 const nativeScroll=useRef(false),positionRef=useRef(initial);
 const productKeys=JSON.stringify(products.map(product=>product.id));
 const active=Math.min(selected,Math.max(0,products.length-1));
 const limit=value=>Math.max(0,Math.min(products.length-1,value));
 const reduced=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
 useLayoutEffect(()=>{
  const node=stage.current;if(!node)return;
  const track=node.querySelector('.jsf-product-arc-track'),items=[...node.querySelectorAll('.jsf-product-arc-item')];
  let scrollFrame=null,lastWidth=-1;
  const paint=position=>{
   positionRef.current=position;
   if(!nativeScroll.current)track.style.transform=`translate3d(${-position*step.current}px,0,0)`;
   items.forEach((item,index)=>{
    const distance=Math.abs(index-position),near=Math.max(0,1-distance);
    item.style.setProperty('--arc-opacity',Math.max(0,1-distance*.3).toFixed(4));
    item.style.setProperty('--arc-focus',(near*near*(3-2*near)).toFixed(4));
   });
  };
  const measure=()=>{
   const width=node.clientWidth,mobile=window.innerWidth<=700;
   if(width===lastWidth&&mobile===nativeScroll.current)return;
   const position=Math.max(0,Math.min(items.length-1,positionRef.current));
   lastWidth=width;nativeScroll.current=mobile;
   node.style.setProperty('--arc-viewport',`${width}px`);
   step.current=node.querySelector('[data-arc-step]').getBoundingClientRect().width||310;
   motion.stop();
   if(mobile){track.style.transform='none';node.scrollLeft=position*step.current;paint(position);}
   else{node.scrollLeft=0;motion.reset(position);}
   setSelected(Math.round(position));
  };
  const onScroll=()=>{
   if(!nativeScroll.current||scrollFrame!==null)return;
   scrollFrame=requestAnimationFrame(()=>{
    scrollFrame=null;
    const position=Math.max(0,Math.min(items.length-1,node.scrollLeft/step.current));
    paint(position);
    setSelected(current=>current===Math.round(position)?current:Math.round(position));
   });
  };
  motion.reset(positionRef.current);motion.setPainter(paint);measure();
  node.addEventListener('scroll',onScroll,{passive:true});
  const observer=typeof ResizeObserver==='function'?new ResizeObserver(measure):null;
  observer?.observe(node);window.addEventListener('resize',measure);
  return()=>{observer?.disconnect();node.removeEventListener('scroll',onScroll);window.removeEventListener('resize',measure);if(scrollFrame!==null)cancelAnimationFrame(scrollFrame);motion.stop();motion.setPainter(()=>{});};
 },[motion,products.length,productKeys]);
 const select=(index,velocity)=>{
  const next=limit(index);
  if(nativeScroll.current){
   const node=stage.current,left=next*step.current;
   if(node.scrollTo)node.scrollTo({left,behavior:reduced()?'auto':'smooth'});
   else node.scrollLeft=left;
  }else{setSelected(next);motion.settle(next,velocity,reduced());}
 };
 const cancelGesture=()=>{if(gesture.current){gesture.current=null;setIsDragging(false);if(nativeScroll.current)select(Math.round(positionRef.current));else motion.settle(active,0,reduced());}};
 if(!products.length)return null;
 return <section className="jsf-product-arc" aria-label="Utvalda produkter" aria-roledescription="karusell"
  onKeyDown={event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();select(active+(event.key==='ArrowRight'?1:-1));}}}>
  <div ref={stage} className="jsf-product-arc-stage" data-dragging={isDragging}
   onPointerDown={event=>{
    if(event.button!==0||event.isPrimary===false)return;
    dragged.current=false;
    // The browser owns touch scrolling and momentum on mobile.
    if(nativeScroll.current&&event.pointerType!=='mouse')return;
    const origin=nativeScroll.current?event.currentTarget.scrollLeft/step.current:motion.grab();
    gesture.current={id:event.pointerId,x:event.clientX,y:event.clientY,lastX:event.clientX,lastTime:event.timeStamp,velocity:0,position:origin,origin};dragged.current=false;
   }}
   onPointerMove={event=>{
    const g=gesture.current;if(!g||g.id!==event.pointerId)return;
    const dx=event.clientX-g.x,dy=event.clientY-g.y;
    if(!dragged.current){
     if(Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>8){cancelGesture();return;}
     if(Math.abs(dx)<7)return;
     dragged.current=true;setIsDragging(true);event.currentTarget.setPointerCapture?.(event.pointerId);
    }
    const dt=event.timeStamp-g.lastTime;
    if(dt>0)g.velocity=.65*((event.clientX-g.lastX)/dt)+.35*g.velocity;
    g.lastX=event.clientX;g.lastTime=event.timeStamp;
    const proposed=g.origin-dx/step.current,bounded=limit(proposed);
    g.position=bounded+(proposed-bounded)*.16;
    if(nativeScroll.current)event.currentTarget.scrollLeft=bounded*step.current;else motion.dragTo(g.position);
   }}
   onPointerUp={event=>{
    const g=gesture.current;if(!g||g.id!==event.pointerId)return;gesture.current=null;
    if(dragged.current){
     const velocity=event.timeStamp-g.lastTime<100?-g.velocity*1000/step.current:0;
     const momentum=Math.max(-.65,Math.min(.65,velocity*.14));
     const next=limit(Math.round(g.position+momentum));
     const speed=Math.min(6,Math.abs(velocity),15*Math.abs(next-g.position));
     const toward=(next-g.position)*velocity>0?Math.sign(velocity)*speed:0;
     select(next,toward);
    }else if(!nativeScroll.current)motion.settle(active,0,reduced());
    setIsDragging(false);
    if(event.currentTarget.hasPointerCapture?.(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
   }}
   onPointerCancel={cancelGesture} onLostPointerCapture={event=>{if(event.target===event.currentTarget)cancelGesture();}}
   onClickCapture={event=>{if(dragged.current&&event.detail!==0){event.preventDefault();event.stopPropagation();dragged.current=false;}}}>
   <span data-arc-step aria-hidden="true" className="jsf-product-arc-step"/>
   <div className="jsf-product-arc-track">
   {products.map((product,index)=>{
    const isActive=index===active;
    return <button type="button" key={product.id} className="jsf-product-arc-item" data-active={isActive}
      aria-label={`${product.name}${isActive?' – visa produkt':''}`} tabIndex={isActive?0:-1}
      style={{'--arc-index':index}}
      onClick={()=>{if(isActive)onOpen?.(product);else select(index);}}>
     <span className="jsf-product-arc-image"><img src={product.cardImage||product.image||'/art.-0201.jpg'} alt="" draggable="false" decoding="async"/></span>
     <span className="jsf-product-arc-caption"><small>{product.articleNumber?`ART.NR ${product.articleNumber}`:'ARTIKEL'}</small><strong>{product.name}</strong>{product.format?<span>{product.format}</span>:null}<span className="jsf-product-arc-open">Välj produkt <span aria-hidden="true">→</span></span></span>
    </button>;
   })}
   </div>
  </div>
  <span className="jsf-product-arc-status" role="status" aria-live="polite" aria-atomic="true">{active+1} / {products.length}</span>
 </section>;
}
