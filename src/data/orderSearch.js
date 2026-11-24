import { getOrderCustomer } from "./orderCustomer";
// Gemensam fritextsokning for Ordrar och Planering.
// Sok i sparade orderuppgifter och i artiklarna som faktiskt ingar i ordern.
import { getOrderDetails } from "./orderDetailsHelpers";

const normalize = (value) => String(value ?? "")
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("sv-SE")
  .trim();

// Tar bort separatorer sa t.ex. 002028053-00 matchar 00202805300.
const compact = (value) => normalize(value).replace(/[^a-z0-9]/g, "");

const scalarValues = (object, keys) => keys.map((key) => object?.[key]).filter(
  (value) => typeof value === "string" || typeof value === "number"
);

const ITEM_FIELDS = [
  "articleNumber", "articleNo", "articleNr", "sku", "productId",
  "name", "badgeName", "title", "productName", "articleName",
  "description", "desc", "categoryName", "groupName", "productGroupName",
  "customText", "customTextLine2", "text", "label", "profession",
];

export function orderMatchesSearch(order, query) {
  const needle = normalize(query);
  if (!needle) return true;
  if (!order || typeof order !== "object") return false;
  if (normalize(getOrderCustomer(order)).includes(needle)) return true;

  // Samma referens som visas i Projekt / objekt och pa arbetsordern.
  const details = getOrderDetails(order);
  const fields = [
    ...scalarValues(order, [
      "id", "orderNumber", "submissionNumber", "title", "customer",
      "customerName", "customerReference", "customerOrderNumber", "customerOrderId",
      "projectName", "projectCode", "managementObject", "targetPoint", "object",
      "accountNumber", "contactName", "contactEmail",
    ]),
    ...scalarValues(details, [
      "customerReference", "projectName", "projectCode", "managementObject",
      "targetPoint", "property", "building", "floor", "room",
    ]),
    ...scalarValues(order.orderer, [
      "customer", "ordererName", "ordererEmail", "accountNumber",
      "customerReference", "contactName",
    ]),
    ...scalarValues(order.delivery, ["company", "recipient", "city"]),
  ];

  // Bada orderformaten stods: kundportalens cart och interna items.
  const items = [
    ...(Array.isArray(order.cart) ? order.cart : []),
    ...(Array.isArray(order.items) ? order.items : []),
  ];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    fields.push(...scalarValues(item, ITEM_FIELDS));
    // Vissa orderrader sparar artikeldata i ett underobjekt.
    fields.push(...scalarValues(item.product, ITEM_FIELDS));
    fields.push(...scalarValues(item.article, ITEM_FIELDS));
  }

  const haystack = normalize(fields.join(" "));
  if (haystack.includes(needle)) return true;
  // Separatorsokning per falt, inte over faltgranser.
  const needleCompact = compact(needle);
  return Boolean(needleCompact) && fields.some((value) => compact(value).includes(needleCompact));
}
