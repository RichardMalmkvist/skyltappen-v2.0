const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const {createHash} = require('node:crypto');
const {BlobServiceClient} = require('@azure/storage-blob');
const {importData} = require('../scripts/import-local-data');

test('local data migration resumes with identical files and preserves different data', async t => {
  const source = new Map([
    ['project-pdfs/project/plan.pdf', Buffer.from('drawing')],
    ['projects-v1.json', Buffer.from('[{"id":"existing-project"}]')],
  ]);
  const destination = new Map();
  const uploads = [];
  t.mock.method(fs, 'lstat', async () => ({isFile: () => true}));
  t.mock.method(fs, 'readFile', async name => source.get(name));
  t.mock.method(BlobServiceClient, 'fromConnectionString', () => ({
    accountName: 'newaccount',
    getContainerClient(name) {
      assert.equal(name, 'orders');
      return {
        createIfNotExists: async () => {},
        async *listBlobsFlat() {
          for (const name of destination.keys()) yield {name};
        },
        getBlockBlobClient(name) {
          return {
            downloadToBuffer: async () => destination.get(name),
            async uploadData(bytes, options) {
              assert.equal(options.conditions.ifNoneMatch, '*');
              assert.ok(!destination.has(name));
              uploads.push(name);
              destination.set(name, bytes);
            },
          };
        },
      };
    },
  }));
  const plan = {
    missing: [],
    files: [...source].map(([name, bytes]) => ({
      file: name, blob: name, hash: createHash('sha256').update(bytes).digest('hex'),
    })),
  };
  const input = {plan, accountName: 'newaccount', connectionString: 'mock'};
  await assert.rejects(importData({...input, accountName: 'oldaccount'}), /angivna lagringskontot/);
  destination.set('projects-v1.json', Buffer.from('[]'));
  await assert.rejects(importData(input), /andra uppgifter/);
  assert.deepEqual(uploads, []);
  destination.delete('projects-v1.json');
  destination.set(plan.files[0].blob, source.get(plan.files[0].file));
  await importData(input);
  await importData(input);
  assert.deepEqual(uploads, ['projects-v1.json']);
  assert.deepEqual(destination, source);
});
