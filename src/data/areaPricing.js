// Shared by the customer form and project-to-order conversion on the server.
function isAreaPriced(product) {
  if (product?.pricingMode) return product.pricingMode === "area";
  return String(product?.categoryId || "").toLowerCase() === "etsfoliering";
}

function isStripedDecor(product) {
  if (product?.decorStyle) return product.decorStyle === "striped";
  return product?.categoryId === "etsfoliering" && /^randig dekor$/i.test(String(product?.name || product?.badgeName || "").trim());
}

function getStripeSettings(product = {}, form = {}) {
  return {
    stripeHeightMm: Number(form.stripeHeightMm ?? product.defaultStripeHeightMm ?? 50),
    stripeGapMm: Number(form.stripeGapMm ?? product.defaultStripeGapMm ?? 50),
  };
}

function stripeSettingsError(product, form = {}) {
  if (!isStripedDecor(product)) return null;
  const stripe = getStripeSettings(product, form);
  if (!Number.isFinite(stripe.stripeHeightMm) || stripe.stripeHeightMm < 0.1 || stripe.stripeHeightMm > 100000) return "Ange randhöjd mellan 0,1 och 100 000 mm.";
  if (form.stripeGapMm === "" || !Number.isFinite(stripe.stripeGapMm) || stripe.stripeGapMm < 0 || stripe.stripeGapMm > 100000) return "Ange mellanrum mellan 0 och 100 000 mm.";
  return null;
}

function areaDimensionsError(form = {}) {
  if (form.areaShape && !["rectangle", "circle"].includes(form.areaShape)) return "Välj form.";
  const fields = form.areaShape === "circle"
    ? [["areaDiameterMm", "diameter"]]
    : [["areaWidthMm", "bredd"], ["areaHeightMm", "höjd"]];
  for (const [key, label] of fields) {
    const value = Number(form[key]);
    if (!Number.isFinite(value) || value < 0.1 || value > 100000) {
      return `Ange ${label} mellan 0,1 och 100 000 mm.`;
    }
  }
  return null;
}

function getAreaGeometry(form = {}) {
  if (areaDimensionsError(form)) return null;
  const circle = form.areaShape === "circle";
  const width = Number(circle ? form.areaDiameterMm : form.areaWidthMm);
  const height = Number(circle ? form.areaDiameterMm : form.areaHeightMm);
  return {
    areaShape: circle ? "circle" : "rectangle",
    areaWidthMm: width,
    areaHeightMm: height,
    areaDiameterMm: circle ? width : 0,
    areaM2: circle ? Math.PI * (width / 2) ** 2 / 1000000 : width * height / 1000000,
    format: circle ? `Ø ${width.toLocaleString("sv-SE")} mm` : `${width.toLocaleString("sv-SE")} × ${height.toLocaleString("sv-SE")} mm`,
  };
}

function calculateAreaPricing(product, form = {}) {
  const geometry = getAreaGeometry(form);
  if (!geometry || stripeSettingsError(product, form)) return null;
  const rate = Number(product.pricePerM2 ?? product.unitPrice ?? 0);
  if (!Number.isFinite(rate) || rate < 0) return null;
  const ore = geometry.areaM2 * rate * 100;
  return {
    pricingMode: "area",
    ...geometry,
    decorStyle: isStripedDecor(product) ? "striped" : "solid",
    ...(isStripedDecor(product) ? getStripeSettings(product, form) : {}),
    pricePerM2: rate,
    unitPrice: Math.round(ore + Number.EPSILON * Math.max(1, Math.abs(ore))) / 100,
  };
}

module.exports = { isStripedDecor, getStripeSettings, stripeSettingsError, isAreaPriced, areaDimensionsError, getAreaGeometry, calculateAreaPricing };
