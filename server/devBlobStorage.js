const {Readable} = require("node:stream");
const {randomUUID} = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");

async function readDevAdmin(source = path.join(__dirname, "users.json")) {
  let users;
  try {
    users = JSON.parse(await fs.readFile(source, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
  if (!Array.isArray(users)) return null;
  const approved = users.filter(user => user?.role === "admin" && user.status === "approved");
  if (approved.length !== 1) return null;
  const [admin] = approved;
  if (!admin.id || typeof admin.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(admin.email) ||
      !/^[a-f0-9]{32}:[a-f0-9]{128}$/i.test(admin.passwordHash || "")) return null;
  return {...admin, email:admin.email.toLowerCase()};
}

async function seedDevData(storage, directory = __dirname) {
  const {planImport, readPlannedFile} = require("../scripts/import-local-data");
  const {files, missing, summary} = await planImport(directory, {allowMissingMetadata:true, includeUsers:false});
  for (const file of files) {
    await storage.getBlockBlobClient(file.blob).uploadData(await readPlannedFile(file));
  }
  if (missing.length) console.warn(`Lokalt testläge: ${missing.length} refererade filer saknas i arbetskopian.`);
  return summary;
}

function createDevBlobStorage() {
  const blobs = new Map();

  return {
    async createIfNotExists() {},
    getBlockBlobClient(name) {
      function read() {
        const blob = blobs.get(name);
        if (!blob) throw Object.assign(new Error("Blob not found"), {code:"BlobNotFound", statusCode:404});
        return blob;
      }

      async function uploadData(data, {conditions} = {}) {
        const current = blobs.get(name);
        if ((conditions?.ifNoneMatch === "*" && current) ||
            (conditions?.ifMatch && current?.etag !== conditions.ifMatch)) {
          throw Object.assign(new Error("Blob write condition failed"), {statusCode:412});
        }
        const etag = randomUUID();
        blobs.set(name, {bytes:Buffer.from(data), etag});
        return {etag};
      }

      return {
        uploadData,
        upload: (data, _length, options) => uploadData(data, options),
        exists: async () => blobs.has(name),
        deleteIfExists: async () => ({succeeded:blobs.delete(name)}),
        downloadToBuffer: async () => Buffer.from(read().bytes),
        async download() {
          const {bytes, etag} = read();
          return {readableStreamBody:Readable.from([Buffer.from(bytes)]), etag};
        },
      };
    },
  };
}

module.exports = {createDevBlobStorage, seedDevData, readDevAdmin};
