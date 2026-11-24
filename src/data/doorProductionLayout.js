function getDoorTextConfig(source={}) {
  const config = {
    lines: 1,
    placeholder: "Skriv text här",
    maxChars: 28,
    fontFamily: "Arial",
    fontWeight: 400,
    fontSize: 178,
    color: "#222222",
    uppercase: true,
    leftPct: 8.3,
    topPct: 13.7,
    widthPct: 73.6,
    lineGapPct: 27.5,
    canvasWidth: 1738,
    canvasHeight: 863,
    line1TextHeightMm: 15.5,
    line1LeftMm: 15.85,
    line1BaselineMm: 27.5,
    line2TextHeightMm: 15.5,
    line2LeftMm: 15.85,
    line2BaselineMm: 47.5,
    nameTextHeightMm: 10.1,
    nameLeftMm: 15.85,
    nameBaselineMm: 59.8,
    titleTextHeightMm: 6.56,
    titleLeftMm: 15.85,
    titleBaselineMm: 72.5,
    titleItalic: true,
    brailleLeftMm: 15.85,
    brailleBaselineMm: 70.5,
    brailleFontSizeMm: 6.5,
    roomNumberTextHeightMm: 28,
    roomNumberLeftMm: 138,
    roomNumberBaselineMm: 66,
    tactileTextHeightMm: 15.5,
    tactileLine1BaselineMm: 27.5,
    tactileLine2BaselineMm: 47.5,
    tactileBrailleBaselineMm: 70.5,
    tactileBrailleFontSizeMm: 6.5,
    ...(source?.doorSignTextConfig || {}),
  };

  // Bakåtkompatibilitet med artiklar som sparats före den gemensamma mm-finjusteringen.
  const saved = source?.doorSignTextConfig || {};
  if (saved.line1TextHeightMm == null && saved.tactileTextHeightMm != null) config.line1TextHeightMm = Number(saved.tactileTextHeightMm);
  if (saved.line2TextHeightMm == null && saved.tactileTextHeightMm != null) config.line2TextHeightMm = Number(saved.tactileTextHeightMm);
  if (saved.line1BaselineMm == null && saved.tactileLine1BaselineMm != null) config.line1BaselineMm = Number(saved.tactileLine1BaselineMm);
  if (saved.line2BaselineMm == null && saved.tactileLine2BaselineMm != null) config.line2BaselineMm = Number(saved.tactileLine2BaselineMm);
  if (saved.brailleBaselineMm == null && saved.tactileBrailleBaselineMm != null) config.brailleBaselineMm = Number(saved.tactileBrailleBaselineMm);
  if (saved.brailleFontSizeMm == null && saved.tactileBrailleFontSizeMm != null) config.brailleFontSizeMm = Number(saved.tactileBrailleFontSizeMm);

  // Artikel 0603: punktskriften följer rubrikens vänsterkant.
  if (String(source?.articleNumber || "").trim() === "0603") config.brailleLeftMm = config.line1LeftMm;

  return config;
}

function getDoorSignPreviewValues(productForm = {}, config = {}) {
  const rawLine1 = productForm?.customText || config?.placeholder || "Egen text";
  const rawLine2 = productForm?.customTextLine2 || "";
  const transform = (value) => config?.uppercase === false ? String(value || "") : String(value || "").toUpperCase();
  return {
    textLine1: transform(rawLine1),
    textLine2: transform(rawLine2),
    // Rubriken och eventuell andra huvudrad följer artikelns VERSALER-val.
    // Namn och titel behåller det kunden faktiskt skriver.
    heading: transform(productForm?.doorHeading || productForm?.customText || config.placeholder || "Egen text"),
    name: productForm?.doorUseName ? String(productForm?.doorName || "") : "",
    title: productForm?.doorUseTitle ? String(productForm?.doorTitle || "") : "",
    extra: productForm?.doorUseLine2 ? transform(productForm?.doorExtra || "") : transform(productForm?.customTextLine2 || ""),
  };
}


module.exports={getDoorTextConfig,getDoorSignPreviewValues};
