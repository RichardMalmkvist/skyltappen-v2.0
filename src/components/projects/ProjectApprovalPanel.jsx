import {WorkspaceStatus,WorkspaceFeedback,WorkspaceSkeleton,BusyLabel} from '../workspace/WorkspaceUI';
import {projectSigns,projectSignDisplayText} from '../../data/projectSigns';
import {useCallback,useEffect,useRef,useState} from 'react';
import ProjectProofModal from './ProjectProofModal';
import OrderAcknowledgementModal from '../orders/OrderAcknowledgementModal';
import {getDoorSignSymbolById} from '../../data/doorSignSymbols';
import {getHangingSignSymbolAssets} from '../../data/hangingSignSymbols';
import './ProjectApprovalPanel.css';
const status=proof=>({draft:'Utkast',pending:'Väntar på godkännande',approved:'Godkänt',changes_requested:'Ändringar begärda – inte godkänt',superseded:'Ersatt av senare version'}[proof.status]||proof.status);
const when=value=>value?new Date(value).toLocaleString('sv-SE',{dateStyle:'short',timeStyle:'short'}):'';

async function frozenSymbols(project,headers){
 const assets=[];
 async function inline(image){
  if(/^data:image\//.test(image))return image;
  if(!String(image).startsWith('/'))throw new Error('En symbolbild kunde inte sparas med korrekturet. Ladda upp symbolen igen.');
  const response=await fetch(image,{headers});if(!response.ok)throw new Error('Kunde inte läsa symbolbilden till korrekturet.');
  const blob=await response.blob();return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Kunde inte läsa symbolbilden.'));reader.readAsDataURL(blob);});
 }
 for(const drawing of [...(project.drawings||[]),{id:'__standalone__',markers:project.signs||[]}])for(const marker of drawing.markers||[]){
  const form=marker.configuration||{};
  if(form.doorUseSymbol&&form.doorSymbol){const image=form.doorSymbolImage||getDoorSignSymbolById(form.doorSymbol)?.image;if(!image)throw new Error(`Symbolbilden för ${marker.position} saknas. Kontrollera symbolbiblioteket.`);assets.push({drawingId:drawing.id,markerId:marker.id,image:await inline(image)});}
  const saved=form.hangingSignSymbolAssets||[];
  for(const asset of [...saved,...getHangingSignSymbolAssets(form).filter(asset=>!saved.some(old=>old.id===asset.id))]){assets.push({drawingId:drawing.id,markerId:marker.id,kind:'hanging',symbolId:asset.id,name:asset.name,symbolKind:asset.kind,image:await inline(asset.image)});}
 }
 return assets;
}

export default function ProjectApprovalPanel({project,adminPassword,role,initialProofId,openRequest,catalog={articles:[]}}){
 const [proofs,setProofs]=useState([]),[version,setVersion]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[document,setDocument]=useState(null),[quote,setQuote]=useState(null),[viewed,setViewed]=useState(null),[confirmed,setConfirmed]=useState(false);
 const [originals,setOriginals]=useState(null);
 const [initialLoading,setInitialLoading]=useState(true);
 const working=useRef(false);
 const [activeProofId,setActiveProofId]=useState(initialProofId||null),[baseId,setBaseId]=useState(null),[selectedKeys,setSelectedKeys]=useState(null);
 const [comment,setComment]=useState('');
 const commentRequest=useRef(null);
 const admin=role==='admin';
 const api=useCallback(async(url,method='GET',body)=>{
  const response=await fetch(url,{method,headers:{'x-admin-password':adminPassword,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store'});
  const data=await response.json();if(!response.ok)throw new Error(data.message||'Kunde inte hämta projektkorrekturet.');return data;
 },[adminPassword]);
 const load=useCallback(async()=>{const data=await api('/api/project-proofs'+(admin?'?includeDrafts=1':''));const list=(data.proofs||[]).filter(proof=>proof.projectId===project.id).sort((a,b)=>String(b.sentAt).localeCompare(String(a.sentAt)));setProofs(list);return list;},[api,project.id,admin]);
 useEffect(()=>{
  let active=true;setInitialLoading(true);
  api('/api/project-proofs'+(admin?'?includeDrafts=1':'')).then(data=>{if(active)setProofs(previous=>{const list=(data.proofs||[]).filter(proof=>proof.projectId===project.id).sort((a,b)=>String(b.sentAt).localeCompare(String(a.sentAt)));return !list.length&&!previous.length?previous:list;})}).catch(error=>{if(active)setError(error.message)}).finally(()=>{if(active)setInitialLoading(false)});
  const timer=setInterval(()=>{if(active)load().catch(()=>{});},20000);
  return()=>{active=false;clearInterval(timer);};
 },[api,load,project.id,admin]);
 useEffect(()=>{if(initialProofId)setActiveProofId(initialProofId);},[initialProofId,openRequest]);
 const current=proofs.find(proof=>proof.id===activeProofId)||proofs.find(proof=>proof.current)||proofs[0];
 const signs=projectSigns(project),availableKeys=signs.map(sign=>sign.key);
 const base=baseId==='new'?null:proofs.find(proof=>proof.id===baseId)||current;
 const chosenKeys=(selectedKeys??base?.selectedSignKeys??availableKeys).filter(key=>availableKeys.includes(key));
 const related=base?proofs.filter(proof=>(proof.seriesId||'legacy:'+proof.projectId)===(base.seriesId||'legacy:'+base.projectId)):[];
 const highest=related.sort((a,b)=>String(b.version).localeCompare(String(a.version),'sv',{numeric:true}))[0];
 useEffect(()=>{setOriginals(null);setComment('');commentRequest.current=null;},[current?.id,role]);
 const previousVersion=highest?.version;
 const nextVersion=previousVersion?(previousVersion.includes('.')?`${Number(previousVersion.split('.')[0])}.${Number(previousVersion.split('.')[1])+1}`:`${Number(previousVersion)}.2`):'1.1';
 async function act(action){
  if(working.current)return;working.current=true;setBusy(true);setError('');setNotice('');
  try{await action();}catch(error){setError(error.message);}finally{working.current=false;setBusy(false);}
 }
 async function prepare(){await act(async()=>{
  const chosen=new Set(chosenKeys),selectedProject={...project,signs:(project.signs||[]).filter(sign=>chosen.has(sign.id)),drawings:(project.drawings||[]).map(drawing=>({...drawing,markers:(drawing.markers||[]).filter(marker=>chosen.has(`drawing:${drawing.id}:${marker.id}`))})).filter(drawing=>drawing.markers.length)};
  const symbols=await frozenSymbols(selectedProject,{'x-admin-password':adminPassword});
  const data=await api(`/api/projects/${encodeURIComponent(project.id)}/proofs/prepare`,'POST',{newProof:!base,baseProofId:base?.id,selectedSignKeys:chosenKeys,version:version.trim()||nextVersion,expectedUpdatedAt:project.updatedAt||null,symbolAssets:symbols});
  const saved=await api(`/api/project-proofs/${data.proof.id}`);setActiveProofId(data.proof.id);setDocument(saved);
 });}
 async function send({showPrices}){
  await api(`/api/project-proofs/${document.proof.id}/send`,'POST',{showPrices});
  setActiveProofId(document.proof.id);setBaseId(null);setSelectedKeys(null);setDocument(null);setVersion('');setNotice(`Korrektur ${document.proof.proofNumber||''} version ${document.proof.version} har skickats till ${document.proof.recipientEmail}. Notisen visas när beställaren loggar in med ett godkänt konto.`);await load();
 }
 async function open(proof,kind){await act(async()=>{
  const data=await api(`/api/project-proofs/${proof.id}`);
  if(kind==='quote')setQuote(data.snapshot.quote);else{setDocument(data);setViewed(null);setConfirmed(false);}
 });}
 async function openOriginals(proof){await act(async()=>{const data=await api(`/api/project-proofs/${proof.id}/files`);setOriginals({proof,files:data.files||[]});});}
 async function downloadOriginal(file){await act(async()=>{
  const response=await fetch(`/api/project-proofs/${originals.proof.id}/files/${encodeURIComponent(file.signKey)}/${file.kind}`,{headers:{'x-admin-password':adminPassword}});if(!response.ok)throw new Error('Kunde inte hämta originalfilen.');
  const url=URL.createObjectURL(await response.blob()),link=globalThis.document.createElement('a');link.href=url;link.download=file.name;globalThis.document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });}
 async function approve(){if(!current||!confirmed||viewed!==current.id)return;await act(async()=>{
  if(comment.trim()){
   commentRequest.current=commentRequest.current||`feedback-${Date.now()}-${Math.random().toString(36).slice(2)}`;
   await api(`/api/project-proofs/${current.id}/comments`,'POST',{version:current.version,comment:comment.trim(),requestId:commentRequest.current});
   setComment('');commentRequest.current=null;
  }
  await api(`/api/project-proofs/${current.id}/approve`,'POST',{version:current.version,confirmed:true});
  setConfirmed(false);setNotice(`Korrektur version ${current.version} är godkänt. En notis har skickats till avsändaren.`);await load();
 });}
 async function feedback(requestChanges){
  if(!current||!comment.trim()){setError('Skriv vad du vill ändra eller kommentera först.');return;}
  await act(async()=>{
   commentRequest.current=commentRequest.current||`feedback-${Date.now()}-${Math.random().toString(36).slice(2)}`;
   await api(`/api/project-proofs/${current.id}/${requestChanges?'request-changes':'comments'}`,'POST',{version:current.version,comment:comment.trim(),requestId:commentRequest.current});
   setComment('');commentRequest.current=null;setConfirmed(false);
   setNotice(requestChanges?'Dina ändringsönskemål har skickats. Korrekturet är inte godkänt. Avsändaren får en notis och kan skicka en ny version.':'Kommentaren har skickats. Avsändaren får en notis.');await load();
  });
 }
 async function signFeedback(payload){
  if(!document?.proof?.id)throw new Error('Öppna korrekturet igen.');
  const data=await api(`/api/project-proofs/${document.proof.id}/comments`,'POST',{...payload,version:document.proof.version});
  setDocument(previous=>previous?{...previous,proof:data.proof}:previous);setConfirmed(false);await load();return data.proof;
 }
 const previous=proofs.filter(proof=>proof.id!==current?.id&&current&&(proof.seriesId||'legacy:'+proof.projectId)===(current.seriesId||'legacy:'+current.projectId));
 if(initialLoading)return <section className="project-panel project-approval-panel"><h2>Korrektur och godkännande</h2><WorkspaceSkeleton kind="proofs" label="Hämtar korrektur"/></section>;
 return <section className="project-panel project-approval-panel" aria-label="Korrektur och godkännande">
  <h2>Korrektur och godkännande</h2>
  {proofs.length>1&&<label className="project-proof-selector">Välj korrektur och version<select aria-label="Välj korrektur och version" value={current?.id||''} onChange={event=>{setActiveProofId(event.target.value);setBaseId(null);setSelectedKeys(null);setVersion('');setViewed(null);setConfirmed(false);}}>{proofs.map(proof=><option key={proof.id} value={proof.id}>{proof.proofNumber||project.number} · Version {proof.version} · {status(proof)}</option>)}</select></label>}
  {error&&<WorkspaceFeedback error>{error}</WorkspaceFeedback>}
  {notice&&<WorkspaceFeedback onDismiss={()=>setNotice("")}>{notice}</WorkspaceFeedback>}
  {current?<article className="project-approval-current">
   <header className="project-approval-heading"><h3>{current.proofNumber?`${current.proofNumber} · Version ${current.version}`:`Korrektur ${current.version}`}</h3><WorkspaceStatus status={current.status} label={status(current)}/></header>
   <p className="project-approval-meta">{current.status==='draft'?'Skapat':'Skickat'} {when(current.sentAt||current.createdAt)} till {current.recipientName}{admin&&current.recipientEmail?` · ${current.recipientEmail}`:''}</p>
   {current.approvedAt&&<p>Godkänt av {current.approvedBy?.name} {when(current.approvedAt)}</p>}
   <p>Granska skyltarnas text, utseende och placering.</p>
   <div className="project-approval-buttons"><button className="project-secondary project-approval-open" disabled={busy} onClick={()=>open(current,'proof')}>Visa korrektur {current.version}</button><button className="project-secondary" disabled={busy} onClick={()=>open(current,'quote')}>Visa offert</button>{role!=='bestallare'&&<button type="button" className="project-secondary" disabled={busy} onClick={()=>openOriginals(current)}>Originalfiler</button>}</div>
   {project.updatedAt&&current.sourceUpdatedAt!==project.updatedAt&&<p className="project-approval-revision">Projektet har ändrats. Korrekturet och godkännandet gäller den sparade versionen {current.version}.</p>}
   {current.status==='changes_requested'&&<p className="project-proof-changes-status">Denna version är inte godkänd. Ett nytt korrektur behöver skickas efter justeringarna.</p>}
  </article>:<p>Inget korrektur har skickats till {admin?'beställaren':'dig'} för detta projekt ännu.</p>}
  {originals&&<section className="project-proof-originals"><h3>Originalfiler · {originals.proof.proofNumber||project.number} · Version {originals.proof.version}</h3>{originals.files.length?originals.files.map(file=><div key={file.signKey+'-'+file.kind}><span>{file.position} · {file.kind==='production'?'Produktion':'Korrekturbild'} · {file.name}</span><button type="button" className="project-secondary" disabled={busy} onClick={()=>downloadOriginal(file)}>Hämta fil</button></div>):<p>Inga uppladdade originalfiler i denna version.</p>}</section>}
  {role==='bestallare'&&current&&current.current&&['pending','changes_requested'].includes(current.status)&&<>
   <ol className="project-approval-steps">
    <li><h3>Granska korrekturet</h3><p>Öppna korrekturet ovan. Där kan du kommentera enskilda skyltar och deras placering.</p></li>
    {current.status==='pending'&&<li><h3>Godkänn eller begär ändringar</h3><p>När du har granskat korrekturet kan du lämna ditt besked. Godkännandet gäller version {current.version}.</p>
     <div className="project-approval-confirm"><label><input type="checkbox" checked={confirmed} disabled={busy||viewed!==current.id} onChange={event=>setConfirmed(event.target.checked)}/>Jag har granskat och godkänner korrektur version {current.version}.</label><button className="project-primary" disabled={busy||!confirmed||viewed!==current.id} onClick={approve}>{busy?'Sparar…':`Godkänn korrektur ${current.version}`}</button>{viewed!==current.id&&<small>Öppna korrekturet för att kunna godkänna.</small>}</div>
    </li>}
   </ol>
   <details className="project-approval-disclosure" key={'feedback-'+current.id}><summary>Begär ändringar eller lämna en kommentar</summary>
    <div className="project-proof-feedback"><p>Kommentarer på enskilda skyltar lämnas i korrekturet. Här kan du lämna en allmän kommentar eller begära en ny version.</p><label>Kommentar<textarea aria-label="Kommentar till korrekturet" maxLength={3000} rows={4} value={comment} onChange={event=>{setComment(event.target.value);commentRequest.current=null;}} placeholder="Beskriv vad som behöver justeras, till exempel ny skylttext eller placering."/></label>
     <div className="project-approval-buttons"><button type="button" className="project-secondary" disabled={busy||!comment.trim()} onClick={()=>feedback(false)}>Skicka kommentar</button>{current.status==='pending'&&<button type="button" className="project-secondary project-proof-request-changes" disabled={busy||!comment.trim()} onClick={()=>feedback(true)}>Begär ändringar</button>}</div><small>Skicka kommentar lämnar versionen öppen. Begär ändringar nekar versionen och ber avsändaren om ett nytt korrektur.</small>
    </div>
   </details>
  </>}
  {current&&(current.comments||[]).length>0&&<details className="project-approval-disclosure" key={'comments-'+current.id} open><summary>Återkoppling på version {current.version} ({current.comments.length})</summary><ProofComments proof={current}/></details>}
  {admin&&<section className="project-approval-admin" aria-label="Förbered och skicka korrektur">
   <h3>{current?'Nästa korrekturversion':'Skicka första korrekturet'}</h3>
   <p>Välj skyltar och granska den sparade versionen innan du skickar den till beställaren.</p>
   <div className="project-approval-send">
    <p>Beställare: <strong>{project.purchaserName||'Ej angiven'}</strong>{project.purchaserEmail?` · ${project.purchaserEmail}`:''}</p>
    <label>Skapa<select aria-label="Nytt korrektur eller ny version" value={base?.id||'new'} onChange={event=>{setBaseId(event.target.value);setVersion('');const proof=proofs.find(proof=>proof.id===event.target.value);setSelectedKeys(proof?.selectedSignKeys||null);}}><option value="new">Nytt korrektur för projektet</option>{proofs.filter(proof=>proof.current||proof.status==='draft').map(proof=><option key={proof.id} value={proof.id}>Ny version av {proof.proofNumber||project.number} (v{proof.version})</option>)}</select></label>
    <fieldset className="project-proof-sign-selection"><legend>Skyltar i korrekturet ({chosenKeys.length} av {signs.length})</legend><div><button type="button" onClick={()=>setSelectedKeys(availableKeys)}>Markera alla</button><button type="button" onClick={()=>setSelectedKeys([])}>Rensa val</button></div>{signs.map(sign=><label key={sign.key}><input type="checkbox" checked={chosenKeys.includes(sign.key)} onChange={event=>setSelectedKeys(event.target.checked?[...chosenKeys,sign.key]:chosenKeys.filter(key=>key!==sign.key))}/><span>{sign.position} · {sign.name||(catalog.articles||[]).find(article=>article.id===sign.articleId)?.name||projectSignDisplayText(sign)||sign.articleId||'Specialskylt'}{projectSignDisplayText(sign)?' · '+projectSignDisplayText(sign):''} · {sign.quantity||1} st{sign.drawingName?' · '+sign.drawingName:''}</span></label>)}</fieldset>
    <label>Ny korrekturversion<input aria-label="Ny korrekturversion" value={version} placeholder={nextVersion} onChange={event=>setVersion(event.target.value)} maxLength={20}/></label>
    <button type="button" className="project-secondary project-approval-open" disabled={busy||!chosenKeys.length||!project.purchaserName||!project.purchaserEmail} onClick={prepare}><BusyLabel busy={busy}>{busy?'Förbereder…':'Förhandsgranska och skicka korrektur'}</BusyLabel></button>
    {(!project.purchaserName||!project.purchaserEmail)&&<small>Fyll i beställarens namn och mejl via Redigera projekt. Kontot kan skapas senare.</small>}
   </div>
  </section>}
  {previous.length>0&&<details className="project-approval-disclosure"><summary>Tidigare versioner ({previous.length})</summary>{previous.map(proof=><div className="project-approval-history" key={proof.id}><span>{proof.version} · {status(proof)}{proof.approvedAt?` · Godkänt ${when(proof.approvedAt)}`:''}</span><button className="project-secondary" disabled={busy} onClick={()=>open(proof,'proof')}>Visa korrektur</button><button className="project-secondary" disabled={busy} onClick={()=>open(proof,'quote')}>Visa offert</button><ProofComments proof={proof}/></div>)}</details>}
  {document&&<ProjectProofModal key={document.proof.id} project={document.snapshot.project} catalog={document.snapshot.catalog} adminPassword={adminPassword} artwork={document.snapshot.artwork} onArchive={async payload=>{const saved=await api(`/api/project-proofs/${document.proof.id}/pdf`,'POST',payload);return saved.proof.pdf;}} publication={{...document.proof,createdAt:document.snapshot.createdAt}} onSignFeedback={role==="bestallare"&&document.proof.current&&["pending","changes_requested"].includes(document.proof.status)?signFeedback:undefined} onReady={()=>setViewed(document.proof.id)} onPublish={document.proof.status==='draft'&&admin?send:undefined} onClose={()=>{setDocument(null);load().catch(error=>setError(error.message));}}/>}
  {quote&&<OrderAcknowledgementModal order={quote} variant="quote" onClose={()=>setQuote(null)}/>}
 </section>;
}


function ProofComments({proof}){return (proof.comments||[]).length>0?<section className="project-proof-feedback-history" aria-label={'Kommentarer till version '+proof.version}><h3>Återkoppling · Version {proof.version}</h3>{proof.comments.map(comment=><article key={comment.id}><strong>{comment.changeType==='move'?'Flytta skylten':comment.changeType==='adjust'?'Justera skylten':comment.kind==='changes_requested'?'Ändringar begärda':'Kommentar'} · {comment.author?.name}</strong><small>{when(comment.createdAt)}{comment.sign?' · '+comment.sign.position+' · '+comment.sign.drawingName:''}</small>{comment.sign?.text&&<span>Skylttext: {comment.sign.text}</span>}<p>{comment.message}</p></article>)}</section>:null;}
