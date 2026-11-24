import {isParking,parkingConfig,parkingLines,parkingFormat} from "./parkingSign";
import {getDestinationCube} from "./destinationCube";
import {vinylTextSettings} from './vinylText';
import { getHangingBackForm } from "./hangingSignBackText";
import { getAreaGeometry, isStripedDecor, getStripeSettings } from "./areaPricing";
import { getDoorSignSymbolById } from "./doorSignSymbols";
import { supportsDoorNumber } from "./doorNumberHelpers";
import { getCatalogArticles } from "./catalogStore";
import { getHangingSignSymbolById, getHangingSignSymbols, getHangingSignSymbolKind } from "./hangingSignSymbols";
import { getChosenProfession } from "./professionHelpers";
import { isProfessionProductType } from "./productHelpers";

function destinationCubeRows(item){
  const cube=getDestinationCube(item);
  return [{label:"Målpunkt",value:cube.target},{label:"Plan",value:cube.floor},...(item.format?[{label:"Format",value:item.format}]:[]),...(item.notes?[{label:"Anteckningar",value:item.notes}]:[])];
}

function dibondRows(item){
  const sign=item.dibondSign;
  const text=(sign.lines||[]).flatMap(line=>String(line.text||"").split(/\r\n|\r|\n/)).map(line=>line.trim()).filter(Boolean).join(" / ");
  const symbols=(sign.symbols||[]).map(symbol=>symbol.name||"Symbol").join(", ");
  return [
    {label:"Format",value:`${sign.widthMm} × ${sign.heightMm} mm`},
    ...(text?[{label:"Skylttext",value:text}]:[]),
    ...(symbols?[{label:"Symboler",value:symbols}]:[]),
    ...(item.notes?[{label:"Anteckningar",value:item.notes}]:[])
  ];
}

// Board contents stay on the saved item for preview and production.
function otRows(item) {
  return [
    {label:"OT-tavla",value:item.otBoardName||"OT-tavla"},
    ...(item.otBoardLocation?[{label:"Placering",value:item.otBoardLocation}]:[]),
    {label:"Format",value:item.format||`${item.otBoard.widthMm} × ${item.otBoard.heightMm} mm`}
  ];
}


function elevatorRows(item, compact = false) {
  return [
    {label:"Hisstavla",value:item.elevatorBoardName||item.badgeName||"Hisstavla"},
    ...(compact ? [] : [
      {label:"Våningsplansexemplar",value:String(item.floorCopies??1)},
      {label:"Hisskorgsexemplar",value:String(item.cabinCopies??0)}
    ]),
    ...(item.elevatorBoardLocation?[{label:"Placering",value:item.elevatorBoardLocation}]:[]),
    {label:"Format",value:item.format||`${item.elevatorBoard.widthMm} × ${Number(item.elevatorBoard.heightMm)+(item.elevatorOrderMode==="complete"?100:0)} mm`},
    ...(compact ? [] : item.elevatorBoard.floors.map(floor=>({label:floor.heading,value:floor.text+(floor.marker?" · Blå planmarkering":"")+(floor.highlightLine>=0?` · Grön rad: ${floor.text.split(/\r?\n/)[floor.highlightLine]||""}`:"")})))
  ];
}


function withProjectConfiguration(item) {
  if (!item) return item;
  const configuration = Object.fromEntries(Object.entries(item.configuration || {}).filter(([key]) => key !== "quantity"));
  const result = { ...configuration, ...item };
  if (!result.desc && /piktogram/i.test(`${result.productType || ""} ${result.badgeName || ""} ${result.categoryId || ""}`)) {
    const article = getCatalogArticles().find(article =>
      String(article.id) === String(result.articleId || result.badgeId) ||
      (result.articleNumber && String(article.articleNumber) === String(result.articleNumber))
    );
    if (article?.desc) result.desc = article.desc;
  }
  return result;
}

function getProjectNotes(item) {
  if (!item?.projectMarkerId && !item?.projectMarkerIds?.length && !item?.projectPositions?.length) return "";
  const locations = (item.projectPositions || []).map(location => String(location.notes || "").trim()).filter(Boolean);
  return locations.length ? [...new Set(locations)].join(", ") : String(item.notes || "").trim();
}

