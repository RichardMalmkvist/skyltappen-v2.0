const {hangingAppearanceFields}=require('../src/data/additionalHangingArticles');
const {normalizeBraLivForm}=require('../src/data/braLivNameBadges');
const {expandHangingStackMarkers}=require('../src/data/hangingStack');
const {resolveOutdoorArticle,outdoorFormat,outdoorOrderFields}=require('../src/data/outdoorBusinessSigns');
const {decalArticleNumber}=require('../src/data/customDecalArticles');
const {getSalesUnit}=require("../src/data/salesUnits");
const { isAreaPriced, calculateAreaPricing } = require("../src/data/areaPricing");
const {poleFormat,isParkingPole}=require('../src/data/parkingPole');
const crypto = require("crypto");
const { getNameBadgeCartAdditions } = require("../src/data/nameBadge0201");
const { getHangingBackTextFields } = require("../src/data/hangingSignBackText");
const {greenTargetsEnabled}=require('../src/data/hangingTargetRules');
const {normalizeDoorTextReference}=require('../src/data/doorTextReference');
const {getOTBoardSelection}=require('../src/data/otBoardSelection');

// Position and drawing describe where a sign goes, not how it is made.
const LOCATION_FIELDS = new Set([
  "id", "quantity", "lineTotal", "position", "drawingName", "projectMarkerId",
  "projectMarkerIds", "projectPositions",
]);

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") return Object.fromEntries(
    Object.keys(value).sort().filter(key => value[key] !== undefined)
      .map(key => [key, stableValue(value[key])])
  );
  return value;
}

// Room references describe placement; other instructions still distinguish order rows.
const isRoomReference = value => /^(?:rum|rumsnummer)\s*:?\s*(?=.*\d)[\p{L}\d._/-]+$/iu.test(String(value || "").trim());

function groupingKey(item) {
  const product = Object.fromEntries(Object.entries(item).filter(([key]) => !LOCATION_FIELDS.has(key)));
  if (!String(product.notes || "").trim() || isRoomReference(product.notes)) delete product.notes;
  // Quantity in the editor snapshot must not split otherwise identical signs.
  if (product.configuration) {
    const { quantity, ...configuration } = product.configuration;
    product.configuration = configuration;
  }
  return JSON.stringify(stableValue(product));
}

function groupProjectOrderItems(items) {
  const groups = new Map();
  for (const item of items) {
    const key = groupingKey(item);
    let row = groups.get(key);
    if (!row) {
      row = { ...item, quantity: 0, lineTotal: 0, projectMarkerIds: [], projectPositions: [] };
      groups.set(key, row);
    }
    row.quantity += item.quantity;
    row.lineTotal = Math.round(row.quantity * row.unitPrice * 100) / 100;
    row.projectMarkerIds.push(item.projectMarkerId);
    row.projectPositions.push({ markerId: item.projectMarkerId, position: item.position, drawingName: item.drawingName, notes: String(item.notes || "").trim() });
    row.notes = [...new Set(row.projectPositions.map(location => location.notes).filter(Boolean))].join(", ");
    row.position = row.projectPositions.map(location => location.position).filter(Boolean).join(", ");
    row.drawingName = [...new Set(row.projectPositions.map(location => location.drawingName).filter(Boolean))].join(", ");
  }
  return [...groups.values()];
}

const CONFIGURATION_FIELDS = ["otBoardId","hangingTargetPosition","hangingTargetRows","hangingTargetRowAssignments","hangingSignWithoutText","parkingSignConfig","parkingSymbols","parkingWithoutText","destinationCube","orgLine1", "orgLine2", "name", "title", "titleLine2", "professionChoiceId", "fastening", "extraMagnets", "color", "textColor", "customText", "customTextLine1", "customTextLine2", "doorHeading", "doorName", "doorTitle", "doorExtra", "doorMiddleName", "doorMiddleTitle", "doorUseLine2", "doorUseName", "doorUseTitle", "doorUseNumber", "doorNumber", "doorNumberSide", "doorUseSymbol", "doorSymbol", "doorSymbolName", "doorSymbolSide", "arrowPlacement", "arrowDirection", "leftArrowDirection", "rightArrowDirection", "hangingSignSymbol", "hangingSignSymbols", "hangingSignTextMode"];

