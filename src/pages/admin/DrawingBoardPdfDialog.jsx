import {useId,useRef,useState} from 'react';
import useModalFocus from '../../hooks/useModalFocus';
import './DrawingLibraryOrganizeDialog.css';

export default function DrawingBoardPdfDialog({draft,location="",adminPassword,onClose}){
 const elevator=draft.type==='elevator';
 const [quantity,setQuantity]=useState('1');
 const [floors,setFloors]=useState(String(draft.floorCopies??1)),[cabins,setCabins]=useState(String(draft.cabinCopies??0));
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const panel=useRef(null),submitting=useRef(false),titleId=useId();
 useModalFocus(true,panel,()=>{if(!submitting.current)onClose();});
 const planCount=draft.board.floors?.length||0;
 const perFloor=planCount&&Number(floors)%planCount===0?Number(floors)/planCount:"";
 const total=elevator?Number(floors)+Number(cabins):Number(quantity);
 const valid=(elevator?[floors,cabins]:[quantity]).every(v=>v!==''&&Number.isSafeInteger(Number(v))&&Number(v)>=0)&&total>=1&&total<=1000;
 async function download(event){
  event.preventDefault();if(submitting.current||!valid)return;
  submitting.current=true;setBusy(true);setError('');
  try{
   const response=await fetch('/api/drawing-library/export-pdf',{method:'POST',headers:{'Content-Type':'application/json','x-admin-password':adminPassword},body:JSON.stringify({type:draft.type,name:draft.name,location,articleNumber:draft.type==='elevator'?(draft.printArticleNumber||draft.articleNumber||''):(draft.articleNumber||''),board:draft.board,...(elevator?{floorCopies:Number(floors),cabinCopies:Number(cabins)}:{quantity:Number(quantity)})})});
   if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.message||'Kunde inte skapa PDF-filen.');}
   const blob=await response.blob();
   if(!blob.size||!String(response.headers.get('Content-Type')).includes('application/pdf'))throw new Error('Servern skickade ingen PDF. Starta om servern och försök igen.');
   const url=URL.createObjectURL(blob),link=document.createElement('a');
   link.href=url;link.download=`${(draft.name||'Tavla').replace(/[^\p{L}\p{N}_-]+/gu,'-')}-${total}st.pdf`;
   document.body.appendChild(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);onClose();
  }catch(failure){setError(failure.message);}
  finally{submitting.current=false;setBusy(false);}
 }
 const width=Number(draft.board.widthMm),height=Number(draft.board.heightMm);
 return <div className="jsf-sign-modal-backdrop drawing-organize-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget&&!busy)onClose();}}>
  <section ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="jsf-sign-modal drawing-organize-dialog" style={{width:"min(520px,100%)"}}>
   <header className="jsf-sign-modal-header"><h2 id={titleId}>Hämta PDF</h2><button type="button" aria-label="Stäng" disabled={busy} onClick={onClose}>×</button></header>
   <form onSubmit={download}>
    <div className="jsf-sign-modal-content" style={{display:'grid',gap:18}}>
     {location&&<p style={{margin:0,color:"#777",fontSize:12}}>{location}</p>}
     <p style={{margin:0}}>{draft.name} · {width} × {height} mm · Skala 1:1</p>
     {error&&<p role="alert" style={{margin:0,color:'#a33'}}>{error}</p>}
     {elevator?<>
      {planCount>0&&<label style={labelStyle}>Exemplar per våningsplan<input type="number" min="0" max="1000" step="1" placeholder="Ojämnt fördelat" value={perFloor} onChange={event=>setFloors(String(Number(event.target.value)*planCount))} disabled={busy} style={inputStyle}/></label>}
      <label style={labelStyle}>Våningsplansexemplar<input autoFocus type="number" required min="0" max="1000" step="1" value={floors} onChange={e=>setFloors(e.target.value)} disabled={busy} style={inputStyle}/></label>
      <label style={labelStyle}>Hisskorgsexemplar<input type="number" required min="0" max="1000" step="1" value={cabins} onChange={e=>setCabins(e.target.value)} disabled={busy} style={inputStyle}/></label>
      <p style={{margin:0,color:'#777',fontSize:12}}>Varje våningsplansexemplar får en blå markering vid sitt plan. Hisskorgsexemplaren saknar planmarkering.</p>
     </>:<label style={labelStyle}>Antal exemplar<input autoFocus type="number" required min="1" max="1000" step="1" value={quantity} onChange={e=>setQuantity(e.target.value)} disabled={busy} style={inputStyle}/></label>}
     <p style={{margin:0,color:'#777',fontSize:12}}>{valid?`${total} sidor · En sida per exemplar`: 'Välj 1–1000 exemplar totalt.'}</p>
    </div>
    <footer className="jsf-sign-modal-footer"><button type="button" className="project-secondary" onClick={onClose} disabled={busy}>Avbryt</button><button type="submit" className="project-primary" disabled={busy||!valid}>{busy?'Skapar PDF …':'Hämta PDF'}</button></footer>
   </form>
  </section>
 </div>;
}
const labelStyle={display:'grid',gap:7,fontSize:13};
const inputStyle={boxSizing:'border-box',width:'100%',border:'1px solid #ddd',borderRadius:6,padding:'10px 12px',background:'#fff',color:'#333',font:'inherit'};