function getSafeTypeLabel(item) {
  if (item?.productTypeLabel) return item.productTypeLabel;
  if (item?.productType) return item.productType;
  return "Produkt";
}

function appendExtraFields(rows, item, options = {}) {
  const { compact = false } = options;

  if (!Array.isArray(item?.extraFields)) {
    return rows;
  }

  item.extraFields.forEach((field) => {
    if (!field?.label) return;
    if (field.value === null || field.value === undefined || field.value === "") {
      return;
    }

    rows.push({
      label: compact ? "" : field.label,
      value: compact ? `${field.label}: ${field.value}` : field.value,
    });
  });

  return rows;
}



function isHangingSignItem(item) {
  return item?.productType === "pendlad_skylt" || item?.previewType === "hanging_sign";
}

function isDoorSignItem(item) {
  return item?.productType === "dorrskylt";
}

const HANGING_LABELS = {
  arrowPlacement: "Pilplacering",
  arrowDirection: "Pilriktning",
  leftArrowDirection: "Pilriktning vänster",
  rightArrowDirection: "Pilriktning höger",
  hangingSignSymbol: "Symbol",
  hangingSignSymbols: "Symboler",
};
const ARROW_NAMES = { none: "Ingen", left: "Vänster", right: "Höger", up: "Upp", down: "Ner" };

function cleanSelection(value) {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  return !text || text === "none" || text === "Ingen" || text === "Ingen symbol" ? "" : (ARROW_NAMES[text] || text);
}

function resolveSymbolName(value) {
  const raw = cleanSelection(value);
  if (!raw) return "";
  const symbol = getHangingSignSymbolById(raw);
  // Do not expose internal IDs if a deleted symbol cannot be resolved.
  return symbol?.name || (/^symbol-[\w-]+$/i.test(raw) ? "" : raw);
}

function getHangingSelectionRows(item) {
  const fields = Array.isArray(item?.extraFields) ? item.extraFields : [];
  const getField = (key, label) => {
    const field = fields.find((entry) => entry?.key === key || entry?.label === label);
    return field?.value ?? item?.[key];
  };
  const rows = [];
  for (const key of ["arrowPlacement", "arrowDirection", "leftArrowDirection", "rightArrowDirection"]) {
    const value = cleanSelection(getField(key, HANGING_LABELS[key]));
    if (!value) continue;
    // Single-sided signs often save the same direction twice.
    if (key === "leftArrowDirection" && value === cleanSelection(getField("arrowDirection", "Pilriktning"))) continue;
    if (key === "rightArrowDirection" && value === cleanSelection(getField("arrowDirection", "Pilriktning"))) continue;
    rows.push({ label: HANGING_LABELS[key], value });
  }
  const rawMultiple = getField("hangingSignSymbols", "Symboler");
  const multiple = Array.isArray(rawMultiple) ? rawMultiple : (typeof rawMultiple === "string" ? rawMultiple.split(",").map((s) => s.trim()) : []);
  const single = getField("hangingSignSymbol", "Symbol");
  const library = getHangingSignSymbols({includeInactive:true});
  const selected = [...new Set([...multiple,single].filter(Boolean))].map(raw=>{
    const name = resolveSymbolName(raw);
    const symbol = getHangingSignSymbolById(raw) || library.find(symbol=>symbol.name===name) || {name};
    return {name,kind:getHangingSignSymbolKind(symbol)};
  }).filter(symbol=>symbol.name);
  for (const kind of ["symbol","target"]) {
    const names = [...new Set(selected.filter(symbol=>symbol.kind===kind).map(symbol=>symbol.name))];
    if(names.length) rows.push({label:kind==="target" ? (names.length>1?"Målpunkter":"Målpunkt") : (names.length>1?"Symboler":"Symbol"),value:names.join(", ")});
  }
  return rows;
}

