import {useEffect,useId,useRef,useState} from 'react';
import {getSalesUnit} from '../../data/salesUnits';
import useModalFocus from '../../hooks/useModalFocus';
import './ProjectSignList.css';
const originalUrl=(project,sign)=>`/api/projects/${encodeURIComponent(project.id)}/signs/${encodeURIComponent(sign.key||sign.id)}/original`;
const fileData=(file,mime)=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve('data:'+mime+';base64,'+String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('Kunde inte läsa filen.'));reader.readAsDataURL(file);});
const fileMime=file=>({svg:'image/svg+xml',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',pdf:'application/pdf'}[file.name.split('.').pop().toLowerCase()]||file.type);

export function Original({project,sign,headers,download=false,purpose='preview',showImage=true}) {
  const [url,setUrl]=useState(''),[error,setError]=useState('');
  const missing=purpose==='preview'&&!sign.proofFile&&sign.productionFile?.mime==='application/pdf';
  const file=purpose==='preview'?(sign.proofFile||sign.productionFile):sign.productionFile;
  useEffect(()=>{
    setUrl('');setError('');if(missing)return;
    const controller=new AbortController();let objectUrl;
    const route=purpose==='preview'?originalUrl(project,sign).replace(/original$/,'preview'):originalUrl(project,sign);
    fetch(route,{headers,signal:controller.signal}).then(async response=>{
      if(!response.ok)throw new Error(purpose==='preview'?'Kunde inte hämta korrekturbilden.':'Kunde inte hämta produktionsfilen.');
      const blob=await response.blob();if(controller.signal.aborted)return;
      objectUrl=URL.createObjectURL(blob);setUrl(objectUrl);
    }).catch(error=>{if(error.name!=='AbortError')setError(error.message);});
    return()=>{controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[project.id,sign.key,sign.id,sign.productionFile?.id,sign.proofFile?.id,headers['x-admin-password'],purpose,missing]); // eslint-disable-line react-hooks/exhaustive-deps
  if(missing)return <span>Ingen korrekturbild</span>;
  return <>{error?<span role="alert">{error}</span>:url?(purpose==='preview'&&showImage&&<img src={url} alt={sign.name||'Korrekturbild'}/>):<span>Läser fil…</span>}{download&&url&&<a className="project-secondary" href={url} download={file?.name||'skyltoriginal.svg'}>{purpose==='preview'?'Hämta korrekturbild':'Hämta produktionsfil'}</a>}</>;
}

export default function SignDetails({project,sign,article,headers,readOnly,onClose,onSaved,placement}) {
  const custom=sign?.kind==='svg'||!sign;
  const [tab,setTab]=useState(sign?'details':'files'),tabsId=useId();
  const [form,setForm]=useState({name:sign?.name||article?.name||'',description:sign?.description||'',material:sign?.material||'',quantity:sign?.quantity||1,price:sign?.price??(custom?0:''),widthMm:sign?.widthMm||'',heightMm:sign?.heightMm||'',notes:sign?.notes||''});
  const [proofFile,setProofFile]=useState(null),[removeProof,setRemoveProof]=useState(false);
  const [file,setFile]=useState(null),[cut,setCut]=useState(Boolean(sign?.productionFile?.cutColor)),[cutColor,setCutColor]=useState(sign?.productionFile?.cutColor||'#ff00ff');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),ref=useRef(null),saving=useRef(false);
  const close=()=>{if(!saving.current)onClose();};
  useModalFocus(true,ref,close);
  const field=(key,label,type='text',extra={})=><label>{label}<input type={type} value={form[key]} onChange={e=>setForm(old=>({...old,[key]:e.target.value}))} {...extra}/></label>;
  async function save(event){
    event.preventDefault();if(saving.current)return;saving.current=true;setBusy(true);setError('');
    try{
      const body={...form};
      for(const key of ['widthMm','heightMm','price'])if(body[key]==='')delete body[key];
      if(!sign){body.kind='svg';if(placement)body.placement=placement;}
      if(!sign&&!file)throw new Error('Välj en produktionsfil i SVG eller PDF.');
      if(file){if(file.size>5*1024*1024)throw new Error('Produktionsfilen får vara högst 5 MB.');body.original={name:file.name,dataUrl:await fileData(file,fileMime(file)),cutColor:cut?cutColor:null};}
      if(proofFile){if(proofFile.size>5*1024*1024)throw new Error('Korrekturbilden får vara högst 5 MB.');body.proofOriginal={name:proofFile.name,dataUrl:await fileData(proofFile,fileMime(proofFile))};}
      if(removeProof&&!proofFile)body.removeProofFile=true;
      const response=await fetch(`/api/projects/${encodeURIComponent(project.id)}/signs${sign?'/'+encodeURIComponent(sign.key):''}`,{method:sign?'PATCH':'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(body)});
      const data=await response.json();if(!response.ok)throw new Error(data.message||'Kunde inte spara skylten.');
      await onSaved(data);onClose();
    }catch(error){setError(error.message);}finally{saving.current=false;setBusy(false);}
  }
  return <div className="project-sign-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)close();}}><section ref={ref} className={'project-sign-dialog'+(custom?' project-sign-dialog-original':'')} role="dialog" aria-modal="true" aria-label={sign?'Skyltuppgifter':'Importera skylt'}>
    <header><div><small>{sign?.position||'EGET ORIGINAL'}</small><h2>{sign?'Skyltuppgifter':'Importera skylt'}</h2></div><button type="button" onClick={close} disabled={busy} aria-label="Stäng">×</button></header>
    <form onSubmit={save} onInvalidCapture={event=>{const pane=event.target.closest('[data-sign-tab]');if(pane)setTab(pane.dataset.signTab);}}>
      {error&&<p role="alert" className="project-error">{error}</p>}
      <div className={custom?'project-original-layout':undefined}>
      {sign?.kind==='svg'&&<div className="project-original-preview project-original-large" aria-label="Förhandsvisning av skylten"><Original project={project} sign={sign} headers={headers}/></div>}
      <div className="project-original-settings">
      {custom&&<div className="project-original-tabs" role="tablist" aria-label="Skyltuppgifter och filer">{[['details','Uppgifter'],['files','Filer']].map(([key,label])=><button key={key} id={tabsId+'-'+key+'-tab'} type="button" role="tab" aria-selected={tab===key} aria-controls={tabsId+'-'+key} tabIndex={tab===key?0:-1} onClick={()=>setTab(key)} onKeyDown={event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?'details':event.key==='End'?'files':tab==='details'?'files':'details';setTab(next);document.getElementById(tabsId+'-'+next+'-tab')?.focus();}}}>{label}</button>)}</div>}
      <fieldset disabled={readOnly||busy} className="project-sign-fields">
       <div className="project-original-tab-panel" data-sign-tab="files" id={tabsId+'-files'} role={custom?'tabpanel':undefined} aria-labelledby={custom?tabsId+'-files-tab':undefined} hidden={!custom||tab!=='files'}>
        {sign?.kind==='svg'&&tab==='files'&&<div className="project-original-downloads"><Original project={project} sign={sign} headers={headers} download showImage={false}/><Original project={project} sign={sign} headers={headers} purpose="production" download/></div>}
        {custom&&<div className="project-sign-file-fields">
          <label>Korrekturbild – PNG, JPG eller SVG (max 5 MB)<input type="file" accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml" onChange={e=>{setProofFile(e.target.files?.[0]||null);setRemoveProof(false);setForm(old=>({...old,widthMm:'',heightMm:''}));}}/>{sign?.proofFile&&!removeProof&&<small>Sparad: {sign.proofFile.name}</small>}</label>
          {sign?.proofFile&&<label className="project-cut-option"><input type="checkbox" checked={removeProof} onChange={e=>{setRemoveProof(e.target.checked);if(e.target.checked)setProofFile(null);}}/>Ta bort separat korrekturbild</label>}
          <label>Produktionsfil – SVG eller PDF (max 5 MB)<input type="file" accept=".svg,.pdf,image/svg+xml,application/pdf" required={!sign} onChange={e=>setFile(e.target.files?.[0]||null)}/>{sign?.productionFile&&<small>Sparad: {sign.productionFile.name}</small>}</label>
        </div>}
        {file&&fileMime(file)==='image/svg+xml'&&<div className="project-cut-option"><label><input type="checkbox" checked={cut} onChange={e=>setCut(e.target.checked)}/>Originalet har skärlinje</label>{cut&&<label>Skärlinjens färg<input type="color" value={cutColor} onChange={e=>setCutColor(e.target.value)}/></label>}</div>}
       </div>
       <div className="project-original-tab-panel" data-sign-tab="details" id={tabsId+'-details'} role={custom?'tabpanel':undefined} aria-labelledby={custom?tabsId+'-details-tab':undefined} hidden={custom&&tab!=='details'}>
        {field('name','Benämning','text',{required:true,maxLength:200})}
        <label>Beskrivning<textarea rows="2" value={form.description} maxLength={1500} onChange={e=>setForm(old=>({...old,description:e.target.value}))}/></label>
        {custom&&<div className="project-sign-pair">{field('widthMm','Bredd (mm)','number',{min:1,max:5000,step:'any',placeholder:'Från korrekturbilden'})}{field('heightMm','Höjd (mm)','number',{min:1,max:5000,step:'any',placeholder:'Från korrekturbilden'})}</div>}
        <div className="project-sign-pair">{field('quantity','Antal','number',{min:1,max:10000,required:true})}{field('price',`Pris per ${getSalesUnit(article||{})} (kr exkl. moms)`,'number',{min:0,max:10000000,step:'any',placeholder:'Artikelns pris'})}</div>
        {field('material','Material','text',{maxLength:1500})}
        <label>Anteckningar<textarea rows="2" maxLength={1500} value={form.notes} onChange={e=>setForm(old=>({...old,notes:e.target.value}))}/></label>
       </div>
      </fieldset>
      </div></div>
      <footer><button type="button" className="project-secondary" onClick={close} disabled={busy}>{readOnly?'Stäng':'Avbryt'}</button>{!readOnly&&<button type="submit" className="project-primary" disabled={busy}>{busy?'Sparar…':'Spara skylt'}</button>}</footer>
    </form>
  </section></div>;
}
