import {useEffect,useLayoutEffect,useRef} from 'react';

// Render the visible PDF region at screen resolution. Canvas dimensions depend
// on the viewport, not the size of the whole drawing at 4000% zoom.
export default function DrawingDetailLayer({pdf,page,zoom,baseSize,scrollRef,stageRef}) {
  const canvasRef=useRef(null);
  useLayoutEffect(()=>{
    const canvas=canvasRef.current;
    if(canvas){canvas.style.visibility='hidden';canvas.width=0;canvas.height=0;}
  },[pdf,page]);
  useEffect(()=>{
    const scroll=scrollRef.current,stage=stageRef.current,canvas=canvasRef.current;
    if(!pdf||!scroll||!stage||!canvas||zoom<2||!baseSize.width||!baseSize.height)return undefined;
    let disposed=false,timer=null,activeTask=null,generation=0;
    const render=async()=>{
      const version=generation;
      let buffer=null,task=null;
      try {
        const pdfPage=await pdf.getPage(page);
        if(disposed||version!==generation)return;
        const image=stage.getBoundingClientRect(),view=scroll.getBoundingClientRect();
        const padding=128;
        const left=Math.max(0,view.left+scroll.clientLeft-image.left-padding);
        const top=Math.max(0,view.top+scroll.clientTop-image.top-padding);
        const right=Math.min(image.width,view.left+scroll.clientLeft+scroll.clientWidth-image.left+padding);
        const bottom=Math.min(image.height,view.top+scroll.clientTop+scroll.clientHeight-image.top+padding);
        const width=right-left,height=bottom-top;
        if(width<=0||height<=0){canvas.style.visibility='hidden';return;}
        const ratio=Math.min(window.devicePixelRatio||1,2,4096/width,4096/height,Math.sqrt(6*1024*1024/(width*height)));
        const original=pdfPage.getViewport({scale:1});
        const viewport=pdfPage.getViewport({scale:baseSize.width/original.width*zoom*ratio});
        buffer=document.createElement('canvas');
        buffer.width=Math.ceil(width*ratio);buffer.height=Math.ceil(height*ratio);
        task=pdfPage.render({canvasContext:buffer.getContext('2d'),viewport,transform:[1,0,0,1,-left*ratio,-top*ratio]});
        activeTask=task;
        await task.promise;
        if(disposed||version!==generation)return;
        // Commit a finished frame so panning never clears a visible canvas.
        canvas.width=buffer.width;canvas.height=buffer.height;
        canvas.getContext('2d').drawImage(buffer,0,0);
        Object.assign(canvas.style,{left:`${left/zoom}px`,top:`${top/zoom}px`,width:`${width/zoom}px`,height:`${height/zoom}px`,visibility:'visible'});
        canvas.dataset.renderZoom=String(zoom);
        canvas.dataset.pixelRatio=String(ratio);
        canvas.dataset.regionLeft=String(left);
        canvas.dataset.regionTop=String(top);
        canvas.dataset.pdfScale=String(viewport.scale);
        canvas.dataset.page=String(page);
      } catch(error) {
        // Keep the overview visible if this frame is cancelled or cannot render.
        if(!disposed&&version===generation&&error?.name!=='RenderingCancelledException')canvas.style.visibility='hidden';
      } finally {
        if(activeTask===task)activeTask=null;
        if(buffer){buffer.width=0;buffer.height=0;}
      }
    };
    const schedule=()=>{
      generation+=1;
      if(activeTask)activeTask.cancel();
      clearTimeout(timer);
      timer=setTimeout(render,90);
    };
    scroll.addEventListener('scroll',schedule,{passive:true});
    window.addEventListener('resize',schedule);
    const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(schedule);
    observer?.observe(scroll);
    schedule();
    return()=>{
      disposed=true;generation+=1;clearTimeout(timer);
      if(activeTask)activeTask.cancel();
      scroll.removeEventListener('scroll',schedule);
      window.removeEventListener('resize',schedule);
      observer?.disconnect();
    };
  },[pdf,page,zoom,baseSize.width,baseSize.height,scrollRef,stageRef]);
  return <canvas ref={canvasRef} className="jsf-planner-detail-canvas" aria-hidden="true" style={{position:'absolute',pointerEvents:'none',zIndex:1,display:zoom>=2?'block':'none',visibility:'hidden'}}/>;
}
