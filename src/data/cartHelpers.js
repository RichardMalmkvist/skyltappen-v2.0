import {signArtworkError} from './signArtwork';
import {hangingAppearanceFields} from './additionalHangingArticles';
import {normalizeBraLivForm} from './braLivNameBadges';
import {resolveOutdoorArticle,outdoorFormat,outdoorOrderFields} from './outdoorBusinessSigns';
import {decalArticleNumber} from './customDecalArticles';
import {getSalesUnit} from "./salesUnits";
import {hangingTargetFields,hangingTargetError} from './hangingTargetLayout';
import {doorBrailleError} from "./tactileBraille";
import {parkingConfig,parkingError} from "./parkingSign";
import {vinylTextSettings,vinylTextError} from './vinylText';
import {greenTargetsEnabled} from './hangingTargetRules';
import {getDestinationCube,destinationCubeError,isDestinationCube} from "./destinationCube";
import { isNameBadge0201, nameBadgeFormError } from "./nameBadge0201";
import { getCatalogArticles } from "./catalogStore";
import { getHangingBackTextFields, hangingBackTextError } from "./hangingSignBackText";
import { isAreaPriced, areaDimensionsError, stripeSettingsError, calculateAreaPricing } from "./areaPricing";
import {isParkingPole,poleError,poleHeight,poleFormat} from './parkingPole';
import {newDibondSign,validateDibondSign,withDibondAbsolutePositions} from "./dibondHelpers";
import { getDoorSymbolFields, supportsDoorSymbol } from "./doorSymbolHelpers";
import { getDoorNumberFields, supportsDoorNumber } from "./doorNumberHelpers";
import {
  getBadgeFieldLabel,
  hasBadgeField,
  isProfessionProductType,
} from "./productHelpers";
import { getChosenProfession } from "./professionHelpers";
import { getProductFlowType, isProfessionFlowProduct } from "./products";
import { buildDirectCartExtraFields } from "./directProductFieldHelpers";
import { getHangingSignSymbolById, getHangingSignSymbolAssets } from "./hangingSignSymbols";

function createItemId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString();
}

