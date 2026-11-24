const MEASURED_MODES = ["expedition", "tactile", "whiteboard", "whiteboard_personal", "occupancy", "occupancy_whiteboard", "occupancy_whiteboard_personal", "dual_whiteboard", "room_number_status"];
const TALL_MODES = ["whiteboard", "whiteboard_personal", "occupancy_whiteboard", "dual_whiteboard", "room_number_status"];
export const COMMON_DOOR_ARTICLES = ["0610", "0602", "0603", "0604", "0607", "0608", "0616", "0620"];

export function isPersonalDoorSign(product) {
  return product?.doorSignTextEnabled !== false && (product?.doorSignTextConfig?.layoutMode !== "tactile" || COMMON_DOOR_ARTICLES.includes(String(product?.articleNumber).trim())) &&
    (product?.previewType === "door_sign" || product?.productType === "dorrskylt" || product?.doorSignTextEnabled === true);
}

export function getDoorSignPreviewDimensions(product) {
  const config = product?.doorSignTextConfig || {};
  const measured = MEASURED_MODES.includes(config.layoutMode);
  const width = measured ? 1920 : Math.max(100, Number(config.canvasWidth) || 1738);
  const defaultHeight = measured ? (config.layoutMode === "occupancy_whiteboard_personal" ? 2812.5 : TALL_MODES.includes(config.layoutMode) ? 1875 : 937.5) : Math.max(100, Number(config.canvasHeight) || 863);
  const savedHeight = Number(config.previewHeightMm);
  const heightMm = Number.isFinite(savedHeight) && savedHeight >= 93.75 && savedHeight <= 2000
    ? savedHeight : 192 * defaultHeight / width;
  return { width, height: width * heightMm / 192, heightMm };
}

// Upgrade the old 0607 form without replacing its image, price or identity.
export function normalizeThreePartDoorArticles(articles) {
  const reference = articles.find(article => String(article.articleNumber).trim() === "0608");
  const normalized = articles.map(article => {
    if (String(article.articleNumber).trim() !== "0607" || article.doorSignTextConfig?.layoutMode !== "occupancy_whiteboard") return article;
    const fields = { ...article.fields };
    for (const key of ["customText", "customTextLine2", "doorName", "doorTitle", "doorExtra"]) delete fields[key];
    fields.doorHeading = { type: "text", label: "Text", maxLength: 40, cartLabel: "Text" };
    fields.doorNumber = reference?.fields?.doorNumber ?? true;
    fields.doorSymbol = reference?.fields?.doorSymbol ?? false;
    return { ...article, fields, doorSignTextEnabled: true, productType: "dorrskylt", previewType: "door_sign", flowType: "form",
      doorNumberConfig: article.doorNumberConfig || reference?.doorNumberConfig,
      doorSymbolConfig: article.doorSymbolConfig || reference?.doorSymbolConfig,
      doorSignTextConfig: { ...article.doorSignTextConfig,
        line1TextHeightMm: 15.5, line1LeftMm: 15.85, line1BaselineMm: 27.5,
        line2BaselineMm: 47.5, nameTextHeightMm: 10.1, nameLeftMm: 15.85, nameBaselineMm: 59.8,
        titleTextHeightMm: 6.56, titleLeftMm: 15.85, titleBaselineMm: 72.5, titleItalic: true,
        ...(reference?.doorSignTextConfig || {}), layoutMode: "occupancy_whiteboard_personal", previewHeightMm: 281.25 } };
  });
  return normalized.map(article => {
    if (!COMMON_DOOR_ARTICLES.includes(String(article?.articleNumber).trim()) || !isPersonalDoorSign(article) || article.doorSignSharedFormVersion === 2) return article;
    return { ...article, doorSignSharedFormVersion: 2, fields: { ...article.fields, doorNumber: true, doorSymbol: true } };
  });
}
