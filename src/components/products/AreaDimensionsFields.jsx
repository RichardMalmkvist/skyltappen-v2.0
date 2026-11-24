import Field from "../forms/Field";
import { calculateAreaPricing, isStripedDecor, getStripeSettings } from "../../data/areaPricing";

const money = value => new Intl.NumberFormat("sv-SE", {style:"currency", currency:"SEK"}).format(value);

export default function AreaDimensionsFields({ product, form, onChange, inputStyle }) {
  const price = calculateAreaPricing(product, form);
  const stripes = getStripeSettings(product, form);
  const circle = form.areaShape === "circle";
  const dimensions = circle ? [["areaDiameterMm","Diameter (mm)"]] : [["areaWidthMm","Bredd (mm)"],["areaHeightMm","Höjd (mm)"]];
  return <div className="jsf-area-dimensions" style={{minWidth:0}}>
    <Field label="Form" htmlFor="areaShape"><select id="areaShape" value={form.areaShape || "rectangle"} onChange={event=>onChange("areaShape",event.target.value)} style={{...inputStyle,width:"100%"}}><option value="rectangle">Rektangulär</option><option value="circle">Rund</option></select></Field>
    <div style={{display:"grid",gridTemplateColumns:circle?"minmax(0,1fr)":"repeat(2,minmax(0,1fr))",gap:14}}>
      {dimensions.map(([key,label]) =>
        <Field key={key} label={label} htmlFor={key}>
          <input id={key} type="number" inputMode="decimal" required min="0.1" max="100000" step="any"
            value={form[key] ?? ""} onChange={event=>onChange(key,event.target.value)}
            style={{...inputStyle,width:"100%",minWidth:0,boxSizing:"border-box"}} />
        </Field>)}
    </div>
    {isStripedDecor(product) && <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:14}}>
      {[["stripeHeightMm","Randhöjd (mm)",0.1],["stripeGapMm","Mellanrum (mm)",0]].map(([key,label,min]) => <Field key={key} label={label} htmlFor={key}><input id={key} type="number" inputMode="decimal" required min={min} max="100000" step="any" value={form[key] ?? stripes[key]} onChange={event=>onChange(key,event.target.value)} style={{...inputStyle,width:"100%",minWidth:0,boxSizing:"border-box"}}/></Field>)}
    </div>}
    <div aria-live="polite" style={{fontSize:12,lineHeight:1.7,color:"#555",marginBottom:16}}>
      <div>{money(Number(product.unitPrice)||0)}/m²</div>
      {price && <div>{price.areaM2.toLocaleString("sv-SE",{maximumFractionDigits:8})} m²/st · {money(price.unitPrice)}/st</div>}
    </div>
  </div>;
}
