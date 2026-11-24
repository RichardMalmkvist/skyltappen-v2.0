import { isDoubleSidedHangingSign } from "./hangingSignBackText";
import {greenTargetsEnabled} from './hangingTargetRules';
import { isAreaPriced } from "./areaPricing";
import { isPersonalDoorSign } from "./doorSignDimensions";
import { supportsDoorSymbol } from "./doorSymbolHelpers";
import { supportsDoorNumber } from "./doorNumberHelpers";

const PRODUCT_TYPE_LABELS = {
  namnbricka: "Namnbricka",
  namnbrickor: "Namnbricka",
  yrkestitelsskyltar: "Yrkestitelsskylt",
  dorropnare: "Dörröppnare",
  dorrskylt: "Dörrskylt",
  dorrskyltar: "Dörrskyltar",
  "taktila piktogram": "Taktila piktogram",
  "taktila-piktogram": "Taktila piktogram",
  taktila_piktogram: "Taktila piktogram",
  verksamhetsskylt: "Verksamhetsskylt",
  verksamhetsskyltar: "Verksamhetsskyltar",
  inomhusskylt: "Inomhusskylt",
  inomhusskyltar: "Inomhusskyltar",
  orienteringstavla: "Orienteringstavla",
  orienteringstavlor: "Orienteringstavlor",
  vaningsplanstavla: "Våningsplanstavla",
  vaningsplanstavlor: "Våningsplanstavlor",
  hisstavla: "Hisstavla",
  hisstavlor: "Hisstavlor",
  kamerabevakning: "Kamerabevakning",
  stoldskyddsmarkning: "Stöldskyddsmärkning",
  pendlad_skylt: "Pendlad skylt",
  pendlade_skyltar: "Pendlade skyltar",
  hansvisningsskylt: "Hänvisningsskylt",
  hansvisningsskyltar: "Hänvisnings-/infoskyltar",
  infoskylt: "Infoskylt",
  infoskyltar: "Infoskyltar",
};

const FIELD_LABEL_DEFAULTS = {
  name: "Namn",
  title: "Titel",
  titleLine2: "Titel rad 2",
  orgLine1: "Verksamhetsnamn",
  orgLine2: "Verksamhetsnamn rad 2",
  fastening: "Fäste",
  quantity: "Antal",
  extraMagnets: "Extra magnetfästen",
  professionChoiceId: "Yrkesroll",
  doorHeading: "Rubrik",
  doorName: "Namn",
  doorTitle: "Titel",
  doorExtra: "Extra text",
};