function getHangingBackSelectionRows(item) {
  if (!item.hangingSignDifferentBackText) return [];
  const rows = getHangingSelectionRows(getHangingBackForm(item)).map(row=>({...row,label:`Baksida – ${row.label.toLowerCase()}`}));
  if (!item.backArrowPlacement || item.backArrowPlacement === "none") rows.unshift({label:"Baksida – pil",value:"Ingen pil"});
  if (!item.backHangingSignSymbols?.length && (!item.backHangingSignSymbol || item.backHangingSignSymbol === "none")) rows.push({label:"Baksida – symboler",value:"Inga symboler"});
  return rows;
}

function getHangingTextRows(item) {
  const fields = Array.isArray(item?.extraFields) ? item.extraFields : [];
  const textFields = fields.filter((field) =>
    ["customText", "customTextLine1", "customTextLine2"].includes(field?.key) ||
    /^(Text|Textrad 1|Textrad 2|Skylttext)$/i.test(field?.label || "")
  );
  const line1 = [item?.customTextLine1, item?.customText, ...textFields.filter((f) => f?.key !== "customTextLine2" && !/2$/.test(f?.label || "")).map((f) => f.value)]
    .find((v) => typeof v === "string" && v.trim());
  const line2 = [item?.customTextLine2, ...textFields.filter((f) => f?.key === "customTextLine2" || /2$/.test(f?.label || "")).map((f) => f.value)]
    .find((v) => typeof v === "string" && v.trim());
  const rows = [];
  if (line1) rows.push({ label: item.hangingSignDifferentBackText ? "Framsida – textrad 1" : "Skylttext", value: line1.trim() });
  if (line2) rows.push({ label: item.hangingSignDifferentBackText ? "Framsida – textrad 2" : "Textrad 2", value: line2.trim() });
  if (item.hangingSignDifferentBackText) {
    if (item.backTextLine1) rows.push({label:"Baksida – textrad 1",value:item.backTextLine1});
    if (item.backTextLine2) rows.push({label:"Baksida – textrad 2",value:item.backTextLine2});
  }
  return rows;
}

function getCartItemDisplayRowsBase(item) {
  if (!item) return [];
  if(item.vinylText){const {text,heightMm,fontWeight}=vinylTextSettings(item);return [{label:'Typ',value:'Svart folietext'},...(item.articleNumber?[{label:'Art.nr',value:item.articleNumber}]:[]),{label:'Skylttext',value:text},{label:'Texthöjd',value:heightMm+' mm'},{label:'Textstil',value:'Arial '+(fontWeight===700?'Bold':'Regular')},{label:'Antal',value:item.quantity??0}];}

  if (item.productType === "dorropnare") {
    const rows = [{ label: "Typ", value: getSafeTypeLabel(item) }];

    if (item.articleNumber) {
      rows.push({ label: "Art.nr", value: item.articleNumber });
    }

    if (item.desc) {
      rows.push({ label: "Beskrivning", value: item.desc });
    }

    appendExtraFields(rows, item);
    rows.push({ label: "Antal", value: item.quantity ?? 0 });

    return rows;
  }

  if (isProfessionProductType(item.productType)) {
    const chosenProfession = item.professionChoiceId
      ? getChosenProfession(item.professionChoiceId)
      : null;

    const rows = [{ label: "Typ", value: getSafeTypeLabel(item) }];

    if (item.articleNumber) {
      rows.push({ label: "Art.nr", value: item.articleNumber });
    }

    rows.push(
      { label: "Text", value: item.title || "-" },
      {
        label: "Val",
        value: chosenProfession?.label || item.professionChoiceId || "-",
      },
      { label: "Antal", value: item.quantity ?? 0 }
    );

    return rows;
  }

  if (isHangingSignItem(item)) {
    const rows = [{ label: "Typ", value: getSafeTypeLabel(item) }];
    if (item.articleNumber) rows.push({ label: "Art.nr", value: item.articleNumber });
    rows.push(...getHangingTextRows(item));
    rows.push(...getHangingSelectionRows(item));
    rows.push(...getHangingBackSelectionRows(item));
    rows.push({ label: "Antal", value: item.quantity ?? 0 });
    return rows;
  }

  if (isDoorSignItem(item)) {
    const rows = [{ label: "Typ", value: getSafeTypeLabel(item) }];

    if (item.articleNumber) {
      rows.push({ label: "Art.nr", value: item.articleNumber });
    }

    if (item.customText) {
      rows.push({ label: "Textrad 1", value: item.customText });
    }

    if (item.customTextLine2) {
      rows.push({ label: "Textrad 2", value: item.customTextLine2 });
    }

    if (item.desc) {
      rows.push({ label: "Beskrivning", value: item.desc });
    }

    if (item.extraLine) {
      rows.push({ label: "Text", value: item.extraLine.replace(/^Text:\s*/i, "") });
    }

    if (item.format) {
      rows.push({ label: "Format", value: item.format });
    }

    appendExtraFields(rows, item);
    rows.push({ label: "Antal", value: item.quantity ?? 0 });

    return rows;
  }

  const rows = [{ label: "Typ", value: getSafeTypeLabel(item) }];

  if (item.articleNumber) {
    rows.push({ label: "Art.nr", value: item.articleNumber });
  }

  if (typeof item.name === "string" && item.name.trim()) {
    rows.push({ label: "Namn", value: item.name.trim() });
  }

  if (typeof item.title === "string" && item.title.trim()) {
    rows.push({ label: "Titel", value: item.title.trim() });
  }

  if (item.titleLine2) {
    rows.push({ label: "Titel rad 2", value: item.titleLine2 });
  }

  if (item.orgLine1) {
    rows.push({ label: "Verksamhetsnamn rad 1", value: item.orgLine1 });
  }

  if (item.orgLine2) {
    rows.push({ label: "Verksamhetsnamn rad 2", value: item.orgLine2 });
  }

  if (typeof item.fastening === "string" && item.fastening.trim()) {
    rows.push({ label: "Fäste", value: item.fastening.trim() });
  }

  if (Number(item.extraMagnets) > 0) {
    rows.push({
      label: "Extra magnetfästen",
      value: item.extraMagnets,
    });
  }

  if (item.desc && !item.name && !item.title) {
    rows.push({ label: "Beskrivning", value: item.desc });
  }

  appendExtraFields(rows, item);
  rows.push({ label: "Antal", value: item.quantity ?? 0 });

  return rows;
}

