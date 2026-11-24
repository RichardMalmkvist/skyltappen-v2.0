const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs/promises'),path=require('path'),os=require('os');
const {Readable}=require('stream');
const {createOrderNumbers}=require('./orderNumbers');
const now=()=>new Date(2026,10,6);
async function fixture(run){const directory=await fs.mkdtemp(path.join(os.tmpdir(),'jsf-order-numbers-'));try{await run(directory);}finally{assert.ok(path.resolve(directory).startsWith(path.join(os.tmpdir(),'jsf-order-numbers-')));await fs.rm(directory,{recursive:true,force:true});}}
test('proof reserves the next real order number; ordinary orders skip it and project order reuses it after restart',()=>fixture(async directory=>{
 const options={directory,now,readOrders:async()=>[{orderNumber:'0026119-00'},{orderNumber:'BEST-10001'}]};
 const store=createOrderNumbers(options);
 assert.equal(await store.reserve('project:p'),'0026120-00');
 assert.equal(await store.reserve('order:one'),'0026121-00');
 const reopened=createOrderNumbers(options);assert.equal(await reopened.reserve('project:p'),'0026120-00');
 assert.equal(await reopened.reserve('order:two'),'0026122-00');
}));
test('concurrent proofs/orders receive unique numbers, retries reuse one reservation and year changes keep sequence',()=>fixture(async directory=>{
 let year=2026;const store=createOrderNumbers({directory,now:()=>new Date(year,0,1),readOrders:async()=>[]});
 const values=await Promise.all(Array.from({length:25},(_,i)=>store.reserve('key:'+i)));
 assert.equal(new Set(values).size,25);assert.equal(values[0],'0026105-00');
 assert.equal(await store.reserve('key:0'),values[0]);year=2027;
 assert.equal(await store.reserve('next'),'0027130-00');
}));
test('separate Azure instances retry conditional conflicts without duplicate numbers',async()=>{
 let bytes=null,revision=0;const blob={
  async download(){if(!bytes)throw Object.assign(new Error('missing'),{statusCode:404});return {etag:String(revision),readableStreamBody:Readable.from([Buffer.from(bytes)])};},
  async uploadData(value,{conditions}){await new Promise(resolve=>setImmediate(resolve));if((conditions.ifNoneMatch&&bytes)||(conditions.ifMatch&&conditions.ifMatch!==String(revision)))throw Object.assign(new Error('conflict'),{statusCode:412});bytes=Buffer.from(value);revision++;}
 };
 const options={directory:os.tmpdir(),now,readOrders:async()=>[{orderNumber:'0026120-00'}],blobFor:async()=>blob};
 const a=createOrderNumbers(options),b=createOrderNumbers(options);
 const values=await Promise.all([a.reserve('project:p'),b.reserve('order:a')]);assert.equal(new Set(values).size,2);
 assert.equal(await b.reserve('project:p'),values[0]);assert.equal(Object.keys((await a.reservations())).length,2);
});
test('corrupt reservation data fails closed instead of starting numbering again',()=>fixture(async directory=>{
 await fs.writeFile(path.join(directory,'order-number-reservations.json'),'{broken');
 const store=createOrderNumbers({directory,now,readOrders:async()=>[]});await assert.rejects(store.reserve('p'));
}));
