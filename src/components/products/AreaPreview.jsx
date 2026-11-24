import { useId } from "react";
import { getAreaGeometry, isStripedDecor, getStripeSettings, stripeSettingsError } from "../../data/areaPricing";

export default function AreaPreview({product = {}, form = {}, maxWidth = 520, mini = false}) {
  const clipId = `area-${useId().replace(/:/g, "")}`;
  const values = {...form.configuration, ...form};
  const geometry = getAreaGeometry(values);
  const circle = values.areaShape === "circle";
  const width = geometry?.areaWidthMm || 300;
  const height = geometry?.areaHeightMm || (circle ? 300 : 200);
  const scale = Math.min(440 / width, 280 / height);
  const w = width * scale, h = height * scale;
  const x = (520 - w) / 2, y = (320 - h) / 2;
  const striped = isStripedDecor({...product, ...values});
  const settings = getStripeSettings(product, values);
  const stripeValid = !stripeSettingsError({...product, ...values}, values);
  const stripeHeight = Math.max(0.01, settings.stripeHeightMm * scale);
  const stripeGap = Math.max(0, settings.stripeGapMm * scale);
  const image = product.image || form.image;
  const shape = circle
    ? <circle cx="260" cy="160" r={w / 2} />
    : <rect x={x} y={y} width={w} height={h} />;
  return <svg className="jsf-area-preview" role="img" aria-label={`${product.name || form.badgeName || "Folie"}${geometry ? ` – ${geometry.format}` : ""}`}
    viewBox="0 0 520 360" style={{display:"block",width:"100%",maxWidth,margin:"auto",height:"auto"}}
    data-shape={circle ? "circle" : "rectangle"} data-width-mm={geometry?.areaWidthMm} data-height-mm={geometry?.areaHeightMm}>
    <defs><clipPath id={clipId}>{shape}</clipPath>{striped && stripeValid && <pattern id={`${clipId}-stripes`} patternUnits="userSpaceOnUse" x={x} y={y} width={Math.max(w,1)} height={stripeHeight+stripeGap}><rect width={Math.max(w,1)} height={stripeHeight} fill="#cbd0d0"/></pattern>}</defs>
    <g fill={striped ? "none" : "#d8dbdb"} stroke="#bec3c3" strokeWidth="1">{shape}</g>
    {striped && stripeValid && <rect data-stripe-height-mm={settings.stripeHeightMm} data-stripe-gap-mm={settings.stripeGapMm} x={x} y={y} width={w} height={h} fill={`url(#${clipId}-stripes)`} clipPath={`url(#${clipId})`}/>}
    {image && !striped && <image href={image} x={x} y={y} width={w} height={h} preserveAspectRatio="none" clipPath={`url(#${clipId})`} />}
    {!mini && geometry && <text x="260" y="345" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="13" fill="#626868">{geometry.format}</text>}
  </svg>;
}