// All user-entered sign text is displayed independently of the preview image.
// The editor uses different keys for different door-sign templates.
function appendCustomerTextRows(rows, item) {
  const fields = [
    ["Skylttext", item?.doorHeading],
    ...String(item?.doorName || "").split(/\r?\n/).slice(0, 2).map((name, index) => [index ? "Namn på skylt – rad 2" : "Namn på skylt", name]),
    ["Titel på skylt", item?.doorTitle],
    ["Namn i mittdelen", item?.doorMiddleName],
    ["Titel i mittdelen", item?.doorMiddleTitle],
    ...String(item?.doorExtra || "").split(/\r?\n/).map((text, index) => [item?.doorUseLine2 ? `Textrad ${index + 2}` : "Övrig skylttext", text]),
    ["Skylttext", item?.customText || item?.customTextLine1],
    ["Textrad 2", item?.customTextLine2],
  ];
  const existing = new Set(rows.map((row) => String(row.value || "").trim().toLocaleLowerCase("sv-SE")));
  for (const [label, rawValue] of fields) {
    const value = typeof rawValue === "string" ? rawValue.trim() : "";
    const normalized = value.toLocaleLowerCase("sv-SE");
    if (!value || existing.has(normalized)) continue;
    const at = rows.findIndex((row) => row.label === "Antal");
    rows.splice(at < 0 ? rows.length : at, 0, { label, value });
    existing.add(normalized);
  }
  return rows;
}

// Keep every continuation directly below the first sign-text line.
function keepTextLinesTogether(rows) {
  const first = rows.findIndex(row => ["Textrad 1", "Skylttext"].includes(row.label));
  if (first < 0) return rows;
  const rest = rows.filter(row => /^Textrad [23]$/.test(row.label));
  const ordered = rows.filter(row => !rest.includes(row));
  ordered.splice(first + 1, 0, ...rest.sort((a, b) => a.label.localeCompare(b.label)));
  return ordered;
}

