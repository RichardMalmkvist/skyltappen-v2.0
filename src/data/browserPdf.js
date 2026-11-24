import {getDocument, GlobalWorkerOptions, version} from "pdfjs-dist/legacy/build/pdf.mjs";

GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();

// The app renders pages as images and never runs PDF document scripts.
export function openPdf(data) {
  const assets = `/api/pdf-assets/${version}/`;
  return getDocument({
    data,
    cMapUrl: assets + "cmaps/",
    iccUrl: assets + "iccs/",
    standardFontDataUrl: assets + "standard_fonts/",
    wasmUrl: assets + "wasm/"
  });
}
