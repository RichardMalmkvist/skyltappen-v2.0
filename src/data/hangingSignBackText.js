// Shared by the browser and project-to-order conversion.
const {hangingTargetError}=require('./hangingTargetLayout');
const BACK_SELECTION_KEYS = {arrowPlacement:"backArrowPlacement", arrowDirection:"backArrowDirection", leftArrowDirection:"backLeftArrowDirection", rightArrowDirection:"backRightArrowDirection", hangingSignSymbol:"backHangingSignSymbol", hangingSignSymbols:"backHangingSignSymbols", hangingUseSymbols:"backHangingUseSymbols", hangingUseTargets:"backHangingUseTargets"};
Object.assign(BACK_SELECTION_KEYS,{hangingTargetPosition:'backHangingTargetPosition',hangingTargetRows:'backHangingTargetRows',hangingTargetRowAssignments:'backHangingTargetRowAssignments',hangingSignWithoutText:'backHangingSignWithoutText'});
function isDoubleSidedHangingSign(product = {}) {
  const hanging = product.productType === "pendlad_skylt" || product.previewType === "hanging_sign" || Boolean(product.hangingSignPreset);
  if (!hanging) return false;
  if (product.hangingSignSides != null) return Number(product.hangingSignSides) === 2;
  return [302, 304, 306, 308].includes(Number(product.badgeId || product.id));
}
function isDoubleLineHangingSign(product = {}, form = {}) {
  return (product.hangingSignTextMode || form.hangingSignTextMode) === "double" || String(product.articleNumber || "").trim() === "0305";
}
function getHangingBackTextFields(product, form = {}) {
  const hangingSignDifferentBackText = isDoubleSidedHangingSign(product) && Boolean(form.hangingSignDifferentBackText);
  return {
    ...Object.fromEntries(Object.values(BACK_SELECTION_KEYS).map(key=>[key, hangingSignDifferentBackText ? form[key] : undefined])),
    hangingSignDifferentBackText,
    backTextLine1: hangingSignDifferentBackText&&!form.backHangingSignWithoutText ? String(form.backTextLine1 || "").trim() : "",
    backTextLine2: hangingSignDifferentBackText&&!form.backHangingSignWithoutText && isDoubleLineHangingSign(product, form) ? String(form.backTextLine2 || "").trim() : "",
  };
}
function hangingBackTextError(product, form = {}) {
  const fields = getHangingBackTextFields(product, form);
  if (!fields.hangingSignDifferentBackText) return null;
  const back=getHangingBackForm(form),targetError=hangingTargetError(product,back,form.hangingSignSymbolAssets||[]);
  if(targetError)return targetError;
  if (!back.hangingSignWithoutText&&!fields.backTextLine1) return "Fyll i baksidans text rad 1.";
  if (!back.hangingSignWithoutText&&isDoubleLineHangingSign(product, form) && !fields.backTextLine2) return "Fyll i baksidans text rad 2.";
  if (form.backArrowPlacement && form.backArrowPlacement !== "none" && !form.backArrowDirection) return "Välj pilriktning för baksidan.";
  return null;
}
function getHangingBackForm(form = {},product=form) {
  if (!form.hangingSignDifferentBackText) return product.hangingSignBackDefaultText?{...form,customText:product.hangingSignBackDefaultText,customTextLine1:product.hangingSignBackDefaultText,customTextLine2:'',hangingSignWithoutText:false,hangingSignSymbols:[],hangingSignSymbol:'none',hangingUseSymbols:false,hangingUseTargets:false}:form;
  return {...form, extraFields: undefined, ...Object.fromEntries(Object.entries(BACK_SELECTION_KEYS).map(([key, backKey])=>[key,form[backKey]])), customText: form.backTextLine1 || "", customTextLine1: form.backTextLine1 || "", customTextLine2: form.backTextLine2 || ""};
}
module.exports = {BACK_SELECTION_KEYS, isDoubleSidedHangingSign, isDoubleLineHangingSign, getHangingBackTextFields, hangingBackTextError, getHangingBackForm};
