import { downloadDrawingPrintPdf } from "./drawingPrintPdf";
import { openPdf } from "./browserPdf";

// Render from the original PDF, independently of the viewer's zoom and scroll.
export async function printDrawing({ bytes, name, markers, registerMode, paperSize = "A4", download = false }) {
  const paper = paperSize === "A3" ? "A3" : "A4";
  const shortSide = paper === "A3" ? 297 : 210;
  const longSide = paper === "A3" ? 420 : 297;
  document.querySelector(".jsf-drawing-print-root")?.remove();
  document.querySelector("style[data-jsf-drawing-print]")?.remove();
  const doc = document;
  const returnFocus = doc.activeElement;
  const originalTitle = doc.title;
  const root = doc.createElement("div");
  root.className = "jsf-drawing-print-root";
  root.lang = "sv";
  const style = doc.createElement("style");
  style.dataset.jsfDrawingPrint = "true";
  style.textContent = `
    @page { size: ${paper} landscape; margin: 10mm; }
    .jsf-drawing-print-root { display: none !important; }
    @media print {
      html, body { margin: 0 !important; padding: 0 !important; background: white !important; overflow: visible !important; height: auto !important; }
      body > :not(.jsf-drawing-print-root) { display: none !important; }
      body > .jsf-drawing-print-root { display: block !important; position: static !important; margin: 0 !important; padding: 0 !important; width: auto !important; color: #222 !important; background: white !important; font: 12px Arial, sans-serif; }
      .jsf-drawing-print-root, .jsf-drawing-print-root * { visibility: visible !important; box-sizing: border-box; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .jsf-drawing-print-root .sheet { margin: 0; padding: 0; border: 0; box-shadow: none; background: white; break-after: page; overflow: hidden; }
      .jsf-drawing-print-root .sheet:last-child { break-after: auto; }
      .jsf-drawing-print-root .portrait { width: ${shortSide - 20}mm; height: ${longSide - 20}mm; }
      .jsf-drawing-print-root .landscape { width: ${longSide - 20}mm; height: ${shortSide - 20}mm; }
      .jsf-drawing-print-root .sheet header { height: 8mm; display: flex; gap: 8mm; align-items: flex-start; justify-content: space-between; font: 9px Arial, sans-serif; }
      .jsf-drawing-print-root .sheet header span:first-child { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
      .jsf-drawing-print-root .sheet header span:last-child { white-space: nowrap; }
      .jsf-drawing-print-root .drawing { display: flex; align-items: center; justify-content: center; }
      .jsf-drawing-print-root .drawing img { display: block !important; flex-shrink: 0; max-width: none !important; object-fit: contain; }
    }
  `;
  doc.head.append(style);
  doc.body.append(root);
  const cleanup = () => {
    window.removeEventListener("afterprint", afterPrint);
    root.remove(); style.remove();
    doc.title = originalTitle;
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  };
  const afterPrint = () => setTimeout(cleanup, 0);
  window.addEventListener("afterprint", afterPrint, { once: true });
  let task;
  try {
    task = openPdf(bytes.slice());
    const pdf = await task.promise;
    const images = [];
    const exportedPages = [];
    const firstPage = await pdf.getPage(1);
    const firstViewport = firstPage.getViewport({ scale: 1 });
    const printLandscape = firstViewport.width > firstViewport.height;
    style.textContent = style.textContent.replace(`size: ${paper} landscape`, `size: ${paper} ${printLandscape ? "landscape" : "portrait"}`);
    for (let number = 1; number <= pdf.numPages; number++) {
      if (!root.isConnected) return;
      const page = await pdf.getPage(number);
      const original = page.getViewport({ scale: 1 });
      // About 300 dpi on A4, bounded for very large source drawings.
      const scale = (paper === "A3" ? 4961 : 3508) / Math.max(original.width, original.height);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      // Printing must continue when the opener becomes a background tab.
      // Display rendering waits for animation frames, which browsers may pause.
      await page.render({ canvasContext: canvas.getContext("2d"), viewport, intent: "print" }).promise;
      if (!root.isConnected) return;
      const landscape = download ? original.width > original.height : printLandscape;
      const pageWidth = landscape ? longSide : shortSide;
      const pageHeight = landscape ? shortSide : longSide;
      const width = pageWidth - 20;
      const height = pageHeight - 28;
      const fit = Math.min(width / original.width, height / original.height);
      const printWidth = original.width * fit;
      const printHeight = original.height * fit;
      const sheet = doc.createElement("section");
      sheet.className = `sheet ${landscape ? "landscape" : "portrait"}`;
      const heading = doc.createElement("header");
      const title = doc.createElement("span");
      title.textContent = name || "Ritning";
      const pageLabel = doc.createElement("span");
      pageLabel.textContent = `Sida ${number} av ${pdf.numPages}`;
      heading.append(title, pageLabel);
      const drawing = doc.createElement("div");
      drawing.className = "drawing";
      drawing.style.height = `${height}mm`;
      // Bake the PDF and circles into one image so Chrome's print snapshot
      // cannot omit an inline SVG layer or its embedded image.
      const ctx = canvas.getContext("2d");
      const pixelsPerMm = viewport.width / printWidth;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const placedLabels = [];
      markers.filter(marker => (Number(marker.page) || 1) === number).forEach(marker => {
        const x = Number(marker.x) * viewport.width;
        const y = Number(marker.y) * viewport.height;
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        // Keep the numbered disc clear of the actual mounting position.
        // A small dot stays at the saved coordinate, joined to its label.
        const colour = registerMode ? "#1677b8" : "#15583e";
        const radius = 2 * pixelsPerMm;
        const inset = radius + .15 * pixelsPerMm;
        const candidates = [3, 6, 9].flatMap(distance => [[0, -distance], [distance, 0], [-distance, 0], [0, distance], [distance, -distance], [-distance, -distance], [distance, distance], [-distance, distance]])
          .map(([dx, dy]) => ({
            x: Math.max(inset, Math.min(canvas.width - inset, x + dx * pixelsPerMm)),
            y: Math.max(inset, Math.min(canvas.height - inset, y + dy * pixelsPerMm))
          }));
        const position = candidates.find(candidate => placedLabels.every(other => Math.hypot(other.x - candidate.x, other.y - candidate.y) >= 4.5 * pixelsPerMm)) || candidates[0];
        const labelX = position.x, labelY = position.y;
        placedLabels.push(position);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(labelX, labelY);
        ctx.lineWidth = .55 * pixelsPerMm; ctx.strokeStyle = "white"; ctx.stroke();
        ctx.lineWidth = .2 * pixelsPerMm; ctx.strokeStyle = colour; ctx.stroke();
        ctx.beginPath();
        ctx.arc(labelX, labelY, radius, 0, Math.PI * 2);
        ctx.fillStyle = colour; ctx.fill();
        ctx.lineWidth = .25 * pixelsPerMm;
        ctx.strokeStyle = "white"; ctx.stroke();
        const text = String(marker.position || String(marker.number || "").padStart(3, "0")).replace(/^S/, "");
        const fontSize = 1.5 * pixelsPerMm;
        ctx.font = `700 ${fontSize}px Arial, sans-serif`;
        const textWidth = ctx.measureText(text).width;
        if (textWidth > 3.25 * pixelsPerMm) ctx.font = `700 ${fontSize * 3.25 * pixelsPerMm / textWidth}px Arial, sans-serif`;
        ctx.fillStyle = "white";
        ctx.fillText(text, labelX, labelY);
        ctx.beginPath(); ctx.arc(x, y, .3 * pixelsPerMm, 0, Math.PI * 2);
        ctx.fillStyle = colour; ctx.fill();
        ctx.lineWidth = .15 * pixelsPerMm; ctx.strokeStyle = "white"; ctx.stroke();
      });
      ctx.restore();
      if (download) {
        const sheetCanvas = doc.createElement("canvas");
        const dpi = 300 / 25.4;
        sheetCanvas.width = Math.round(pageWidth * dpi);
        sheetCanvas.height = Math.round(pageHeight * dpi);
        const sheetCtx = sheetCanvas.getContext("2d", { alpha: false });
        sheetCtx.fillStyle = "white"; sheetCtx.fillRect(0, 0, sheetCanvas.width, sheetCanvas.height);
        sheetCtx.fillStyle = "#222"; sheetCtx.font = `${2.4 * dpi}px Arial, sans-serif`;
        const pageText = `Sida ${number} av ${pdf.numPages}`;
        const pageTextWidth = sheetCtx.measureText(pageText).width;
        sheetCtx.fillText(name || "Ritning", 10 * dpi, 13 * dpi, (pageWidth - 28) * dpi - pageTextWidth);
        sheetCtx.fillText(pageText, (pageWidth - 10) * dpi - pageTextWidth, 13 * dpi);
        sheetCtx.drawImage(canvas, (10 + (width - printWidth) / 2) * dpi, (18 + (height - printHeight) / 2) * dpi, printWidth * dpi, printHeight * dpi);
        const binary = atob(sheetCanvas.toDataURL("image/jpeg", .98).split(",")[1]);
        exportedPages.push({ widthMm: pageWidth, heightMm: pageHeight, widthPx: sheetCanvas.width, heightPx: sheetCanvas.height, jpeg: Uint8Array.from(binary, char => char.charCodeAt(0)) });
        sheetCanvas.width = 0; sheetCanvas.height = 0;
        canvas.width = 0; canvas.height = 0; page.cleanup();
        continue;
      }
      const image = doc.createElement("img");
      image.alt = `Ritning med skyltmarkeringar, sida ${number}`;
      image.style.width = `${printWidth}mm`;
      image.style.height = `${printHeight}mm`;
      const imageReady = new Promise((resolve, reject) => {
        image.onload = async () => {
          try {
            if (image.decode) await image.decode();
            if (!image.complete || !image.naturalWidth) throw new Error("Ritningsbilden kunde inte laddas.");
            resolve();
          } catch (error) { reject(error); }
        };
        image.onerror = () => reject(new Error("Kunde inte läsa ritningsbilden för utskrift."));
      });
      image.src = canvas.toDataURL("image/jpeg", .98);
      canvas.width = 0; canvas.height = 0;
      page.cleanup();
      drawing.append(image);
      sheet.append(heading, drawing);
      root.append(sheet);
      images.push(imageReady);
    }
    if (download) { downloadDrawingPrintPdf(exportedPages, name, paper); cleanup(); return; }
    await Promise.all(images);
    if (!root.isConnected) return;
    // Decode and lay out all images before opening the native print preview.
    // The timer also completes if this tab's animation frames are paused.
    doc.body.getBoundingClientRect();
    await new Promise(resolve => setTimeout(resolve, 150));
    if (!root.isConnected) return;
    doc.title = name || "Ritning";
    window.print();
  } catch (error) {
    cleanup();
    throw error;
  } finally { if (task) await task.destroy(); }
}
