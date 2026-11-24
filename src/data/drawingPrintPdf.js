// A small image-only PDF encoder. All drawing content is already rendered
// locally, so exporting needs no server, network request or new dependency.
export function createDrawingPrintPdf(pages) {
  const encoder = new TextEncoder();
  const chunks = [], offsets = [0];
  let length = 0;
  const append = value => {
    const bytes = typeof value === "string" ? encoder.encode(value) : value;
    chunks.push(bytes); length += bytes.length;
  };
  const object = (id, body, stream) => {
    offsets[id] = length;
    append(`${id} 0 obj\n${body}`);
    if (stream) { append("\nstream\n"); append(stream); append("\nendstream"); }
    append("\nendobj\n");
  };
  append("%PDF-1.4\n");
  object(1, "<< /Type /Catalog /Pages 2 0 R >>");
  object(2, `<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_, i) => `${3 + i * 3} 0 R`).join(" ")}] >>`);
  pages.forEach((page, index) => {
    const id = 3 + index * 3;
    const width = (page.widthMm * 72 / 25.4).toFixed(4);
    const height = (page.heightMm * 72 / 25.4).toFixed(4);
    const content = encoder.encode(`q\n${width} 0 0 ${height} 0 0 cm\n/Im0 Do\nQ\n`);
    object(id, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im0 ${id + 1} 0 R >> >> /Contents ${id + 2} 0 R >>`);
    object(id + 1, `<< /Type /XObject /Subtype /Image /Width ${page.widthPx} /Height ${page.heightPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpeg.length} >>`, page.jpeg);
    object(id + 2, `<< /Length ${content.length} >>`, content);
  });
  const xref = length;
  append(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);
  for (let id = 1; id < offsets.length; id++) append(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
  append(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(chunks, { type: "application/pdf" });
}

export function downloadDrawingPrintPdf(pages, name, paperSize) {
  const url = URL.createObjectURL(createDrawingPrintPdf(pages));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${String(name || "Ritning").replace(/\.pdf$/i, "").replace(/[<>:"/\\|?*\x00-\x1f]/g, "-")}-${paperSize}.pdf`;
  document.body.append(link);
  link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
