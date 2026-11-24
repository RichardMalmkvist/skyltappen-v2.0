const crypto = require('crypto');
const {createArticleProductionStore} = require('./articleProduction');
const {createProjectSignFileStore,parseProjectFile} = require('./projectSignFiles');

const problem = (status, message) => { throw Object.assign(new Error(message), {status}); };
const text = (value, max = 500) => String(value ?? '').trim().slice(0, max);

// Existing drawing markers remain the source of truth. No copies or destructive migration.
function projectSigns(project) {
  return [
    ...(project.signs || []).map(sign => ({...sign, key: sign.id, drawingId: null})),
    ...(project.drawings || []).flatMap(drawing => (drawing.markers || []).map(sign => ({
      ...sign, kind: sign.kind === 'svg' ? 'svg' : 'catalog', key: `drawing:${drawing.id}:${sign.id}`, drawingId: drawing.id, drawingName: drawing.name
    })))
  ].sort((a, b) => Number(String(a.position).replace(/\D/g, '')) - Number(String(b.position).replace(/\D/g, '')));
}

function findSign(project, key) {
  const own = (project.signs || []).find(sign => sign.id === key);
  if (own) return {sign: own, collection: project.signs};
  for (const drawing of project.drawings || []) {
    const sign = (drawing.markers || []).find(sign => `drawing:${drawing.id}:${sign.id}` === key);
    if (sign) return {sign, collection: drawing.markers, drawing};
  }
  problem(404, 'Skylten hittades inte.');
}

function signDetails(body, old = {}, {custom = false} = {}) {
  const result = {...old};
  for (const key of ['name', 'description', 'material', 'notes']) {
    if (Object.hasOwn(body, key)) result[key] = text(body[key], key === 'name' ? 200 : 1500);
  }
  for (const key of ['widthMm', 'heightMm', 'quantity', 'price']) {
    if (!Object.hasOwn(body, key)) continue;
    const value = !['number','string'].includes(typeof body[key]) || String(body[key]).trim() === '' ? NaN : Number(body[key]);
    const valid = key === 'quantity' ? Number.isSafeInteger(value) && value >= 1 && value <= 10000
      : key === 'price' ? Number.isFinite(value) && value >= 0 && value <= 10000000
        : Number.isFinite(value) && value >= 1 && value <= 5000;
    if (!valid) problem(400, key === 'quantity' ? 'Ange ett antal mellan 1 och 10000.' : key === 'price' ? 'Ange ett giltigt pris.' : 'Ange mått mellan 1 och 5000 mm.');
    result[key] = value;
  }
  if (custom && !result.name) problem(400, 'Ange skyltens benämning.');
  return result;
}

