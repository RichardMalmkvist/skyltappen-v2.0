import {resolveOutdoorArticle} from '../../data/outdoorBusinessSigns';
import {decalArticleNumber} from '../../data/customDecalArticles';
import {getSalesUnit} from "../../data/salesUnits";
import {useRef,useState} from 'react';
import ProjectSignThumbnail from '../../components/projects/ProjectSignThumbnail';
import OrderDeleteDialog from '../../components/orders/OrderDeleteDialog';
import SignDetails,{Original} from './ProjectSignDetails';
import {projectSigns,projectSignDisplayText} from '../../data/projectSigns';
import ProjectDrawingPlanner from './ProjectDrawingPlanner';
import './ProjectSignList.css';

const money=n=>Number(n||0).toLocaleString('sv-SE',{style:'currency',currency:'SEK'});

export default function ProjectSignList({project,catalog,headers,readOnly,onSaved,onDrawing}) {
  const signs=projectSigns(project),[edit,setEdit]=useState(null),[configure,setConfigure]=useState(null),[deleteTarget,setDeleteTarget]=useState(null),[deleteError,setDeleteError]=useState(''),[search,setSearch]=useState(''),[busy,setBusy]=useState(false),deleting=useRef(false);
  const [copyError,setCopyError]=useState(''),copying=useRef(false);
  const articleFor=sign=>resolveOutdoorArticle((catalog.articles||[]).find(article=>String(article.id)===String(sign.articleId)),sign.configuration?.dibondSign,catalog.articles||[]);
  const nameFor=sign=>sign.name||articleFor(sign)?.name||sign.articleId||'Specialskylt';
  const filtered=signs.filter(sign=>[sign.position,nameFor(sign),sign.text,sign.description,sign.material,sign.drawingName,articleFor(sign)?.articleNumber].join(' ').toLocaleLowerCase('sv-SE').includes(search.toLocaleLowerCase('sv-SE')));
  async function duplicate(sign){
    if(readOnly||copying.current||busy)return;
    copying.current=true;setBusy(true);setCopyError('');
    try{
      const response=await fetch(`/api/projects/${encodeURIComponent(project.id)}/signs/${encodeURIComponent(sign.key)}/duplicate`,{method:'POST',headers});
      const data=await response.json();if(!response.ok)throw new Error(data.message||'Kunde inte duplicera skylten.');
      const copy={...data.sign,key:data.sign.id,drawingId:null};
      await onSaved();
      if(copy.kind==='svg')setEdit(copy);else setConfigure(copy);
    }catch(error){setCopyError(error.message);}finally{copying.current=false;setBusy(false);}
  }
  async function remove(sign){
    if(deleting.current||!sign)return;
    deleting.current=true;setBusy(true);setDeleteError('');
    try{const response=await fetch(`/api/projects/${encodeURIComponent(project.id)}/signs/${encodeURIComponent(sign.key)}`,{method:'DELETE',headers});const data=await response.json();if(!response.ok)throw new Error(data.message||'Kunde inte ta bort skylten.');await onSaved();setDeleteTarget(null);}catch(error){setDeleteError(error.message);}finally{deleting.current=false;setBusy(false);}
  }
  return <section className="project-panel project-unified-signs" aria-label="Gemensam skyltlista">
    <div className="project-detail-heading"><h2>Gemensam skyltlista <span className="project-counter">{signs.length}</span></h2>{!readOnly&&<div className="project-sign-actions"><button className="project-secondary" type="button" onClick={()=>setEdit({new:true})}>Importera skylt</button><button className="project-primary" type="button" onClick={()=>setConfigure({new:true})}>+ Lägg till artikel</button></div>}</div>
    <input type="search" aria-label="Sök skyltar i projektet" placeholder="Sök skylt, text, material eller ritning" value={search} onChange={e=>setSearch(e.target.value)}/>
    {copyError&&<p role="alert" className="project-error">{copyError}</p>}
    <div className="project-unified-list" role="region" aria-label="Skyltlista" tabIndex={0}>{filtered.map(sign=><article key={sign.key} className="project-unified-row">
      <div className="project-sign-thumb">{sign.kind==='svg'?<Original project={project} sign={sign} headers={headers}/>:<ProjectSignThumbnail product={articleFor(sign)} sign={sign}/>}</div>
      <div className="project-sign-description"><small>{sign.position} · {sign.kind==='svg'?'Eget original':`Art. ${decalArticleNumber(articleFor(sign)||{},sign.configuration||{})||'–'}`}</small><h3>{nameFor(sign)}</h3>{projectSignDisplayText(sign)&&<p title={projectSignDisplayText(sign)}>{projectSignDisplayText(sign)}</p>}{sign.description&&<p title={sign.description}>{sign.description}</p>}<small>{[sign.kind==='svg'?`${sign.widthMm} × ${sign.heightMm} mm`:sign.configuration?.dibondSign?`${sign.configuration.dibondSign.widthMm} \u00d7 ${sign.configuration.dibondSign.heightMm} mm`:articleFor(sign)?.format,sign.material,sign.drawingName||'Utan ritning'].filter(Boolean).join(' · ')}</small></div>
      <div className="project-sign-amount"><strong>{sign.quantity||1} {getSalesUnit(articleFor(sign)||{})}</strong>{(sign.price!==undefined||articleFor(sign)?.price!==undefined)&&<small>{money(sign.price??articleFor(sign)?.price)} / {getSalesUnit(articleFor(sign)||{})}</small>}</div>
      <div className="project-sign-row-actions"><button type="button" className="project-secondary" onClick={()=>setEdit(sign)}>{readOnly?'Visa uppgifter':'Uppgifter'}</button>{sign.kind!=='svg'&&<button type="button" className="project-secondary" onClick={()=>setConfigure(sign)}>{readOnly?'Visa skylt':'Anpassa'}</button>}{!readOnly&&!sign.drawingId&&<button type="button" className="project-secondary" disabled={busy} onClick={()=>duplicate(sign)}>Duplicera</button>}{sign.drawingId&&<button type="button" className="project-secondary" onClick={()=>onDrawing(sign.drawingId)}>Visa ritning</button>}{!readOnly&&<button type="button" className="project-secondary" disabled={busy} onClick={()=>{setDeleteError('');setDeleteTarget(sign);}}>Ta bort</button>}</div>
    </article>)}</div>
    {!filtered.length&&<p>{search?'Inga skyltar matchar sökningen.':'Inga skyltar tillagda ännu.'}</p>}
    {deleteTarget&&<OrderDeleteDialog entityLabel="skylt" contextLabel="SKYLT" reference={deleteTarget.position} busy={busy} error={deleteError} onClose={()=>{if(!deleting.current)setDeleteTarget(null);}} onConfirm={()=>remove(deleteTarget)} description={<>Vill du ta bort <strong>{deleteTarget.position} – {nameFor(deleteTarget)}</strong>? {deleteTarget.drawingId?'Skylten och dess markering på ritningen tas bort.':'Skylten tas bort från projektets skyltlista.'} Redan sparade korrekturversioner finns kvar.</>}/>}
    {edit&&<SignDetails key={edit.key||'new'} project={project} sign={edit.new?null:edit} article={articleFor(edit)} headers={headers} readOnly={readOnly} onClose={()=>setEdit(null)} onSaved={onSaved}/>}
    {configure&&<ProjectDrawingPlanner key={configure.key||'new'} signOnly initialSign={configure.new?null:configure} project={project} drawing={{id:'standalone',markers:configure.new?[]:[configure]}} catalog={catalog} headers={headers} readOnly={readOnly} onClose={()=>setConfigure(null)} onSaved={onSaved}/>}
  </section>;
}
