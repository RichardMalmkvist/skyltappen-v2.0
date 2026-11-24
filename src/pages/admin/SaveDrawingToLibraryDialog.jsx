import {useEffect,useId,useRef,useState} from 'react';
import useModalFocus from '../../hooks/useModalFocus';

function folderOptions(folders) {
 const byId=new Map(folders.map(folder=>[folder.id,folder]));
 return folders.map(folder=>{
  const names=[folder.name],seen=new Set([folder.id]);let parent=byId.get(folder.parentId);
  while(parent&&!seen.has(parent.id)){seen.add(parent.id);names.unshift(parent.name);parent=byId.get(parent.parentId);}
  return {id:folder.id,label:names.join(' / ')};
 }).sort((a,b)=>a.label.localeCompare(b.label,'sv'));
}

export default function SaveDrawingToLibraryDialog({projectId,drawing,headers,onClose,onSaved}) {
 const [name,setName]=useState(drawing.name||'');
 const [folderId,setFolderId]=useState('');
 const [folders,setFolders]=useState([]),[loaded,setLoaded]=useState(false);
 const [saving,setSaving]=useState(false),[error,setError]=useState('');
 const panel=useRef(null),titleId=useId();
 const importId=useRef(globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`);
 const alive=useRef(true);
 const credential=headers?.['x-admin-password']||'';
 useModalFocus(true,panel,()=>{if(!saving)onClose();});
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{
  const controller=new AbortController();
  fetch('/api/drawing-library',{headers:{'x-admin-password':credential},cache:'no-store',signal:controller.signal})
   .then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.message||'Kunde inte hämta mapparna.');return data;})
   .then(data=>{if(!controller.signal.aborted){setFolders(folderOptions(data.folders||[]));setLoaded(true);}})
   .catch(error=>{if(error.name!=='AbortError'&&!controller.signal.aborted)setError(error.message);});
  return()=>controller.abort();
 },[credential]);
 async function save(event) {
  event.preventDefault();if(saving||!loaded||!name.trim())return;
  setSaving(true);setError('');
  try {
   const response=await fetch('/api/drawing-library/import-project',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({projectId,drawingId:drawing.id,name:name.trim(),folderId:folderId||null,importId:importId.current})});
   const data=await response.json();if(!response.ok)throw new Error(data.message||'Kunde inte spara ritningen.');
   if(alive.current)onSaved(data.item);
  }catch(error){if(alive.current)setError(error.message);}
  finally{if(alive.current)setSaving(false);}
 }
 return <div className="jsf-sign-modal-backdrop"><section ref={panel} className="jsf-sign-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-busy={saving} style={{width:'min(520px,100%)'}}>
  <header className="jsf-sign-modal-header"><h2 id={titleId} style={{fontSize:21,fontWeight:400}}>Spara i Ritningar</h2><button type="button" aria-label="Stäng" disabled={saving} onClick={onClose}>×</button></header>
  <form onSubmit={save}>
   <div className="jsf-sign-modal-content" style={{display:'grid',gap:18}}>
    {error&&<p role="alert" style={{color:'#a33',margin:0}}>{error}</p>}
    <label style={{display:'grid',gap:7,fontSize:13}}>Ritningens namn<input autoComplete="off" required maxLength={120} value={name} onChange={event=>setName(event.target.value)} disabled={saving} style={inputStyle}/></label>
    <label style={{display:'grid',gap:7,fontSize:13}}>Mapp<select aria-label="Mapp i Ritningar" value={folderId} onChange={event=>setFolderId(event.target.value)} disabled={saving||!loaded} style={inputStyle}><option value="">Ritningar – rotmappen</option>{folders.map(folder=><option key={folder.id} value={folder.id}>{folder.label}</option>)}</select></label>
    <small style={{color:'#777'}}>{drawing.markers?.length||0} skyltar</small>
   </div>
   <footer className="jsf-sign-modal-footer"><button type="button" className="project-secondary" disabled={saving} onClick={onClose}>Avbryt</button><button type="submit" className="project-primary" disabled={saving||!loaded||!name.trim()}>{saving?'Sparar…':'Spara kopia'}</button></footer>
  </form>
 </section></div>;
}
const inputStyle={boxSizing:'border-box',width:'100%',border:'1px solid #ddd',borderRadius:6,padding:'10px 12px',background:'#fff',color:'#333',font:'inherit'};
