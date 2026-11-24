const generic = /^(skriv\s+(text|namn).*|egen text|text|rubrik)$/i;
const example = (value, fallback) => {
  const text = String(value || "").trim();
  return text && !generic.test(text) ? text : fallback;
};

export function getDoorSignExamples(product = {}) {
  const config = product.doorSignTextConfig || {};
  return {
    heading: example(config.exampleHeading || product.fields?.doorHeading?.placeholder || config.placeholder, "EXPEDITION").split(/\r?\n/).slice(0, 3).join("\n"),
    name: example(config.exampleName, "Anna Svensson").split(/\r?\n/).slice(0, 2).join("\n"),
    title: example(config.exampleTitle, "Sjuksköterska"),
  };
}

// A display-only copy. Never use this object for validation, cart or project saving.
export function getDoorSignExampleForm(product, form = {}) {
  if (!product || product.doorSignTextEnabled === false || (product.previewType !== "door_sign" && product.productType !== "dorrskylt")) return form;
  const samples = getDoorSignExamples(product);
  const preview = { ...form };
  if (![form.doorHeading, form.customText, form.customTextLine1, form.doorExtra, form.customTextLine2].some(value => String(value || "").trim())) {
    const [first, ...rest] = samples.heading.split("\n");
    const second = rest.join("\n");
    preview.doorHeading = first;
    preview.customText = first;
    if (second) { preview.doorUseLine2 = true; preview.doorExtra = second; preview.customTextLine2 = second; }
  }
  if (form.doorUseName && !String(form.doorName || "").trim()) preview.doorName = samples.name;
  if (form.doorUseTitle && !String(form.doorTitle || "").trim()) preview.doorTitle = samples.title;
  return preview;
}
