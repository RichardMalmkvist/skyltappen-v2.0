import {WorkspacePageHeader,WorkspaceStatus,WorkspaceFeedback,WorkspaceSkeleton,WorkspaceMenu,BusyLabel} from '../../components/workspace/WorkspaceUI';
import ProjectSignList from "./ProjectSignList";
import {projectSigns} from "../../data/projectSigns";
import ProjectFolderBrowser,{ProjectFolderTrail} from './ProjectFolderBrowser';
import DrawingLibraryOrganizeDialog from './DrawingLibraryOrganizeDialog';
import {projectFolderPath,projectFolderOptions,projectFolderDescendants} from '../../data/projectFolders';
import './ProjectFolders.css';
import DatePicker from '../../components/forms/DatePicker';
import OrderAcknowledgementModal from "../../components/orders/OrderAcknowledgementModal";
import { useCallback, useEffect, useRef, useState } from "react";
import PageContainer from "../../components/layout/PageContainer";
import { AdminLayout } from "../../components/admin/AdminNavigation";
import OrderDeleteDialog from "../../components/orders/OrderDeleteDialog";
import ProjectApprovalPanel from "../../components/projects/ProjectApprovalPanel";
import ProjectProofModal from "../../components/projects/ProjectProofModal";
import ProjectDrawingPlanner from "./ProjectDrawingPlanner";
import "./ProjectWorkspace.css";
import {projectMatchesPurchaser,projectPurchaserOptions} from "../../data/projectPurchasers";

const EMPTY = { purchaserName:"",purchaserEmail:"",purchaserPhone:"", name:"",customer:"",contact:"",phone:"",email:"",accountNumber:"",customerReference:"",projectCode:"",managementObject:"",targetPoint:"",property:"",building:"",floor:"",room:"",priority:"planeringsbar",requestedCompletionDate:"",requestedExecutionNote:"",responsible:"",notes:"",status:"Planering" };
const STATUS = ["Planering", "Pågående", "Pausat", "Avslutat"];
const FIELDS = [["customer","Kund"],["contact","Kontakt"],["email","E-post"],["phone","Telefon"],["accountNumber","Ansvarsnummer"],["customerReference","Kundens ordernummer / referens"],["name","Projekt *"],["projectCode","Projektkod"],["managementObject","Förvaltningsobjekt"],["targetPoint","Målpunkt"],["property","Fastighet"],["building","Byggnad / hus"],["floor","Plan"],["room","Rum"]];

