export const HANGING_SIGN_PRESETS = {
  hanging_1500: {
    id: 'hanging_1500',
    label: 'Pendlad skylt 1500 mm',
    widthMm: 1500,
    heightMm: 200,
    fontFamily: 'Arial',
    fontWeight: 400,
    textHeightMm: 70,
    textStartMm: 190,
    symbolRightMm: 190,
    symbolGapMm: 5,
    symbolHeightMm: 117,
    sideStripeMm: 4,
    arrowWidthMm: 110,
    arrowHeightMm: 80,
    arrowEdgeMm: 30,
    arrowVerticalCenter: true,
  },
  hanging_1000: {
    id: 'hanging_1000',
    label: 'Pendlad skylt 1000 mm',
    widthMm: 1000,
    heightMm: 150,
    fontFamily: 'Arial',
    fontWeight: 700,
    textHeightMm: 40,
    textStartMm: 130,
    symbolRightMm: 125,
    symbolGapMm: 5,
    symbolHeightMm: 70,
    sideStripeMm: 4,
    arrowWidthMm: 60,
    arrowHeightMm: 50,
    arrowEdgeMm: 30,
    arrowVerticalCenter: true,
  },
};


export function isGreenHangingSignArticle(article = {}) {
  const key = String(
    article?.categoryId ||
    article?.category ||
    article?.group ||
    ""
  ).toLowerCase();

  return (
    key.includes("pendlade-gron") ||
    key.includes("gron") ||
    key.includes("grön") ||
    key.includes("green")
  );
}

export function getHangingSignPreset(id) {
  return HANGING_SIGN_PRESETS[id] || null;
}

export function applyHangingSignPreset(article = {}, presetId, sides = 1) {
  const preset = getHangingSignPreset(presetId);
  if (!preset) {
    const next = { ...article };
    delete next.hangingSignPreset;
    delete next.hangingSignRules;
    delete next.hangingSignSides;
    return next;
  }

  const isGreen = isGreenHangingSignArticle(article);

  return {
    ...article,
    productType: 'pendlad_skylt',
    previewType: 'hanging_sign',
    flowType: 'form',
    hangingSignPreset: presetId,
    hangingSignSizeMm: preset.widthMm,
    hangingSignHeightMm: preset.heightMm,
    hangingSignSides: Number(sides) === 2 ? 2 : 1,
    hangingSignRules: { ...preset },
    hangingSignBackgroundColor: isGreen ? '#00843D' : '#FFFFFF',
    hangingSignForegroundColor: isGreen ? '#FFFFFF' : '#111111',
    fields: {
      ...(article.fields || {}),
      customText: true,
      leftArrowDirection: true,
      hangingSignSymbols: isGreen ? false : true,
      rightArrowDirection: true,
      quantity: true,
    },
  };
}
