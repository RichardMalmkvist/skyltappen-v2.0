const fs=require('fs/promises'),path=require('path'),crypto=require('crypto');
const sequence=value=>{const match=/^00\d{2}(\d{3,})-00$/.exec(String(value||''));return match?Number(match[1]):0;};

// Reservations survive failed requests, deleted projects and server restarts.
// Azure uses conditional writes so two API instances cannot allocate the same number.
function createOrderNumbers({directory,blobFor=async()=>null,readOrders,now=()=>new Date()}){
 const name='order-number-reservations.json',file=path.join(directory,name);
 let queue=Promise.resolve();
 const empty=()=>({version:1,highestSequence:104,reservations:{}});
 function validate(state){
  if(state?.version!==1||!Number.isSafeInteger(state.highestSequence)||state.highestSequence<104||!state.reservations||typeof state.reservations!=='object'||Array.isArray(state.reservations))throw new Error('Ogiltigt register för ordernummer.');
  if(Object.values(state.reservations).some(value=>!sequence(value)))throw new Error('Ogiltig ordernummerreservation.');
  return state;
 }
 async function read(){
  try{return {state:validate(JSON.parse(await fs.readFile(file,'utf8')))};}catch(error){if(error.code==='ENOENT')return {state:empty(),missing:true};throw error;}
 }
 async function load(blob){
  if(!blob)return read(null);
  try{const response=await blob.download(),chunks=[];for await(const chunk of response.readableStreamBody)chunks.push(chunk);return {state:validate(JSON.parse(Buffer.concat(chunks).toString('utf8'))),etag:response.etag};}
  catch(error){if(error.statusCode===404)return {state:empty(),missing:true};throw error;}
 }
 return {
  async reservations(){return (await load(await blobFor(name))).state.reservations;},
  reserve(key=crypto.randomUUID(),extra=[]){
   if(typeof key!=='string'||!key||key.length>200)throw new Error('Ogiltig reservationsnyckel.');
   const run=async()=>{
    const blob=await blobFor(name);
    for(let attempt=0;attempt<12;attempt++){
     const {state,etag,missing}=await load(blob);
     if(Object.hasOwn(state.reservations,key))return state.reservations[key];
     const orders=[...await readOrders(),...extra];
     const highest=Math.max(state.highestSequence,...orders.map(order=>sequence(order.orderNumber)),...Object.values(state.reservations).map(sequence));
     const next=highest+1;if(!Number.isSafeInteger(next))throw new Error('Ordernummerregistret är fullt.');
     const number=`00${String(now().getFullYear()).slice(-2)}${String(next).padStart(3,'0')}-00`;
     state.highestSequence=next;state.reservations[key]=number;
     const bytes=Buffer.from(JSON.stringify(state));
     if(blob){try{await blob.uploadData(bytes,{conditions:missing?{ifNoneMatch:'*'}:{ifMatch:etag},blobHTTPHeaders:{blobContentType:'application/json'}});return number;}
      catch(error){if([409,412].includes(error.statusCode))continue;throw error;}}
     await fs.mkdir(directory,{recursive:true});const temporary=file+'.'+crypto.randomUUID()+'.tmp';await fs.writeFile(temporary,bytes);await fs.rename(temporary,file);return number;
    }
    throw new Error('Ordernumret kunde inte reserveras. Försök igen.');
   };
   const pending=queue.then(run,run);queue=pending.catch(()=>{});return pending;
  }
 };
}
module.exports={createOrderNumbers};
