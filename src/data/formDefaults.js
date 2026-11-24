import { getChosenProfession } from "./professionHelpers";

export const EMPTY_PRODUCT_FORM = {
  orgLine1: "",
  orgLine2: "",
  name: "",
  title: "",
  titleLine2: "",
  professionChoiceId: "",
  fastening: "",
  quantity: 1,
  extraMagnets: 0,
  color: "",
  textColor: "",
  customText: "",
  parkingSymbols: [],
  parkingWithoutText: false,
  customTextLine1: "",
  customTextLine2: "",
  doorHeading: "",
  doorName: "",
  doorTitle: "",
  doorExtra: "",
  doorMiddleName: "",
  doorMiddleTitle: "",
  doorUseLine2: false,
  doorUseName: false,
  doorUseTitle: false,
  doorUseSymbol: false,
  doorSymbol: "",
  doorSymbolName: "",
  doorSymbolSide: "right",
  doorUseNumber: false,
  doorNumber: "",
  doorNumberSide: "left",
  arrowPlacement: "none",
  arrowDirection: "",
  leftArrowDirection: "none",
  rightArrowDirection: "none",
  hangingSignSymbol: "none",
  hangingSignSymbols: [],
  hangingSignTextMode: "single",
  hangingTargetPosition:'right',hangingTargetRows:1,hangingTargetRowAssignments:{},hangingSignWithoutText:false,
  hangingSignDifferentBackText: false,
  backTextLine1: "",
  backTextLine2: "",
};

export const EMPTY_ORDERER = {
  purchaserName: "",
  purchaserPhone: "",
  purchaserEmail: "",
  customer: "",
  ordererName: "",
  ordererEmail: "",
  ordererPhone: "",
  messageToSupplier: "",
  accountNumber: "",
};


export const EMPTY_ORDER_DETAILS = {
  customerReference: "",
  projectName: "",
  projectCode: "",
  managementObject: "",
  targetPoint: "",
  property: "",
  building: "",
  floor: "",
  room: "",
  priority: "planeringsbar",
  requestedCompletionDate: "",
  requestedExecutionNote: "",
};

export const EMPTY_DELIVERY = {
  company: "",
  recipient: "",
  address: "",
  postalCode: "",
  city: "",
  country: "Sverige",
};

export function getProfessionInitialForm(product = null) {
  const fallbackProfession = getChosenProfession("lakare");

  const fixedTitle = product?.fixedProfessionTitle || fallbackProfession.label;
  const fixedColor = product?.fixedColor || fallbackProfession.color;
  const fixedTextColor =
    product?.fixedTextColor || fallbackProfession.textColor;

  return {
    ...EMPTY_PRODUCT_FORM,
    title: fixedTitle,
    titleLine2: product?.fixedProfessionTitleLine2 || "",
    professionChoiceId: "",
    color: fixedColor,
    textColor: fixedTextColor,
    quantity: 1,
  };
}

export function getHangingSignInitialForm(product = null) {
  const isDoubleText = product?.hangingSignTextMode === "double" || String(product?.articleNumber || "").trim() === "0305";

  return {
    ...EMPTY_PRODUCT_FORM,
    customText: "",
    customTextLine1: "",
    customTextLine2: "",
    arrowPlacement: "none",
    arrowDirection: "",
    leftArrowDirection: "none",
    rightArrowDirection: "none",
    hangingSignSymbol: "none",
    hangingSignSymbols: [],
    hangingSignTextMode: isDoubleText ? "double" : "single",
    quantity: 1,
  };
}

export function getEmptyProductForm() {
  return {
    ...EMPTY_PRODUCT_FORM,
  };
}
