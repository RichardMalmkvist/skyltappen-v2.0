import {useRef,useState} from 'react';
import {getCatalogAccessHeaders} from '../../data/catalogStore';
import './SignArtworkField.css';
const readData=file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Filen kunde inte läsas.'));reader.readAsDataURL(file);});
async function pdfPreview(file){
 const {openPdf}=await import('../../data/browserPdf');
 const task=openPdf(new Uint8Array(await file.arrayBuffer()));
 try{const pdf=await task.promise;if(pdf.numPages!==1)throw new Error('Välj en PDF med en sida per skylt.');const page=await pdf.getPage(1),base=page.getViewport({scale:1}),viewport=page.getViewport({scale:Math.min(2,1600/Math.max(base.width,base.height))}),canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);await page.render({canvasContext:canvas.getContext('2d'),viewport,background:'white'}).promise;return canvas.toDataURL('image/png');}finally{await task.destroy();}
}
export default function SignArtworkField({value,onChange,credential,validate,onBusyChange}){
 const input=useRef(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[over,setOver]=useState(false);
 async function upload(file){
  if(!file||busy)return;setBusy(true);onBusyChange?.(true);setError('');
  try{
   const pdf=/\.pdf$/i.test(file.name),svg=/\.svg$/i.test(file.name);if(!pdf&&!svg)throw new Error('Exportera filen som SVG eller PDF från Corel.');if(file.size>5*1024*1024)throw new Error('Välj en fil på högst 5 MB.');
   const dataUrl=await readData(new Blob([file],{type:pdf?'application/pdf':'image/svg+xml'})),preview=pdf?await pdfPreview(file):undefined;
   const response=await fetch('/api/sign-artworks',{method:'POST',headers:{'Content-Type':'application/json',...(credential?{'x-admin-password':credential}:getCatalogAccessHeaders())},body:JSON.stringify({name:file.name,dataUrl,preview})});
   const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.message||(response.status===404?'Starta om servern för att aktivera uppladdningen.':'Kunde inte ladda upp originalet.'));
   const issue=validate?.(data.artwork);if(issue)throw new Error(issue);onChange(data.artwork);
  }catch(problem){setError(problem.message);}finally{setBusy(false);onBusyChange?.(false);}
 }
 return <section className="jsf-sign-artwork" data-drag-over={over||undefined} aria-label="Eget original" onDragOver={event=>{event.preventDefault();setOver(true);}} onDragLeave={()=>setOver(false)} onDrop={event=>{event.preventDefault();setOver(false);upload(event.dataTransfer.files?.[0]);}}>
  <input ref={input} type="file" hidden accept=".svg,.pdf,image/svg+xml,application/pdf" aria-label="Ladda upp eget original" disabled={busy} onChange={event=>{upload(event.target.files?.[0]);event.target.value='';}}/>
  <div><span>{value?value.name:'Eget original från Corel'}</span><small>{value?`${value.widthMm} × ${value.heightMm} mm`:'Dra in SVG eller PDF, eller välj en fil'}</small></div>
  <button type="button" disabled={busy} onClick={()=>input.current?.click()}>{busy?'Laddar upp…':value?'Byt fil':'Välj fil'}</button>
  {value&&<button type="button" disabled={busy} onClick={()=>onChange(null)}>Ta bort</button>}
  {error&&<p role="alert">{error}</p>}
 </section>;
}
