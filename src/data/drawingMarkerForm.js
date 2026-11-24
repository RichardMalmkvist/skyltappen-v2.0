import { getEmptyProductForm } from "./formDefaults";
import { newDibondSign } from "./dibondHelpers";
import { isPersonalDoorSign } from "./doorSignDimensions";
import {getSignArtwork} from './signArtwork';

export function getDrawingMarkerForm(article, marker) {
  let configuration = marker?.configuration;
  const savedText = marker?.signText || marker?.text || "";
  // Older drawing registers saved only the text summary. Recover that text
  // without overwriting any complete product configuration that does exist.
  if (!configuration && article?.previewType === "dibond_sign") {
    if (savedText) {
      const sign = newDibondSign(article);
      configuration = { dibondSign: { ...sign, lines: [{ ...sign.lines[0], text: savedText }] } };
    }
  }
  if (savedText && isPersonalDoorSign(article) &&
      !["doorHeading", "customText", "customTextLine1", "customTextLine2", "doorExtra", "doorName", "doorTitle", "doorNumber"].some(key => String(configuration?.[key] || "").trim())) {
    const [heading, ...continuation] = savedText.split(/\r?\n/);
    configuration = { ...configuration, doorHeading: heading, doorExtra: continuation.join("\n"), doorUseLine2: continuation.length > 0 };
  } else if (savedText && !configuration && article?.previewType === "door_sign") {
    // Tactile door signs use the custom-text fields instead of doorHeading.
    const [first, ...rest] = savedText.split(/\r?\n/);
    configuration = { customText: first, customTextLine2: rest.join("\n"), doorUseLine2: rest.length > 0 };
  }
  if (isPersonalDoorSign(article) && configuration?.customText && !configuration.doorHeading) {
    const roomNumber = configuration.doorExtra || "";
    configuration = { ...configuration, doorHeading: configuration.customText,
      doorUseLine2: Boolean(configuration.customTextLine2), doorExtra: configuration.customTextLine2 || "",
      doorUseNumber: Boolean(roomNumber), doorNumber: String(roomNumber).replace(/\D/g, ""),
      customText: "", customTextLine2: "" };
  }
  return { ...getEmptyProductForm(), ...configuration, quantity: 1 };
}

// The register summary must contain the complete sign text, including the
// continuation field that holds door-sign lines two and three.
export function getDrawingMarkerText(article, form = {}) {
  if(getSignArtwork(form))return getSignArtwork(form).name;
  if (isPersonalDoorSign(article)) {
    return [form.doorHeading || form.customText || form.customTextLine1,
      form.doorUseLine2 ? form.doorExtra || form.customTextLine2 : form.customTextLine2,
      form.doorUseName ? form.doorName : "",
      form.doorUseTitle ? form.doorTitle : "",
      form.doorUseNumber ? form.doorNumber : ""].filter(value => String(value || "").trim()).join("\n");
  }
  return [form.dibondSign?.lines?.map(line => line.text).filter(Boolean).join(" / "),
    form.customText, form.customTextLine1, form.customTextLine2, form.doorHeading, form.name, form.title]
    .filter(Boolean).join(" / ");
}