function installProjectSigns(app, {readProjects, writeProjects, readCatalog, readAccess, adminAccess, markerFields, ...storage}) {
  const store = createArticleProductionStore(storage);
  const fileStore = createProjectSignFileStore(storage);
  const saveProduction = input => /^data:application\/pdf;/i.test(String(input?.dataUrl)) ? fileStore.save(input,true) : store.save(input);
  let queue = Promise.resolve();
  const locked = action => { const next = queue.then(action, action); queue = next.catch(() => {}); return next; };
  const wrap = (write, handler) => async (req, res) => {
    try {
      if (!await (write ? adminAccess : readAccess)(req)) return res.status(403).json({message: 'Åtkomst nekad.'});
      await handler(req, res);
    } catch (error) {
      res.status(error.status || (error.validation ? 400 : 500)).json({message: error.status || error.validation ? error.message : 'Kunde inte hantera projektets skyltar.'});
    }
  };
  const projectFrom = (projects, id) => projects.find(project => project.id === id) || problem(404, 'Projektet hittades inte.');
  const catalogFields = async (body, existing = {}) => {
    let fields;
    try { fields = markerFields(body, existing); } catch (error) { problem(400, error.message); }
    const catalog = await readCatalog();
    if (!(catalog.articles || []).some(article => String(article.id) === String(fields.articleId))) problem(400, 'Välj en giltig katalogartikel.');
    return signDetails(body, fields);
  };
  app.get('/api/projects/:id/signs', wrap(false, async (req, res) => {
    const project = projectFrom(await readProjects(), req.params.id);
    res.set('Cache-Control', 'no-store').json({signs: projectSigns(project)});
  }));
  const drawingPlacement=(project,input)=>{if(!input)return null;const drawing=(project.drawings||[]).find(d=>d.id===input.drawingId);if(!drawing)problem(404,'Ritningen hittades inte.');let coordinates;try{coordinates=markerFields({page:input.page,x:input.x,y:input.y});}catch(error){problem(400,error.message);}if(!['page','x','y'].every(key=>coordinates[key]!==undefined))problem(400,'Välj en placering på ritningen.');return {drawing,coordinates};};
  app.post('/api/projects/:id/signs/:signId/place',wrap(true,async(req,res)=>locked(async()=>{const projects=await readProjects(),project=projectFrom(projects,req.params.id),found=findSign(project,req.params.signId);if(found.drawing)problem(400,'Skylten är redan placerad på en ritning.');const target=drawingPlacement(project,req.body);if(!target)problem(400,'Välj en ritning.');const sign={...found.sign,...target.coordinates,unplaced:false,updatedAt:new Date().toISOString()};found.collection.splice(found.collection.indexOf(found.sign),1);target.drawing.markers=[...(target.drawing.markers||[]),sign];project.updatedAt=sign.updatedAt;await writeProjects(projects);res.json({sign,project});})));
  app.post('/api/projects/:id/signs', wrap(true, async (req, res) => locked(async () => {
    const body = req.body || {};
    // Validate ownership/project existence before accepting an asset.
    projectFrom(await readProjects(), req.params.id);
    const kind = body.kind || 'catalog';
    if (!['catalog', 'svg'].includes(kind)) problem(400, 'Välj katalogartikel eller SVG-original.');
    let fields;
    if (kind === 'svg') {
      fields = signDetails(body, {quantity: 1, price: 0, material: ''}, {custom: true});
      // Validate both files before persisting either; each upload receives a new ID.
      const proof=body.proofOriginal?await parseProjectFile(body.proofOriginal):{};
      fields.widthMm=fields.widthMm??proof.widthMm;fields.heightMm=fields.heightMm??proof.heightMm;
      if(!fields.widthMm||!fields.heightMm)problem(400,'Korrekturbilden saknar fysiska mått. Ange skyltens bredd och höjd i mm.');
      const file = await saveProduction(body.original);
      fields = {...fields, productionFile: file};
      if(body.proofOriginal)fields.proofFile=await fileStore.save(body.proofOriginal);
    } else fields = await catalogFields({...body, unplaced: true});
    const projects = await readProjects(), project = projectFrom(projects, req.params.id);
    const number = Math.max(0, ...projectSigns(project).map(sign => Number(String(sign.position || '').replace(/\D/g, '')) || 0)) + 1;
    const now = new Date().toISOString();
    const sign = {...fields, kind, id: crypto.randomUUID(), position: `S${String(number).padStart(3, '0')}`, unplaced: true, x: null, y: null, page: null, quantity: fields.quantity || 1, createdAt: now, updatedAt: now};
    const target=drawingPlacement(project,body.placement);
    if(target){Object.assign(sign,target.coordinates,{unplaced:false});target.drawing.markers=[...(target.drawing.markers||[]),sign];}else project.signs = [...(project.signs || []), sign]; project.updatedAt = now;
    await writeProjects(projects);
    res.status(201).json({sign, project});
  })));
  app.post('/api/projects/:id/signs/:signId/duplicate', wrap(true, async (req, res) => locked(async () => {
    const projects = await readProjects(), project = projectFrom(projects, req.params.id);
    const {sign: source, drawing} = findSign(project, req.params.signId);
    if (drawing && source.kind!=='svg') problem(400, 'Duplicera ritningsplacerade skyltar från ritningen.');
    // Copy saved content, never client-supplied IDs or file references. Files are immutable.
    const copy = JSON.parse(JSON.stringify(source));
    for (const key of ['key', 'drawingId', 'drawingName', 'checkedAt']) delete copy[key];
    const number = Math.max(0, ...projectSigns(project).map(sign => Number(String(sign.position || '').replace(/\D/g, '')) || 0)) + 1;
    const now = new Date().toISOString();
    Object.assign(copy, {id: crypto.randomUUID(), position: `S${String(number).padStart(3, '0')}`, unplaced: true, x: null, y: null, page: null, createdAt: now, updatedAt: now});
    const target=drawingPlacement(project,req.body?.placement);
    if(target){Object.assign(copy,target.coordinates,{unplaced:false});target.drawing.markers=[...(target.drawing.markers||[]),copy];}else project.signs = [...(project.signs || []), copy]; project.updatedAt = now;
    await writeProjects(projects);
    res.status(201).json({sign: copy, project});
  })));
  app.patch('/api/projects/:id/signs/:signId', wrap(true, async (req, res) => locked(async () => {
    const projects = await readProjects(), project = projectFrom(projects, req.params.id);
    const {sign, collection, drawing} = findSign(project, req.params.signId), body = req.body || {};
    let next = sign.kind === 'svg' ? signDetails(body, sign, {custom: true}) : await catalogFields(body, sign);
    if(body.proofOriginal){
      if(sign.kind!=='svg')problem(400,'Endast specialskyltar kan ha en separat korrekturbild.');
      const proof=await parseProjectFile(body.proofOriginal);
      next.widthMm=Object.hasOwn(body,'widthMm')?next.widthMm:proof.widthMm;
      next.heightMm=Object.hasOwn(body,'heightMm')?next.heightMm:proof.heightMm;
      if(!next.widthMm||!next.heightMm)problem(400,'Korrekturbilden saknar fysiska mått. Ange skyltens bredd och höjd i mm.');
    }
    if (body.original) {
      if (sign.kind !== 'svg') problem(400, 'Endast specialskyltar kan byta SVG-original.');
      next.productionFile = await saveProduction(body.original);
    }
    if(body.proofOriginal)next.proofFile=await fileStore.save(body.proofOriginal);
    else if(body.removeProofFile===true)delete next.proofFile;
    // Identity, kind, placements and asset references cannot be injected by a client.
    if (drawing) for (const key of ['x', 'y', 'page', 'unplaced']) next[key] = sign[key];
    else Object.assign(next, {unplaced: true, x: null, y: null, page: null});
    const now = new Date().toISOString(); next.updatedAt = now;
    collection[collection.indexOf(sign)] = next; project.updatedAt = now;
    await writeProjects(projects); res.json({sign: next, project});
  })));
  app.delete('/api/projects/:id/signs/:signId', wrap(true, async (req, res) => locked(async () => {
    const projects = await readProjects(), project = projectFrom(projects, req.params.id);
    const {sign, collection} = findSign(project, req.params.signId);
    collection.splice(collection.indexOf(sign), 1); project.updatedAt = new Date().toISOString();
    // Never delete original bytes: historical proofs/orders may refer to them.
    await writeProjects(projects); res.json({project});
  })));
  app.get('/api/projects/:id/signs/:signId/original', wrap(false, async (req, res) => {
    const project = projectFrom(await readProjects(), req.params.id), {sign} = findSign(project, req.params.signId);
    if (sign.kind !== 'svg') problem(404, 'Skylten saknar eget produktionsoriginal.');
    const pdf=sign.productionFile?.mime==='application/pdf';
    const asset = pdf?await fileStore.read(sign.productionFile.id):await store.read(sign.productionFile?.id);
    res.set({'Content-Type': asset.mime, 'Content-Disposition': `attachment; filename="skyltoriginal.${pdf?'pdf':'svg'}"; filename*=UTF-8''` + encodeURIComponent(asset.name), 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox"}).send(pdf?asset.bytes:asset.svg);
  }));
  app.get('/api/projects/:id/signs/:signId/preview', wrap(false, async (req,res)=>{
    const project=projectFrom(await readProjects(),req.params.id),{sign}=findSign(project,req.params.signId);
    if(sign.kind!=='svg')problem(404,'Skylten saknar korrekturbild.');
    let asset;
    if(sign.proofFile)asset=await fileStore.read(sign.proofFile.id);
    else if(sign.productionFile?.mime!=='application/pdf'){
      const original=await store.read(sign.productionFile?.id);asset={...original,bytes:Buffer.from(original.svg)};
    }else problem(404,'Ladda upp en separat korrekturbild för denna skylt.');
    res.set({'Content-Type':asset.mime,'Content-Disposition':"attachment; filename=\"korrekturbild\"; filename*=UTF-8''"+encodeURIComponent(asset.name),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; sandbox"}).send(asset.bytes);
  }));
  return {store,fileStore};
}
module.exports = {projectSigns, findSign, signDetails, installProjectSigns};
