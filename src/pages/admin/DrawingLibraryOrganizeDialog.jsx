import {useId,useRef,useState} from 'react';
import useModalFocus from '../../hooks/useModalFocus';
import './DrawingLibraryOrganizeDialog.css';

export default function DrawingLibraryOrganizeDialog({mode,entry,folders,onClose,onSave,labels={}}) {
 const moving=mode==='move';
 const [value,setValue]=useState(moving?entry.folderId||'':entry.name);
 const [saving,setSaving]=useState(false),[error,setError]=useState('');
 const panel=useRef(null),submitting=useRef(false),titleId=useId();
 useModalFocus(true,panel,()=>{if(!submitting.current)onClose();});
 const options=folders.map(folder=>{
  const names=[folder.name],seen=new Set([folder.id]);let parent=folders.find(item=>item.id===folder.parentId);
  while(parent&&!seen.has(parent.id)){seen.add(parent.id);names.unshift(parent.name);const parentId=parent.parentId;parent=folders.find(item=>item.id===parentId);}
  return {id:folder.id,label:names.join(' / ')};
 }).sort((a,b)=>a.label.localeCompare(b.label,'sv'));
 const unchanged=moving?value===(entry.folderId||''):value.trim()===entry.name;
 async function save(event){
  event.preventDefault();if(submitting.current||unchanged||(!moving&&!value.trim()))return;
  submitting.current=true;setSaving(true);setError('');
  try{await onSave(moving?value:value.trim());}
  catch(error){setError(error.message||'Kunde inte spara ändringen.');}
  finally{submitting.current=false;setSaving(false);}
 }
 return <div className="jsf-sign-modal-backdrop drawing-organize-backdrop"><section ref={panel} className="jsf-sign-modal drawing-organize-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-busy={saving} style={{width:'min(520px,100%)'}}>
  <header className="jsf-sign-modal-header"><h2 id={titleId} style={{fontSize:21,fontWeight:400}}>{labels.title||(moving?'Flytta ritning':'Byt namn på mapp')}</h2><button type="button" aria-label="Stäng" disabled={saving} onClick={onClose}>×</button></header>
  <form onSubmit={save}>
   <div className="jsf-sign-modal-content" style={{display:'grid',gap:18}}>
    {error&&<p role="alert" style={{color:'#a33',margin:0}}>{error}</p>}
    {moving?<><p style={{margin:0,fontSize:14,overflowWrap:'anywhere'}}>{entry.name}</p><label style={labelStyle}>Flytta till<select value={value} onChange={event=>setValue(event.target.value)} disabled={saving} style={inputStyle}><option value="">{labels.root||'Ritningar – rotmappen'}</option>{options.map(folder=><option key={folder.id} value={folder.id}>{folder.label}</option>)}</select></label></>:<label style={labelStyle}>{labels.name||"Mappnamn"}<input autoComplete="off" required maxLength={120} value={value} onChange={event=>setValue(event.target.value)} disabled={saving} style={inputStyle}/></label>}
   </div>
   <footer className="jsf-sign-modal-footer"><button type="button" className="project-secondary" disabled={saving} onClick={onClose}>Avbryt</button><button type="submit" className="project-primary" disabled={saving||unchanged||(!moving&&!value.trim())}>{saving?'Sparar…':labels.submit||(moving?'Flytta ritning':'Spara namn')}</button></footer>
  </form>
 </section></div>;
}
const labelStyle={display:'grid',gap:7,fontSize:13};
const inputStyle={boxSizing:'border-box',width:'100%',border:'1px solid #ddd',borderRadius:6,padding:'10px 12px',background:'#fff',color:'#333',font:'inherit'};