function toSafeString(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function toTrimmedString(value) {
  return toSafeString(value).trim();
}

function toSafeQuantity(value) {
  return Math.max(1, Number(value) || 1);
}

function toSafeNonNegativeNumber(value) {
  return Math.max(0, Number(value) || 0);
}

function getProductTypeLabelFromProduct(product) {
  if (product?.productTypeLabel) return product.productTypeLabel;
  if (product?.subTypeLabel) return product.subTypeLabel;
  if (product?.categoryTitle) return product.categoryTitle;
  if (product?.productType) return product.productType;
  return "Produkt";
}

function createBaseCartItem(product, quantity) {
  return {
    id: createItemId(),
    badgeId: product?.id || null,
    categoryId: product?.categoryId || "",
    productType: product?.productType || "",
    productTypeLabel: getProductTypeLabelFromProduct(product),
    previewType: product?.previewType || "image",
    badgeName: product?.name || "",
    articleNumber: product?.articleNumber || "",
    quantity: toSafeQuantity(quantity),
    salesUnit: getSalesUnit(product),
    image: product?.image || "",
    desc: product?.desc || "",
    extraLine: product?.extraLine || "",
    format: product?.format || "",
    unitPrice: toSafeNonNegativeNumber(product?.unitPrice),
    currency: product?.currency || "SEK",
    productionFile: product?.productionFile || null,
  };
}

function getFormFlowKey(selectedBadge, selectedProductType) {
  if (isProfessionFlowProduct(selectedBadge)) {
    return "profession";
  }

  if (isProfessionProductType(selectedProductType)) {
    return "profession";
  }

  const flowType = getProductFlowType(selectedBadge);

  if (flowType === "profession") return "profession";
  return "badge";
}

function validateQuantity(productForm) {
  if (
    !Number.isFinite(Number(productForm.quantity)) ||
    Number(productForm.quantity) < 1
  ) {
    return "Antal måste vara minst 1.";
  }

  return null;
}

function validateExtraMagnets(productForm) {
  if (
    !Number.isFinite(Number(productForm.extraMagnets)) ||
    Number(productForm.extraMagnets) < 0
  ) {
    return "Extra magnetfästen kan inte vara mindre än 0.";
  }

  return null;
}

function validateRequiredText(value, message) {
  if (!toTrimmedString(value)) {
    return message;
  }

  return null;
}

function isHangingSignProduct(product) {
  return product?.productType === "pendlad_skylt";
}

function isDoorSignProduct(product) {
  return product?.productType === "dorrskylt";
}

function buildHangingSignExtraFields(selectedBadge, productForm) {
  const extraFields = [];

  const fieldConfigs = selectedBadge?.fields || {};

  Object.keys(fieldConfigs).forEach((fieldKey) => {
    if (fieldKey === "quantity") return;
    if(productForm.hangingSignWithoutText&&['customText','customTextLine1','customTextLine2'].includes(fieldKey))return;

    const rawValue = productForm?.[fieldKey];

    if (rawValue === null || rawValue === undefined || rawValue === "") {
      return;
    }

    const label = getBadgeFieldLabel(selectedBadge, fieldKey, fieldKey);
    let displayValue = toSafeString(rawValue);

    if (fieldKey === "arrowPlacement" || fieldKey === "arrowDirection") {
      const directions = { none: "Ingen", left: "Vänster", right: "Höger", up: "Upp", down: "Ner" };
      displayValue = directions[rawValue] || displayValue;
    }
    if (fieldKey === "hangingSignSymbol") {
      const symbol = getHangingSignSymbolById(rawValue);
      displayValue = symbol?.name || (rawValue === "none" ? "Ingen symbol" : displayValue);
    }
    if (fieldKey === "hangingSignSymbols") {
      const ids = Array.isArray(rawValue) ? rawValue : [];
      displayValue = ids.length
        ? ids.map((id) => getHangingSignSymbolById(id)?.name || id).join(", ")
        : "Ingen symbol";
    }

    const arrowLabelMap = {
      none: "Ingen",
      left: "Vänster",
      right: "Höger",
      up: "Upp",
      down: "Ner",
    };
    if (fieldKey === "leftArrowDirection" || fieldKey === "rightArrowDirection") {
      displayValue = arrowLabelMap[rawValue] || displayValue;
    }

    extraFields.push({
      key: fieldKey,
      label,
      value: displayValue,
    });
  });

  if(productForm.hangingSignWithoutText)extraFields.push({key:'hangingSignWithoutText',label:'Text',value:'Utan text'});
  if(productForm.hangingTargetPosition==='left')extraFields.push({key:'hangingTargetPosition',label:'Målpunkternas placering',value:'Från textens vänsterkant'});
  if(Number(productForm.hangingTargetRows)===2){
    const ids=Array.isArray(productForm.hangingSignSymbols)?productForm.hangingSignSymbols:[];
    for(const row of [1,2]){const names=ids.filter(id=>(Number(productForm.hangingTargetRowAssignments?.[id])===2?2:1)===row).map(id=>getHangingSignSymbolById(id)?.name||id);if(names.length)extraFields.push({key:`hangingTargetRow${row}`,label:`Målpunkter – rad ${row}`,value:names.join(', ')});}
  }
  return extraFields;
}

const validators = {
  profession: ({ productForm }) => {
    if (!toTrimmedString(productForm.professionChoiceId)) {
      return "Du måste välja yrkesroll.";
    }

    return validateQuantity(productForm);
  },

  badge: ({ selectedBadge, productForm }) => {
    if (!selectedBadge) {
      return "Ingen skylt är vald.";
    }
    if(selectedBadge.previewType==="parking_sign")return parkingError(selectedBadge,productForm)||validateQuantity(productForm);
    if(selectedBadge.vinylText)return vinylTextError(productForm,selectedBadge)||validateQuantity(productForm);

    if (isDoorSignProduct(selectedBadge) || selectedBadge?.previewType === "door_sign") {
      if (supportsDoorNumber(selectedBadge) && productForm.doorUseNumber && !/^\d+$/.test(String(productForm.doorNumber || ""))) return "Fyll i numret på skylten med siffror.";
      // Validate the actual text control shown by this article template.
      // Personal/expedition templates use doorHeading, not customText.
      const textFields = ["doorHeading", "customTextLine1", "customText"]
        .filter((key) => hasBadgeField(selectedBadge, key));
      if (textFields.length && !textFields.some((key) => toTrimmedString(productForm[key]))) {
        return "Du måste fylla i texten på skylten.";
      }
      const brailleError=doorBrailleError(selectedBadge,productForm);
      if(brailleError)return brailleError;
      return validateQuantity(productForm);
    }

    if (isHangingSignProduct(selectedBadge)) {
      const assets=getHangingSignSymbolAssets(productForm);
      const targetError=hangingTargetError(selectedBadge,productForm,assets);
      if(targetError)return targetError;
      const backError = hangingBackTextError(selectedBadge, {...productForm,hangingSignSymbolAssets:assets});
      if (backError) return backError;
      const isDouble = selectedBadge?.hangingSignTextMode === "double" ||
        String(selectedBadge?.articleNumber || "").trim() === "0305";
      if (isDouble&&!productForm.hangingSignWithoutText) {
        if (!toTrimmedString(productForm.customTextLine1)) return "Du måste fylla i textrad 1.";
        if (!toTrimmedString(productForm.customTextLine2)) return "Du måste fylla i textrad 2.";
      } else if(!productForm.hangingSignWithoutText) {
        const activeTextKeys = ["customText", "customTextLine1"]
          .filter((key) => hasBadgeField(selectedBadge, key));
        if (activeTextKeys.length && !activeTextKeys.some((key) => toTrimmedString(productForm[key]))) {
          return "Du måste fylla i text.";
        }
      }
      if (
        selectedBadge?.fields?.arrowPlacement &&
        toTrimmedString(productForm.arrowPlacement) &&
        productForm.arrowPlacement !== "none" &&
        !toTrimmedString(productForm.arrowDirection)
      ) return "Du måste välja pilriktning.";
      return validateQuantity(productForm);
    }

    if (hasBadgeField(selectedBadge, "name")) {
      const error = validateRequiredText(
        productForm.name,
        "Du måste fylla i namn."
      );
      if (error) return error;
    }

    if (hasBadgeField(selectedBadge, "titleLine2")) {
      if (
        !toTrimmedString(productForm.title) &&
        !toTrimmedString(productForm.titleLine2)
      ) {
        return "Du måste fylla i minst en titelrad.";
      }
    } else if (hasBadgeField(selectedBadge, "title")) {
      const error = validateRequiredText(
        productForm.title,
        "Du måste fylla i titel."
      );
      if (error) return error;
    }

    if (hasBadgeField(selectedBadge, "orgLine1")) {
      const label = getBadgeFieldLabel(
        selectedBadge,
        "orgLine1",
        "verksamhetsnamn"
      ).toLowerCase();

      const error = validateRequiredText(
        productForm.orgLine1,
        `Du måste fylla i ${label}.`
      );
      if (error) return error;
    }

    if (hasBadgeField(selectedBadge, "fastening")) {
      const error = validateRequiredText(
        productForm.fastening,
        "Du måste välja fäste."
      );
      if (error) return error;
    }

    if (hasBadgeField(selectedBadge, "quantity")) {
      const quantityError = validateQuantity(productForm);
      if (quantityError) return quantityError;
    }

    if (hasBadgeField(selectedBadge, "extraMagnets")) {
      const magnetsError = validateExtraMagnets(productForm);
      if (magnetsError) return magnetsError;
    }

    return null;
  },
};

const cartItemBuilders = {
  direct: ({ product, quantity, directFieldValues = {} }) => {
    const base = createBaseCartItem(product, quantity);

    const isProfession =
      isProfessionFlowProduct(product) ||
      product?.previewType === "profession" ||
      product?.productType === "yrkestitelsskylt" ||
      product?.categoryId === "yrkestitelsskyltar";

    return {
      ...base,
      extraFields: buildDirectCartExtraFields(product, directFieldValues),
      ...(isProfession
        ? {
            previewType: "profession",
            productType: product?.productType || "yrkestitelsskylt",
            productTypeLabel: "Yrkestitelsskylt",
            title:
              [product?.fixedProfessionTitle || product?.fixedTitle || product?.name || "",product?.fixedProfessionTitleLine2].filter(Boolean).join("\n"),
            fastening: product?.fastening || "Militärklämma i metall",
            color: product?.fixedColor || "",
            textColor: product?.fixedTextColor || "",
            articleNumber: product?.articleNumber || "",
          }
        : {}),
    };
  },

  profession: ({ selectedBadge, productForm }) => {
    const chosenProfession = getChosenProfession(productForm.professionChoiceId);

    const finalTitle =
      selectedBadge?.fixedProfessionTitle ||
      selectedBadge?.fixedTitle ||
      selectedBadge?.name ||
      chosenProfession?.label ||
      "";

    const finalColor =
      selectedBadge?.fixedColor ||
      productForm?.color ||
      chosenProfession?.color ||
      "";

    const finalTextColor =
      selectedBadge?.fixedTextColor ||
      productForm?.textColor ||
      chosenProfession?.textColor ||
      "";

    const finalArticleNumber =
      selectedBadge?.articleNumber ||
      chosenProfession?.articleNumber ||
      "";

    const base = createBaseCartItem(selectedBadge, productForm.quantity);

    return {
      ...base,
      categoryId: selectedBadge?.categoryId || base.categoryId || "",
      productType: selectedBadge?.productType || "yrkestitelsskylt",
      productTypeLabel: "Yrkestitelsskylt",
      previewType: "profession",
      badgeId: selectedBadge?.id || base.badgeId || null,
      badgeName: selectedBadge?.name || "Yrkestitelsskylt",
      articleNumber: finalArticleNumber,
      title: finalTitle,
      professionChoiceId:
        chosenProfession?.id || toTrimmedString(productForm.professionChoiceId),
      color: finalColor,
      textColor: finalTextColor,
    };
  },

  badge: ({ selectedBadge, productForm }) => {
    const base = createBaseCartItem(selectedBadge, productForm.quantity);
    if(selectedBadge?.previewType==="parking_sign"){
      const error=parkingError(selectedBadge,productForm);if(error)throw new Error(error);
      return {...base,parkingSignConfig:{...parkingConfig(selectedBadge)},parkingWithoutText:productForm.parkingWithoutText===true,parkingSymbols:JSON.parse(JSON.stringify(productForm.parkingSymbols||[])),customTextLine1:String(productForm.customTextLine1||"").trim(),customTextLine2:String(productForm.customTextLine2||"").trim()};
    }
    if(selectedBadge?.vinylText){
      const error=vinylTextError(productForm,selectedBadge);if(error)throw new Error(error);
      const {text,heightMm,fontWeight}=vinylTextSettings(productForm,selectedBadge);
      return {...base,vinylText:true,hangingSignTextOnly:true,hangingSignSides:1,customText:text,vinylTextHeightMm:heightMm,vinylFontWeight:fontWeight,format:heightMm+' mm texthöjd · Arial '+(fontWeight===700?'Bold':'Regular'),extraFields:[{key:'vinylTextHeightMm',label:'Texthöjd',value:heightMm+' mm'},{key:'vinylFontWeight',label:'Textstil',value:'Arial '+(fontWeight===700?'Bold':'Regular')}]};
    }

    if (isDoorSignProduct(selectedBadge)) {
      return {
        ...base,
        productType: selectedBadge?.productType || "",
        productTypeLabel:
          selectedBadge?.productTypeLabel ||
          base.productTypeLabel ||
          "Produkt",
        previewType: selectedBadge?.previewType || "door_sign",
        customText: toTrimmedString(productForm.customText || productForm.customTextLine1),
        customTextLine1: toTrimmedString(productForm.customTextLine1),
        customTextLine2: toTrimmedString(productForm.customTextLine2),
        doorHeading: toTrimmedString(productForm.doorHeading),
        doorName: toTrimmedString(productForm.doorName),
        doorTitle: toTrimmedString(productForm.doorTitle),
        doorExtra: toTrimmedString(productForm.doorExtra),
        doorMiddleName: toTrimmedString(productForm.doorMiddleName),
        doorMiddleTitle: toTrimmedString(productForm.doorMiddleTitle),
      ...getDoorNumberFields(selectedBadge, productForm),
      ...getDoorSymbolFields(selectedBadge, productForm),
      ...(selectedBadge?.previewType === "door_sign" ? {
        doorUseLine2: Boolean(productForm.doorUseLine2),
        doorUseName: Boolean(productForm.doorUseName),
        doorUseTitle: Boolean(productForm.doorUseTitle),
        doorSignTextEnabled: Boolean(selectedBadge.doorSignTextEnabled),
        doorSignTextConfig: selectedBadge.doorSignTextConfig || null,
        doorSignPreviewImage: selectedBadge.doorSignPreviewImage || "",
      } : {}),
        doorUseLine2: Boolean(productForm.doorUseLine2),
        doorUseName: Boolean(productForm.doorUseName),
        doorUseTitle: Boolean(productForm.doorUseTitle),
        doorSignTextEnabled: Boolean(selectedBadge?.doorSignTextEnabled),
        doorSignTextConfig: selectedBadge?.doorSignTextConfig || null,
        doorSignPreviewImage: selectedBadge?.doorSignPreviewImage || "",
      };
    }

    if (isHangingSignProduct(selectedBadge)) {
      return {
        ...base,
        productType: selectedBadge?.productType || "",
        productTypeLabel:
          selectedBadge?.productTypeLabel ||
          base.productTypeLabel ||
          "Produkt",
        previewType: selectedBadge?.previewType || "hanging_sign",
        ...hangingTargetFields(productForm),
        customText: productForm.hangingSignWithoutText?'':toTrimmedString(productForm.customText || productForm.customTextLine1),
        customTextLine1: productForm.hangingSignWithoutText?'':toTrimmedString(productForm.customTextLine1 || productForm.customText),
        customTextLine2: productForm.hangingSignWithoutText?'':toTrimmedString(productForm.customTextLine2),
        arrowPlacement: toSafeString(productForm.arrowPlacement || "none"),
        arrowDirection: toSafeString(productForm.arrowDirection),
        leftArrowDirection: toSafeString(productForm.leftArrowDirection || "none"),
        rightArrowDirection: toSafeString(productForm.rightArrowDirection || "none"),
        hangingSignSymbol: toSafeString(productForm.hangingSignSymbol || "none"),
        hangingSignSymbols: Array.isArray(productForm.hangingSignSymbols) ? productForm.hangingSignSymbols : [],
        hangingSignTextMode:
          selectedBadge?.hangingSignTextMode ||
          productForm?.hangingSignTextMode ||
          "single",
        ...getHangingBackTextFields(selectedBadge, productForm),
        hangingSignSymbolAssets: getHangingSignSymbolAssets(productForm),
        ...hangingAppearanceFields(selectedBadge),
        hangingSignSides: selectedBadge.hangingSignSides,
        hangingSignTargetsEnabled:greenTargetsEnabled(selectedBadge),
        hangingSignTextOnly: Boolean(selectedBadge.hangingSignTextOnly),
        hangingSignPreset: selectedBadge.hangingSignPreset,
        hangingSignRules: selectedBadge.hangingSignRules,
        hangingSignSizeMm: selectedBadge.hangingSignSizeMm,
        hangingSignHeightMm: selectedBadge.hangingSignHeightMm,
        extraFields: buildHangingSignExtraFields(selectedBadge, productForm),
      };
    }

    return {
      ...base,
      productType: selectedBadge?.productType || "",
      productTypeLabel:
        selectedBadge?.productTypeLabel ||
        base.productTypeLabel ||
        "Produkt",
      previewType: selectedBadge?.previewType || base.previewType || "badge",
      name: toTrimmedString(productForm.name),
      title: toTrimmedString(productForm.title),
      titleLine2: toTrimmedString(productForm.titleLine2),
      orgLine1: toTrimmedString(productForm.orgLine1),
      orgLine2: toTrimmedString(productForm.orgLine2),
      fastening: toSafeString(productForm.fastening),
      extraMagnets: toSafeNonNegativeNumber(productForm.extraMagnets),
      // Preserve customer-entered text even when the product type is a generic "skylt".
      customText: toTrimmedString(productForm.customText),
      customTextLine1: toTrimmedString(productForm.customTextLine1),
      customTextLine2: toTrimmedString(productForm.customTextLine2),
      doorHeading: toTrimmedString(productForm.doorHeading),
      doorName: toTrimmedString(productForm.doorName),
      doorTitle: toTrimmedString(productForm.doorTitle),
      doorExtra: toTrimmedString(productForm.doorExtra),
        doorMiddleName: toTrimmedString(productForm.doorMiddleName),
        doorMiddleTitle: toTrimmedString(productForm.doorMiddleTitle),
      ...getDoorNumberFields(selectedBadge, productForm),
      ...getDoorSymbolFields(selectedBadge, productForm),
      ...(selectedBadge?.previewType === "door_sign" ? {
        doorUseLine2: Boolean(productForm.doorUseLine2),
        doorUseName: Boolean(productForm.doorUseName),
        doorUseTitle: Boolean(productForm.doorUseTitle),
        doorSignTextEnabled: Boolean(selectedBadge.doorSignTextEnabled),
        doorSignTextConfig: selectedBadge.doorSignTextConfig || null,
        doorSignPreviewImage: selectedBadge.doorSignPreviewImage || "",
      } : {}),
    };
  },
};

export function createDirectCartItem(product, quantity, directFieldValues = {}) {
  return cartItemBuilders.direct({
    product,
    quantity,
    directFieldValues,
  });
}

export function validateCurrentItem(
  selectedBadge,
  selectedProductType,
  productForm
) {
  if(selectedBadge?.previewType==="profession"&&selectedBadge.fixedProfessionTitle)return validateQuantity(productForm);
  productForm=normalizeBraLivForm(selectedBadge,productForm);
  if(String(selectedBadge?.articleNumber)==='0610'&&!/^\d{1,4}$/.test(String(productForm.doorNumber||'')))return 'Skriv en siffra med högst fyra tecken i mittdelen.';
  if (isAreaPriced(selectedBadge)) {
    return areaDimensionsError(productForm) || stripeSettingsError(selectedBadge,productForm) || validateQuantity(productForm) ||
      (!Number.isInteger(Number(productForm.quantity)) ? "Antal måste vara ett heltal." : null);
  }
  if(isDestinationCube(selectedBadge))return destinationCubeError(productForm)||validateQuantity(productForm);
  if(isParkingPole(selectedBadge))return poleError(productForm)||validateQuantity(productForm);
  if(selectedBadge?.previewType==="dibond_sign")return validateDibondSign(selectedBadge,productForm.dibondSign||newDibondSign(selectedBadge))||validateQuantity(productForm);
  if(selectedBadge?.previewType==="ot_board") {
    if(productForm.otBoard?.uploadedArtwork)return signArtworkError(productForm.otBoard.uploadedArtwork,productForm.otBoard.widthMm,productForm.otBoard.heightMm,productForm.otBoard.artworkPlacement)||validateQuantity(productForm);
    const variant=selectedBadge.otBoards?.find(item=>item.id===productForm.otBoardId);
    if(!variant)return "Välj vilken OT-tavla du vill beställa.";
    const board=productForm.otBoard||variant.board;
    if(!board?.rows?.length||board.rows.length>100*(Number(board.columns)||1))return `OT-tavlan behöver ha 1–${100*(Number(board?.columns)||1)} rader.`;
    if(!board.rows.some(row=>String(row.text||"").trim()&&String(row.target||"").trim()))return "Fyll i minst en avdelning och målpunkt på tavlan.";
    if(board.rows.some(row=>{
      const text=String(row.text||"").trim(),target=String(row.target||"").trim();
      if(Number(board.columns)===2&&!text&&!target)return false;
      return !text||!target||text.length>120||target.length>10||/[\r\n]/.test(text+target);
    }))return "Fyll i avdelning (högst 120 tecken) och målpunkt (högst 10 tecken) i varje påbörjat fält. Helt tomma fält får lämnas i tvåkolumnstavlor.";
    return validateQuantity(productForm);
  }
  if(selectedBadge?.previewType==="elevator_board") {
    const variant=productForm.elevatorBoardVariant?.id===productForm.elevatorBoardId?productForm.elevatorBoardVariant:selectedBadge.elevatorBoards?.find(item=>item.id===productForm.elevatorBoardId);
    if(selectedBadge.elevatorBoards?.length && !variant) return "Välj vilken hisstavla du vill beställa.";
    if(variant?.options && !variant.options[productForm.elevatorOrderMode||"print"]?.articleId) return "Den valda hisstypen saknar en giltig artikel i artikelregistret.";
    const board=productForm.elevatorBoard || variant?.board || selectedBadge.elevatorBoardConfig;
    if(!board?.floors?.length || board.floors.some(floor=>!String(floor.heading||"").trim())) return "Fyll i planrubrik för varje plan på hisstavlan.";
    if(board.floors.some(floor=>String(floor.text||"").split(/\r?\n/).length>12 || String(floor.text||"").split(/\r?\n/).some(line=>line.length>120))) return "Använd högst 12 textrader per plan och 120 tecken per rad.";
    return validateQuantity(productForm);
  }
  if (supportsDoorNumber(selectedBadge) && productForm.doorUseNumber && !/^\d+$/.test(String(productForm.doorNumber || ""))) {
    return "Fyll i numret på skylten med siffror.";
  }
  if (supportsDoorSymbol(selectedBadge) && productForm.doorUseSymbol && !productForm.doorSymbol) return "Välj en symbol till skylten.";
  const badgeError=nameBadgeFormError(selectedBadge,productForm);
  if(badgeError) return badgeError;
  const flowKey = getFormFlowKey(selectedBadge, selectedProductType);
  const validator = validators[flowKey];

  if (!validator) {
    return "Produkten kunde inte valideras.";
  }

  return (
    validator({
      selectedBadge,
      selectedProductType,
      productForm,
    }) || null
  );
}

export function createFormCartItem(
  selectedBadge,
  selectedProductType,
  productForm
) {
  productForm=normalizeBraLivForm(selectedBadge,productForm);
  const flowKey = getFormFlowKey(selectedBadge, selectedProductType);
  const builder = cartItemBuilders[flowKey];

  if (!builder) {
    throw new Error(`Ingen cart builder finns för flow: ${flowKey}`);
  }

  return builder({
    selectedBadge,
    selectedProductType,
    productForm,
  });
}

export function createCartItem(
  selectedBadge,
  selectedProductType,
  productForm
) {
  if(selectedBadge?.previewType==="profession"&&selectedBadge.fixedProfessionTitle)return createDirectCartItem(selectedBadge,productForm.quantity);
  if (isAreaPriced(selectedBadge)) {
    const pricing = calculateAreaPricing(selectedBadge, productForm);
    if (!pricing) throw new Error(areaDimensionsError(productForm) || "Kontrollera artikelns m²-pris.");
    return {...createBaseCartItem(selectedBadge,productForm.quantity), ...pricing};
  }
  if(isDestinationCube(selectedBadge)) return {...createBaseCartItem(selectedBadge,productForm.quantity),destinationCube:getDestinationCube(productForm,selectedBadge)};
  if(isParkingPole(selectedBadge))return {...createBaseCartItem(selectedBadge,productForm.quantity),poleHeightMm:poleHeight(productForm),format:poleFormat(productForm),extraFields:[{key:"poleHeightMm",label:"Stolphöjd",value:poleHeight(productForm)+" mm"}]};
  if(selectedBadge?.previewType==="dibond_sign") {
    const sign=withDibondAbsolutePositions(JSON.parse(JSON.stringify(productForm.dibondSign||newDibondSign(selectedBadge))));
    sign.widthMm=Number(sign.widthMm);sign.heightMm=Number(sign.heightMm);sign.textOffsetYMm=Number(sign.textOffsetYMm??0);sign.separatorEnabled=Boolean(sign.separatorEnabled);sign.separatorOffsetYMm=Number(sign.separatorOffsetYMm??0);sign.lines=sign.lines.map(line=>({...line,text:String(line.text||""),sizeMm:Number(line.sizeMm),bold:Boolean(line.bold),offsetXMm:Number(line.offsetXMm??0),offsetYMm:0,firstLineBottomMm:Number(line.firstLineBottomMm)}));
    const chosen=resolveOutdoorArticle(selectedBadge,sign,getCatalogArticles());
    return {...createBaseCartItem(chosen,productForm.quantity),articleNumber:decalArticleNumber(chosen,{dibondSign:sign}),dibondSign:sign,extraFields:sign.outdoorSign?outdoorOrderFields(sign):sign.acrylicPocket?.enabled?[{key:"acrylicPocket",label:"Vikt akryl A4",value:`210 × 297 mm · Från vänster: ${sign.acrylicPocket.xMm} mm · Från ovankant: ${sign.acrylicPocket.yMm} mm`}]:[],dibondConfig:{...selectedBadge.dibondConfig},frameMm:sign.frameEnabled===false||/^123[0-4]$/.test(String(selectedBadge.articleNumber||""))?0:4,format:sign.outdoorSign?outdoorFormat(sign):`${sign.widthMm} × ${sign.heightMm} mm`};
  }
  if(selectedBadge?.previewType==="ot_board") {
    if(productForm.otBoard?.uploadedArtwork)return {...createBaseCartItem(selectedBadge,productForm.quantity),otBoard:JSON.parse(JSON.stringify(productForm.otBoard)),otBoardName:productForm.otBoard.uploadedArtwork.name,format:productForm.otBoard.widthMm+' × '+productForm.otBoard.heightMm+' mm'};
    const variant=selectedBadge.otBoards?.find(item=>item.id===productForm.otBoardId);
    const board=JSON.parse(JSON.stringify(productForm.otBoard||variant?.board));
    return {...createBaseCartItem(selectedBadge,productForm.quantity),unitPrice:Number(variant.unitPrice??selectedBadge.unitPrice)||0,otBoard:board,otBoardId:variant.id,otBoardName:variant.name,otBoardLocation:variant.location||"",badgeName:`${selectedBadge.name} – ${variant.name}`,format:`${board.widthMm} × ${board.heightMm} mm`};
  }
  if(selectedBadge?.previewType==="elevator_board") {
    const variant=productForm.elevatorBoardVariant?.id===productForm.elevatorBoardId?productForm.elevatorBoardVariant:selectedBadge.elevatorBoards?.find(item=>item.id===productForm.elevatorBoardId);
    const board=JSON.parse(JSON.stringify(productForm.elevatorBoard || variant?.board || selectedBadge.elevatorBoardConfig));
    const option=variant?.options?.[productForm.elevatorOrderMode||"print"];
    return {...createBaseCartItem(selectedBadge,variant ? Number(variant.floorCopies??1)+Number(variant.cabinCopies??0) : productForm.quantity),badgeId:option?.articleId||selectedBadge.id,articleNumber:option?.articleNumber||selectedBadge.articleNumber,badgeName:`${option?.articleName||selectedBadge.name} – ${variant?.name||"Hisstavla"}`,floorCopies:Number(variant?.floorCopies??1),cabinCopies:Number(variant?.cabinCopies??0),unitPrice:Number(option?.unitPrice ?? variant?.unitPrice ?? selectedBadge.unitPrice)||0,elevatorBoard:board,elevatorOrderMode:productForm.elevatorOrderMode||"print",elevatorBoardId:variant?.id||"",elevatorBoardName:variant?.name||selectedBadge.name,elevatorBoardLocation:variant?.location||"",format:`${board.widthMm} × ${board.heightMm} mm`};
  }
  const item=createFormCartItem(selectedBadge, selectedProductType, productForm);
  if(isNameBadge0201(selectedBadge)) {
    const magnet=getCatalogArticles().find(article=>String(article.articleNumber)===String(selectedBadge.extraMagnetArticleNumber || "02030"));
    return {...item,nameBadgePreset:selectedBadge.nameBadgePreset,nameBadgePreviewImage:selectedBadge.nameBadgePreviewImage,extraMagnetProduct:magnet ? {id:magnet.id,name:magnet.name,articleNumber:magnet.articleNumber,unitPrice:magnet.unitPrice,categoryId:magnet.categoryId,image:magnet.image,desc:magnet.desc} : null};
  }
  return item;
}
