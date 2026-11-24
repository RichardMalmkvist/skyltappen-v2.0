const fs=require('fs/promises'),path=require('path'),crypto=require('crypto');
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const folderId=value=>{
 if(value===null||value===undefined||value==='')return null;
 if(typeof value!=='string'||value.length>100)fail(400,'Välj en giltig mapp.');
 return value;
};
function checkedFolderId(folders,value){
 const id=folderId(value);
 if(id&&!folders.some(folder=>folder.id===id))fail(400,'Mappen finns inte längre. Uppdatera sidan och välj en annan mapp.');
 return id;
}
function checkedName(value){
 if(typeof value!=='string')fail(400,'Ange ett mappnamn.');
 const name=value.trim().normalize('NFC');
 if(!name||name.length>120||/[\x00-\x1f\x7f]/.test(name))fail(400,'Mappnamnet måste innehålla 1–120 tecken.');
 return name;
}
function checkedChange(folders,body,existing){
 const name=Object.hasOwn(body,'name')?checkedName(body.name):existing?.name;
 if(!name)fail(400,'Ange ett mappnamn.');
 const parentId=Object.hasOwn(body,'parentId')?checkedFolderId(folders,body.parentId):existing?.parentId||null;
 const visited=new Set();let cursor=parentId;
 while(cursor){
  if(cursor===existing?.id||visited.has(cursor))fail(400,'En mapp kan inte flyttas till sig själv eller en egen undermapp.');
  visited.add(cursor);cursor=folders.find(folder=>folder.id===cursor)?.parentId||null;
 }
 if(folders.some(folder=>folder.id!==existing?.id&&(folder.parentId||null)===parentId&&folder.name.normalize('NFC').toLocaleLowerCase('sv')===name.toLocaleLowerCase('sv')))fail(409,'Det finns redan en mapp med det namnet på den platsen.');
 return {name,parentId};
}
function createProjectFolderStore({blobFor=async()=>null,directory=__dirname}={}){
 const name='project-folders-v1.json',file=path.join(directory,'project-folders.json');
 return {
  async read(){
   const blob=await blobFor(name);let data;
   if(blob){
    if(!await blob.exists())return {version:1,folders:[]};
    data=JSON.parse((await blob.downloadToBuffer()).toString('utf8'));
   }
   else{
    try{data=JSON.parse(await fs.readFile(file,'utf8'));}
    catch(error){if(error.code==='ENOENT')return {version:1,folders:[]};throw error;}
   }
   if(!data||!Array.isArray(data.folders))throw new Error('Projektmapparnas data kunde inte läsas.');
   return data;
  },
  async write(data){
   const body=Buffer.from(JSON.stringify({...data,version:1},null,2)),blob=await blobFor(name);
   if(blob)await blob.upload(body,body.length,{overwrite:true,blobHTTPHeaders:{blobContentType:'application/json'}});
   else{
    await fs.mkdir(directory,{recursive:true});const temp=file+'.'+crypto.randomUUID()+'.tmp';
    try{await fs.writeFile(temp,body);await fs.rename(temp,file);}
    finally{await fs.unlink(temp).catch(error=>{if(error.code!=='ENOENT')throw error;});}
   }
  }
 };
}
function installProjectFolders(app,{store,readAccess,adminAccess,readProjects=async()=>[],writeProjects=async()=>{}}){
 let queue=Promise.resolve();
 const mutate=fn=>{const task=queue.then(async()=>{const data=await store.read();const result=await fn(data.folders);await store.write(data);return result;});queue=task.catch(()=>{});return task;};
 const wrap=(editing,handler)=>async(req,res)=>{
  try{
   if(!await (editing?adminAccess:readAccess)(req))return res.status(403).json({message:'Du har inte behörighet att '+(editing?'ändra':'visa')+' projektmappar.'});
   await handler(req,res);
  }catch(error){if(!error.status)console.error('Projektmappar:',error.message);res.status(error.status||500).json({message:error.status?error.message:'Kunde inte läsa eller spara projektmappar.'});}
 };
 app.get('/api/project-folders',wrap(false,async(_req,res)=>res.set('Cache-Control','no-store').json({folders:(await store.read()).folders})));
 app.post('/api/project-folders',wrap(true,async(req,res)=>{
  const folder=await mutate(folders=>{
   const fields=checkedChange(folders,req.body||{}),now=new Date().toISOString();
   const folder={id:crypto.randomUUID(),...fields,createdAt:now,updatedAt:now};folders.push(folder);return folder;
  });res.status(201).json({folder});
 }));
 app.patch('/api/project-folders/:id',wrap(true,async(req,res)=>{
  const folder=await mutate(folders=>{
   const current=folders.find(folder=>folder.id===req.params.id);if(!current)fail(404,'Mappen hittades inte.');
   if(!Object.hasOwn(req.body||{},'name')&&!Object.hasOwn(req.body||{},'parentId'))fail(400,'Välj ett namn eller en ny plats för mappen.');
   Object.assign(current,checkedChange(folders,req.body,current),{updatedAt:new Date().toISOString()});return current;
  });res.json({folder});
 }));
 app.delete('/api/project-folders/:id',wrap(true,async(req,res)=>{
  const result=await mutate(async folders=>{
   const index=folders.findIndex(folder=>folder.id===req.params.id);if(index<0)fail(404,'Mappen hittades inte.');
   const folder=folders[index],parentId=folder.parentId||null,children=folders.filter(child=>child.parentId===folder.id);
   for(const child of children)if(folders.some(sibling=>sibling.id!==folder.id&&(sibling.parentId||null)===parentId&&sibling.name.normalize('NFC').toLocaleLowerCase('sv')===child.name.normalize('NFC').toLocaleLowerCase('sv')))fail(409,'En undermapp har samma namn som en mapp på nivån ovanför. Byt namn på eller flytta undermappen innan du tar bort mappen.');
   const projects=await readProjects(),moved=projects.map(project=>project.folderId===folder.id?{...project,folderId:parentId,organizedAt:new Date().toISOString()}:project);
   if(moved.some((project,i)=>project!==projects[i]))await writeProjects(moved);
   children.forEach(child=>{child.parentId=parentId;child.updatedAt=new Date().toISOString();});folders.splice(index,1);
   return {success:true,parentId,folders};
  });res.json(result);
 }));
 return {readFolders:async()=>(await store.read()).folders,validateFolderId:async value=>checkedFolderId((await store.read()).folders,value)};
}
module.exports={createProjectFolderStore,installProjectFolders,checkedFolderId,checkedChange};
