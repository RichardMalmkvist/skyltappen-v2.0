import { useId, useState, useEffect, useRef, useCallback } from "react";
import "../../styles/groupedCatalog.css";
import "../../styles/catalogGroupMotion.css";
const saved = {};
export default function CatalogDisclosure({ groupId, title, count, thumbnail, defaultOpen=false, children }) {
  const section=useRef(null);
  const id=useId().replace(/:/g, "");
  const [open,setOpen]=useState(()=>{const prefix=String(groupId).split("-")[0]+"-";const latest=Object.keys(saved).filter(key=>key.startsWith(prefix)&&saved[key]).pop();return defaultOpen || latest===groupId;});
  const save=useCallback(value=>{saved[groupId]=value;},[groupId]);
  useEffect(()=>{
    const closeOther=event=>{
      if(event.detail?.parent===section.current?.parentElement&&event.detail?.id!==id){setOpen(false);save(false);}
    };
    window.addEventListener("jsf:catalog-group-open",closeOther);
    if(open)window.dispatchEvent(new CustomEvent("jsf:catalog-group-open",{detail:{parent:section.current?.parentElement,id}}));
    return ()=>window.removeEventListener("jsf:catalog-group-open",closeOther);
  },[open,id,save]);
  return <section ref={section} className="jsf-catalog-disclosure">
    <h2><button type="button" id={`${id}-heading`} aria-expanded={open} aria-controls={`${id}-panel`} onClick={()=>{
      if(!open)window.dispatchEvent(new CustomEvent("jsf:catalog-group-open",{detail:{parent:section.current?.parentElement,id}}));
      setOpen(!open);save(!open);
    }}>
      {thumbnail && <span className="jsf-disclosure-thumbnail" aria-hidden="true">{thumbnail}</span>}
      <span className="jsf-disclosure-title">{title}</span><span className="jsf-disclosure-count">{count} {count===1?"artikel":"artiklar"}</span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>
    </button></h2>
    <div id={`${id}-panel`} role="region" aria-labelledby={`${id}-heading`} hidden={!open}>{open && <div className="jsf-disclosure-content">{children}</div>}</div>
  </section>;
}
