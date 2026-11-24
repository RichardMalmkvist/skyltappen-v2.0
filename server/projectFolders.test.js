const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs/promises'),os=require('os'),path=require('path'),express=require('express');
const {createProjectFolderStore,installProjectFolders,checkedChange}=require('./projectFolders');
async function fixture(fn){
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'jsf-project-folders-'));
 const store=createProjectFolderStore({directory}),app=express();app.use(express.json());
 const projects=[];
 const service=installProjectFolders(app,{store,readAccess:async req=>['admin','personal','bestallare'].includes(req.headers.role),adminAccess:async req=>req.headers.role==='admin',readProjects:async()=>projects,writeProjects:async next=>projects.splice(0,projects.length,...next)});
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));const url='http://127.0.0.1:'+server.address().port;
 async function api(method,route,body,role='admin'){const response=await fetch(url+route,{method,headers:{role,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,data:await response.json()};}
 try{await fn({api,store,service,directory,projects});}finally{await new Promise(resolve=>server.close(resolve));assert.ok(path.resolve(directory).startsWith(path.join(os.tmpdir(),'jsf-project-folders-')));await fs.rm(directory,{recursive:true,force:true});}
}
test('missing store means an empty root and creates no files; nested folders survive reopening',()=>fixture(async({api,directory})=>{
 assert.deepEqual(await fs.readdir(directory),[]);assert.deepEqual((await api('GET','/api/project-folders')).data.folders,[]);assert.deepEqual(await fs.readdir(directory),[]);
 const a=(await api('POST','/api/project-folders',{name:'Ryhov'})).data.folder;
 const b=(await api('POST','/api/project-folders',{name:'Ogon',parentId:a.id})).data.folder;
 const c=(await api('POST','/api/project-folders',{name:'Plan 3',parentId:b.id})).data.folder;
 const restored=await createProjectFolderStore({directory}).read();assert.equal(restored.folders.length,3);assert.equal(restored.folders[2].parentId,b.id);assert.equal(restored.folders[2].id,c.id);
}));
test('rename/move keeps IDs and descendants; self and descendant cycles are rejected',()=>fixture(async({api})=>{
 const a=(await api('POST','/api/project-folders',{name:'Ryhov'})).data.folder;
 const b=(await api('POST','/api/project-folders',{name:'Ogon',parentId:a.id})).data.folder;
 const other=(await api('POST','/api/project-folders',{name:'Varnamo'})).data.folder;
 assert.equal((await api('PATCH','/api/project-folders/'+a.id,{parentId:b.id})).status,400);
 assert.equal((await api('PATCH','/api/project-folders/'+a.id,{parentId:a.id})).status,400);
 const changed=await api('PATCH','/api/project-folders/'+a.id,{name:'Lanssjukhuset Ryhov',parentId:other.id});assert.equal(changed.status,200);assert.equal(changed.data.folder.id,a.id);
 const folders=(await api('GET','/api/project-folders')).data.folders;assert.equal(folders.find(f=>f.id===b.id).parentId,a.id);
 assert.equal((await api('PATCH','/api/project-folders/'+a.id,{parentId:null})).status,200);
}));
test('duplicate names, missing parents and concurrent writes are handled without losing folders',()=>fixture(async({api})=>{
 const duplicate=await Promise.all([api('POST','/api/project-folders',{name:'Ryhov'}),api('POST','/api/project-folders',{name:'ryhov'})]);assert.deepEqual(duplicate.map(x=>x.status).sort(),[201,409]);
 assert.equal((await api('POST','/api/project-folders',{name:'Bad',parentId:'missing'})).status,400);
 const parent=duplicate.find(r=>r.status===201).data.folder;
 assert.equal((await api('POST','/api/project-folders',{name:'Ryhov',parentId:parent.id})).status,201);
 assert.equal((await api('POST','/api/project-folders',{name:'  '})).status,400);
}));
test('only admin can organize; project folder validation accepts legacy root and rejects missing folders',()=>fixture(async({api,service})=>{
 for(const role of ['personal','bestallare','none'])assert.equal((await api('POST','/api/project-folders',{name:'No'},role)).status,403);
 assert.equal((await api('GET','/api/project-folders',null,'personal')).status,200);
 assert.equal((await api('GET','/api/project-folders',null,'none')).status,403);
 assert.equal(await service.validateFolderId(undefined),null);assert.equal(await service.validateFolderId(''),null);
 await assert.rejects(service.validateFolderId('missing'),e=>e.status===400);
 const folder=(await api('POST','/api/project-folders',{name:'Ryhov'})).data.folder;assert.equal(await service.validateFolderId(folder.id),folder.id);
}));
test('corrupt local data is never treated as an empty collection',()=>fixture(async({store,directory})=>{
 await fs.writeFile(path.join(directory,'project-folders.json'),'broken');await assert.rejects(store.read());
}));
test('Azure store persists the same schema as local storage',async()=>{
 const saved=new Map();const blobFor=async name=>({exists:async()=>saved.has(name),downloadToBuffer:async()=>saved.get(name),upload:async bytes=>saved.set(name,Buffer.from(bytes))});
 const store=createProjectFolderStore({blobFor});const data={version:1,folders:[{id:'a',name:'Ryhov',parentId:null}]};await store.write(data);assert.deepEqual(await createProjectFolderStore({blobFor}).read(),data);
});

test('deleting a folder moves its direct contents up one level and preserves projects, drawings and deeper descendants',()=>fixture(async({api,projects})=>{
 const root=(await api('POST','/api/project-folders',{name:'Ryhov'})).data.folder;
 const folder=(await api('POST','/api/project-folders',{name:'Akut',parentId:root.id})).data.folder;
 const child=(await api('POST','/api/project-folders',{name:'Medicin',parentId:folder.id})).data.folder;
 const grandchild=(await api('POST','/api/project-folders',{name:'Plan 2',parentId:child.id})).data.folder;
 const drawing={id:'drawing',markers:[{id:'sign'}]};projects.push({id:'p',folderId:folder.id,drawings:[drawing],proofs:['saved-proof']},{id:'nested',folderId:grandchild.id});
 for(const role of ['personal','bestallare','none'])assert.equal((await api('DELETE','/api/project-folders/'+folder.id,null,role)).status,403);
 const result=await api('DELETE','/api/project-folders/'+folder.id);assert.equal(result.status,200);assert.ok(!result.data.folders.some(f=>f.id===folder.id));assert.equal(result.data.folders.find(f=>f.id===child.id).parentId,root.id);assert.equal(result.data.folders.find(f=>f.id===grandchild.id).parentId,child.id);
 assert.equal(projects[0].folderId,root.id);assert.deepEqual(projects[0].drawings,[drawing]);assert.deepEqual(projects[0].proofs,['saved-proof']);assert.equal(projects[1].folderId,grandchild.id);
 assert.equal((await api('DELETE','/api/project-folders/'+folder.id)).status,404);
 assert.equal((await api('DELETE','/api/project-folders/'+root.id)).status,200);assert.equal(projects[0].folderId,null);
}));

test('folder deletion rejects conflicting child names before moving any project',()=>fixture(async({api,projects})=>{
 const parent=(await api('POST','/api/project-folders',{name:'Parent'})).data.folder;
 await api('POST','/api/project-folders',{name:'Medicin',parentId:parent.id});await api('POST','/api/project-folders',{name:'Medicin'});projects.push({id:'p',folderId:parent.id});
 const result=await api('DELETE','/api/project-folders/'+parent.id);assert.equal(result.status,409);assert.equal(projects[0].folderId,parent.id);assert.equal((await api('GET','/api/project-folders')).data.folders.length,3);
}));