// Use the format stored on the ordered article, regardless of product type.
function getCartItemDisplayRowsWithoutArea(item, compactElevator) {
  if(isParking(item)){const resolved=withProjectConfiguration(item),c=parkingConfig(resolved);return [{label:"Format",value:parkingFormat(resolved)},...parkingLines(resolved).map((value,index)=>({label:`Textrad ${index+1}`,value})),{label:"Texthöjd",value:`${c.textHeightMm} mm`}];}
  if(item?.destinationCube||item?.configuration?.destinationCube)return destinationCubeRows(withProjectConfiguration(item));
  if(item?.dibondSign||item?.configuration?.dibondSign)return dibondRows(withProjectConfiguration(item));
  if(item?.otBoard) return otRows(item);
  if(item?.elevatorBoard) return elevatorRows(item, compactElevator);
  item = withProjectConfiguration(item);
  const rows = getCartItemDisplayRowsBase(item);
  if (item?.format && !rows.some((row) => row.label === "Format")) {
    const at = rows.findIndex((row) => row.label === "Beskrivning");
    rows.splice(at < 0 ? Math.max(0, rows.length - 1) : at, 0, {
      label: "Format", value: item.format,
    });
  }
  const cleaned = rows.filter((row) => !["Typ", "Art.nr", "Antal"].includes(row.label));
  if (/piktogram/i.test(`${item?.productType || ""} ${item?.categoryId || ""} ${item?.badgeName || ""}`) && item?.desc) {
    const description = cleaned.find(row => row.label === "Beskrivning" && row.value === item.desc);
    if (description) description.label = "Piktogram";
    else cleaned.push({label:"Piktogram",value:item.desc});
  }
  appendCustomerTextRows(cleaned, item);
  for (const row of getHangingSelectionRows(item)) {
    if (!cleaned.some(existing => existing.label === row.label && String(existing.value) === String(row.value))) cleaned.push(row);
  }
  if (item?.doorUseSymbol && item.doorSymbol) {
    cleaned.push({label:"Symbol på skylt",value:item.doorSymbolName || getDoorSignSymbolById(item.doorSymbol)?.name || "Vald symbol"});
    cleaned.push({label:"Symbolens placering",value:item.doorSymbolSide==="right"?"Höger sida":"Vänster sida"});
  }
  if (supportsDoorNumber(item) && item.doorUseNumber && item.doorNumber) {
    cleaned.push({ label: "Nummer på skylt", value: String(item.doorNumber) });
    cleaned.push({ label: "Numrets placering", value: item.doorNumberSide === "right" ? "Höger sida" : "Vänster sida" });
  }
  const notes = getProjectNotes(item);
  if (notes) cleaned.push({ label: "Anteckningar", value: notes });
  return keepTextLinesTogether(cleaned);
}

