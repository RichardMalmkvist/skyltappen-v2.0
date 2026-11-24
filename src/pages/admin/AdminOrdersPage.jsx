import ProjectOriginalFiles from '../../components/orders/ProjectOriginalFiles';
import {WorkspacePageHeader,WorkspaceStatus,WorkspaceFeedback,WorkspaceSkeleton,BusyLabel} from '../../components/workspace/WorkspaceUI';
import DatePicker from '../../components/forms/DatePicker';
import {canExportParking,canExportOT,canExportDibond,canExportDoor,canExportFixed,canExportProduction,hasBothProductionFiles,downloadPlotterExport} from "../../data/plotterExport";
import OrderPdfAttachments from "../../components/orders/OrderPdfAttachments";
import OrderDeleteDialog from "../../components/orders/OrderDeleteDialog";
import OrderUserFilter, { orderMatchesUser } from "../../components/orders/OrderUserFilter";
import { orderMatchesSearch } from "../../data/orderSearch";
import { useEffect, useMemo, useRef, useState } from "react";
import PageContainer from "../../components/layout/PageContainer";
import { AdminLayout } from "../../components/admin/AdminNavigation";
import { getCartItemDisplayRows } from "../../data/orderDisplayHelpers";
import OrderAcknowledgementModal from "../../components/orders/OrderAcknowledgementModal";
import OrderEditModal from "../../components/orders/OrderEditModal";
import { DEPARTMENT_NAMES, DEPARTMENT_STATES, DepartmentStatusIcon, selectedDepartments, allDepartmentsComplete } from "../../components/orders/DepartmentStatus";
import { getOrderDetails } from "../../data/orderDetailsHelpers";
import { getOrderCustomer } from "../../data/orderCustomer";


const STATUS_OPTIONS = [
  { value: "all", label: "Alla aktiva" },
  { value: "godkänd", label: "Godkänd" },
  { value: "påbörjad", label: "I produktion" },
  { value: "klar", label: "Klar" },
  { value: "skickad", label: "Skickad" },
  { value: "levererad", label: "Levererad" },
];

const ORDER_STATUSES = new Set(["godkänd", "påbörjad", "klar", "skickad", "levererad"]);
const DOWNLOAD_BUTTON_STYLE = {padding:"6px 8px",background:"white",border:"1px solid #dce4de",cursor:"pointer",fontSize:11};

function money(value) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function dateTime(value) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("sv-SE", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}

function qty(order) {
  return (order.cart || []).reduce(
    (sum, item) => sum + Math.max(1, Number(item.quantity) || 1),
    0
  );
}

function statusLabel(status) {
  const value = String(status || "").toLowerCase();
  if (value === "ny") return "Ny";
  if (value === "väntar_godkännande") return "Väntar på godkännande";
  if (value === "behöver_kompletteras") return "Behöver kompletteras";
  if (value === "godkänd") return "Godkänd";
  if (value === "påbörjad") return "I produktion";
  if (value === "klar") return "Klar";
  if (value === "skickad") return "Skickad";
  if (value === "levererad") return "Levererad";
  return status || "-";
}

