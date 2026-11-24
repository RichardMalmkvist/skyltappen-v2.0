import { useEffect, useId, useRef, useState } from "react";
import "../../styles/groupedCatalog.css";
const normalize=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
export const professionLabel=product=>[product?.fixedProfessionTitle || product?.name || "Titel",product?.fixedProfessionTitleLine2].filter(Boolean).join(" ");
export default function ProfessionOrderCard({ products, selectedProduct, onSelect, renderPreview, renderQuantity, onAdd, added }) {
  const id=useId().replace(/:/g,"");const root=useRef(null);const active=useRef(null);
  const [query,setQuery]=useState("");const [open,setOpen]=useState(false);const [index,setIndex]=useState(0);
  const words=normalize(query).trim().split(/\s+/).filter(Boolean);
  const matches=products.filter(product=>words.every(word=>normalize([professionLabel(product),product.articleNumber,product.fixedColor].join(" ")).includes(word)));
  const activeIndex=Math.min(index,Math.max(0,matches.length-1));
  useEffect(()=>{if(open)active.current?.scrollIntoView({block:"nearest"});},[open,activeIndex,query]);
  if(!selectedProduct)return null;
  function choose(product){if(!product)return;onSelect(product.id);setOpen(false);setQuery("");}
  return <div className="jsf-profession-order-card" ref={root}>
    <div className="jsf-profession-order-preview">{renderPreview(selectedProduct)}</div>
    <div className="jsf-profession-order-fields">
      <div className="jsf-profession-combobox" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget)){setOpen(false);setQuery("");}}}>
        <label htmlFor={`${id}-input`}>Yrkestitel</label>
        <div className="jsf-profession-search-control"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg>
          <input id={`${id}-input`} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-list`} aria-activedescendant={open&&matches.length?`${id}-option-${activeIndex}`:undefined}
            value={open?query:professionLabel(selectedProduct)} placeholder={open?"Sök titel eller artikelnummer":"Välj yrkestitel"}
            onFocus={()=>{setOpen(true);setQuery("");setIndex(0);}}
            onClick={()=>{if(!open){setOpen(true);setQuery("");setIndex(0);}}}
            onChange={event=>{setQuery(event.target.value);setIndex(0);setOpen(true);}}
            onKeyDown={event=>{
              if(event.key==="Escape"){event.preventDefault();setOpen(false);setQuery("");}
              if(event.key==="ArrowDown"||event.key==="ArrowUp"){event.preventDefault();setOpen(true);setIndex(previous=>!open?0:Math.max(0,Math.min(matches.length-1,previous+(event.key==="ArrowDown"?1:-1))));}
              if(event.key==="Enter"&&open){event.preventDefault();choose(matches[activeIndex]);}
            }}/><span aria-hidden="true">⌄</span>
        </div>
        {open&&<div className="jsf-profession-options"><ul role="listbox" id={`${id}-list`} aria-label="Yrkestitlar">{matches.map((product,i)=><li key={product.id} role="option" aria-selected={String(product.id)===String(selectedProduct.id)} id={`${id}-option-${i}`} ref={i===activeIndex?active:null} className={i===activeIndex?"is-active":""}><button type="button" tabIndex={-1} onMouseDown={event=>event.preventDefault()} onClick={()=>choose(product)}><span>{professionLabel(product)}</span><small>{product.articleNumber?`Art.nr ${product.articleNumber}`:""}</small></button></li>)}</ul>{!matches.length&&<p role="status">Inga yrkestitlar matchar din sökning.</p>}</div>}
      </div>
      <div className="jsf-profession-product-meta"><span>{selectedProduct.articleNumber?`Art.nr ${selectedProduct.articleNumber}`:""}</span><span>{selectedProduct.fixedColorName || selectedProduct.fixedColor || ""}</span>{selectedProduct.format&&<span>{selectedProduct.format}</span>}{selectedProduct.unitPrice!==undefined&&Number.isFinite(Number(selectedProduct.unitPrice))&&<span>{new Intl.NumberFormat("sv-SE",{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(selectedProduct.unitPrice))} kr/st</span>}</div>
      <p className="jsf-profession-fastening">Levereras med militärklämma i metall.</p>
      <div className="jsf-profession-order-actions">{renderQuantity(selectedProduct)}<button type="button" className="jsf-profession-add" onClick={event=>onAdd(selectedProduct,event.currentTarget.closest('.jsf-profession-order-card'))}>{added?"✓ Tillagd":"Lägg i kundkorg"}<span aria-hidden="true">{added?"":"→"}</span></button></div>
    </div>
  </div>;
}
