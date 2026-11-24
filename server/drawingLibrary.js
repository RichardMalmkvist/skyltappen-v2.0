const {validateProjectConfiguration}=require('../src/data/hangingStack');
const {makeOTPdf}=require('./otBoardProduction');
const {makeElevatorPdf}=require('./elevatorPdf');
const {cleanOTBoard,cleanOTUnitPrice} = require("./otBoards");
const crypto = require("crypto");
const {isDeepStrictEqual} = require("node:util");
const text = (value, max = 120) => String(value || "").trim().slice(0, max);
function cleanBoard(input = {}) {
  const widthMm = Number(input.widthMm), heightMm = Number(input.heightMm);
  if (![widthMm, heightMm].every(value => Number.isFinite(value) && value >= 100 && value <= 2000)) throw new Error("Ange bredd och höjd mellan 100 och 2000 mm.");
  if (!Array.isArray(input.floors) || !input.floors.length || input.floors.length > 30) throw new Error("Tavlan behöver ha 1–30 plan.");
  return { widthMm, heightMm, liftLetter:text(input.liftLetter,5), floors: input.floors.map(floor => {
    const heading = text(floor.heading, 60);
    const rawLines = String(floor.text || "").split(/\r?\n/);
    if (rawLines.length > 12 || rawLines.some(line => line.length > 120)) throw new Error("Använd högst 12 textrader per plan och 120 tecken per rad.");
    const lines = rawLines.map(line => text(line));
    if (!heading) throw new Error("Ange en rubrik för varje plan.");
    const highlightLine = Number(floor.highlightLine);
    return { heading, text: lines.join("\n"), marker: Boolean(floor.marker), highlightLine: Number.isInteger(highlightLine) && highlightLine >= 0 && highlightLine < lines.length ? highlightLine : -1 };
  }) };
}
function cleanCopies(body) {
  const floorCopies = Number(body.floorCopies ?? 1);
  const cabinCopies = Number(body.cabinCopies ?? 0);
  if (![floorCopies,cabinCopies].every(n=>Number.isSafeInteger(n)&&n>=0&&n<=10000) || floorCopies+cabinCopies<1) throw new Error("Ange giltiga fasta antal skyltar (minst ett exemplar totalt).");
  return {floorCopies,cabinCopies};
}
function cleanItem(body, folderId) {
  const name = text(body.name);
  if (!name) throw new Error("Ange ett namn.");
  if (body.type === "elevator") return { type: "elevator", name, folderId, articleNumber: text(body.printArticleNumber ?? body.articleNumber, 40), completeArticleNumber: text(body.completeArticleNumber, 40), printArticleNumber: text(body.printArticleNumber ?? body.articleNumber, 40), board: cleanBoard(body.board), ...cleanCopies(body) };
  if (body.type === "ot") return {type:"ot",name,folderId,articleNumber:text(body.articleNumber,40),unitPrice:cleanOTUnitPrice(body.unitPrice),board:cleanOTBoard(body.board)};
  if (body.type !== "file") throw new Error("Välj hisstavla, OT-tavla eller en fil.");
  const match = /^data:(application\/pdf|image\/png|image\/jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(String(body.dataUrl || ""));
  if (!match) throw new Error("Välj PDF, PNG eller JPG.");
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > 20 * 1024 * 1024) throw new Error("Filen får vara högst 20 MB.");
  const mime = match[1];
  if ((mime === "application/pdf" && bytes.subarray(0,5).toString() !== "%PDF-") || (mime === "image/png" && bytes.subarray(0,8).toString("hex") !== "89504e470d0a1a0a") || (mime === "image/jpeg" && bytes.subarray(0,3).toString("hex") !== "ffd8ff")) throw new Error("Filen stämmer inte med det valda filformatet.");
  return { type: "file", name, folderId, mime, dataUrl: body.dataUrl };
}
function drawingBoardLabel(body={}){
 return [text(body.location,90),text(body.name,80),body.articleNumber?'Art. '+text(body.articleNumber,30):''].filter(Boolean).join(' | ').replace(/[^\x20-\u017f]/g,'?');
}
async function makeDrawingBoardPdf(body={}){
 const title=text(body.name,120)||'Tavla',label=drawingBoardLabel(body)||title;
 let pdf,total;
 if(body.type==='ot'){
  total=Number(body.quantity);
  if(!Number.isSafeInteger(total)||total<1||total>1000)throw new Error('V\u00e4lj 1\u20131000 exemplar.');
  const board=cleanOTBoard(body.board);
  pdf=await makeOTPdf({otBoard:board},total,title,{label});
 }else if(body.type==='elevator'){
  const board=cleanBoard(body.board),floorCopies=Number(body.floorCopies),cabinCopies=Number(body.cabinCopies);
  total=floorCopies+cabinCopies;
  pdf=await makeElevatorPdf(board,floorCopies,cabinCopies,title,{label});
 }else throw new Error('V\u00e4lj en OT-tavla eller hisstavla.');
 const stem=title.replace(/[^\p{L}\p{N}_-]+/gu,'-').slice(0,100)||'Tavla';
 return {pdf,filename:stem+'-'+total+'st.pdf'};
}
function installDrawingLibrary(app, { read, write, canAccess, canEdit, canPublish, readCatalog, writeCatalog, getProjectDrawing }) {
  let queue = Promise.resolve();
  const wrap = handler => async (req, res) => {
    try {
      if (!(await canAccess(req))) return res.status(403).json({ message: "Du har inte behörighet till ritningsbiblioteket." });
      if (!["GET", "HEAD"].includes(req.method) && !(await canEdit(req))) return res.status(403).json({ message: "Endast Admin kan ändra ritningar och skyltar." });
      await handler(req,res); } catch (error) { console.error("Ritningsbibliotek:",error.message); if (!res.headersSent) res.status(error.validation ? 400 : 500).json({ message: error.validation ? error.message : "Kunde inte läsa eller spara ritningsbiblioteket." }); }
  };
  const invalid = message => { const error = new Error(message); error.validation = true; throw error; };
  const mutate = (fn, shouldWrite = () => true) => { const task = queue.then(async () => { const library = await read(); const result = await fn(library); if (shouldWrite(result)) await write(library); return result; }); queue = task.catch(() => {}); return task; };
  const checkBoardArticle=(library,item)=>{
    if(item.type!=="ot"||!item.articleNumber)return;
    if(library.items.some(other=>other.type==="elevator"&&[other.articleNumber,other.printArticleNumber,other.completeArticleNumber].some(number=>number&&String(number).trim()===item.articleNumber)))invalid("Välj ett eget artikelnummer för OT-tavlan. Detta nummer används för hisstavlor.");
  };
  const folderExists = (library,id) => id === null || library.folders.some(folder => folder.id === id);
  app.post("/api/drawing-library/export-pdf", wrap(async(req,res)=>{
    let exported;
    try{exported=await makeDrawingBoardPdf(req.body);}catch(error){invalid(error.message);}
    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition',"attachment; filename=board.pdf; filename*=UTF-8''"+encodeURIComponent(exported.filename));
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
    res.send(exported.pdf);
  }));
  app.get("/api/drawing-library", wrap(async (_req,res) => {
    const library = await read();
    res.setHeader("Cache-Control","no-store");
    res.json({ capabilities:{markerConfiguration:true}, folders:library.folders, items:library.items.map(({dataUrl,...item})=>item) });
  }));
  app.post("/api/drawing-library/folders", wrap(async (req,res) => {
    const result = await mutate(library => {
      const name = text(req.body?.name), parentId = req.body?.parentId || null;
      if (!name) invalid("Ange ett mappnamn.");
      if (!folderExists(library,parentId)) invalid("Överordnad mapp hittades inte.");
      if (library.folders.some(folder => folder.parentId === parentId && folder.name.toLocaleLowerCase("sv") === name.toLocaleLowerCase("sv"))) invalid("Det finns redan en mapp med det namnet här.");
      const folder = { id:crypto.randomUUID(), name, parentId };
      library.folders.push(folder);
      if (req.body?.standardFolders) ["Planritningar","Hisstavlor","OT-tavlor"].forEach(name=>library.folders.push({id:crypto.randomUUID(),name,parentId:folder.id}));
      return folder;
    });res.status(201).json({folder:result});
  }));
  app.patch("/api/drawing-library/folders/:id", wrap(async(req,res)=>{
    const folder=await mutate(library=>{
      const folder=library.folders.find(entry=>entry.id===req.params.id);
      if(!folder)invalid("Mappen hittades inte.");
      const name=text(req.body?.name);
      if(!name)invalid("Ange ett mappnamn.");
      if(library.folders.some(other=>other.id!==folder.id&&other.parentId===folder.parentId&&other.name.toLocaleLowerCase("sv")===name.toLocaleLowerCase("sv")))invalid("Det finns redan en mapp med det namnet här.");
      // Keep the folder's function when its visible name changes.
      if(!folder.kind){
        const previous=String(folder.type||folder.name||"").toLocaleLowerCase("sv");
        folder.kind=previous.includes("planritning")?"Planritningar":previous.includes("hisstav")?"Hisstavlor":previous.includes("ot-tav")?"OT-tavlor":"general";
      }
      folder.name=name;
      return folder;
    });res.json({folder});
  }));
  app.patch("/api/drawing-library/items/:id/move", wrap(async(req,res)=>{
    const item=await mutate(library=>{
      const item=library.items.find(entry=>entry.id===req.params.id&&entry.type==="file");
      if(!item)invalid("Ritningen hittades inte.");
      if(!Object.prototype.hasOwnProperty.call(req.body||{},"folderId"))invalid("Välj en mapp.");
      const folderId=req.body.folderId;
      if(!folderExists(library,folderId))invalid("Mappen hittades inte. Välj en annan mapp.");
      item.folderId=folderId;
      item.updatedAt=new Date().toISOString();
      return item;
    });const {dataUrl,...safe}=item;res.json({item:safe});
  }));
  app.delete("/api/drawing-library/folders/:id", wrap(async(req,res)=>{
    await mutate(library=>{
      if (!library.folders.some(folder=>folder.id===req.params.id)) invalid("Mappen hittades inte.");
      if (library.folders.some(folder=>folder.parentId===req.params.id) || library.items.some(item=>item.folderId===req.params.id)) invalid("Mappen behöver vara tom innan den tas bort.");
      library.folders=library.folders.filter(folder=>folder.id!==req.params.id);
    });res.json({success:true});
  }));
  app.post("/api/drawing-library/items", wrap(async(req,res)=>{
    const item = await mutate(library=>{
      const folderId=req.body?.folderId || null;
      if (!folderExists(library,folderId)) invalid("Mappen hittades inte.");
      let clean;try {clean=cleanItem(req.body || {},folderId);}catch(error){invalid(error.message);}
      checkBoardArticle(library,clean);
      const item={...clean,id:crypto.randomUUID(),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};library.items.push(item);return item;
    });const {dataUrl,...safe}=item;res.status(201).json({item:safe});
  }));
  app.post("/api/drawing-library/import-project", wrap(async(req,res)=>{
    const projectId=text(req.body?.projectId,100),drawingId=text(req.body?.drawingId,100);
    const name=text(req.body?.name),folderId=req.body?.folderId || null,importId=text(req.body?.importId,100);
    if(!projectId||!drawingId||!name||!importId)invalid("Ange en projektritning och ett namn.");
    const item=await mutate(async library=>{
      if(!folderExists(library,folderId))invalid("Mappen hittades inte. Öppna dialogen igen och välj en mapp.");
      const existing=library.items.find(item=>item.sourceImportId===importId&&item.sourceProjectId===projectId&&item.sourceProjectDrawingId===drawingId);
      if(existing)return existing;
      const source=await getProjectDrawing(projectId,drawingId);
      if(!source)invalid("Projektritningen hittades inte.");
      const markers=source.drawing.markers || [];
      if(!Array.isArray(markers)||markers.length>1000)invalid("En ritning kan innehålla högst 1 000 skyltmarkeringar.");
      let clean;try{clean=cleanItem({type:"file",name,dataUrl:"data:application/pdf;base64,"+source.bytes.toString("base64")},folderId);}catch(error){invalid(error.message);}
      const now=new Date().toISOString();
      const item={...clean,id:crypto.randomUUID(),createdAt:now,updatedAt:now,
        markers:JSON.parse(JSON.stringify(markers)),sourceProjectId:projectId,sourceProjectDrawingId:drawingId,sourceImportId:importId};
      library.items.push(item);return item;
    });
    const {dataUrl,...safe}=item;res.status(201).json({item:safe});
  }));
  app.put("/api/drawing-library/items/:id", wrap(async(req,res)=>{
    const item=await mutate(library=>{
      const index=library.items.findIndex(item=>item.id===req.params.id);
      if(index<0)invalid("Ritningen hittades inte.");
      if(!["elevator","ot"].includes(library.items[index].type))invalid("Filer kan inte redigeras som tavlor.");
      let clean;try{clean=cleanItem({...req.body,type:library.items[index].type},library.items[index].folderId);}catch(error){invalid(error.message);}
      checkBoardArticle(library,clean);
      library.items[index]={...library.items[index],...clean,updatedAt:new Date().toISOString()};return library.items[index];
    });res.json({item});
  }));
  app.patch("/api/drawing-library/items/:id/register", wrap(async(req,res)=>{
    const result=await mutate(library=>{
      const item=library.items.find(entry=>entry.id===req.params.id && entry.type==="file");
      if(!item)invalid("Ritningen hittades inte.");
      const name=text(req.body?.name,120);
      if(!name)invalid("Ange ett namn på ritningen.");
      const markers=req.body?.markers;
      if(!Array.isArray(markers)||markers.length>1000)invalid("Ogiltiga skyltmarkeringar.");
      item.name=name;
      item.markers=markers.map((m,i)=>{
        const unplaced=m.unplaced===true;
        const x=unplaced?null:Number(m.x),y=unplaced?null:Number(m.y),page=unplaced?null:Number(m.page);
        if(!unplaced&&(!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>1||y<0||y>1||!Number.isSafeInteger(page)||page<1||page>1000))invalid("Ogiltig markering.");
        const previous=(item.markers||[]).find(entry=>entry.id===m.id);
        const configuration=Object.prototype.hasOwnProperty.call(m,"configuration")?m.configuration:previous?.configuration;
        if(configuration!==undefined){try{validateProjectConfiguration(configuration);}catch(error){invalid(error.message);}}
        const position=text(m.position??previous?.position,80);
        const savedNumber=Number(m.number??previous?.number??position.replace(/\D/g,""));
        return {...(previous||{}),id:text(m.id,80)||crypto.randomUUID(),number:Number.isSafeInteger(savedNumber)&&savedNumber>0?savedNumber:i+1,...(position?{position}:{}),x,y,page,...(unplaced?{unplaced:true}:m.unplaced===false?{unplaced:false}:{}),
          articleId:text(m.articleId??previous?.articleId,100),articleNumber:text(m.articleNumber,40),
          signText:text(m.signText??m.text,6000),text:text(m.text??m.signText,6000),symbols:text(m.symbols??previous?.symbols,1000),
          ...(configuration!==undefined?{configuration:JSON.parse(JSON.stringify(configuration))}:{}),
          notes:text(m.notes,1500),checkedAt:text(m.checkedAt,30)};
      });
      item.updatedAt=new Date().toISOString();return item;
    });
    const {dataUrl,...safe}=result;res.json({item:safe});
  }));
  app.delete("/api/drawing-library/items/:id", wrap(async(req,res)=>{
    await mutate(library=>{if(!library.items.some(item=>item.id===req.params.id))invalid("Ritningen hittades inte.");library.items=library.items.filter(item=>item.id!==req.params.id);});res.json({success:true});
  }));
  app.post("/api/drawing-library/items/:id/publish", wrap(async(req,res)=>{
    if(!(await canPublish(req)))return res.status(403).json({message:"Endast admin kan publicera artiklar."});
    const result=await mutate(async library=>{
      const item=library.items.find(item=>item.id===req.params.id && item.type==="elevator");
      if(!item)invalid("Spara hisstavlan först.");
      const unitPrice=Number(req.body?.unitPrice);
      if(!Number.isFinite(unitPrice)||unitPrice<0)invalid("Ange ett giltigt pris.");
      const catalogue=await readCatalog();
      let category=catalogue.categories.find(category=>category.id===req.body?.categoryId);
      if(!category && req.body?.categoryId==="__new"){
        category=catalogue.categories.find(category=>category.title.toLocaleLowerCase("sv")==="hisstavlor");
        if(!category){category={id:"hisstavlor-"+crypto.randomUUID(),title:"Hisstavlor",status:"open",isImplemented:true,isCustom:true};catalogue.categories.push(category);}
      }
      if(!category)invalid("Välj artikelgrupp.");
      const articleNumber=text(item.articleNumber || req.body?.articleNumber,40);
      if(!articleNumber)invalid("Ange artikelnummer på hisstavlan och spara först.");
      const existing=catalogue.articles.find(article=>String(article.articleNumber||"").trim()===articleNumber && article.categoryId===category.id);
      if(!existing)invalid(`Artikel ${articleNumber} finns inte i den valda artikelgruppen. Skapa artikeln först under Artiklar.`);
      const id=existing.id;
      const ancestors=[];let folder=library.folders.find(folder=>folder.id===item.folderId);const seen=new Set();
      while(folder&&!seen.has(folder.id)){seen.add(folder.id);ancestors.unshift(folder.name);folder=library.folders.find(parent=>parent.id===folder.parentId);}
      const variant={id:item.id,name:item.name,location:ancestors.join(" / "),board:cleanBoard(item.board),floorCopies:item.floorCopies??1,cabinCopies:item.cabinCopies??0,unitPrice:Number(existing.unitPrice)||0};
      // Remove an older publication if this board was moved to a different article.
      for(const article of catalogue.articles){if(article.id!==id && Array.isArray(article.elevatorBoards))article.elevatorBoards=article.elevatorBoards.filter(v=>v.id!==item.id);}
      const variants=[...(existing.elevatorBoards||[]).filter(v=>v.id!==item.id),variant];
      Object.assign(existing,{previewType:"elevator_board",flowType:"form",isImplemented:true,fields:{...(existing.fields||{}),quantity:false},elevatorBoards:variants,elevatorBoardConfig:variants[0].board});
      await writeCatalog(catalogue);item.catalogArticleId=id;item.publishedAt=new Date().toISOString();return {articleId:id,variantId:item.id};
    });res.json(result);
  }));
  app.get("/api/drawing-library/items/:id/file", wrap(async(req,res)=>{
    const item=(await read()).items.find(item=>item.id===req.params.id && item.type==="file");
    if(!item)return res.status(404).json({message:"Filen hittades inte."});
    res.setHeader("Content-Type",item.mime);res.setHeader("X-Content-Type-Options","nosniff");res.setHeader("Cache-Control","no-store");res.send(Buffer.from(item.dataUrl.split(",")[1],"base64"));
  }));

  async function syncProjectBoardsOnProductionStart(previousOrder, order) {
    const beforeProduction = ["ny", "väntar_godkännande", "behöver_kompletteras", "godkänd"];
    if (order.source !== "project" || !order.projectId || !beforeProduction.includes(previousOrder.status)
      || !["påbörjad", "klar"].includes(order.status)) return;

    const boards = (order.cart || []).flatMap(item => {
      const configuration = item.configuration || {};
      const elevatorId = item.elevatorBoardId || configuration.elevatorBoardId;
      const otId = item.otBoardId || configuration.otBoardId;
      const elevator = item.elevatorBoard || configuration.elevatorBoard;
      const ot = item.otBoard || configuration.otBoard;
      if (elevatorId && elevator) return [{id:elevatorId, type:"elevator", board:elevator, clean:cleanBoard}];
      if (otId && ot && !ot.uploadedArtwork) return [{id:otId, type:"ot", board:ot, clean:cleanOTBoard}];
      return [];
    });
    if (!boards.length) return;

    await mutate(library => {
      const updates = new Map();
      for (const entry of boards) {
        const item = library.items.find(item => item.id === entry.id && item.type === entry.type);
        if (!item || item.productionOrderIds?.includes(order.id)) continue;
        let board;
        try { board = entry.clean(entry.board); }
        catch (error) { throw Object.assign(new Error(`Tavlan ${item.name} kunde inte uppdateras under Ritningar. ${error.message}`), {status:409}); }
        if (updates.has(item) && !isDeepStrictEqual(updates.get(item), board)) {
          throw Object.assign(new Error(`Ordern innehåller flera olika versioner av ${item.name}. Välj samma version på orderraderna innan produktionen startas.`), {status:409});
        }
        updates.set(item, board);
      }

      const updatedAt = new Date().toISOString();
      for (const [item, board] of updates) {
        Object.assign(item, {board, updatedAt, productionOrderIds:[...(item.productionOrderIds || []), order.id]});
      }
      return updates.size;
    }, count => count > 0);
  }

  return {syncProjectBoardsOnProductionStart};
}
module.exports={installDrawingLibrary,cleanBoard,makeDrawingBoardPdf,drawingBoardLabel};
