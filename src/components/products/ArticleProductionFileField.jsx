import {useState} from 'react';

export default function ArticleProductionFileField({value,onChange,credential,onBusyChange}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[hasCut,setHasCut]=useState(value?.cutColor!=null||!value),[cutColor,setCutColor]=useState(value?.cutColor||'#ec2a90');
 const setWorking=working=>{setBusy(working);onBusyChange?.(working);};
 async function upload(file){
  if(!file)return;
  setWorking(true);setMessage('');
  try{
   if(!/\.svg$/i.test(file.name)&&file.type!=='image/svg+xml')throw new Error('Välj SVG-originalet som du exporterat från Corel.');
   if(file.size>5*1024*1024)throw new Error('Produktionsoriginalet får vara högst 5 MB.');
   const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Kunde inte läsa produktionsoriginalet.'));reader.readAsDataURL(new Blob([file],{type:'image/svg+xml'}));});
   const response=await fetch('/api/admin/article-production-files',{method:'POST',headers:{'Content-Type':'application/json','x-admin-password':credential||''},body:JSON.stringify({name:file.name,dataUrl,cutColor:hasCut?cutColor:null})});
   const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.message||(response.status===404?'Starta om servern efter att uppdateringen lagts in.':'Kunde inte ladda upp produktionsoriginalet.'));
   onChange(data.file);setMessage('Originalet är uppladdat. Spara artikeln för att koppla det till artikeln.');
  }catch(error){setMessage(error.message);}finally{setWorking(false);}
 }
 async function download(format='svg'){
  setWorking(true);setMessage('');
  try{const response=await fetch('/api/article-production-files/'+encodeURIComponent(value.id)+(format==='pdf'?'/pdf':''),{headers:{'x-admin-password':credential||''}});if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.message||'Kunde inte hämta produktionsoriginalet.');}if(format==='pdf'&&!response.headers.get('Content-Type')?.includes('application/pdf'))throw new Error('Starta om servern för att kunna hämta originalet som PDF.');const url=URL.createObjectURL(await response.blob()),link=document.createElement('a');link.href=url;link.download=format==='pdf'?(value.name||'Produktionsoriginal').replace(/\.svg$/i,'')+'.pdf':value.name||'Produktionsoriginal.svg';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
  catch(error){setMessage(error.message);}finally{setWorking(false);}
 }
 return <section className="wide field-box" aria-label="Produktionsoriginal" style={{display:'grid',gap:10}}>
  <b style={{fontSize:12}}>Produktionsoriginal för fast motiv</b>
  <p style={{margin:0,fontSize:11,color:'#626a66'}}>Ladda upp en SVG från Corel med rätt mått, färdigt motiv och eventuell skärlinje. Omvandla texten till kurvor före export.</p>
  {value?<div style={{padding:10,background:'#f2f7f4',borderRadius:8,fontSize:11}}><b>{value.name}</b><div>{Number(value.widthMm).toLocaleString('sv-SE')} × {Number(value.heightMm).toLocaleString('sv-SE')} mm · {value.cutColor?'Tryck och skärlinje':'Tryckoriginal'}</div><div style={{display:'flex',gap:8,marginTop:8}}><button type="button" disabled={busy} onClick={()=>download()}>Hämta original</button><button type="button" disabled={busy} onClick={()=>download('pdf')}>Hämta PDF</button><button type="button" disabled={busy} onClick={()=>{onChange(null);setMessage('Spara artikeln för att ta bort kopplingen.');}}>Ta bort koppling</button></div></div>:<p style={{margin:0,fontSize:11}}>Inget produktionsoriginal kopplat.</p>}
  <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
   <label style={{display:'flex',gap:6,alignItems:'center',fontSize:11}}><input type="checkbox" checked={hasCut} disabled={busy} onChange={e=>setHasCut(e.target.checked)}/>Originalet som laddas upp har skärlinje</label>
   {hasCut&&<label style={{display:'flex',gap:6,alignItems:'center',fontSize:11}}>Skärlinjens färg<input type="color" aria-label="Skärlinjens färg" value={cutColor} disabled={busy} onChange={e=>setCutColor(e.target.value)}/></label>}
  </div>
  <label className="upload-button" style={{justifySelf:'start',opacity:busy ? 0.6 : 1}}>{busy?'Arbetar…':value?'Byt produktionsoriginal':'Ladda upp produktionsoriginal'}<input type="file" aria-label="Ladda upp produktionsoriginal" accept=".svg,image/svg+xml" disabled={busy} onChange={e=>{upload(e.target.files?.[0]);e.target.value='';}}/></label>
  {message&&<p role="status" style={{margin:0,fontSize:11}}>{message}</p>}
 </section>;
}
