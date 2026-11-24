const {validateProjectConfiguration}=require('../src/data/hangingStack');
const markerText = (value, limit = 500) => String(value ?? "").slice(0, limit);
function markerFields(body, existing = {}) {
  const next = { ...existing };
  if (Object.prototype.hasOwnProperty.call(body, "configuration")) {
    const configuration = body.configuration;
    validateProjectConfiguration(configuration);
    next.configuration = configuration;
  }
  for (const key of ["articleId", "text", "symbols", "notes"]) if (Object.prototype.hasOwnProperty.call(body, key)) next[key] = markerText(body[key], key === "notes" ? 1500 : 500);
  if(Object.prototype.hasOwnProperty.call(body,"unplaced")){
    if(typeof body.unplaced!=="boolean")throw new Error("Ogiltigt val av placering.");
    next.unplaced=body.unplaced;
  }
  if(next.unplaced===true){next.x=null;next.y=null;next.page=null;}
  for (const key of ["x", "y"]) if (next.unplaced!==true && Object.prototype.hasOwnProperty.call(body, key)) {
    const value = Number(body[key]);
    if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error("Ogiltig position på ritningen.");
    next[key] = value;
  }
  if (next.unplaced!==true && Object.prototype.hasOwnProperty.call(body, "page")) {
    const value = Number(body.page);
    if (!Number.isSafeInteger(value) || value < 1 || value > 10000) throw new Error("Ogiltigt sidnummer.");
    next.page = value;
  }
  if (Object.prototype.hasOwnProperty.call(body, "quantity")) {
    const value = Number(body.quantity);
    if (!Number.isSafeInteger(value) || value < 1 || value > 10000) throw new Error("Ange ett giltigt antal.");
    next.quantity = value;
  }
  return next;
}

// Use the stored marker's original identity; client-supplied file references are ignored.
function createUpdateMarkerHandler({adminAccess,readProjects,writeProjects}){return async (req, res) => {
  if (!(await adminAccess(req))) return res.status(403).json({ message: "Åtkomst nekad." });
  try {
    const projects = await readProjects();
    const project = projects.find(p => p.id === req.params.id);
    const drawing = project?.drawings?.find(d => d.id === req.params.drawingId);
    const marker = drawing?.markers?.find(m => m.id === req.params.markerId);
    if (!marker) return res.status(404).json({ message: "Markeringen hittades inte." });
    const fields=markerFields(req.body || {}, marker);
    if((!fields.articleId&&!(marker.kind==='svg'&&marker.productionFile?.id))||(fields.unplaced!==true&&(!Number.isFinite(fields.x)||!Number.isFinite(fields.y)||!fields.page)))return res.status(400).json({message:"Välj artikel och placering."});
    Object.assign(marker, fields, { updatedAt: new Date().toISOString() });
    project.updatedAt = new Date().toISOString();
    await writeProjects(projects);
    return res.json({ marker, drawing });
  } catch (e) { console.error(e); return res.status(400).json({ message: e.message || "Kunde inte uppdatera markeringen." }); }
};}
module.exports={markerFields,createUpdateMarkerHandler};
