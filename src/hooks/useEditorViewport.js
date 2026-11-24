import {useLayoutEffect,useRef} from 'react';

export default function useEditorViewport(key,externalRef){
 const ownRef=useRef(null),ref=externalRef||ownRef;
 useLayoutEffect(()=>{
  const element=ref.current;if(!element)return;
  const modal=element.matches('.jsf-sign-modal'),backdrop=modal?element.parentElement:null;
  let frame=null,settleTimer=null,active=true,reveal=false,alignedControl=null;
  const mobile=()=>window.matchMedia?window.matchMedia('(max-width:800px)').matches:window.innerWidth<=800;
  const focused=()=>{const node=document.activeElement;return element.contains(node)&&node.matches('input:not([type=checkbox]):not([type=radio]),textarea,select')?node:null;};
  const setStyle=(node,property,value)=>{if(node.style.getPropertyValue(property)!==value)node.style.setProperty(property,value);};
  function measure(){
   const viewport=window.visualViewport,height=viewport?.height||window.innerHeight,offset=viewport?.offsetTop||0;
   if(viewport?.scale>1.05){reveal=false;return;}
   const narrow=mobile(),control=focused();
   if(narrow&&modal){
    setStyle(backdrop,'height',height+'px');setStyle(backdrop,'top',offset+'px');setStyle(backdrop,'bottom','auto');
    setStyle(element,'--jsf-mobile-viewport-height',height+'px');
   }else if(backdrop){backdrop.style.removeProperty('height');backdrop.style.removeProperty('top');backdrop.style.removeProperty('bottom');}
   if(!modal){
    // On mobile the editor height must not depend on its document position.
    // Otherwise changing the height also changes the page's scroll range.
    const available=narrow?Math.max(180,Math.floor(height-16)):Math.max(240,Math.floor(height+offset-Math.max(offset+8,element.getBoundingClientRect().top)-16));
    setStyle(element,'--jsf-editor-height',available+'px');
    if(narrow&&control&&reveal&&alignedControl!==control){
     alignedControl=control;
     const top=element.getBoundingClientRect().top-offset-8;
     if(Math.abs(top)>2)window.scrollBy({top,behavior:'instant'});
    }
   }
   if(narrow&&control&&reveal){
    const pane=control.closest('.jsf-product-fields,.jsf-sign-fields');
    if(pane){const p=pane.getBoundingClientRect(),c=control.getBoundingClientRect();const top=Math.max(p.top,offset)+12,bottom=Math.min(p.bottom,offset+height)-12;
     if(c.bottom>bottom)pane.scrollTop+=c.bottom-bottom;
     else if(c.top<top)pane.scrollTop-=top-c.top;
    }
   }
   reveal=false;
  }
  function schedule(shouldReveal=false){reveal=reveal||shouldReveal;if(!active||frame!==null)return;frame=requestAnimationFrame(()=>{frame=null;if(active)measure();});}
  function settle(shouldReveal=false){
   if(!mobile()){schedule(shouldReveal);return;}
   reveal=reveal||shouldReveal;
   clearTimeout(settleTimer);
   // Keyboard animations emit many resize events; align only after they settle.
   settleTimer=setTimeout(()=>{settleTimer=null;schedule();},160);
  }
  const resize=()=>settle(Boolean(focused()));
  const scroll=()=>{if(!mobile())schedule();};
  const focus=()=>settle(true),blur=()=>{alignedControl=null;settle(false);};
  measure();
  const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>{if(!mobile())schedule();}):null;
  observer?.observe(element.parentElement);
  window.addEventListener('resize',resize);window.addEventListener('scroll',scroll,{passive:true});
  element.addEventListener('focusin',focus);element.addEventListener('focusout',blur);
  window.visualViewport?.addEventListener('resize',resize);
  // visualViewport.scroll is browser panning, not a request to scroll back.
  return()=>{active=false;clearTimeout(settleTimer);if(frame!==null)cancelAnimationFrame(frame);observer?.disconnect();window.removeEventListener('resize',resize);window.removeEventListener('scroll',scroll);element.removeEventListener('focusin',focus);element.removeEventListener('focusout',blur);window.visualViewport?.removeEventListener('resize',resize);if(backdrop){backdrop.style.removeProperty('height');backdrop.style.removeProperty('top');backdrop.style.removeProperty('bottom');}element.style.removeProperty('--jsf-editor-height');element.style.removeProperty('--jsf-mobile-viewport-height');};
 },[key,ref]);
 return ref;
}
