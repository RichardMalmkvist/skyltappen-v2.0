import AreaPreview from "../products/AreaPreview";
import { createPortal } from "react-dom";
import { useLayoutEffect, useRef } from "react";
import useModalFocus from "../../hooks/useModalFocus";

export default function CartAddedPanel({ item, cartCount, onClose, onCartClick, flight }) {
  const panel = useRef(null);
  const destination = useRef(null);
  useLayoutEffect(() => {
    if (!item || !flight) return;
    flight.play(destination.current);
    return () => flight.cancel();
  }, [item, flight]);
  useModalFocus(Boolean(item), panel, onClose);
  if (!item) return null;
  return createPortal(<div className="jsf-added-overlay" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section style={flight ? { animation: "none" } : undefined} className="jsf-added-panel" ref={panel} role="dialog" aria-modal="true" aria-labelledby="jsf-added-title" tabIndex={-1}>
      <div className="jsf-added-panel-heading"><h2 id="jsf-added-title">Tillagd i kundkorgen</h2><button type="button" onClick={onClose} aria-label="Stäng kundkorgspanelen">×</button></div>
      <div ref={destination} className="jsf-added-product">
        {item.pricingMode === "area" ? <div style={{width:110,flexShrink:0}}><AreaPreview form={item} mini/></div> : item.image && <img src={item.image} alt=""/>}
        <div><small>{item.articleNumber ? `Art.nr ${item.articleNumber}` : "Produkt"}</small><h3>{item.badgeName || item.name || "Skylt"}</h3>{item.format && <p>{item.format}</p>}<p>Antal: {item.quantity} st</p></div>
      </div>
      <p className="jsf-added-total">Totalt i kundkorgen <span>{cartCount} st</span></p>
      <div className="jsf-added-actions"><button type="button" className="jsf-order-primary" onClick={onCartClick}>Till kundkorgen →</button><button type="button" onClick={onClose}>Fortsätt handla</button></div>
    </section>
  </div>, document.body);
}
