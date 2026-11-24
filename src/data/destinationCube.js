const isDestinationCube = product => product?.previewType === "destination_cube" || product?.productType === "malpunktskub";
function getDestinationCube(form = {}, product = {}) {
  const value = form.destinationCube || form.configuration?.destinationCube || {};
  return { target: String(value.target ?? "S").trim(), floor: String(value.floor ?? "4").trim(), ...((value.variant || product?.destinationSignVariant) === "wall" ? {variant:"wall"} : {}) };
}
function destinationCubeError(form = {}) {
  const value = getDestinationCube(form);
  if (!value.target || value.target.length > 4 || /[\r\n]/.test(value.target)) return "Ange en målpunkt med 1–4 tecken.";
  if (!value.floor || value.floor.length > 8 || /[\r\n]/.test(value.floor)) return "Ange ett plan med 1–8 tecken.";
  return null;
}
function applyDestinationCubePreset(article) {
  return { ...article, destinationSignVariant: undefined, previewType: "destination_cube", productType: "malpunktskub", productTypeLabel: "Målpunktskub",
    flowType: "form", directAddToCart: false, doorSignTextEnabled: false, hangingSignPreset: undefined,
    pricingMode: "piece", fields: { destinationCube: true, quantity: true } };
}
function applyDestinationWallPreset(article) {
  return {...applyDestinationCubePreset(article),destinationSignVariant:"wall",productType:"malpunktsskylt_vagg",productTypeLabel:"Målpunktsskylt för vägg"};
}
module.exports = { applyDestinationWallPreset, isDestinationCube, getDestinationCube, destinationCubeError, applyDestinationCubePreset };
