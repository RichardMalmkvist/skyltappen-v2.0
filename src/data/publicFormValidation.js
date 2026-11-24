import {badgeCheckoutErrors} from "./badgeProduction";
import { getBadgeFieldLabel, hasBadgeField } from "./productHelpers";

// Use the existing product validator's message and attach it to its visible control.
export function productErrorField(message, product) {
  if(/^(Välj minst en målpunkt när skylten saknar text\.|Målpunkterna|Symbolerna och målpunkterna|För många symboler)/.test(message))return 'hangingSignSymbols';
  if(message === "Ange en målpunkt med 1–4 tecken.") return "destinationCubeTarget";
  if(message === "Ange ett plan med 1–8 tecken.") return "destinationCubeFloor";
  if(message === "Välj vilken OT-tavla du vill beställa.") return "otBoardId";
  if(message === "Välj vilken hisstavla du vill beställa.") return "elevatorBoardId";
  if (message.startsWith("Ange randhöjd mellan")) return "stripeHeightMm";
  if (message.startsWith("Ange mellanrum mellan")) return "stripeGapMm";
  if (message === "Välj form.") return "areaShape";
  if (message.startsWith("Ange diameter mellan")) return "areaDiameterMm";
  if (message.startsWith("Ange bredd mellan")) return "areaWidthMm";
  if (message.startsWith("Ange höjd mellan")) return "areaHeightMm";
  if (message === "Antal måste vara ett heltal.") return "quantity";
  const fields = {
    "Fyll i baksidans text rad 1.": "backTextLine1",
    "Fyll i baksidans text rad 2.": "backTextLine2",
    "Välj pilriktning för baksidan.": "backArrowDirection",
    "Extra magnetfästen måste vara ett heltal från 0.": "extraMagnets",
    "Fyll i numret på skylten med siffror.": "doorNumber",
    "Välj en symbol till skylten.": "doorSymbol",
    "Du måste välja yrkesroll.": "professionChoiceId",
    "Du måste fylla i textrad 1.": "customTextLine1",
    "Du måste fylla i textrad 2.": "customTextLine2",
    "Du måste välja pilriktning.": "arrowDirection",
    "Du måste fylla i namn.": "name",
    "Du måste fylla i minst en titelrad.": "title",
    "Du måste fylla i titel.": "title",
    "Du måste välja fäste.": "fastening",
    "Antal måste vara minst 1.": "quantity",
    "Extra magnetfästen kan inte vara mindre än 0.": "extraMagnets",
  };
  if (fields[message]) return fields[message];
  if (message === "Du måste fylla i texten på skylten." || message === "Du måste fylla i text.") {
    return ["doorHeading", "customTextLine1", "customText"].find(key => hasBadgeField(product, key));
  }
  if (message === `Du måste fylla i ${getBadgeFieldLabel(product, "orgLine1", "verksamhetsnamn").toLowerCase()}.`) return "orgLine1";
  return null;
}

export function checkoutFieldErrors(orderer = {}, details = {}, {badgeOnly=false,delivery={}} = {}) {
  if(badgeOnly)return badgeCheckoutErrors(orderer,delivery);
  const errors = {};
  if (!String(orderer.accountNumber || "").trim()) errors.accountNumber = "Fyll i ansvarsnummer.";
  const email=badgeOnly?(orderer.purchaserEmail||orderer.ordererEmail):orderer.ordererEmail;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.ordererEmail = "Kontrollera e-postadressen.";
  if (!badgeOnly && orderer.purchaserEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(orderer.purchaserEmail.trim())) errors.purchaserEmail = "Kontrollera beställarens mejladress.";
  if (!badgeOnly && details.priority === "datum" && !details.requestedCompletionDate) errors.requestedCompletionDate = "Välj önskat datum.";
  return errors;
}

export function focusOrderField(id) {
  const field = document.getElementById(id);
  field?.scrollIntoView?.({ block: "center", behavior: "auto" });
  field?.focus({ preventScroll: true });
}
