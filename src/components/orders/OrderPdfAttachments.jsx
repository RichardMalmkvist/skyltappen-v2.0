import {useRef,useState} from 'react';
import './OrderPdfAttachments.css';

export default function OrderPdfAttachments({files=[],onChange,onBusyChange,orderId,headers={}}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const locked=useRef(false),input=useRef(null);
 async function add(event){
  const selected=Array.from(event.target.files||[]);event.target.value='';
  if(!selected.length||locked.current)return;
  locked.current=true;setBusy(true);onBusyChange?.(true);setError('');
  try{
   if(files.length+selected.length>5)throw new Error('Bifoga högst 5 PDF-filer.');
   if(files.reduce((sum,f)=>sum+f.size,0)+selected.reduce((sum,f)=>sum+f.size,0)>20*1024*1024)throw new Error('Bilagorna får tillsammans vara högst 20 MB.');
   const added=[];
   for(const file of selected){
    if(!/\.pdf$/i.test(file.name)||!file.size||file.size>10*1024*1024)throw new Error('Välj en PDF-fil på högst 10 MB.');
    if(await file.slice(0,5).text()!=='%PDF-')throw new Error('Bilagan är inte en giltig PDF-fil.');
    const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve('data:application/pdf;base64,'+String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('Kunde inte läsa PDF-filen.'));reader.readAsDataURL(file);});
    added.push({id:globalThis.crypto?.randomUUID?.()||`${Date.now()}-${added.length}`,name:file.name,size:file.size,dataUrl});
   }
   onChange([...files,...added]);
  }catch(error){setError(error.message);}
  finally{locked.current=false;setBusy(false);onBusyChange?.(false);}
 }
 async function open(file,download){
  if(locked.current)return;
  const viewer=download?null:window.open('','_blank');if(viewer)viewer.opener=null;
  locked.current=true;setBusy(true);setError('');
  try{
   const response=await fetch(file.dataUrl||`/api/orders/${encodeURIComponent(orderId)}/attachments/${encodeURIComponent(file.id)}${download?'?download=1':''}`,{headers:file.dataUrl?{}:headers,cache:'no-store'});
   if(!response.ok){let data={};try{data=await response.json();}catch{}throw new Error(data.message||'Kunde inte hämta PDF-filen.');}
   const blob=await response.blob(),url=URL.createObjectURL(new Blob([blob],{type:'application/pdf'}));
   if(download){const link=document.createElement('a');link.href=url;link.download=file.name;link.click();}
   else if(viewer)viewer.location.href=url;
   else{URL.revokeObjectURL(url);throw new Error('Tillåt att webbläsaren öppnar PDF-filen i en ny flik, eller välj Ladda ner.');}
   window.setTimeout(()=>URL.revokeObjectURL(url),60000);
  }catch(error){viewer?.close();setError(error.message);}
  finally{locked.current=false;setBusy(false);}
 }
 if(!onChange&&!files.length)return null;
 return <section className="jsf-order-pdfs" aria-label="PDF-bilagor" aria-busy={busy}>
  <h3>PDF-bilagor</h3>
  {files.length>0&&<ul>{files.map(file=><li key={file.id}><span className="jsf-order-pdf-name">{file.name}<small>{file.size<1024*1024?`${Math.max(1,Math.round(file.size/1024))} kB`:`${(file.size/1024/1024).toLocaleString('sv-SE',{maximumFractionDigits:1})} MB`}</small></span><div className="jsf-order-pdf-actions"><button type="button" disabled={busy} onClick={()=>open(file,false)}>Öppna</button>{onChange?<button type="button" disabled={busy} aria-label={`Ta bort ${file.name}`} onClick={()=>onChange(files.filter(f=>f.id!==file.id))}>Ta bort</button>:<button type="button" disabled={busy} onClick={()=>open(file,true)}>Ladda ner</button>}</div></li>)}</ul>}
  {onChange&&<><input ref={input} type="file" accept="application/pdf,.pdf" multiple aria-label="Välj PDF-bilagor" onChange={add} disabled={busy} hidden/><button type="button" disabled={busy||files.length>=5} onClick={()=>input.current?.click()}>{busy?'Läser fil…':'Bifoga PDF'}</button><p className="jsf-order-pdf-limit">Högst 5 filer · 10 MB per fil · 20 MB totalt</p></>}
  {error&&<p role="alert" className="jsf-order-pdf-error">{error}</p>}
 </section>;
}
