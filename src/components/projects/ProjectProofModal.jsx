import {captureProjectProof} from '../../data/captureProjectProof';
import {useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {openPdf} from '../../data/browserPdf';
import BadgePreview from '../products/BadgePreview';
import {hasPhotographicDoorPreview} from '../../data/doorPhotoPreview';
import FittedProductPreview from '../products/FittedProductPreview';
import AreaPreview from '../products/AreaPreview';
import {isAreaPriced} from '../../data/areaPricing';
import {getFormPreviewConfig} from '../../data/previewHelpers';
import {projectProofGroups,projectProofPages,proofMarkers,proofFormat,proofAnnotations,proofLocationLines} from '../../data/projectProof';
import useModalFocus from '../../hooks/useModalFocus';
import ProofSignFeedback from './ProofSignFeedback';
import RoadAssemblyProof,{hasRoadAssembly} from './RoadAssemblyProof';
import './ProjectProofModal.css';
const money=value=>Number(value||0).toLocaleString('sv-SE',{style:'currency',currency:'SEK'});
const EMPTY_ARTWORK=[];
const supported=['parking_sign','badge','door_sign','hanging_sign','profession','destination_cube','dibond_sign','ot_board','elevator_board'];

function ProofNotes({notes}){
 const annotation=proofAnnotations(notes);
 return <>{annotation.rooms.length>0&&<p className="proof-room-list">Rum: {annotation.rooms.join(', ')}</p>}{annotation.notes.length>0&&<p className="proof-note-list">Anteckningar: {annotation.notes.join('; ')}</p>}</>;
}

export function ProofProduct({group,align="center",showPrices=false}){
 const {product,form}=group;
 if(group.archivedImage)return <img className="proof-frozen-artwork" src={group.archivedImage} alt={product?.name||'Skylt'}/>;
 if(!product)return <p className="proof-missing">Artikel {group.articleNumber} saknas i artikelregistret. Kontrollera underlaget.</p>;
 if(hasRoadAssembly(group))return <FittedProductPreview><RoadAssemblyProof group={group} showPrices={showPrices}/></FittedProductPreview>;
 const preview=getFormPreviewConfig(product);
 return <FittedProductPreview align={align} horizontalAlign="right">{isAreaPriced(product)?<AreaPreview product={product} form={form} maxWidth={430}/>:(supported.includes(preview.previewType)||hasPhotographicDoorPreview(product))?<BadgePreview photographic product={product} badgeId={preview.badgeId} productType={preview.productType} productForm={form} maxWidth={430}/>:product.image?<img src={product.image} alt={product.name}/>:<p className="proof-missing">Produktbild saknas</p>}</FittedProductPreview>;
}

async function loadPlans(project,adminPassword,signal,onProgress,proofId){
 const result=[];
 for(const drawing of project.drawings||[]){
  if(signal.aborted)throw new Error('Avbrutet');
  onProgress(`Läser ${drawing.name}…`);
  const response=await fetch(proofId?`/api/project-proofs/${encodeURIComponent(proofId)}/drawings/${encodeURIComponent(drawing.id)}/file`:`/api/projects/${encodeURIComponent(project.id)}/drawings/${encodeURIComponent(drawing.id)}/file`,{headers:{'x-admin-password':adminPassword},signal});
  if(!response.ok)throw new Error(`Kunde inte läsa ritningen ${drawing.name}. Försök igen.`);
  const task=openPdf(new Uint8Array(await response.arrayBuffer()));
  const abort=()=>{task.destroy().catch(()=>{});};signal.addEventListener('abort',abort,{once:true});
  try{
   const pdf=await task.promise;
   if(result.length+pdf.numPages>100)throw new Error('Korrekturet innehåller fler än 100 ritningssidor. Dela upp projektet innan export.');
   const invalid=(drawing.markers||[]).find(marker=>!marker.unplaced&&(!Number.isInteger(Number(marker.page||1))||Number(marker.page||1)<1||Number(marker.page||1)>pdf.numPages));
   if(invalid)throw new Error(`Skylten ${invalid.position||invalid.id} pekar på en sida som saknas i ${drawing.name}.`);
   for(let number=1;number<=pdf.numPages;number++){
    if(signal.aborted)throw new Error('Avbrutet');
    onProgress(`Förbereder ${drawing.name}, sida ${number}/${pdf.numPages}…`);
    const page=await pdf.getPage(number),base=page.getViewport({scale:1});
    const viewport=page.getViewport({scale:Math.min(2800/base.width,2800/base.height)}),canvas=document.createElement('canvas');
    canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
    const context=canvas.getContext('2d');if(!context)throw new Error('Webbläsaren kunde inte skapa ritningsbilden.');
    await page.render({canvasContext:context,viewport,background:'#ffffff'}).promise;
    result.push({drawingId:drawing.id,drawingName:drawing.name,page:number,pages:pdf.numPages,width:canvas.width,height:canvas.height,image:canvas.toDataURL('image/png'),markers:proofMarkers(drawing,number)});
    canvas.width=0;canvas.height=0;page.cleanup();
   }
  }finally{signal.removeEventListener('abort',abort);await task.destroy();}
 }
 return result;
}

export default function ProjectProofModal({project,catalog,adminPassword,onClose,publication=null,onPublish,onReady,onSignFeedback,onArchive,artwork=EMPTY_ARTWORK}){
 const [snapshot]=useState(()=>JSON.parse(JSON.stringify({project,catalog,createdAt:publication?.createdAt||new Date().toISOString()})));
 const [showPrices,setShowPrices]=useState(publication?.showPrices!==false),[version,setVersion]=useState(publication?.version||'1.1');
 const [publishing,setPublishing]=useState(false);
 const [archived,setArchived]=useState(publication?.pdf||null);
 const [reviewReady,setReviewReady]=useState(false);
 const [feedback,setFeedback]=useState(null),[feedbackBusy,setFeedbackBusy]=useState(false);
 const feedbackReturn=useRef(null),restoringFeedback=useRef(false);
 const [plans,setPlans]=useState([]),[ready,setReady]=useState(false),[error,setError]=useState(''),[progress,setProgress]=useState('Förbereder ritningar…'),[attempt,setAttempt]=useState(0),[printing,setPrinting]=useState(false);
 const root=useRef(null),previousTitle=useRef(null);
 useModalFocus(true,root,()=>{if(publishing||feedbackBusy)return;if(feedback){restoringFeedback.current=true;setFeedback(null);}else onClose();});
 useEffect(()=>{if(feedback){root.current.scrollTop=0;return;}if(restoringFeedback.current){restoringFeedback.current=false;root.current.scrollTop=feedbackReturn.current?.top||0;Array.from(root.current.querySelectorAll('[data-proof-feedback]')).find(button=>button.dataset.proofFeedback===feedbackReturn.current?.key)?.focus({preventScroll:true});}},[feedback]);
 const grouped=useMemo(()=>{try{return {groups:projectProofGroups(snapshot.project,snapshot.catalog.articles)}}catch(error){return {groups:[],error:error.message}}},[snapshot]);
 const groups=useMemo(()=>grouped.groups.map(group=>({...group,archivedImage:artwork.find(item=>item.signKey===group.locations[0]?.signKey)?.image})),[grouped.groups,artwork]);
 const canComment=Boolean(reviewReady&&onSignFeedback&&publication?.current&&['pending','changes_requested'].includes(publication.status));
 function openFeedback(group,location,event){feedbackReturn.current={top:root.current.scrollTop,key:event.currentTarget.dataset.proofFeedback};setFeedback({group,location});}
 function closeFeedback(){if(feedbackBusy)return;restoringFeedback.current=true;setFeedback(null);}
 const commentCount=group=>(publication?.comments||[]).filter(comment=>group.locations.some(location=>location.drawingId===comment.sign?.drawingId&&location.markerId===comment.sign?.markerId)).length;
 useEffect(()=>{
  if((!onReady&&!onSignFeedback)||feedback||!ready||error||grouped.error||groups.some(group=>!group.product))return;
  let active=true;
  Promise.all(Array.from(root.current.querySelectorAll('img')).map(image=>image.decode?image.decode():Promise.resolve())).then(()=>{if(active){setReviewReady(true);onReady?.();}}).catch(()=>{if(active)setError('En produktbild kunde inte laddas. Kontrollera korrekturet innan det godkänns.');});
  return()=>{active=false;};
 },[onReady,onSignFeedback,feedback,ready,error,grouped.error,groups]);
 useEffect(()=>{
  const controller=new AbortController();setReady(false);setReviewReady(false);setError('');
  loadPlans(snapshot.project,adminPassword,controller.signal,setProgress,publication?.id).then(pages=>{if(!controller.signal.aborted){setPlans(pages);setReady(true);}}).catch(error=>{if(!controller.signal.aborted)setError(error.message)});
  return()=>controller.abort();
 },[snapshot,adminPassword,attempt,publication?.id]);
 useEffect(()=>{
  const restore=()=>{document.body.classList.remove('jsf-print-project-proof');if(previousTitle.current!==null){document.title=previousTitle.current;previousTitle.current=null;}setPrinting(false);};
  window.addEventListener('afterprint',restore);
  return()=>{window.removeEventListener('afterprint',restore);document.body.classList.remove('jsf-print-project-proof');if(previousTitle.current!==null)document.title=previousTitle.current;};
 },[]);
 async function archive(){
  if(archived)return archived;
  if(!onArchive)throw new Error('Öppna korrekturet från projektets korrekturflik för att spara PDF.');
  const captured=await captureProjectProof(root.current,{'x-admin-password':adminPassword},setProgress);
  const saved=await onArchive({...captured,showPrices});setArchived(saved);return saved;
 }
 async function download(){
  const response=await fetch(`/api/project-proofs/${encodeURIComponent(publication.id)}/pdf`,{headers:{'x-admin-password':adminPassword}});
  if(!response.ok)throw new Error('Kunde inte hämta den sparade PDF-filen.');
  const url=URL.createObjectURL(await response.blob()),link=document.createElement('a');link.href=url;link.download=`${publication.proofNumber||project.number}_v${publication.version}.pdf`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 async function publish(){
  if(publishing||printing||!ready)return;setPublishing(true);setError('');
  try{if(publication?.archiveRequired)await archive();await onPublish({showPrices});}catch(error){setError(error.message);}finally{setPublishing(false);}
 }
 async function print(){
  if(!ready||printing||grouped.error)return;
  setPrinting(true);setError('');
  try{
   if(publication?.archiveRequired||publication?.pdf){if(!archived)await archive();await download();return;}
   if(document.fonts?.ready)await document.fonts.ready;
   await Promise.all(Array.from(root.current.querySelectorAll('img')).map(image=>image.decode?image.decode():Promise.resolve()));
   if(!root.current)return;
   for(const card of root.current.querySelectorAll('.proof-product')){
    if(card.querySelector('.proof-product-info').getBoundingClientRect().height>card.getBoundingClientRect().height+1)throw new Error('Beskrivningstexten får inte plats på korrektursidan. Korta anteckningarna i projektet och skapa korrekturet igen.');
   }
   previousTitle.current=document.title;document.title=`Korrektur_${snapshot.project.number}_v${(version.trim()||'1.1').replace(/[^a-zA-Z0-9._-]/g,'_')}`;
   document.body.classList.add('jsf-print-project-proof');
   window.print();
   document.body.classList.remove('jsf-print-project-proof');
   if(previousTitle.current!==null){document.title=previousTitle.current;previousTitle.current=null;}
  }catch(error){setError(`Kunde inte förbereda utskriften. ${error.message}`);}
  finally{setPrinting(false);}
 }
 const productPages=projectProofPages(groups,snapshot.catalog.categories||[]);
 const totalPages=productPages.length+plans.length;
 const projectData=snapshot.project;
 const date=new Date(snapshot.createdAt).toLocaleDateString('sv-SE');
 const heading=[projectData.customer,projectData.name].filter(Boolean).join(' · ');
 const header=(subtitle)=><header className="proof-page-header"><div><small>KORREKTUR · {publication?.proofNumber||projectData.number} · VERSION {version.trim()||'1.1'} · {date}</small><h2>{heading}</h2><p>{[projectData.targetPoint&&`Målpunkt ${projectData.targetPoint}`,projectData.floor&&`Plan ${projectData.floor}`,subtitle].filter(Boolean).join(' · ')}</p></div><strong>{projectData.customerReference||projectData.projectCode||''}</strong></header>;
 const footer=number=><footer className="proof-page-footer"><img src="/jsf-logo.jpg" alt="Jönköpings Skyltfabrik"/><span>Korrektur – kontrollera text, utseende och placering. Bilderna visas inte i skala.</span><img className="proof-region-logo" src="/logoRJL_transparent.png" alt="Region Jönköpings län"/><span>{number} / {totalPages}</span></footer>;
 return createPortal(<div className="project-proof-overlay" role="dialog" aria-modal="true" aria-label={`Korrektur ${projectData.number}`} ref={root} tabIndex={-1}>
  {feedback?<ProofSignFeedback key={feedback.group.key} group={feedback.group} initialLocation={feedback.location} preview={<ProofProduct group={feedback.group}/>} comments={publication?.comments||[]} version={publication.version} onSave={onSignFeedback} onClose={closeFeedback} onBusy={setFeedbackBusy}/>:<>
  <div className="proof-toolbar"><div><strong>Korrektur {publication?.proofNumber||projectData.number}</strong><small>{publication?.archiveRequired?'Granska skyltarna. PDF-filen sparas med denna version.':'Granska och välj Skriv ut / spara PDF. Välj A4 liggande och stäng av webbläsarens sidhuvud och sidfot.'}</small></div><label><input type="checkbox" checked={showPrices} disabled={publishing||printing||Boolean(archived)||(publication&&publication.status!=='draft')} onChange={event=>setShowPrices(event.target.checked)}/>Visa priser</label><label>Version<input aria-label="Korrekturversion" value={version} disabled={!!publication} maxLength={20} onChange={event=>setVersion(event.target.value)}/></label><button type="button" disabled={!ready||printing||publishing||!!grouped.error||!!error||groups.some(group=>!group.product)} onClick={print}>{printing?'Sparar PDF…':publication?.archiveRequired||publication?.pdf?'Hämta PDF':'Skriv ut / spara PDF'}</button>{onPublish&&<button type="button" disabled={!ready||publishing||printing||!!grouped.error||groups.some(group=>!group.product)} onClick={publish}>{publishing?'Skickar…':'Skicka för godkännande'}</button>}<button type="button" disabled={publishing||printing} onClick={onClose}>Stäng</button></div>
  {(printing||publishing)&&<p className="proof-progress" role="status">{progress}</p>}
  {publication&&<p className="proof-progress">Sparat korrektur version {publication.version}{publication.status==='draft'?` – granskas före utskick till ${publication.recipientEmail}`:publication.status==='approved'?` – godkänt av ${publication.approvedBy?.name||publication.recipientName}`:publication.status==='changes_requested'?' – ändringar begärda, inte godkänt':' – för godkännande'}. Den här vyn visar den sparade versionen.</p>}
  {(error||grouped.error)&&<div className="proof-alert" role="alert">{error||grouped.error}{!grouped.error&&<button onClick={()=>setAttempt(value=>value+1)}>Försök igen</button>}</div>}
  {!ready&&!error&&<p className="proof-progress" role="status">{progress}</p>}
  {!groups.length&&!grouped.error&&<p className="proof-progress">Inga skyltar i projektet.</p>}
  {canComment&&<p className="proof-comment-instructions">Välj Kommentera skylten under en skylt eller klicka på en position på ritningen för att kommentera, begära justering eller flytt. Har samma skylt flera positioner väljer du vilken det gäller.</p>}
  {groups.some(group=>!group.product)&&<p className="proof-progress">En eller flera artiklar saknas i artikelregistret. Kontrollera markeringarna i korrekturet.</p>}
  <div className="proof-pages">
   {productPages.map((page,index)=><section className={`proof-page${page.spacious?" proof-page-spacious":""}${page.groups.length===1?" proof-page-single":""}`} key={`products-${index}`} aria-label={`Produktsida ${index+1}`}>{header(page.label)}<div className="proof-products">{page.groups.map(group=><article className={`proof-product${hasRoadAssembly(group)?" proof-product-road-assembly":""}`} key={group.key}><div className={`proof-product-image${canComment?" proof-product-image-with-feedback":""}`}><div className="proof-product-artwork" data-proof-artwork={JSON.stringify(group.locations.map(location=>location.signKey))}><ProofProduct group={group} showPrices={showPrices} align={page.groups.length===1?"bottom":"center"}/></div>{canComment&&<button type="button" className="proof-image-feedback-button" data-proof-feedback={group.key} aria-label={`Kommentera skylt ${group.locations.map(location=>location.position).join(', ')}`} onClick={event=>openFeedback(group,null,event)}><span className="proof-image-feedback-label">{commentCount(group)?`${commentCount(group)} ${commentCount(group)===1?"kommentar":"kommentarer"} · Öppna`:'Kommentera skylten'}</span></button>}</div><div className="proof-product-info">{!hasRoadAssembly(group)&&<><strong>{group.product?.categoryId==='project-special'?'Specialskylt':`Art.nr ${group.articleNumber}`}</strong><h3>{group.product?.name||'Artikel saknas'}</h3>{(group.form.otBoardName||group.form.elevatorBoardVariant?.name)&&<p>{[group.form.otBoardLocation||group.form.elevatorBoardVariant?.location,group.form.otBoardName||group.form.elevatorBoardVariant?.name].filter(Boolean).join(' · ')}</p>}{group.product?.desc&&<p>{group.product.desc.length>160?group.product.desc.slice(0,157)+"…":group.product.desc}</p>}<p>Format: {proofFormat(group.product,group.form)||'Ej angivet'}<br/>Antal: {group.quantity} st</p><p>{group.product?.material}</p></>}<ProofNotes notes={group.notes}/><p className="proof-locations">{proofLocationLines(group.locations).map((line,index)=><span key={index}>{line}</span>)}</p>{showPrices&&group.product&&!hasRoadAssembly(group)&&<strong>{money(group.form.unitPrice??group.product.price??group.product.unitPrice)} / st exkl. moms</strong>}</div></article>)}</div>{footer(index+1)}</section>)}
   {plans.map((plan,index)=><section className="proof-page proof-plan-page" key={`${plan.drawingId}-${plan.page}`} aria-label={`Ritning ${plan.drawingName}, sida ${plan.page}`}>{header(`${plan.drawingName} · Ritningssida ${plan.page}/${plan.pages}`)}<div className="proof-plan-area"><div className="proof-plan-image" style={{aspectRatio:`${plan.width}/${plan.height}`,maxWidth:`${(plan.width/plan.height)*470}px`}}><img src={plan.image} alt={`${plan.drawingName}, sida ${plan.page}`}/>{plan.markers.map(marker=>{const group=groups.find(group=>group.locations.some(location=>location.drawingId===plan.drawingId&&location.markerId===marker.id));const location=group?.locations.find(location=>location.drawingId===plan.drawingId&&location.markerId===marker.id);const hasFeedback=(publication?.comments||[]).some(comment=>comment.sign?.drawingId===plan.drawingId&&comment.sign?.markerId===marker.id);return canComment&&group&&marker.id?<button type="button" key={marker.id} className={`proof-position proof-position-feedback${hasFeedback?' has-feedback':''}`} data-proof-feedback={plan.drawingId+'-'+marker.id} aria-label={`Kommentera skylt ${marker.position} på ${plan.drawingName}`} style={{left:`${marker.x*100}%`,top:`${marker.y*100}%`}} onClick={event=>openFeedback(group,location,event)}>{marker.position}</button>:<span key={marker.id||marker.position} className="proof-position" style={{left:`${marker.x*100}%`,top:`${marker.y*100}%`}}>{marker.position}</span>;})}</div><p>{plan.markers.length} skyltpositioner på sidan. Positionsnumren återfinns på produktsidorna.</p></div>{footer(productPages.length+index+1)}</section>)}
  </div>
 </>}
 </div>,document.body);
}



