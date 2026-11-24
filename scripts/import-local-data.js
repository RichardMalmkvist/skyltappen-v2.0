const fs = require("node:fs/promises");
const path = require("node:path");
const {createHash} = require("node:crypto");
const {BlobServiceClient} = require("@azure/storage-blob");
const {readBuiltinDibondAsset} = require("../server/dibondBuiltinSymbols");

// Files go first. The indexes that make them visible in the app go last.
const DIRECTORIES = {
  "article-production-files":[".json",".svg"],
  "dibond-symbol-assets":[".svg",".png"],
  "order-attachments":[".pdf"],
  "project-pdfs":[".pdf"],
  "project-proofs":[".json"],
  "project-sign-files":[".bin",".json"],
  "sign-artworks":[".json"]
};
const JSON_FILES = [
  {file:"catalog-v2.local.json",blob:"catalog-v2.json",arrays:["articles","categories"]},
  {file:"drawing-library.json",blob:"drawing-library-v1.json",arrays:["items","folders"]},
  {file:"project-folders.json",blob:"project-folders-v1.json",arrays:["folders"]},
  {file:"dibond-symbols.json",blob:"dibond-symbols-v1.json",array:true},
  {file:"badge-production-settings.json",optional:true},
  {file:"hanging-sign-symbols-v1.json",array:true,optional:true},
  {file:"door-sign-symbols-v1.json",array:true,optional:true},
  {file:"order-number-reservations.json",optional:true},
  {file:"homepage-notice-v1.json",optional:true},
  {file:"projects.json",blob:"projects-v1.json",array:true},
  {file:"orders.json",array:true},
  {file:"project-proof-workflow.json",arrays:["proofs","notifications"]},
  {file:"users.json",array:true}
];
const CONTENT_TYPES = {
  ".json":"application/json", ".pdf":"application/pdf", ".png":"image/png",
  ".svg":"image/svg+xml", ".bin":"application/octet-stream"
};

const checksum = bytes => createHash("sha256").update(bytes).digest("hex");

async function readSource(file, optional = false) {
  try {
    if (!(await fs.lstat(file)).isFile()) throw new Error("Källan är inte en vanlig fil: " + path.basename(file));
    return await fs.readFile(file);
  } catch (error) {
    if (optional && error.code === "ENOENT") return undefined;
    throw error;
  }
}

async function listDirectory(root, key, extensions, optional = false) {
  const directory = path.join(root,key);
  let entries;
  try {
    if (!(await fs.lstat(directory)).isDirectory()) throw new Error("Källan är inte en vanlig mapp: " + key);
    entries = await fs.readdir(directory,{withFileTypes:true});
  } catch (error) {
    if (optional && error.code === "ENOENT") return [];
    throw error;
  }
  const files = [];
  for (const entry of entries.sort((a,b) => a.name.localeCompare(b.name))) {
    const name = key + "/" + entry.name;
    if (entry.isDirectory()) files.push(...await listDirectory(root,name,extensions));
    else if (entry.isFile() && name.endsWith(".tmp")) continue;
    else if (entry.isFile() && extensions.includes(path.extname(name))) files.push(name);
    else throw new Error("Oväntad fil eller länk i datamappen: " + name);
  }
  return files;
}

function readJson(bytes, name) {
  try { return JSON.parse(bytes.toString("utf8")); }
  catch { throw new Error("Källdata kunde inte läsas som JSON: " + name); }
}

function findMissingReferences(metadata, artwork, keys) {
  const missing = new Set();
  const requireBlob = key => { if (!keys.has(key)) missing.add(key); };
  const requireAsset = (id, kind) => {
    const folder = kind === "project" ? "project-sign-files" : "article-production-files";
    requireBlob(`${folder}/${id}.json`);
    requireBlob(`${folder}/${id}.${kind === "project" ? "bin" : "svg"}`);
  };
  const checkSymbol = value => {
    if (typeof value !== "string") return;
    const id = /^\/api\/dibond-symbols\/images\/([a-f0-9-]{36})$/i.exec(value)?.[1];
    if (id && !keys.has(`dibond-symbol-assets/${id}.svg`) && !keys.has(`dibond-symbol-assets/${id}.png`) && !readBuiltinDibondAsset(id)) {
      missing.add(`dibond-symbol-assets/${id}`);
    }
  };
  function checkDesign(value) {
    if (!value || typeof value !== "object") return;
    if (value.uploadedArtwork?.id) requireBlob(`sign-artworks/${value.uploadedArtwork.id}.json`);
    checkSymbol(value.image);
    for (const item of Object.values(value)) checkDesign(item);
  }

  for (const entry of artwork) requireAsset(entry.id, entry.mime === "application/pdf" ? "project" : "article");
  for (const proof of metadata["project-proof-workflow.json"]?.proofs ?? []) requireBlob(`project-proofs/${proof.id}.json`);
  for (const project of metadata["projects.json"] ?? []) {
    const signs = [...(project.signs || [])];
    for (const drawing of project.drawings || []) {
      requireBlob(`project-pdfs/${project.id}/${drawing.fileName}`);
      signs.push(...(drawing.markers || []));
    }
    for (const sign of signs) {
      if (sign.productionFile?.id) requireAsset(sign.productionFile.id,sign.productionFile.mime === "application/pdf" ? "project" : "article");
      if (sign.proofFile?.id) requireAsset(sign.proofFile.id,"project");
      checkDesign(sign.configuration);
    }
  }
  for (const order of metadata["orders.json"] ?? []) {
    for (const file of order.attachments || []) requireBlob(`order-attachments/${file.id}.pdf`);
    for (const item of order.cart || []) {
      for (const file of [item?.productionFile,item?.proofFile]) {
        if (file?.id) requireAsset(file.id,file.storage);
      }
      checkDesign(item);
    }
  }
  for (const article of metadata["catalog-v2.local.json"]?.articles ?? []) {
    if (article.productionFile?.id) requireAsset(article.productionFile.id,"article");
    checkDesign(article);
  }
  for (const symbol of metadata["dibond-symbols.json"] ?? []) checkSymbol(symbol.image);
  return [...missing].sort();
}

