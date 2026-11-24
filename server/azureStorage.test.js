const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {spawnSync} = require("node:child_process");
const express = require("express");
const {BlobServiceClient} = require("@azure/storage-blob");

test("startup requires an Azure storage connection", () => {
  const env = {...process.env};
  delete env.AZURE_STORAGE_CONNECTION_STRING;
  const result = spawnSync(process.execPath, [path.join(__dirname, "server.js")], {env, encoding:"utf8"});
  assert.equal(result.status, 1);
  assert.match(result.stderr, /AZURE_STORAGE_CONNECTION_STRING saknas/);
  const production = spawnSync(process.execPath, [path.join(__dirname, "server.js"), "--development"], {
    env:{...env, NODE_ENV:"production"}, encoding:"utf8",
  });
  assert.equal(production.status, 1);
  assert.match(production.stderr, /AZURE_STORAGE_CONNECTION_STRING saknas/);
});

test("temporary development storage supports conditional updates and is isolated between runs", async () => {
  const {createDevBlobStorage} = require("./devBlobStorage");
  const storage = createDevBlobStorage();
  const blob = storage.getBlockBlobClient("test.json");
  const {etag} = await blob.uploadData("first", {conditions:{ifNoneMatch:"*"}});
  await assert.rejects(blob.uploadData("overwrite", {conditions:{ifNoneMatch:"*"}}), {statusCode:412});
  await blob.uploadData("second", {conditions:{ifMatch:etag}});
  await assert.rejects(blob.uploadData("stale", {conditions:{ifMatch:etag}}), {statusCode:412});
  assert.equal((await blob.downloadToBuffer()).toString(), "second");
  assert.equal(await createDevBlobStorage().getBlockBlobClient("test.json").exists(), false);
});

test("account, catalog and symbols use blob storage without falling back to local files", async t => {
  const localNames = ["users.json","catalog-v2.local.json","projects.json","orders.json","drawing-library.json"];
  const localState = () => localNames.map(name => fs.statSync(path.join(__dirname,name), {throwIfNoEntry:false})?.mtimeMs);
  const before = localState();
  const password = "integration-only-123", email = "admin@example.test";
  const blobs = new Map();
  let initialAdminWrite;
  let unavailable = false;
  t.mock.method(BlobServiceClient, "fromConnectionString", () => ({getContainerClient:() => ({
    createIfNotExists:async () => {},
    getBlockBlobClient(key) {
      return {
        async downloadToBuffer() {
          if (unavailable) throw Object.assign(new Error("Storage unavailable"),{code:"Unavailable"});
          if (!blobs.has(key)) throw Object.assign(new Error("Blob not found"),{
            statusCode:404, details:{errorCode:"BlobNotFound"},
          });
          return blobs.get(key);
        },
        async uploadData(bytes, options) {
          if (unavailable) throw Object.assign(new Error("Storage unavailable"),{code:"Unavailable"});
          if (key === "users.json" && !blobs.has(key)) initialAdminWrite = options;
          blobs.set(key,Buffer.from(bytes));
        }
      };
    }
  })}));

  let server;
  const listen = express.application.listen;
  const ready = new Promise((resolve, reject) => {
    t.mock.method(express.application, "listen", function() {
      server = listen.call(this, 0, "127.0.0.1", resolve);
      server.once("error", reject);
      return server;
    });
  });
  const settings = {AZURE_STORAGE_CONNECTION_STRING:"mocked-storage",INITIAL_ADMIN_EMAIL:email,INITIAL_ADMIN_PASSWORD:password};
  const originalSettings = Object.keys(settings).map(key => [key,process.env[key]]);
  Object.assign(process.env, settings);
  t.after(async () => {
    for (const [key,value] of originalSettings) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    if (server?.listening) await new Promise(resolve => server.close(resolve));
  });
  require("./server");
  await ready;
  assert.equal(initialAdminWrite.conditions.ifNoneMatch,"*");
  assert.ok(!blobs.get("users.json").toString().includes(password));
  const base = "http://127.0.0.1:" + server.address().port;
  const pdfVersion = require("pdfjs-dist/package.json").version;
  const font = await fetch(base + `/api/pdf-assets/${pdfVersion}/standard_fonts/FoxitFixed.pfb`);
  assert.equal(font.status, 200);
  assert.ok((await font.arrayBuffer()).byteLength > 0);
  const request = (route, method, body, token) => fetch(base+route, {
    method, headers:{"Content-Type":"application/json",...(token ? {Authorization:"Bearer "+token} : {})},
    body:body === undefined ? undefined : JSON.stringify(body)
  });
  const login = await request("/api/account/login","POST",{email,password});
  assert.equal(login.status,200);
  const {token} = await login.json();
  const registration = await request("/api/account/register","POST",{
    email:"buyer@example.test",password,firstName:"Test",lastName:"Buyer",organization:"Test"
  });
  assert.equal(registration.status,201);
  assert.ok(JSON.parse(blobs.get("users.json")).some(user => user.email === "buyer@example.test"));
  const symbols = [{id:"test",name:"Testsymbol",image:"/symbol-vantrum.svg",active:true}];
  assert.equal((await request("/api/admin/sign-symbols/hanging","PUT",{symbols},token)).status,200);
  const catalog = await request("/api/catalog","GET",undefined,token);
  assert.equal(catalog.status,200);
  assert.deepEqual((await catalog.json()).signSymbols.hanging,symbols);
  assert.ok(blobs.has("catalog-v2.json"));

  unavailable = true;
  assert.equal((await request("/api/orders","GET",undefined,token)).status,503);
  assert.equal((await request("/api/admin/sign-symbols/hanging","PUT",{symbols:[]},token)).status,500);
  assert.deepEqual(JSON.parse(blobs.get("hanging-sign-symbols-v1.json")),symbols);
  assert.deepEqual(localState(),before);
});
