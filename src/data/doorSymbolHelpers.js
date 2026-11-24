import { getDoorSignSymbolById } from "./doorSignSymbols";

export function supportsDoorSymbol(product) {
  if (Object.prototype.hasOwnProperty.call(product?.fields || {}, "doorSymbol")) return Boolean(product.fields.doorSymbol);
  return product?.doorSymbolEnabled === true || String(product?.articleNumber || "").trim().replace(/^0+/, "") === "602";
}

export function getDoorSymbolConfig(product) {
  const config = product?.doorSymbolConfig || {};
  const bounded = (value, fallback, max, min = 0) => {
    const number = value === "" || value == null ? fallback : Number(value);
    return Math.min(max, Math.max(min, Number.isFinite(number) ? number : fallback));
  };
  const sizeMm = bounded(config.sizeMm, 28, 70, 3);
  return { sizeMm, leftMm: bounded(config.leftMm, 15.85, 180 - sizeMm),
    rightMm: bounded(config.rightMm, 15.85, 180 - sizeMm),
    topMm: bounded(config.topMm, 43, 86.7 - sizeMm) };
}

export function getDoorSymbolFields(product, form) {
  if (!supportsDoorSymbol(product)) return {};
  const symbol = form?.doorUseSymbol ? getDoorSignSymbolById(form.doorSymbol) : null;
  return { doorSymbolEnabled: true, doorSymbolConfig: getDoorSymbolConfig(product),
    doorUseSymbol: Boolean(form?.doorUseSymbol), doorSymbol: form?.doorUseSymbol ? form.doorSymbol || "" : "",
    doorSymbolName: form?.doorUseSymbol ? symbol?.name || form.doorSymbolName || "" : "",
    doorSymbolImage: form?.doorUseSymbol ? symbol?.image || form.doorSymbolImage || "" : "",
    doorSymbolSide: form?.doorSymbolSide === "left" ? "left" : "right" };
}