function buildProjectOrderItems(markers, articles) {
  return expandHangingStackMarkers(markers,articles).map(marker => {
      const baseArticle = articles.find(a => String(a.id) === String(marker.articleId) || String(a.articleNumber) === String(marker.articleId));
      const article=resolveOutdoorArticle(baseArticle,marker.configuration?.dibondSign,articles);
      if (!article) return null;
      const quantity = Number(marker.quantity || 1);
      const configuration = normalizeBraLivForm(article,marker.configuration || {});
      const ot = getOTBoardSelection(article,configuration);
      const elevator = configuration.elevatorBoard;
      const lift = configuration.elevatorBoardVariant;
      const areaPrice = isAreaPriced(article) ? calculateAreaPricing(article, marker.configuration || {}) : null;
      if (isAreaPriced(article) && !areaPrice) return null;
      const unitPrice = Number(marker.price ?? areaPrice?.unitPrice ?? ot?.unitPrice ?? article.price ?? article.unitPrice ?? 0);
      if (!Number.isSafeInteger(quantity) || quantity < 1 || !Number.isFinite(unitPrice) || unitPrice < 0) return null;
      const signFields = {...Object.fromEntries([...CONFIGURATION_FIELDS,'vinylTextHeightMm','vinylFontWeight','poleHeightMm'].filter(key => configuration[key] !== undefined).map(key => [key,configuration[key]])),...(article.vinylText?{vinylText:true,hangingSignTextOnly:true,hangingSignSides:1}:{}), ...(article.productType === "pendlad_skylt" ? {...getHangingBackTextFields(article, configuration),...hangingAppearanceFields(article),hangingSignTargetsEnabled:greenTargetsEnabled(article)} : {})};
      const boardFields = ot ? {
        previewType:"ot_board",otBoard:ot.board,otBoardName:ot.name,otBoardLocation:ot.location,
        format:`${ot.board.widthMm} × ${ot.board.heightMm} mm`
      } : elevator ? {
        previewType:"elevator_board",elevatorBoard:elevator,elevatorBoardId:configuration.elevatorBoardId,
        elevatorOrderMode:configuration.elevatorOrderMode || "print",elevatorBoardName:lift?.name,elevatorBoardLocation:lift?.location,
        floorCopies:lift?.floorCopies,cabinCopies:lift?.cabinCopies,
        format:`${elevator.widthMm} × ${Number(elevator.heightMm)+(configuration.elevatorOrderMode==="complete"?100:0)} mm`
      } : {};
      return {...signFields,...areaPrice,...(article.previewType==='dibond_sign'?{dibondSign:configuration.dibondSign,dibondConfig:article.dibondConfig,...(configuration.dibondSign?.outdoorSign?{extraFields:outdoorOrderFields(configuration.dibondSign)}:{})}:{}),...(article.previewType==='door_sign'?{doorSignTextEnabled:article.doorSignTextEnabled!==false,doorSignTextConfig:configuration.doorSignTextConfig||normalizeDoorTextReference(article).doorSignTextConfig}:{}),...(article.nameBadgePreset ? {nameBadgePreset:article.nameBadgePreset,nameBadgePreviewImage:article.nameBadgePreviewImage} : {}),...(article.previewType==="parking_sign"?{parkingSignConfig:configuration.parkingSignConfig||article.parkingSignConfig}:{}),salesUnit:getSalesUnit(article),previewType:article.previewType,format:isParkingPole(article)?poleFormat(configuration):configuration.dibondSign?.outdoorSign?outdoorFormat(configuration.dibondSign):configuration.dibondSign?`${configuration.dibondSign.widthMm} \u00d7 ${configuration.dibondSign.heightMm} mm`:areaPrice?.format || article.format || "",desc:marker.description || article.desc || "",...(marker.material?{material:marker.material}:{}),categoryId:article.categoryId || "",id:crypto.randomUUID(), articleId:article.id, articleNumber:decalArticleNumber(article,configuration),
        badgeName:marker.name || article.name || article.title || article.articleNumber, productType:article.productType || "standard",
        productTypeLabel:article.productTypeLabel || article.group || "Artikel",quantity,unitPrice,
        lineTotal:Math.round(quantity*unitPrice*100)/100,currency:"SEK",customText:configuration.hangingSignWithoutText?"":configuration.customText || configuration.customTextLine1 || configuration.doorHeading || marker.text || "",
        symbols:marker.symbols || "", notes:marker.notes || "", position:marker.unplaced===true?"":marker.position,
        drawingName:marker.unplaced===true?"":marker.drawingName, projectMarkerId:marker.id,
        configuration: areaPrice ? {...marker.configuration,...areaPrice,quantity:1} : article.productType === "pendlad_skylt" ? {...configuration,...getHangingBackTextFields(article,configuration),hangingBackInitialized:undefined} : marker.configuration || {},
        ...((Object.prototype.hasOwnProperty.call(article.fields || {}, "doorSymbol") ? Boolean(article.fields.doorSymbol) : String(article.articleNumber || "").replace(/^0+/, "")==="602") ? {doorSymbolEnabled:true,doorSymbolConfig:article.doorSymbolConfig || null} : {}),
        ...boardFields,
        ...((Object.prototype.hasOwnProperty.call(article.fields || {}, "doorNumber")
          ? Boolean(article.fields.doorNumber)
          : String(article.articleNumber || "").trim().replace(/^0+/, "") === "602") ? {
          doorNumberEnabled: true,
          doorNumberConfig: article.doorNumberConfig || null,
          doorUseNumber: Boolean(marker.configuration?.doorUseNumber),
          doorNumber: marker.configuration?.doorUseNumber ? String(marker.configuration.doorNumber || "").replace(/\D/g, "") : "",
          doorNumberSide: marker.configuration?.doorNumberSide === "right" ? "right" : "left"
        } : {})};
    }).flatMap(item=>getNameBadgeCartAdditions(item,articles.find(article=>String(article.articleNumber)==="02030")));
}

module.exports = { groupProjectOrderItems, buildProjectOrderItems };