export default function AdminProjectsPage({ adminPassword, initialProjectId, initialProofId, openRequest, ...nav }) {
  const readOnly = nav.role !== "admin";
  const [projects, setProjects] = useState([]);
  const [loading,setLoading]=useState(true);
  const [folders,setFolders]=useState([]),[folderId,setFolderId]=useState(null),[allProjects,setAllProjects]=useState(false),[organize,setOrganize]=useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [workspaceView,setWorkspaceView]=useState(nav.role==='bestallare'?'proof':'overview');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Alla");
  const [purchaserFilter,setPurchaserFilter]=useState(nav.role==='bestallare'?'mine':'all');
  const [sort,setSort]=useState('recent');
  useEffect(()=>setPurchaserFilter(nav.role==='bestallare'?'mine':'all'),[nav.role,nav.user?.id,nav.user?.email]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [quote, setQuote] = useState(null);
  const [orderConfirmation,setOrderConfirmation]=useState(null);
  const [orderError,setOrderError]=useState('');
  const orderBusy=useRef(false);
  const [proof, setProof] = useState(null);
  const [activeDrawing, setActiveDrawing] = useState(null);
  const [catalog, setCatalog] = useState({ articles: [] });
  const [drawingName, setDrawingName] = useState("");
  const [drawingFile, setDrawingFile] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const deleteBusy = useRef(false);
  const deleteButton = useRef(null);
  const backFocus = useRef(null);
  async function deleteProject() {
    if (readOnly || !deleteTarget || deleteBusy.current) return;
    deleteBusy.current = true; setDeleting(true); setDeleteError("");
    try {
      const response = await fetch(`/api/${deleteTarget.kind==='folder'?'project-folders':'projects'}/${encodeURIComponent(deleteTarget.id)}`, { method: "DELETE", headers: { "x-admin-password": adminPassword } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Kunde inte ta bort projektet.");
      if(deleteTarget.kind==='folder'){setFolders(data.folders||[]);setProjects(current=>current.map(project=>project.folderId===deleteTarget.id?{...project,folderId:data.parentId||null}:project));if(folderId===deleteTarget.id)setFolderId(data.parentId||null);}
      else setProjects(current => current.filter(project => project.id !== deleteTarget.id));
      setDeleteTarget(null); setSelectedId(null); setActiveDrawing(null); setEditing(false); setQuote(null);
      setError(""); setNotice(deleteTarget.kind==='folder'?`Mappen ${deleteTarget.name} har tagits bort.`:`Projekt ${deleteTarget.number} har tagits bort.`);
      backFocus.current?.focus();
    } catch (e) { setDeleteError(e.message || "Kunde inte ta bort projektet."); }
    finally { deleteBusy.current = false; setDeleting(false); }
  }
  const headers = { "x-admin-password": adminPassword };
  const selected = projects.find(p => p.id === selectedId);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/projects", { headers: { "x-admin-password": adminPassword } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Kunde inte läsa projekt.");
      setProjects(data.projects || []);
      setFolders(data.folders||[]);
      setError("");
    } catch (e) { setError(e.message); } finally {setLoading(false);}
  }, [adminPassword]);
  useEffect(() => { load(); }, [load]);
  useEffect(()=>{if(initialProjectId){setWorkspaceView("proof");setSelectedId(initialProjectId);setEditing(false);setActiveDrawing(null);load();}},[initialProjectId,openRequest,load]);
  const [catalogError,setCatalogError]=useState("");
  useEffect(() => {
    let active=true;
    fetch("/api/catalog",{headers:{"x-admin-password":adminPassword},cache:"no-store"})
      .then(async response=>{if(!response.ok)throw new Error(response.status===401?"Logga in igen för att hämta artiklarna till ritningen.":"Kunde inte hämta artikelregistret till ritningen.");return response.json();})
      .then(data=>{if(active){setCatalog(data);setCatalogError("");}})
      .catch(error=>{if(active)setCatalogError(error.message);});
    return()=>{active=false;};
  },[adminPassword]);
  function startNew() { setSelectedId(null); setForm({ ...EMPTY,folderId }); setEditing(true); setError(""); setNotice(""); }
  function openProject(project) { setFolderId(project.folderId||null);setWorkspaceView(nav.role==='bestallare'?'proof':'overview'); setActiveDrawing(null); setSelectedId(project.id); setEditing(false); setDrawingFile(null); setDrawingName(""); setError(""); setNotice(""); }
  function editProject() { setForm({ ...EMPTY, ...selected, projectCode:selected.projectCode ?? selected.number ?? "",customerReference:selected.customerReference ?? selected.number ?? "",managementObject:selected.managementObject ?? selected.object ?? "" }); setEditing(true); }
  async function saveProject(event) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(selected && editing ? `/api/projects/${selected.id}` : "/api/projects", {
        method: selected && editing ? "PATCH" : "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(form)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Kunde inte spara projekt.");
      setProjects(current => selected ? current.map(p => p.id === data.project.id ? data.project : p) : [data.project, ...current]);
      setSelectedId(data.project.id);setFolderId(data.project.folderId||null); setEditing(false); setNotice("Projektet har sparats.");
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function createProjectOrder() {
    if (!selected || busy) return;
    if(!orderConfirmation||orderBusy.current)return;
    orderBusy.current=true;setOrderError('');
    setBusy(true);setError("");setNotice("");
    try {
      const response = await fetch(`/api/projects/${orderConfirmation.id}/create-order`, {method:"POST",headers:{...headers,"Content-Type":"application/json"}});
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Kunde inte skapa ordern.");
      await load();setOrderConfirmation(null);setNotice(`Order ${data.order.orderNumber} skapad. Gå till Ordrar och välj Planera order.`);
    } catch (e) {setOrderError(e.message);} finally {orderBusy.current=false;setBusy(false);}
  }
  async function openProjectQuote() {
    if (!selected || busy) return;
    setBusy(true);setError("");
    try {
      const response = await fetch(`/api/projects/${selected.id}/quote`, {headers});
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Kunde inte skapa offerten.");
      setQuote(data.quote);
    } catch (e) {setError(e.message);} finally {setBusy(false);}
  }
  async function uploadDrawing(event) {
    event.preventDefault(); if (!drawingFile || !selected) return;
    setBusy(true); setError(""); setNotice("");
    try {
      if (drawingFile.size > 20 * 1024 * 1024) throw new Error("PDF-filen får vara högst 20 MB.");
      const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error("Kunde inte läsa filen.")); reader.readAsDataURL(drawingFile); });
      const response = await fetch(`/api/projects/${selected.id}/drawings`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ name: drawingName.trim() || drawingFile.name.replace(/\.pdf$/i, ""), data }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Kunde inte ladda upp ritningen.");
      await load(); setDrawingFile(null); setDrawingName(""); setNotice("Ritningen har lagts till.");
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  function openDrawing(drawing) { setActiveDrawing(drawing.id); setError(""); }
  function navigateFolder(id){setFolderId(id);setAllProjects(false);setSelectedId(null);setActiveDrawing(null);setEditing(false);setSearch("");setError("");setNotice("");}
  async function organizeProject(value){
    const {kind,action,entry}=organize;
    const path=kind==='folder'?`/api/project-folders${action==='create'?'':'/'+encodeURIComponent(entry.id)}`:`/api/projects/${encodeURIComponent(entry.id)}`;
    const body=kind==='folder'?(action==='create'?{name:value,parentId:entry.parentId||null}:action==='move'?{parentId:value||null}:{name:value}):(action==='move'?{folderId:value||null}:{name:value});
    const response=await fetch(path,{method:action==='create'?'POST':'PATCH',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(body)});
    const data=await response.json();if(!response.ok)throw new Error(data.message||'Kunde inte spara organiseringen.');
    if(kind==='project'&&action==='move'&&selectedId===entry.id)setFolderId(value||null);
    await load();setOrganize(null);setNotice(action==='create'?'Mappen har skapats.':action==='move'?'Flytten har sparats.':'Namnet har sparats.');
  }
  const organizingFolder=organize?.kind==='folder';
  const blockedFolders=organizingFolder&&organize.action==='move'?projectFolderDescendants(folders,organize.entry.id):new Set();
  const organizingLabels=organize?{title:organize.action==='create'?'Ny mapp':organize.action==='move'?(organizingFolder?'Flytta mapp':'Flytta projekt'):(organizingFolder?'Byt namn på mapp':'Byt namn på projekt'),name:organizingFolder?'Mappnamn':'Projektnamn',root:'Projekt & Korrektur – rotmappen',submit:organize.action==='create'?'Skapa mapp':organize.action==='move'?'Flytta':'Spara namn'}:{};
  const allMarkers = projectSigns(selected);

  const scoped=projects.filter(project=>projectMatchesPurchaser(project,purchaserFilter,nav.user));
  const filtered = scoped.filter(p => (statusFilter === "Alla" || p.status === statusFilter) && `${p.name} ${p.number} ${p.reservedOrderNumber||""} ${p.customer} ${p.object} ${p.purchaserName||''} ${p.purchaserEmail||''} ${projectFolderPath(folders,p.folderId).map(folder=>folder.name).join(" / ")}`.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>sort==='buyer'?String(a.purchaserName||a.purchaserEmail||'').localeCompare(String(b.purchaserName||b.purchaserEmail||''),'sv')||String(a.name).localeCompare(String(b.name),'sv'):sort==='name'?String(a.name).localeCompare(String(b.name),'sv'):String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||'')));
  return <PageContainer><AdminLayout active="projects" {...nav}>
    <main className="jsf-projects">
      {(!selected||editing)&&<WorkspacePageHeader className="project-heading" kicker="PROJEKT & KORREKTUR" title="Projekt & Korrektur" titleRef={backFocus} description={readOnly?'F\u00f6lj dina projekt och granska korrektur.':'Planera skyltar, samla underlag och hantera korrektur.'}>
       {!readOnly&&<><button type="button" className="project-secondary" onClick={()=>setOrganize({kind:'folder',action:'create',entry:{id:'new',name:'',parentId:folderId}})}>+ Ny mapp</button><button type="button" className="project-primary" onClick={startNew}>+ Nytt projekt</button></>}
      </WorkspacePageHeader>}
      {!editing&&!activeDrawing&&<ProjectFolderTrail folders={folders} folderId={selected?selected.folderId:folderId} onNavigate={navigateFolder}/>}
      {(error||catalogError)&&<WorkspaceFeedback error>{error||catalogError}</WorkspaceFeedback>}
      {notice&&<WorkspaceFeedback onDismiss={()=>setNotice("")}>{notice}</WorkspaceFeedback>}
      {selected && activeDrawing ? <ProjectDrawingPlanner readOnly={readOnly} key={activeDrawing} project={selected} drawing={selected.drawings.find(d => d.id === activeDrawing)} headers={headers} catalog={catalog} onClose={() => { setActiveDrawing(null); load(); }} onSaved={load} /> : null}
      {!selected && !editing && <>
        <div className="project-stats">{[["Totalt antal projekt", scoped.length], ["Aktiva projekt", scoped.filter(p => p.status === "Pågående").length], ["I planering", scoped.filter(p => p.status === "Planering").length], ["Avslutade", scoped.filter(p => p.status === "Avslutat").length]].map(([label, value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div>
        <div className="project-filters"><input aria-label="Sök projekt" placeholder="Sök projekt, kund, mapp eller projektnummer..." value={search} onChange={e => setSearch(e.target.value)} /><select aria-label="Filtrera projekt på beställare" value={purchaserFilter} onChange={e=>setPurchaserFilter(e.target.value)}><option value="all">Alla beställare</option>{(nav.user||nav.role==="bestallare")&&<option value="mine">Mina projekt</option>}{projectPurchaserOptions(projects).map(option=><option key={option.key} value={option.key}>{option.label}</option>)}<option value="unassigned">Utan beställare</option></select><select aria-label="Sortera projekt" value={sort} onChange={e=>setSort(e.target.value)}><option value="recent">Senaste först</option><option value="name">Projektnamn A–Ö</option><option value="buyer">Beställare A–Ö</option></select><select aria-label="Filtrera status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>{["Alla", ...STATUS].map(s => <option key={s}>{s}</option>)}</select></div>
        {loading&&!projects.length?<WorkspaceSkeleton label="Hämtar projekt"/>:<ProjectFolderBrowser folders={folders} projects={filtered} folderId={folderId} search={search} allProjects={allProjects} readOnly={readOnly} onNavigate={navigateFolder} onOpenProject={openProject} onOrganize={value=>{if(value.action==='delete'){setDeleteError('');setDeleteTarget({...value.entry,kind:value.kind});}else setOrganize(value);}} onShowAll={()=>setAllProjects(value=>!value)}/>}

      </>}
      {!activeDrawing && (selected || editing) && <>
        <button className="project-back jsf-back-link" onClick={() => { setSelectedId(null); setEditing(false); setError(""); setNotice(""); }}>← Tillbaka till mappen</button>
        {editing ? <form className="project-panel" onSubmit={saveProject}><h2>{selected ? `Redigera ${selected.number}` : "Skapa nytt projekt"}</h2><div className="project-form-grid"><label className="project-wide">Mapp<select value={form.folderId||""} onChange={event=>setForm(current=>({...current,folderId:event.target.value||null}))}><option value="">Projekt &amp; Korrektur – rotmappen</option>{projectFolderOptions(folders).map(folder=><option key={folder.id} value={folder.id}>{folder.label}</option>)}</select></label>{FIELDS.map(([key,label]) => <label key={key}>{label}<input required={key === "name"} type={key === "email" ? "email" : "text"} value={form[key] || ""} onChange={e => setForm(current => ({ ...current, [key]: e.target.value }))}/></label>)}<label>Prioritet<select value={form.priority || "planeringsbar"} onChange={e=>setForm(current=>({...current,priority:e.target.value,...(e.target.value!=="datum"?{requestedCompletionDate:""}:{})}))}><option value="planeringsbar">Planeringsbar</option><option value="snarast">Snarast</option><option value="datum">Önskat datum</option></select></label>{form.priority==="datum"&&<label>Önskat leverans-/utförandedatum<DatePicker value={form.requestedCompletionDate || ""} onChange={e=>setForm(current=>({...current,requestedCompletionDate:e.target.value}))}/></label>}<label className="project-wide">Önskemål om utförande / tid<input value={form.requestedExecutionNote || ""} onChange={e=>setForm(current=>({...current,requestedExecutionNote:e.target.value}))}/></label><label>Ansvarig<input value={form.responsible || ""} onChange={e=>setForm(current=>({...current,responsible:e.target.value}))}/></label><fieldset className="project-wide project-purchaser-fields"><legend>Beställare</legend><label>Namn<input value={form.purchaserName||""} onChange={e=>setForm(current=>({...current,purchaserName:e.target.value}))}/></label><label>Mejl<input type="email" value={form.purchaserEmail||""} onChange={e=>setForm(current=>({...current,purchaserEmail:e.target.value}))}/></label><label>Telefon<input type="tel" value={form.purchaserPhone||""} onChange={e=>setForm(current=>({...current,purchaserPhone:e.target.value}))}/></label><p>Beställaren får korrektur och notiser på sitt konto med samma mejladress. Kontot kan skapas senare.</p></fieldset><label>Status<select value={form.status} onChange={e => setForm(current => ({ ...current, status: e.target.value }))}>{STATUS.map(s => <option key={s}>{s}</option>)}</select></label><label className="project-wide">Beskrivning<textarea rows="4" value={form.notes || ""} onChange={e => setForm(current => ({ ...current, notes: e.target.value }))}/></label></div><div className="project-actions"><button className="project-primary" disabled={busy}><BusyLabel busy={busy}>{busy?"Sparar\u2026":"Spara projekt"}</BusyLabel></button><button type="button" className="project-secondary" onClick={() => { setEditing(false); if (!selected) setSelectedId(null); }}>Avbryt</button></div></form> : <>

          <header className="project-workspace-header">
            <div><div className="project-workspace-meta"><span>{selected.reservedOrderNumber||selected.number}</span>{selected.status&&<WorkspaceStatus status={selected.status}/>}</div><h1>{selected.name}</h1><p>{[selected.customer,selected.targetPoint&&`Målpunkt ${selected.targetPoint}`,selected.floor&&`Plan ${selected.floor}`].filter(Boolean).join(' · ')||'Ingen kund angiven'}</p></div>
            {!readOnly&&<WorkspaceMenu className="project-manage" key={selected.id} label="Hantera projekt" triggerRef={deleteButton}><button type="button" disabled={busy} onClick={editProject}>Redigera projekt</button><button type="button" onClick={()=>setOrganize({kind:"project",action:"rename",entry:selected})}>Byt namn</button><button type="button" onClick={()=>setOrganize({kind:"project",action:"move",entry:selected})}>Flytta projekt</button><button type="button" data-danger="true" disabled={busy} onClick={()=>{setDeleteError('');setDeleteTarget(selected);}}>Ta bort projekt</button></WorkspaceMenu>}
          </header>
          <nav className="project-workspace-nav" aria-label="Projektvyer">{[['overview','Översikt'],['proof','Korrektur'],['signs',`Skyltlista (${allMarkers.length})`],...((nav.role!=='bestallare'||selected.orderId)?[['documents','Order & dokument']]:[])].map(([value,label])=><button type="button" key={value} aria-current={workspaceView===value?'page':undefined} onClick={()=>setWorkspaceView(value)}>{label}</button>)}</nav>
          <div className="project-workspace-content" hidden={workspaceView!=='overview'}>
            <section className="project-overview-summary" aria-label="Projektöversikt"><div><small>Beställare</small><strong>{selected.purchaserName||'Ej angiven'}</strong>{selected.purchaserEmail&&<span>{selected.purchaserEmail}</span>}</div><div><small>Ritningar</small><strong>{selected.drawings?.length||0}</strong></div><div><small>Skyltpositioner</small><strong>{allMarkers.length}</strong></div><button type="button" onClick={()=>setWorkspaceView('proof')}>{nav.role==='bestallare'?'Granska korrektur':'Till korrektur'} →</button></section>
                      <div className="project-panel"><h2>Ritningar <span className="project-counter">{selected.drawings?.length || 0}</span></h2>{!(selected.drawings||[]).length&&<p>Lägg till skyltar i skyltlistan eller ladda upp en ritning.</p>}<div className="project-drawings">{(selected.drawings || []).map(d => <button className="project-drawing" key={d.id} onClick={() => openDrawing(d)}><span>▤</span><strong>{d.name}</strong><small>{readOnly ? "Visa ritning →" : "Planera skyltar →"}</small></button>)}</div>{!readOnly && <details className="project-upload-disclosure"><summary>Lägg till ritning</summary><form className="project-upload" onSubmit={uploadDrawing}><label>Ritningens namn<input value={drawingName} onChange={e => setDrawingName(e.target.value)} placeholder="T.ex. Plan 1 – Entréplan" /></label><label>PDF-ritning (max 20 MB)<input type="file" accept="application/pdf,.pdf" required onChange={e => setDrawingFile(e.target.files?.[0] || null)} /></label><button className="project-primary" disabled={busy || !drawingFile}>{busy ? "Laddar upp..." : "Lägg till ritning"}</button></form></details>}</div>

            <details className="project-info-disclosure" key={selected.id}><summary>Projektuppgifter och kontakt</summary><div className="project-details">{[["Kontakt",selected.contact],["E-post",selected.email],["Telefon",selected.phone],["Ansvarsnummer",selected.accountNumber],["Kundens ordernummer / referens",selected.customerReference ?? selected.number],["Projektkod",selected.projectCode ?? selected.number],["Förvaltningsobjekt",selected.managementObject ?? selected.object],["Målpunkt",selected.targetPoint],["Fastighet",selected.property],["Byggnad / hus",selected.building],["Plan",selected.floor],["Rum",selected.room],["Prioritet",selected.priority==="snarast"?"Snarast":selected.priority==="datum"?`Önskat datum: ${selected.requestedCompletionDate || "–"}`:"Planeringsbar"],["Önskemål om utförande / tid",selected.requestedExecutionNote],["Ansvarig",selected.responsible]].filter(([,value])=>value!==undefined&&value!==null&&String(value).trim()!=="").map(([key,value]) => <div key={key}><small>{key}</small><strong>{value || "–"}</strong></div>)}</div><div className="project-purchaser-summary"><strong>Beställare</strong><p>{[selected.purchaserName,selected.purchaserEmail,selected.purchaserPhone].filter(Boolean).join(' · ')||'Ej angiven'}</p></div>{selected.notes&&<p className="project-notes">{selected.notes}</p>}</details>
          </div>
          <div className="project-workspace-content" hidden={workspaceView!=='proof'}>          <ProjectApprovalPanel catalog={catalog} openRequest={openRequest} initialProofId={initialProofId} key={selected.id} project={selected} adminPassword={adminPassword} role={nav.role}/>
</div>
          <div className="project-workspace-content" hidden={workspaceView!=='signs'}><ProjectSignList key={selected.id} project={selected} catalog={catalog} headers={headers} readOnly={readOnly} onSaved={load} onDrawing={setActiveDrawing}/></div>
          <div className="project-workspace-content" hidden={workspaceView!=='documents'}>          {(nav.role!=="bestallare"||selected.orderId)&&<div className="project-panel"><div className="project-detail-heading"><div><h2>Order och dokument</h2><p>Alla skyltar i skyltlistan följer med, även skyltar utan ritning och importerade original.</p></div><div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>{nav.role !== "bestallare" && <><button type="button" className="project-secondary" disabled={busy || !allMarkers.length} onClick={()=>setWorkspaceView('proof')}>Skapa korrektur – PDF</button><button type="button" className="project-secondary" disabled={busy || !allMarkers.length} onClick={openProjectQuote}>Visa offert</button></>}{selected.orderId ? <strong>Order {selected.orderNumber || "skapad"}</strong> : !readOnly && <button type="button" className="project-primary" disabled={busy || !allMarkers.length} onClick={()=>{setOrderError('');setOrderConfirmation({id:selected.id,number:selected.number,count:allMarkers.length});}}>Skapa order från projekt</button>}</div></div></div>}
</div>
        </>}
      </>}
      {organize&&<DrawingLibraryOrganizeDialog key={`${organize.kind}-${organize.action}-${organize.entry.id}`} mode={organize.action==='move'?'move':'rename'} entry={{...organize.entry,folderId:organizingFolder?organize.entry.parentId:organize.entry.folderId}} folders={folders.filter(folder=>!blockedFolders.has(folder.id))} labels={organizingLabels} onClose={()=>setOrganize(null)} onSave={organizeProject}/>}
      {orderConfirmation&&<OrderDeleteDialog reference={orderConfirmation.number} contextLabel="PROJEKT" title="Skapa order?" confirmLabel="Skapa order" busyLabel="Skapar order…" busy={busy} error={orderError} onClose={()=>{if(!orderBusy.current)setOrderConfirmation(null);}} onConfirm={createProjectOrder} description={<>Skapa en order av {orderConfirmation.count} skyltpositioner i <strong>{orderConfirmation.number}</strong>? Alla skyltar, även importerade original och skyltar utan ritningsplacering, följer med.</>}/> }
      {deleteTarget && <OrderDeleteDialog entityLabel={deleteTarget.kind==='folder'?'mapp':'projekt'} contextLabel={deleteTarget.kind==='folder'?'MAPP':'PROJEKT'} reference={deleteTarget.kind==='folder'?deleteTarget.name:deleteTarget.number} busy={deleting} error={deleteError} returnFocusRef={deleteButton} onClose={() => { if (!deleteBusy.current) setDeleteTarget(null); }} onConfirm={deleteProject} description={deleteTarget.kind==='folder'?<>Vill du ta bort mappen <strong>{deleteTarget.name}</strong>? Projekt och undermappar flyttas upp en nivå. Inga projekt, ritningar eller korrektur tas bort.</>:<>Vill du ta bort projekt <strong>{deleteTarget.number} – {deleteTarget.name}</strong>? Projektet med dess ritningar och skyltlista tas bort och går inte att återställa. Redan skapade ordrar och kopior i ritningsbiblioteket finns kvar.</>} />}
      {proof && <ProjectProofModal project={proof} catalog={catalog} adminPassword={adminPassword} onClose={()=>setProof(null)}/>}
      {quote && <OrderAcknowledgementModal order={quote} variant="quote" onClose={()=>setQuote(null)}/> }
    </main>
    <style>{`
      .jsf-projects{box-sizing:border-box;width:100%;min-width:0;padding:32px 34px 48px;max-width:none;margin:0;color:#14221b}.project-kicker{font-size:10px;letter-spacing:.15em;color:#657a6e;font-weight:800}.project-heading,.project-detail-heading{display:flex;justify-content:space-between;align-items:center;gap:20px}.project-heading h1{font-size:36px;letter-spacing:-.04em;margin:6px 0}.project-heading p,.project-panel>p,.project-detail-heading p{color:#718078;font-size:13px;margin:0 0 20px}.project-primary{background:#15583e;color:white;border:0;border-radius:9px;padding:13px 20px;font-weight:700;cursor:pointer;white-space:nowrap}.project-primary:disabled{opacity:.5;cursor:wait}.project-secondary{background:white;border:1px solid #d9e0db;border-radius:9px;padding:12px 18px;cursor:pointer;color:#183b2c}.project-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:22px 0}.project-stats>div{border:1px solid #e3e9e5;border-radius:13px;padding:20px;background:white;display:grid;gap:9px}.project-stats small,.project-details small{font-size:12px;color:#76837c}.project-stats strong{font-size:30px}.project-filters{display:flex;flex-wrap:wrap;gap:12px;margin:24px 0}.project-filters input{flex:1}.project-filters input,.project-filters select,.project-form-grid input,.project-form-grid select,.project-form-grid textarea,.project-upload input{box-sizing:border-box;min-height:42px;padding:10px 12px;border:1px solid #dce4de;border-radius:9px;background:white;font:inherit;font-size:13px;max-width:100%}.project-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.project-card{background:white;border:1px solid #e2e7e3;border-radius:14px;padding:23px;text-align:left;cursor:pointer;min-height:185px;display:flex;flex-direction:column}.project-card:hover{border-color:#7bb89a;box-shadow:0 12px 30px #102d1b0b}.project-card-top,.project-card-foot{display:flex;justify-content:space-between;align-items:center;gap:10px;color:#708078;font-size:11px}.project-status{background:#eaf3ed;color:#245b42;border-radius:99px;padding:6px 10px}.project-card h2{font-size:18px;margin:22px 0 4px}.project-card p{color:#758079;font-size:12px;margin:0}.project-card-foot{margin-top:auto;padding-top:24px}.project-empty{background:white;border:1px solid #e2e7e3;padding:45px;border-radius:14px;text-align:center;color:#7b857e}.project-back{border:0;background:transparent;color:#15583e;cursor:pointer;margin:15px 0 20px;padding:0}.project-panel{background:white;border:1px solid #e1e8e2;border-radius:15px;padding:25px;margin-bottom:16px}.project-panel h2{font-size:20px;margin:0 0 20px}.project-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.project-form-grid label,.project-upload label{display:grid;gap:7px;font-size:12px;font-weight:700}.project-wide{grid-column:1/-1}.project-actions{display:flex;gap:10px;margin-top:22px}.project-details{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;margin-top:18px}.project-details>div{display:grid;gap:5px}.project-details strong{font-size:13px;overflow-wrap:anywhere}.project-notes{white-space:pre-wrap;border-top:1px solid #e5eae6;padding-top:18px;margin-top:25px!important}.project-counter{font-size:13px;color:#718078}.project-drawings{display:grid;gap:8px;margin:20px 0}.project-drawing{border:1px solid #e0e8e2;background:#fafcfb;border-radius:9px;padding:13px;display:flex;align-items:center;gap:12px;text-align:left;cursor:pointer}.project-drawing strong{flex:1}.project-drawing small{color:#15583e}.project-upload{display:grid;grid-template-columns:1fr 1fr auto;align-items:end;gap:12px;padding-top:18px;border-top:1px solid #e7ebe8}.project-error,.project-success{padding:12px 15px;border-radius:9px;margin:14px 0;background:#fff0ec;color:#9b3e2b}.project-success{background:#e8f4ec;color:#176344}@media(max-width:1100px){.project-grid{grid-template-columns:repeat(2,1fr)}.project-upload{grid-template-columns:1fr 1fr}.project-upload button{grid-column:1/-1}}@media(max-width:760px){.jsf-projects{padding:22px 15px}.project-heading{align-items:start;flex-direction:column}.project-grid,.project-stats,.project-form-grid,.project-details,.project-upload{grid-template-columns:1fr}.project-upload button{grid-column:auto}.project-filters{flex-direction:column}}
      .jsf-minimal .jsf-projects{padding:32px 34px 48px}@media(max-width:760px){.jsf-minimal .jsf-projects{padding:20px 15px}}
      .project-sign-table{overflow:auto}.project-sign-head,.project-sign-row{display:grid;grid-template-columns:90px 1.2fr 1.3fr 1.4fr 60px;gap:12px;align-items:center;min-width:620px;padding:12px;border-bottom:1px solid #e5ebe7;font-size:12px}.project-sign-head{color:#738077;font-weight:700}.project-sign-row{width:100%;background:white;border:0;border-bottom:1px solid #e5ebe7;text-align:left;cursor:pointer}.project-sign-row:hover{background:#f4f8f5}
    `}</style>
  </AdminLayout></PageContainer>;
}