const PLAN_DEPARTMENTS = ["Layout", "Produktion", "Montering", "Packning"];
function initialProductionPlan(order) {
  const existing = order.productionPlan || {};
  return {
    year: Number(existing.year) || new Date().getFullYear(),
    deliveryDate: existing.deliveryDate || "",
    installationDate: existing.installationDate || "",
    departments: Object.fromEntries(PLAN_DEPARTMENTS.map(name => {
      const row = existing.departments?.[name] || {};
      return [name, {enabled: row.enabled !== undefined ? Boolean(row.enabled) : true, week: String(row.week || ""), day: String(row.day || ""), entry: ""}];
    }))
  };
}
function PlanOrderModal({order,onClose,onSave,saving}) {
  const [plan,setPlan] = useState(() => initialProductionPlan(order));
  const [error,setError] = useState("");
  const updateRow = (name, changes) => setPlan(old => ({...old,departments:{...old.departments,[name]:{...old.departments[name],...changes}}}));
  function submit(event) {
    event.preventDefault();
    if (!plan.deliveryDate && !plan.installationDate) {setError("Ange leveransdatum eller montagedatum.");return;}
    if (!PLAN_DEPARTMENTS.some(name => plan.departments[name].enabled && plan.departments[name].week && plan.departments[name].day)) {setError("Planera minst en avdelning med vecka och färdigdag.");return;}
    if (PLAN_DEPARTMENTS.some(name => plan.departments[name].enabled && (!plan.departments[name].week || !plan.departments[name].day))) {setError("Alla aktiva avdelningar behöver vecka och färdigdag.");return;}
    const {departments,...rest}=plan;
    onSave({...rest,departments:Object.fromEntries(PLAN_DEPARTMENTS.map(name=>[name,{enabled:departments[name].enabled,week:departments[name].enabled?departments[name].week:"",day:departments[name].enabled?departments[name].day:""}]))});
  }
  return <div className="jsf-plan-edit-backdrop" role="dialog" aria-modal="true" aria-label="Planera order">
    <form className="jsf-plan-edit-card" onSubmit={submit}>
      <h2>Planera {order.orderNumber}</h2>
      
      <label>Planeringsår<input type="number" min="2020" max="2100" value={plan.year} onChange={e=>setPlan(old=>({...old,year:Number(e.target.value)}))}/></label>
      {PLAN_DEPARTMENTS.map(name => {
        const row=plan.departments[name];
        return <div className="planning-department" key={name}>
          <label className="department-check"><input type="checkbox" checked={row.enabled} onChange={e=>updateRow(name,{enabled:e.target.checked})}/> {name}</label>
          <input aria-label={`${name} färdigvecka och dag`} disabled={!row.enabled} type="text" inputMode="numeric" placeholder="42:3" value={row.week && row.day ? `${row.week}:${row.day}` : row.entry || ""} onChange={e=>{const entry=e.target.value.replace(/[^0-9:]/g,"");const match=/^(\d{1,2}):([1-5])$/.exec(entry);const valid=match && Number(match[1])>=1 && Number(match[1])<=53;updateRow(name,{entry,week:valid?String(Number(match[1])):"",day:valid?match[2]:""});}}/>
          <strong>{row.enabled && row.week && row.day ? `v.${row.week}:${row.day}` : ""}</strong>
        </div>;
      })}
      <div className="planning-dates"><label>Bekräftat leveransdatum<DatePicker value={plan.deliveryDate} onValueChange={value=>setPlan(old=>({...old,deliveryDate:value}))}/></label><label>Bekräftat montagedatum<DatePicker value={plan.installationDate} onValueChange={value=>setPlan(old=>({...old,installationDate:value}))}/></label></div>
      {error && <p role="alert" style={{color:"#a12d2d"}}>{error}</p>}
      <div className="jsf-plan-edit-actions"><button type="button" onClick={onClose}>Avbryt</button><button disabled={saving}><BusyLabel busy={saving}>{saving?"Sparar…":"Spara planering"}</BusyLabel></button></div>
    </form>
    <style>{`.jsf-plan-edit-backdrop{position:fixed;inset:0;z-index:2000;background:#20242870;display:grid;place-items:center;padding:16px}.jsf-plan-edit-card{background:#fff;border-radius:0;padding:26px;width:min(650px,100%);max-height:90vh;overflow:auto;display:grid;gap:13px;box-shadow:0 20px 60px #0002}.jsf-plan-edit-card h2{margin:0;font-size:18px}.jsf-plan-edit-card p{margin:0;color:#74797e;font-size:12px}.jsf-plan-edit-card label{display:grid;gap:5px;font-size:12px;font-weight:400}.jsf-plan-edit-card input:not([type=checkbox]){padding:10px;border:1px solid #e0e2e4;border-radius:0;font:inherit;min-width:0}.jsf-plan-edit-card .planning-department{display:grid;grid-template-columns:minmax(120px,1fr) 125px 75px;align-items:center;gap:12px}.jsf-plan-edit-card .department-check{display:flex;gap:8px;align-items:center}.jsf-plan-edit-card .planning-department strong{font-size:12px;color:#303437}.jsf-plan-edit-card .planning-dates{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:8px}.jsf-plan-edit-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:10px}.jsf-plan-edit-actions button{border:1px solid #e0e2e4;border-radius:0;padding:11px 16px;background:#fff;cursor:pointer}.jsf-plan-edit-actions button:last-child{background:#303437;color:white;border-color:#303437}.jsf-plan-edit-actions button:disabled{opacity:.5}@media(max-width:550px){.jsf-plan-edit-card .planning-department{grid-template-columns:1fr 1fr}.jsf-plan-edit-card .planning-dates{grid-template-columns:1fr}}`}</style>
  </div>;
}

