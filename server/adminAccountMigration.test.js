const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const {BlobServiceClient} = require("@azure/storage-blob");
const {importFirstAdmin} = require("../scripts/import-first-admin");

test("first-admin import copies only the selected account and never replaces an existing user register", async t => {
  const admin = {id:"existing-admin",email:"admin@example.test",role:"admin",status:"approved",
    firstName:"Test",passwordHash:"a".repeat(32)+":"+"b".repeat(128)};
  t.mock.method(fs,"readFile",async () => JSON.stringify([admin,{...admin,id:"other",email:"other@example.test"}]));
  let saved, containerWrites = 0;
  t.mock.method(BlobServiceClient,"fromConnectionString",() => ({
    accountName:"newaccount",
    getContainerClient(name) {
      assert.equal(name,"orders");
      return {
        createIfNotExists:async () => {containerWrites++;},
        getBlockBlobClient(blobName) {
          assert.equal(blobName,"users.json");
          return {async uploadData(bytes, options) {
            assert.equal(options.conditions.ifNoneMatch,"*");
            if (saved) throw Object.assign(new Error("Already exists"),{statusCode:412});
            saved = JSON.parse(bytes.toString());
          }};
        }
      };
    }
  }));
  const input = {connectionString:"mock",accountName:"newaccount",email:admin.email,source:"mock-users.json"};
  await assert.rejects(importFirstAdmin({...input,accountName:"otheraccount"}),/angivna lagringskontot/);
  await assert.rejects(importFirstAdmin({...input,email:"missing@example.test"}),/exakt ett godkänt/);
  assert.equal(containerWrites,0);
  await importFirstAdmin(input);
  assert.deepEqual(saved,[admin]);
  await assert.rejects(importFirstAdmin({...input,email:"other@example.test"}),/redan ett användarregister/);
  assert.deepEqual(saved,[admin]);
});