async function planImport(directory, {allowMissingMetadata = false, includeUsers = true} = {}) {
  const files = [], metadata = {}, artwork = [];
  for (const [folder,extensions] of Object.entries(DIRECTORIES)) {
    for (const name of await listDirectory(directory,folder,extensions,true)) {
      const file = path.join(directory,name);
      const bytes = await readSource(file);
      if (name.endsWith(".json")) {
        const data = readJson(bytes,name);
        if (folder === "sign-artworks") {
          if (!data.original?.id) throw new Error("Tryckmotivet saknar original: " + name);
          artwork.push(data.original);
        }
      }
      files.push({file,blob:name,mime:CONTENT_TYPES[path.extname(name)],hash:checksum(bytes),size:bytes.length});
    }
  }
  for (const {file,blob = file,array,arrays,optional} of JSON_FILES) {
    if (!includeUsers && file === "users.json") continue;
    const source = path.join(directory,file);
    const bytes = await readSource(source,optional || allowMissingMetadata);
    if (!bytes) continue;
    const data = readJson(bytes,file);
    if (array ? !Array.isArray(data) : !data || typeof data !== "object" || Array.isArray(data) || arrays?.some(key => !Array.isArray(data[key]))) {
      throw new Error("Källdata har oväntat format: " + file);
    }
    metadata[file] = data;
    files.push({file:source,blob,mime:CONTENT_TYPES[".json"],hash:checksum(bytes),size:bytes.length});
  }
  const missing = findMissingReferences(metadata,artwork,new Set(files.map(file => file.blob)));
  return {
    files, missing,
    summary:{
      användare:metadata["users.json"]?.length ?? 0,
      artiklar:metadata["catalog-v2.local.json"]?.articles.length ?? 0,
      ordrar:metadata["orders.json"]?.length ?? 0,
      projekt:metadata["projects.json"]?.length ?? 0,
      korrekturversioner:metadata["project-proof-workflow.json"]?.proofs.length ?? 0,
      ritningsobjekt:metadata["drawing-library.json"]?.items.length ?? 0,
      filer:files.length,
      megabyte:Math.round(files.reduce((sum,file) => sum + file.size,0) / 1_000_000)
    }
  };
}

async function readPlannedFile(file) {
  const bytes = await readSource(file.file);
  if (checksum(bytes) !== file.hash) throw new Error("Källdata ändrades under importen. Kör om när den tidigare lokala appen är pausad.");
  return bytes;
}

async function importData({plan, accountName, connectionString}) {
  if (plan.missing.length) throw new Error("Importen avbröts. Källdata refererar till filer som saknas.");
  if (!connectionString || !accountName) throw new Error("Ange det nya lagringskontot och JSF_NEW_AZURE_STORAGE_CONNECTION_STRING.");
  const service = BlobServiceClient.fromConnectionString(connectionString);
  if (service.accountName !== accountName) throw new Error("Anslutningssträngen hör inte till det angivna lagringskontot.");
  const container = service.getContainerClient("orders");
  await container.createIfNotExists();

  const planned = new Map(plan.files.map(file => [file.blob,file]));
  const existing = new Set();
  for await (const {name} of container.listBlobsFlat()) {
    const file = planned.get(name);
    if (!file || checksum(await container.getBlockBlobClient(name).downloadToBuffer()) !== file.hash) {
      throw new Error("Mållagringen innehåller andra uppgifter. Importen avbröts före uppladdning.");
    }
    existing.add(name);
  }

  for (const file of plan.files) {
    if (existing.has(file.blob)) continue;
    const bytes = await readPlannedFile(file);
    const blob = container.getBlockBlobClient(file.blob);
    try {
      await blob.uploadData(bytes,{
        conditions:{ifNoneMatch:"*"},
        blobHTTPHeaders:{blobContentType:file.mime}
      });
    } catch (error) {
      if (error.statusCode !== 412 && error.code !== "BlobAlreadyExists") throw error;
      if (checksum(await blob.downloadToBuffer()) !== file.hash) {
        throw new Error("Mållagringen ändrades under importen. En befintlig fil skyddades från överskrivning.");
      }
    }
  }
}

if (require.main === module) {
  const [mode,accountName] = process.argv.slice(2);
  (async () => {
    if (mode && mode !== "--apply") throw new Error("Kör utan argument för kontroll eller med --apply följt av det nya lagringskontots namn.");
    const plan = await planImport(path.join(__dirname,"../server"));
    console.log(JSON.stringify(plan.summary,null,2));
    if (plan.missing.length) {
      console.error("Filer som saknas:\n" + plan.missing.join("\n"));
      process.exitCode = 1;
      return;
    }
    if (mode === "--apply") {
      await importData({plan,accountName,connectionString:process.env.JSF_NEW_AZURE_STORAGE_CONNECTION_STRING});
      console.log("Importen till det nya Azure-lagringskontot är klar.");
    } else console.log("Kontrollen är klar. Inga uppgifter har skickats.");
  })().catch(error => {
    console.error(error.code ? "Importen misslyckades (" + error.code + ")." : error.message);
    process.exitCode = 1;
  });
}

module.exports = {planImport, readPlannedFile, importData};