export default function AdminOrdersPage({
  orders = [],
  loading=false,orderFetchError="",
  user,
  role,
  onLogout,
  onOpenProfile,
  adminPassword,
  onOrdersChanged,
  onOpenDashboard,onOpenBadgeOrders,
  onOpenOrders,
  onOpenApprovalOrders,
  onOpenStatistics,onOpenPlanning,
  onOpenArticles,
  onOpenSymbols,
  onOpenArticleGroups,
  onOpenProjects,
  onOpenUsers,
  onOpenDrawings,
  onOpenSettings,
  onOpenPortal,
}) {
  const canEdit = role === "admin";
  const actionBarRef = useRef(null);
  useEffect(() => {
    const closeMenus = event => {
      const bar = actionBarRef.current;
      if (!bar) return;
      if (event.type === "keydown" && event.key !== "Escape") return;
      if (event.type === "pointerdown" && bar.contains(event.target)) return;
      bar.querySelectorAll("details[open]").forEach(menu => {
        menu.open = false;
        if (event.type === "keydown") menu.querySelector("summary")?.focus();
      });
    };
    document.addEventListener("pointerdown", closeMenus);
    document.addEventListener("keydown", closeMenus);
    return () => {
      document.removeEventListener("pointerdown", closeMenus);
      document.removeEventListener("keydown", closeMenus);
    };
  }, []);
  const closeActionMenu = event => {
    const menu = event.currentTarget.closest("details");
    if (menu) { menu.open = false; menu.querySelector("summary")?.focus(); }
  };
  const openActionMenu = event => {
    if (!event.currentTarget.open) return;
    actionBarRef.current?.querySelectorAll("details[open]").forEach(menu => {
      if (menu !== event.currentTarget) menu.open = false;
    });
  };
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [busyStatus, setBusyStatus] = useState(false);
  const [busyDepartment, setBusyDepartment] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [exportingPlotter,setExportingPlotter]=useState(false);
  const [showAcknowledgement, setShowAcknowledgement] = useState(false);
  const [documentVariant, setDocumentVariant] = useState("acknowledgement");
  const [showEdit, setShowEdit] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [savingCreate, setSavingCreate] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [catalogArticles, setCatalogArticles] = useState([]);
  const [deleteTarget,setDeleteTarget]=useState(null);
  const [deletingOrder,setDeletingOrder]=useState(false);
  const [deleteError,setDeleteError]=useState('');
  const deleteBusyRef=useRef(false);
  const deleteReturnFocus=useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/catalog",{headers:{"x-admin-password":adminPassword},cache:"no-store"})
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("catalog")))
      .then((data) => { if (!cancelled) setCatalogArticles(Array.isArray(data?.articles) ? data.articles : []); })
      .catch(() => { if (!cancelled) setError("Kunde inte hämta artikelregistret. Logga in igen om inloggningen har gått ut."); });
    return () => { cancelled = true; };
  }, [adminPassword]);

  const activeOrders = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return [...orders]
      .filter((order) => role === "personal" || ORDER_STATUSES.has(String(order.status || "").toLowerCase()))
      .filter((order) => orderMatchesUser(order, userFilter, user?.id, user?.email))
      .filter((order) => {
        const status = String(order.status || "").toLowerCase();
        // Searching includes delivered orders; the default list only shows active work.
        return statusFilter === "all" ? Boolean(needle) || status !== "levererad" : status === statusFilter;
      })
      .filter((order) => {
        if (!needle) return true;
        return orderMatchesSearch(order, needle);
      })
      .sort((a, b) => new Date(b.approvedAt || b.createdAt || 0) - new Date(a.approvedAt || a.createdAt || 0));
  }, [orders, search, statusFilter, userFilter, user?.id, user?.email, role]);

  const selectedOrder =
    activeOrders.find((order) => order.id === selectedId) || activeOrders[0] || null;

  const stats = useMemo(() => {
    const approved = orders.filter((o) => String(o.status || "").toLowerCase() === "godkänd").length;
    const inProduction = orders.filter((o) => String(o.status || "").toLowerCase() === "påbörjad").length;
    const ready = orders.filter((o) => String(o.status || "").toLowerCase() === "klar").length;
    const delivered = orders.filter((o) => String(o.status || "").toLowerCase() === "levererad").length;
    return { approved, inProduction, ready, delivered };
  }, [orders]);

  async function saveProductionPlan(plan) {
    if (!selectedOrder || savingPlan) return;
    setSavingPlan(true);setError("");setMessage("");
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(selectedOrder.id)}/production-plan`, {
        method:"PUT",headers:{"Content-Type":"application/json","x-admin-password":adminPassword || ""},body:JSON.stringify(plan)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Kunde inte spara planeringen.");
      setShowPlan(false);setMessage(`Planeringen för ${data.order.orderNumber} har sparats.`);
      if (onOrdersChanged) await onOrdersChanged();
    } catch (err) {setError(err.message || "Kunde inte spara planeringen.");}
    finally {setSavingPlan(false);}
  }

  async function createManualOrder(draft) {
    if (savingCreate) return;
    if (!draft.cart?.length) { setError("Lägg till minst en artikel på ordern."); return; }
    setSavingCreate(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/orders/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": adminPassword || "" },
        body: JSON.stringify({ orderer: { ...(draft.orderer || {}), customer: draft.orderer?.customer || draft.delivery?.company || "" }, delivery: draft.delivery || {}, orderDetails: draft.orderDetails || {}, cart: draft.cart }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Kunde inte skapa ordern.");
      setShowCreate(false);
      setSelectedId(data.order.id);
      setStatusFilter("all");
      setMessage(`Order ${data.order.orderNumber} skapades. Planera avdelningar och slutleverans innan produktionsstart.`);
      if (onOrdersChanged) await onOrdersChanged();
    } catch (err) { setError(err.message || "Kunde inte skapa ordern."); }
    finally { setSavingCreate(false); }
  }

  async function saveOrderEdits(draft) {
    if (!selectedOrder || savingEdit) return;
    setSavingEdit(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword,
        },
        body: JSON.stringify({
          orderer: draft.orderer || {},
          delivery: draft.delivery || {},
          orderDetails: draft.orderDetails || {},
          cart: draft.cart || [],
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Kunde inte spara ordern.");
      setMessage(`Order ${selectedOrder.orderNumber || selectedOrder.submissionNumber || ""} uppdaterades.`);
      setShowEdit(false);
      if (onOrdersChanged) await onOrdersChanged();
    } catch (err) {
      setError(err.message || "Kunde inte spara ordern.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteSelectedOrder() {
    if (!canEdit||!deleteTarget||deleteBusyRef.current) return;
    const target=deleteTarget,number=target.orderNumber||target.submissionNumber||'ordern';
    deleteBusyRef.current=true;setDeletingOrder(true);setDeleteError('');
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(target.id)}`, {
        method: "DELETE",
        headers: { "x-admin-password": adminPassword },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Kunde inte ta bort ordern.");
      setDeleteTarget(null);
      setSelectedId(null);
      setShowAcknowledgement(false);
      setShowEdit(false);
      setMessage(`${number} är borttagen.`);
      if (onOrdersChanged) await onOrdersChanged();
    } catch (err) {
      setDeleteError(err.message || "Kunde inte ta bort ordern.");
      setError(err.message || "Kunde inte ta bort ordern.");
    } finally {
      deleteBusyRef.current=false;setDeletingOrder(false);
    }
  }

  async function updateDepartmentFromOrders(department, status) {
    if (!selectedOrder || busyDepartment) return;
    setBusyDepartment(department);
    setMessage(""); setError("");
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(selectedOrder.id)}/department-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-password": adminPassword || "" },
        body: JSON.stringify({ department, status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Kunde inte spara avdelningsstatus.");
      setMessage(`${department} uppdaterad. Orderstatus: ${statusLabel(data.order.status)}.`);
      if (onOrdersChanged) await onOrdersChanged();
    } catch (err) { setError(err.message || "Kunde inte uppdatera avdelningen."); }
    finally { setBusyDepartment(""); }
  }

  async function exportPlotter(itemIndex,productionKind='all') {
    if(!selectedOrder||exportingPlotter)return;
    const includesDibond=(selectedOrder.cart||[]).some((item,index)=>(itemIndex===undefined||index===itemIndex)&&(canExportParking(item)||canExportDibond(item)||canExportDoor(item)||canExportOT(item)||canExportFixed(item)));
    const includesOT=(selectedOrder.cart||[]).some((item,index)=>(itemIndex===undefined||index===itemIndex)&&canExportOT(item));
    setExportingPlotter(true);setError("");setMessage("");
    try{await downloadPlotterExport(selectedOrder,adminPassword,itemIndex,productionKind);setMessage((selectedOrder.cart||[]).some((item,index)=>(itemIndex===undefined||index===itemIndex)&&item.projectOriginal&&item.productionFile?.mime==='application/pdf')?"Original-PDF:en är hämtad oförändrad med skärlinjer. Vid flera exemplar får du en ZIP med en PDF per exemplar. Använd originalstorlek (100 %).":productionKind==='all'&&(selectedOrder.cart||[]).some((item,index)=>(itemIndex===undefined||index===itemIndex)&&hasBothProductionFiles(item))?"Filerna är hämtade som ZIP med både kundanpassat underlag och produktionsoriginal. Använd originalstorlek (100 %).":includesOT?"Produktionsfilen är skapad. OT-tavlorna har en sida per beställt exemplar, med ordernummer och exemplarnummer. Skriv ut i originalstorlek (100 %).":includesDibond?"Produktionsfilen är skapad med tryckmotiv och ordermärkning. Använd originalstorlek (100 %).":"Plotterfilen är skapad med ordermärkning på Print Data. Öppna i GoSign i skala 100 % och använd endast CutContour för skärning.");}
    catch(error){setError(error.message);}
    finally{setExportingPlotter(false);}
  }

  async function updateStatus(nextStatus) {
    if (!selectedOrder || busyStatus || busyDepartment) return;
    if (nextStatus === "levererad" && !allDepartmentsComplete(selectedOrder)) {
      setError("Alla valda avdelningar måste vara klara innan ordern kan levereras.");
      return;
    }
    setBusyStatus(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/orders/${selectedOrder.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Kunde inte uppdatera ordern.");
      setMessage(`Order ${selectedOrder.orderNumber || ""} är nu ${statusLabel(nextStatus).toLowerCase()}.`);
      if (onOrdersChanged) await onOrdersChanged();
    } catch (err) {
      setError(err.message || "Kunde inte uppdatera ordern.");
    } finally {
      setBusyStatus(false);
    }
  }

  return (
    <PageContainer>
      <AdminLayout
        role={role} user={user} onLogout={onLogout} onOpenProfile={onOpenProfile}
        active="orders"
        onOpenDashboard={onOpenDashboard} onOpenBadgeOrders={onOpenBadgeOrders}
        onOpenOrders={onOpenOrders}
        onOpenApprovalOrders={onOpenApprovalOrders}
        onOpenStatistics={onOpenStatistics} onOpenPlanning={onOpenPlanning}
        onOpenArticles={onOpenArticles}
        onOpenSymbols={onOpenSymbols}
        onOpenArticleGroups={onOpenArticleGroups}
        onOpenProjects={onOpenProjects}
        onOpenUsers={onOpenUsers}
        onOpenDrawings={onOpenDrawings}
        onOpenSettings={onOpenSettings}
        onOpenPortal={onOpenPortal}
      >
        <main className="orders-page-new">
          <WorkspacePageHeader className="orders-head-new" kicker="ORDERFLÖDE" title="Lagda ordrar" description="Följ beställningar, planering och produktion.">
            {canEdit&&<button type="button" className="refresh-new primary-new" onClick={()=>setShowCreate(true)}>+ Ny order</button>}
            <button type="button" className="refresh-new" disabled={loading} aria-busy={loading} onClick={()=>onOrdersChanged&&onOrdersChanged()}><BusyLabel busy={loading}>{loading?'Uppdaterar\u2026':'Uppdatera'}</BusyLabel></button>
          </WorkspacePageHeader>

          <section className="order-stats-new">
            <article><span>Godkända</span><strong>{stats.approved}</strong></article>
            <article><span>I produktion</span><strong>{stats.inProduction}</strong></article>
            <article><span>Klara</span><strong>{stats.ready}</strong></article>
            <article><span>Levererade</span><strong>{stats.delivered}</strong></article>
          </section>

          {message&&<WorkspaceFeedback onDismiss={()=>setMessage("")}>{message}</WorkspaceFeedback>}
          {(error||orderFetchError)&&<WorkspaceFeedback error>{error||orderFetchError}</WorkspaceFeedback>}

          <div className="orders-toolbar-new" style={{gridTemplateColumns:"minmax(0,1fr) minmax(150px,180px) minmax(170px,220px)",alignItems:"end"}}>
            <input
              aria-label="Sök bland lagda ordrar"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Sök ordernummer, kund, kundens referens, projekt, artikel ..."
            />
            <select aria-label="Filtrera orderstatus" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setSelectedId(null); }}>
              {(role === "personal" ? [...STATUS_OPTIONS, {value:"ny",label:"Ny"}, {value:"väntar_godkännande",label:"Väntar på godkännande"}, {value:"behöver_kompletteras",label:"Behöver kompletteras"}] : STATUS_OPTIONS).map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <OrderUserFilter orders={orders} userId={user?.id} value={userFilter} onChange={value => { setUserFilter(value); setSelectedId(null); }}/>
          </div>

          {loading&&!orders.length?<WorkspaceSkeleton kind="orders" label="Hämtar ordrar"/>:<div className="orders-layout-new" aria-busy={loading}>
            <section className="orders-list-new">
              <div className="list-head-new">
                <strong>{activeOrders.length} ordrar</strong>
                <span>Senaste först</span>
              </div>
              {activeOrders.length ? activeOrders.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  className={`order-card-new ${selectedOrder?.id === order.id ? "active" : ""}`}
                  onClick={() => { setSelectedId(order.id); setShowAcknowledgement(false); }}
                >
                  <div className="card-top-new">
                    <span className="order-no-new">{order.orderNumber || order.submissionNumber || "Order"}</span>
                    <WorkspaceStatus status={order.status} label={statusLabel(order.status)}/>
                  </div>
                  <strong>{getOrderCustomer(order) || order.orderer?.ordererName || order.delivery?.recipient || "Okänd kund"}</strong>
                  <span>{order.delivery?.company || order.orderer?.ordererEmail || "-"}</span>
                  <div className="card-meta-new">
                    <span>{qty(order)} st</span>
                    <span>{money(order.orderTotal)}</span>
                    <span>{dateTime(order.approvedAt || order.createdAt)}</span>
                  </div>
                </button>
              )) : (
                <div className="empty-new"><span>▤</span><h3>Inga ordrar här ännu</h3></div>
              )}
            </section>

            <section className="order-detail-new">
              {selectedOrder ? (
                <>
                  <div className="detail-head-new">
                    <div>
                      <span className="detail-order-no-new">{selectedOrder.orderNumber || selectedOrder.submissionNumber}</span>
                      <h2>{selectedOrder.orderer?.ordererName || selectedOrder.delivery?.recipient || "Order"}</h2>
                      <p>Godkänd {dateTime(selectedOrder.approvedAt || selectedOrder.createdAt)}</p>
                    </div>
                    <WorkspaceStatus status={selectedOrder.status} label={statusLabel(selectedOrder.status)}/>
                  </div>

                  <div className="detail-grid-new">
                    <div style={{ display: "grid", gap: 12, alignContent: "start", minWidth: 0 }}>
                      <div className="info-new">
                      <h3>Kund / kontakt</h3>
                      <p><b>Kund / verksamhet</b><span>{getOrderCustomer(selectedOrder) || "-"}</span></p>
                      <p><b>Kontakt</b><span>{selectedOrder.orderer?.ordererName || "-"}</span></p>
                      <p><b>E-post</b><span>{selectedOrder.orderer?.ordererEmail || "-"}</span></p>
                      <p><b>Telefon</b><span>{selectedOrder.orderer?.ordererPhone || "-"}</span></p>
                      <p><b>Ansvarsnummer</b><span>{selectedOrder.orderer?.accountNumber || "-"}</span></p>
                    </div>
                    {(selectedOrder.orderer?.purchaserName || selectedOrder.orderer?.purchaserPhone || selectedOrder.orderer?.purchaserEmail) && (
                      <div className="info-new" aria-label="Beställare">
                        <h3>Beställare</h3>
                        <p><b>Namn</b><span>{selectedOrder.orderer?.purchaserName || "-"}</span></p>
                        <p><b>Telefon</b><span>{selectedOrder.orderer?.purchaserPhone || "-"}</span></p>
                        <p><b>Mejl</b><span style={{ overflowWrap: "anywhere", minWidth: 0 }}>{selectedOrder.orderer?.purchaserEmail || "-"}</span></p>
                      </div>
                    )}
                    </div>
                    <div className="info-new">
                      <h3>Projekt / objekt</h3>
                      <p><b>Referens</b><span>{getOrderDetails(selectedOrder).customerReference || "-"}</span></p>
                      <p><b>Projekt</b><span>{getOrderDetails(selectedOrder).projectName || "-"}</span></p>
                      <p><b>Projektkod</b><span>{getOrderDetails(selectedOrder).projectCode || "-"}</span></p>
                      <p><b>Förv. obj.</b><span>{getOrderDetails(selectedOrder).managementObject || "-"}</span></p>
                      <p><b>Målpunkt</b><span>{getOrderDetails(selectedOrder).targetPoint || "-"}</span></p>
                      <p><b>Fastighet</b><span>{getOrderDetails(selectedOrder).property || "-"}</span></p>
                      <p><b>Byggnad</b><span>{getOrderDetails(selectedOrder).building || "-"}</span></p>
                      <p><b>Plan / rum</b><span>{[getOrderDetails(selectedOrder).floor, getOrderDetails(selectedOrder).room].filter(Boolean).join(" / ") || "-"}</span></p>
                      <p><b>Önskat datum</b><span>{getOrderDetails(selectedOrder).requestedCompletionDate || "-"}</span></p>
                      <p><b>Utförande</b><span>{getOrderDetails(selectedOrder).requestedExecutionNote || "-"}</span></p>
                    </div>
                  </div>

                  {selectedOrder.orderer?.messageToSupplier ? (
                    <div className="message-new"><b>Beskrivning</b><p>{selectedOrder.orderer.messageToSupplier}</p></div>
                  ) : null}

                  <OrderPdfAttachments files={selectedOrder.attachments||[]} orderId={selectedOrder.id} headers={{"x-admin-password":adminPassword}}/>
                  <section className="order-articles-section-new order-articles-compact" aria-label="Beställda artiklar">
                    <div className="order-article-table-wrap">
                      <table className="order-article-table">
                        <thead><tr><th scope="col">Artikel</th><th scope="col">Beskrivning</th><th scope="col">Antal</th><th scope="col">Summa</th></tr></thead>
                        <tbody>{(selectedOrder.cart || []).map((item, index) => (
                          <tr key={item.id || `${item.articleNumber}-${index}`}>
                            <td>{item.projectOriginal&&<ProjectOriginalFiles orderId={selectedOrder.id} item={item} index={index} credential={adminPassword}/>}<span className="order-article-name">{item.badgeName || item.name || "Artikel"}</span><small>{item.articleNumber ? `Art.nr ${item.articleNumber}` : ""}</small>{canExportProduction(item)&&(hasBothProductionFiles(item)?<div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:8}}><button type="button" style={DOWNLOAD_BUTTON_STYLE} disabled={exportingPlotter} onClick={()=>exportPlotter(index,'layout')}>{canExportDoor(item)?'Pappersutskrift – PDF':'Kundanpassad fil – PDF'}</button><button type="button" style={DOWNLOAD_BUTTON_STYLE} disabled={exportingPlotter} onClick={()=>exportPlotter(index,'original')}>Produktionsoriginal – PDF</button><button type="button" style={DOWNLOAD_BUTTON_STYLE} disabled={exportingPlotter} onClick={()=>exportPlotter(index)}>Ladda ner båda – ZIP</button></div>:<button type="button" disabled={exportingPlotter} onClick={()=>exportPlotter(index)} style={{...DOWNLOAD_BUTTON_STYLE,marginTop:8}}>{exportingPlotter?"Skapar fil…":item.projectOriginal&&item.productionFile?.mime==='application/pdf'&&Number(item.quantity)>1?"Produktionsfiler – ZIP":(canExportParking(item)||canExportDibond(item)||canExportDoor(item)||canExportOT(item)||canExportFixed(item))?"Produktionsfil – PDF":"Plotterfil – GoSign"}</button>)}</td>
                            <td><div className="order-article-description">{getCartItemDisplayRows(item).filter(row => row.label !== "Antal").map((row, rowIndex) => (
                              <span key={`${row.label}-${rowIndex}`}><span className="order-article-field">{row.label}</span>{row.value}</span>
                            ))}</div></td>
                            <td>{item.quantity || 1} st</td>
                            <td>{money(item.lineTotal ?? (Number(item.unitPrice || 0) * Number(item.quantity || 1)))}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                    <div className="total-new"><span>Ordersumma</span><strong>{money(selectedOrder.orderTotal)}</strong></div>
                  </section>

                  <div ref={actionBarRef} className="order-action-bar" key={`actions-${selectedOrder.id}`}>
                    {(selectedOrder.cart||[]).some(canExportProduction)&&<button type="button" disabled={exportingPlotter} onClick={()=>exportPlotter()}>{exportingPlotter?"Skapar filer…":(selectedOrder.cart||[]).some(item=>canExportDibond(item)||canExportDoor(item)||canExportOT(item)||canExportFixed(item))?"Produktionsfiler – PDF":"Plotterfiler – GoSign"}</button>}
                    {canEdit && <button type="button" onClick={() => setShowPlan(true)} disabled={selectedOrder.status === "levererad"}>Planera order</button>}
                    {canEdit && <button type="button" onClick={() => setShowEdit(true)}>Redigera</button>}
                    <details className="order-action-menu" onToggle={openActionMenu}>
                      <summary>Dokument <span aria-hidden="true">⌄</span></summary>
                      <div className="order-action-popover" role="group" aria-label="Orderdokument">
                        {[["acknowledgement", "Ordererkännande"], ["workOrder", "Arbetsorder"], ["deliveryNote", "Följesedel"], ["quote", "Offert"]].map(([variant, label]) => (
                          <button key={variant} type="button" onClick={event => { closeActionMenu(event); setDocumentVariant(variant); setShowAcknowledgement(true); }}>{label}</button>
                        ))}
                      </div>
                    </details>
                    {canEdit && <details className="order-action-menu" onToggle={openActionMenu}>
                      <summary className="order-more-actions" aria-label="Fler orderåtgärder"><span aria-hidden="true">⋯</span></summary>
                      <div className="order-action-popover" role="group" aria-label="Fler orderåtgärder">
                        <button type="button" className="delete-order-new" onClick={event => { deleteReturnFocus.current=event.currentTarget.closest('details')?.querySelector('summary');closeActionMenu(event); setDeleteError('');setDeleteTarget(selectedOrder); }}>Ta bort order</button>
                      </div>
                    </details>}
                  </div>

                  <section className="order-production-section" aria-label="Produktion och orderstatus">
                    <div className="order-production-row">
                      <details className="order-production-details" key={`production-${selectedOrder.id}`}>
                        <summary><span className="order-production-chevron" aria-hidden="true">›</span><span>Produktion</span><small>{selectedDepartments(selectedOrder).length ? `${selectedDepartments(selectedOrder).filter(name => selectedOrder.productionPlan?.departments?.[name]?.status === "klar").length} av ${selectedDepartments(selectedOrder).length} avdelningar klara` : "Ingen avdelning planerad"}</small></summary>
                        <div className="order-production-content">
                          <div className="jsf-order-department-grid">
                            {DEPARTMENT_NAMES.map(department => {
                              const enabled = selectedDepartments(selectedOrder).includes(department);
                              const status = selectedOrder.productionPlan?.departments?.[department]?.status || "ej_paborjad";
                              return <div key={department} className={`jsf-order-department ${enabled ? "" : "is-disabled"}`}>
                                <span>{department}</span>
                                {enabled ? <div className="jsf-order-department-control">
                                  <DepartmentStatusIcon status={status} />
                                  <select aria-label={`Status ${department}`} value={status} disabled={!!busyDepartment || busyStatus || selectedOrder.status === "levererad"} onChange={e => updateDepartmentFromOrders(department,e.target.value)}>
                                    {DEPARTMENT_STATES.map(state => <option key={state.id} value={state.id}>{state.label}</option>)}
                                  </select>
                                </div> : <small>Ej vald</small>}
                              </div>;
                            })}
                          </div>
                          
                        </div>
                      </details>
                      <label className="order-status-control">Orderstatus
                        <select aria-label="Orderstatus" value={["godkänd", "påbörjad", "klar"].includes(String(selectedOrder.status).toLowerCase()) ? String(selectedOrder.status).toLowerCase() : ""} disabled={busyStatus || !!busyDepartment} onChange={e => updateStatus(e.target.value)}>
                          <option value="" disabled>Ändra status</option>
                          {STATUS_OPTIONS.filter(option => ["godkänd", "påbörjad", "klar"].includes(option.value)).map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    {selectedOrder.status !== "levererad" && <div className="jsf-order-ready">
                      <span>{allDepartmentsComplete(selectedOrder) ? "✓ Alla valda avdelningar är klara" : "Alla valda avdelningar måste vara klara före leverans."}</span>
                      <button type="button" disabled={!allDepartmentsComplete(selectedOrder) || busyStatus || !!busyDepartment} onClick={() => updateStatus("levererad")}>Markera som levererad</button>
                    </div>}
                    {selectedOrder.status === "levererad" && <p className="jsf-order-delivered">✓ Ordern är levererad och finns kvar i orderhistoriken.</p>}
                  </section>
                </>
              ) : (
                <div className="empty-detail-new">Välj en order för att se detaljer.</div>
              )}
            </section>
          </div>}
        </main>


        {canEdit && showPlan && selectedOrder ? <PlanOrderModal key={selectedOrder.id} order={selectedOrder} onClose={() => setShowPlan(false)} onSave={saveProductionPlan} saving={savingPlan}/> : null}

        {canEdit && showCreate ? (
          <OrderEditModal
            creating
            order={{ orderer: {}, delivery: {}, orderDetails: {}, cart: [] }}
            catalogArticles={catalogArticles}
            saving={savingCreate} error={error}
            onClose={() => setShowCreate(false)}
            onSave={createManualOrder}
          />
        ) : null}

        {canEdit && showEdit && selectedOrder ? (
          <OrderEditModal
            order={selectedOrder}
            catalogArticles={catalogArticles}
            saving={savingEdit} error={error}
            onClose={() => setShowEdit(false)}
            onSave={saveOrderEdits}
          />
        ) : null}

        {canEdit&&deleteTarget&&<OrderDeleteDialog key={deleteTarget.id} order={deleteTarget} busy={deletingOrder} error={deleteError} returnFocusRef={deleteReturnFocus} onClose={()=>{if(!deleteBusyRef.current)setDeleteTarget(null);}} onConfirm={deleteSelectedOrder}/>}

        {showAcknowledgement && selectedOrder ? (
          <OrderAcknowledgementModal
            order={selectedOrder}
            variant={documentVariant}
            onClose={() => setShowAcknowledgement(false)}
          />
        ) : null}

        
      </AdminLayout>
    </PageContainer>
  );
}