function startCaseFromKey(value) {
  if (!value) return "";

  return String(value)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function hasBadgeField(product, fieldKey) {
  if(product?.previewType==="parking_sign")return ["customTextLine1","customTextLine2","quantity"].includes(fieldKey);
  if(product?.vinylText)return ['customText','vinylTextOptions','quantity'].includes(fieldKey);
  if(product?.hangingSignTextOnly)return ['customText','quantity','hangingSignSymbols'].includes(fieldKey);
  if (fieldKey === "hangingBackText") return isDoubleSidedHangingSign(product);
  if (fieldKey === "areaDimensions") return isAreaPriced(product);
  if (fieldKey === "quantity" && isAreaPriced(product)) return true;
  if (isPersonalDoorSign(product)) {
    if (fieldKey === "doorHeading") return true;
    if (["customText", "customTextLine2", "doorName", "doorTitle", "doorExtra"].includes(fieldKey)) return false;
  }
  if (["hangingSignSymbol","hangingSignSymbols"].includes(fieldKey) &&
      (product?.previewType==="door_sign" || product?.productType==="dorrskylt" || supportsDoorSymbol(product))) return false;
  if (fieldKey === "doorSymbol") return supportsDoorSymbol(product);
  if (fieldKey === "doorNumber") return supportsDoorNumber(product);
  // Expedition/personalskylt renderar namn/titel/andra raden inuti sitt eget
  // kundval. Äldre sparade artiklar kan fortfarande ha dessa fält markerade
  // i admin, men de ska inte renderas en gång till i formuläret.
  if (product?.doorSignTextConfig?.layoutMode === "expedition" &&
      (fieldKey === "doorName" || fieldKey === "doorTitle" || fieldKey === "doorExtra")) {
    return false;
  }
  const categoryKey = String(product?.categoryId || product?.category || product?.group || "").toLowerCase();
  const isDoubleHangingText = product?.productType === "pendlad_skylt" &&
    (product?.hangingSignTextMode === "double" || String(product?.articleNumber || "").trim() === "0305");
  if (isDoubleHangingText) {
    if (fieldKey === "customText") return false;
    if (fieldKey === "customTextLine1" || fieldKey === "customTextLine2") return true;
  }
  const isGreenHangingSign =
    product?.productType === "pendlad_skylt" &&
    (categoryKey.includes("pendlade-gron") ||
      categoryKey.includes("gron") ||
      categoryKey.includes("grön") ||
      categoryKey.includes("green"));

  // Green signs may opt into destination markers, but never ordinary symbols.
  if (isGreenHangingSign && (fieldKey === "hangingSignSymbols" || fieldKey === "hangingSignSymbol")) {
    return fieldKey==='hangingSignSymbols'&&greenTargetsEnabled(product);
  }
  if(fieldKey==='hangingSignTargets')return false;

  return Boolean(product?.fields?.[fieldKey]);
}

export function getBadgeFieldConfig(product, fieldKey) {
  const isDoubleHangingText = product?.productType === "pendlad_skylt" &&
    (product?.hangingSignTextMode === "double" || String(product?.articleNumber || "").trim() === "0305");
  if (isDoubleHangingText && fieldKey === "customTextLine1" && !product?.fields?.[fieldKey]) {
    return { type: "text", label: "Textrad 1", placeholder: "Skriv text här", cartLabel: "Text rad 1" };
  }
  if (isDoubleHangingText && fieldKey === "customTextLine2" && !product?.fields?.[fieldKey]) {
    return { type: "text", label: "Textrad 2", placeholder: "Skriv text här", cartLabel: "Text rad 2" };
  }
  return product?.fields?.[fieldKey] || null;
}

export function getBadgeFieldLabel(product, fieldKey, fallbackLabel = "") {
  const fieldConfig = getBadgeFieldConfig(product, fieldKey);

  if (
    fieldConfig &&
    typeof fieldConfig === "object" &&
    typeof fieldConfig.label === "string" &&
    fieldConfig.label.trim()
  ) {
    return fieldConfig.label.trim();
  }

  if (fallbackLabel) {
    return fallbackLabel;
  }

  return FIELD_LABEL_DEFAULTS[fieldKey] || startCaseFromKey(fieldKey);
}

export function getAllConfiguredFieldKeys(product) {
  if (!product?.fields || typeof product.fields !== "object") {
    return [];
  }

  return Object.keys(product.fields);
}

export function getVisibleFieldKeys(product, orderedKeys = []) {
  let configuredKeys = getAllConfiguredFieldKeys(product);
  const isDoubleHangingText = product?.productType === "pendlad_skylt" &&
    (product?.hangingSignTextMode === "double" || String(product?.articleNumber || "").trim() === "0305");
  if (isDoubleHangingText) {
    configuredKeys = configuredKeys.filter((key) => key !== "customText");
    if (!configuredKeys.includes("customTextLine1")) configuredKeys.unshift("customTextLine1");
    if (!configuredKeys.includes("customTextLine2")) configuredKeys.splice(1, 0, "customTextLine2");
  }

  if (!orderedKeys.length) {
    return configuredKeys.filter((fieldKey) => hasBadgeField(product, fieldKey));
  }

  const orderedVisibleKeys = orderedKeys.filter((fieldKey) =>
    hasBadgeField(product, fieldKey)
  );

  const remainingVisibleKeys = configuredKeys.filter(
    (fieldKey) =>
      hasBadgeField(product, fieldKey) && !orderedVisibleKeys.includes(fieldKey)
  );

  return [...orderedVisibleKeys, ...remainingVisibleKeys];
}

export function isProfessionProductType(productType) {
  return productType === "yrkestitelsskyltar";
}

export function isDirectProductType(productType) {
  return productType === "dorropnare";
}

export function getProductTypeLabel(productType) {
  if (!productType) return "Produkt";

  return PRODUCT_TYPE_LABELS[productType] || startCaseFromKey(productType);
}

export function getProductDisplayName(product) {
  if (!product) return "Produkt";

  return product.name || getProductTypeLabel(product.productType);
}

export function getProductDescription(product) {
  return product?.desc || "";
}
