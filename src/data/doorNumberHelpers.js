export function supportsDoorNumber(product) {
  if (Object.prototype.hasOwnProperty.call(product?.fields || {}, "doorNumber")) {
    return Boolean(product.fields.doorNumber);
  }
  if (product?.doorNumberEnabled === true) return true;
  return String(product?.articleNumber || "").trim().replace(/^0+/, "") === "602";
}

export function getDoorNumberConfig(product, form = {}) {
  const config = product?.doorNumberConfig || {};
  const margin = Number(product?.doorSignTextConfig?.line1LeftMm) || 15.85;
  const bounded = (value, fallback, min, max) => {
    const number = value === "" || value == null ? fallback : Number(value);
    return Math.min(max, Math.max(min, Number.isFinite(number) ? number : fallback));
  };
  const textHeightMm = bounded(config.textHeightMm, 28, 3, 70);
  return {
    leftMm: bounded(config.leftMm, margin, 0, 170),
    rightMm: bounded(config.rightMm, margin, 0, 170),
    topMm: bounded(config.topMm, form?.doorUseLine2 ? 50 : 43, 0, 86.7 - textHeightMm),
    textHeightMm,
  };
}

export function getDoorNumberFields(product, form) {
  if (!supportsDoorNumber(product)) return {};
  return {
    doorNumberEnabled: true,
    doorNumberConfig: getDoorNumberConfig(product, form),
    doorUseNumber: Boolean(form?.doorUseNumber),
    doorNumber: form?.doorUseNumber ? String(form.doorNumber || "").replace(/\D/g, "") : "",
    doorNumberSide: form?.doorNumberSide === "right" ? "right" : "left",
  };
}