function getPackingSlipDescriptionRowsBase(item) {
  if (!item) return [];

  if (isProfessionProductType(item.productType)) {
    const rows = [];

    if (item.title) {
      rows.push({ label: "", value: item.title });
    }

    rows.push({
      label: "",
      value: getSafeTypeLabel(item),
    });

    return rows;
  }

  if (item.productType === "dorropnare") {
    const rows = [];

    if (item.desc) {
      rows.push({ label: "", value: item.desc });
    }

    appendExtraFields(rows, item, { compact: true });
    return rows;
  }

  if (isHangingSignItem(item)) {
    const rows = [];

    if (item.desc) {
      rows.push({ label: "", value: item.desc });
    }

    for (const field of [...getHangingTextRows(item), ...getHangingSelectionRows(item), ...getHangingBackSelectionRows(item)]) {
      rows.push({ label: "", value: `${field.label}: ${field.value}` });
    }

    return rows;
  }

  if (isDoorSignItem(item)) {
    const rows = [];

    if (item.desc) {
      rows.push({ label: "", value: item.desc });
    }

    if (item.customText) {
      rows.push({ label: "", value: item.customText });
    }

    if (item.customTextLine2) {
      rows.push({ label: "", value: item.customTextLine2 });
    }

    if (item.extraLine) {
      rows.push({ label: "", value: item.extraLine });
    }

    if (item.format) {
      rows.push({ label: "", value: `Format ${item.format}` });
    }

    appendExtraFields(rows, item, { compact: true });
    return rows;
  }

  const rows = [];

  if (item.desc) {
    rows.push({ label: "", value: item.desc });
  }

  if ("name" in item && item.name) {
    rows.push({ label: "", value: item.name });
  }

  if ("title" in item && item.title) {
    rows.push({ label: "", value: item.title });
  }

  if (item.titleLine2) {
    rows.push({ label: "", value: item.titleLine2 });
  }

  if (item.orgLine1) {
    rows.push({ label: "", value: item.orgLine1 });
  }

  if (item.orgLine2) {
    rows.push({ label: "", value: item.orgLine2 });
  }

  if ("fastening" in item && item.fastening) {
    rows.push({ label: "", value: item.fastening });
  }

  if ("extraMagnets" in item && Number(item.extraMagnets ?? 0) > 0) {
    rows.push({
      label: "",
      value: `Extra magnetfästen: ${item.extraMagnets}`,
    });
  }

  appendExtraFields(rows, item, { compact: true });

  return rows;
}
function getPackingSlipDescriptionRowsWithoutArea(item) {
  if(item?.destinationCube||item?.configuration?.destinationCube)return destinationCubeRows(withProjectConfiguration(item));
  if(item?.dibondSign||item?.configuration?.dibondSign)return dibondRows(withProjectConfiguration(item));
  if(item?.otBoard) return otRows(item);
  if(item?.elevatorBoard) return elevatorRows(item);
  item = withProjectConfiguration(item);
  const rows = getPackingSlipDescriptionRowsBase(item);
  for (const row of getCartItemDisplayRows(item).filter(row => ["Anteckningar","Texthöjd","Textstil","Skylttext","Textrad 1","Textrad 2","Textrad 3","Namn på skylt","Namn på skylt – rad 2","Titel på skylt","Övrig skylttext","Pilplacering","Pilriktning","Pilriktning vänster","Pilriktning höger","Symbol","Symboler","Symbol på skylt","Symbolens placering"].includes(row.label))) {
    if (!rows.some(existing => String(existing.value) === String(row.value) || String(existing.value).endsWith(": " + row.value))) rows.push({label:"",value:`${row.label}: ${row.value}`});
  }
  if (supportsDoorNumber(item) && item.doorUseNumber && item.doorNumber) {
    rows.push({ label: "", value: `Nummer: ${item.doorNumber} · ${item.doorNumberSide === "right" ? "höger sida" : "vänster sida"}` });
  }
  if (item?.format && !rows.some((row) => String(row.value).includes(item.format))) {
    rows.push({ label: "", value: `Format: ${item.format}` });
  }
  return rows;
}

export function getCartItemDisplayRows(item, {compactElevator = false} = {}) {
  const rows = getCartItemDisplayRowsWithoutArea(item, compactElevator);
  const area = areaRows(item);
  return area ? [...area, ...rows.filter(row => row.label !== "Format")] : rows;
}

export function getPackingSlipDescriptionRows(item) {
  const rows = getPackingSlipDescriptionRowsWithoutArea(item);
  const area = areaRows(item);
  return area ? [...area, ...rows.filter(row => row.label !== "Format")] : rows;
}

function areaRows(item) {
  const geometry = getAreaGeometry({...item?.configuration, ...item});
  if (!geometry) return null;
  return [
    {label:"Form", value:geometry.areaShape === "circle" ? "Rund" : "Rektangulär"},
    {label:geometry.areaShape === "circle" ? "Diameter" : "Mått",value:geometry.format},
    {label:"Yta per styck",value:`${geometry.areaM2.toLocaleString("sv-SE",{maximumFractionDigits:8})} m²`},
    ...(isStripedDecor({...item?.configuration,...item}) ? Object.entries(getStripeSettings(item,{...item?.configuration,...item})).map(([key,value])=>({label:key==="stripeHeightMm"?"Randhöjd":"Mellanrum",value:`${value.toLocaleString("sv-SE")} mm`})) : []),
  ];
}
