import { orderMatchesSearch } from "../../data/orderSearch";
import { planningCustomer, planningObject, planningArticleGroups } from "../../data/planningOrderLabels";
import OrderAcknowledgementModal from "../../components/orders/OrderAcknowledgementModal";
import { useMemo, useState } from "react";
import PageContainer from "../../components/layout/PageContainer";
import { DepartmentStatusIcon } from "../../components/orders/DepartmentStatus";
import { AdminLayout } from "../../components/admin/AdminNavigation";

const VIEWS = [
  { id: "delivery", label: "Slutleverans" },
  { id: "Produktion", label: "Produktion" },
  { id: "Layout", label: "Layout" },
  { id: "Montering", label: "Montering" },
];
const DAY_NAMES = ["Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag", "Söndag"];
const normalize = value => String(value ?? "").trim().toLowerCase();
const mondayOf = input => {
  const d = new Date(input.getFullYear(), input.getMonth(), input.getDate(), 12);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
};
const isoWeekInfo = date => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const year = d.getUTCFullYear();
  const week = Math.ceil((((d - new Date(Date.UTC(year, 0, 1))) / 86400000) + 1) / 7);
  return { year, week };
};
const weekKey = (year, week) => `${year}-${String(week).padStart(2, "0")}`;
const parseDate = value => {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  return Number.isNaN(date.getTime()) ? null : date;
};
const planPosition = (order, view) => {
  const plan = order.productionPlan;
  if (!plan) return null;
  if (view === "delivery") {
    const date = parseDate(plan.deliveryDate || order.deliveryDate || order.completionDate);
    if (!date) return null;
    const { year, week } = isoWeekInfo(date);
    return { year, week, day: ((date.getDay() + 6) % 7) + 1 };
  }
  const department = plan.departments?.[view];
  if (!department?.enabled) return null;
  const year = Number(department.year || plan.year);
  const week = Number(department.week);
  const day = Number(department.day);
  if (!year || week < 1 || week > 53 || day < 1 || day > 7) return null;
  return { year, week, day };
};
const orderTitle = order => planningObject(order) || "–";
const orderCustomer = order => planningCustomer(order);
const orderNumber = order => order.orderNumber || order.submissionNumber || order.id;
const isPriority = order => Boolean(order.priority === true || order.isPriority || /prioriterad|kritisk|hög/i.test(String(order.priorityLabel || order.priority || "")));


const DEPARTMENTS = ["Layout", "Produktion", "Montering", "Packning"];
const STATUS_OPTIONS = [
  {id:"ej_paborjad",label:"Ej påbörjad"},
  {id:"paborjad",label:"Påbörjad"},
  {id:"pausad",label:"Pausad"},
  {id:"klar",label:"Klar"},
];
function StatusIcon({status}) { return <DepartmentStatusIcon status={status} />; }
const statusOf = (order, dept) => order.productionPlan?.departments?.[dept]?.status || "ej_paborjad";
const deliveryLabel = order => {const date=parseDate(order.productionPlan?.deliveryDate || order.deliveryDate || order.completionDate);if(!date)return "–";const p=isoWeekInfo(date);return `v${p.week}:${((date.getDay()+6)%7)+1}`;};
const articleLabel = order => planningArticleGroups(order);
export default function AdminPlanningPage({ orders = [], onOrderUpdated, adminPassword, ...nav }) {
  const [view,setView]=useState("delivery");
  const [query,setQuery]=useState("");
  const [selectedOrder,setSelectedOrder]=useState(null);
  const [menu,setMenu]=useState(null);
  const [updates,setUpdates]=useState({});
  const [saving,setSaving]=useState("");
  const [error,setError]=useState("");
  const today=useMemo(()=>mondayOf(new Date()),[]);
  const effectiveOrders=useMemo(()=>orders.map(o=>updates[o.id]||o),[orders,updates]);
  // Levererade ordrar hör till orderhistoriken, inte till aktiv planering.
  const planned=useMemo(()=>effectiveOrders
    .filter(o=>o.productionPlan && ["godkänd","påbörjad","klar","skickad"].includes(normalize(o.status)))
    .map(order=>({order,position:planPosition(order,view)}))
    .filter(x=>x.position)
    .filter(x=>orderMatchesSearch(x.order,query)),
    [effectiveOrders,view,query]);
  // Kalendern innehåller även tomma veckor. De visas som diskreta rubriker.
  // Visa två tidigare veckor och 26 framåt, samt alla veckor med planerade jobb.
  const weeks=useMemo(()=>{
    const m=new Map();
    const addDate = date => {
      const p=isoWeekInfo(date);
      const key=weekKey(p.year,p.week);
      if(!m.has(key))m.set(key,{...p,date:mondayOf(date)});
    };
    for(let offset=-2;offset<27;offset++){
      const d=new Date(today);
      d.setDate(d.getDate()+offset*7);
      addDate(d);
    }
    for(const {position:p} of planned){
      const d=mondayOf(new Date(p.year,0,4,12));
      d.setDate(d.getDate()+(p.week-1)*7);
      addDate(d);
    }
    return [...m.values()].sort((a,b)=>a.date-b.date);
  },[today,planned]);
  const grouped=useMemo(()=>{const m=new Map();for(const entry of planned){const k=weekKey(entry.position.year,entry.position.week);if(!m.has(k))m.set(k,new Map());const days=m.get(k),day=entry.position.day;if(!days.has(day))days.set(day,[]);days.get(day).push(entry.order);}for(const days of m.values())for(const items of days.values())items.sort((a,b)=>Number(isPriority(b))-Number(isPriority(a))||String(orderNumber(a)).localeCompare(String(orderNumber(b)),"sv"));return m;},[planned]);
  const scrollToCurrent=()=>document.getElementById(`jsf-week-${weekKey(isoWeekInfo(today).year,isoWeekInfo(today).week)}`)?.scrollIntoView({behavior:"smooth",block:"nearest"});
  async function updateDepartment(order,department,status){
    setSaving(`${order.id}:${department}`);setError("");setMenu(null);
    try{const response=await fetch(`/api/orders/${encodeURIComponent(order.id)}/department-status`,{method:"PATCH",headers:{"Content-Type":"application/json","x-admin-password":adminPassword||""},body:JSON.stringify({department,status})});const data=await response.json();if(!response.ok)throw new Error(data.message||"Kunde inte spara status.");setUpdates(prev=>({...prev,[order.id]:data.order}));setSelectedOrder(prev=>prev?.id===order.id?data.order:prev);onOrderUpdated?.(data.order);}
    catch(e){setError(e.message||"Kunde inte spara status.");}
    finally{setSaving("");}
  }
  return <PageContainer><AdminLayout active="planning" adminPassword={adminPassword} {...nav}><main className="jsf-continuous-planning jsf-plan-contained">
    <header className="jsf-plan-header"><div><small>PRODUKTION / ÖVERSIKT</small><h1>Planering</h1></div><button className="jsf-plan-today" onClick={scrollToCurrent}>◉ Aktuell vecka</button></header>
    <div className="jsf-plan-toolbar"><div className="jsf-plan-tabs" role="tablist">{VIEWS.map(v=><button key={v.id} role="tab" aria-selected={view===v.id} className={view===v.id?"active":""} onClick={()=>{setView(v.id);setMenu(null)}}>{v.label}</button>)}</div><div className="jsf-plan-filters"><input aria-label="Sök i planeringen" placeholder="Sök ordernummer, kundens referens, objekt, artikel..." value={query} onChange={e=>setQuery(e.target.value)}/><span className="jsf-plan-filter-note">Levererade ordrar finns under Ordrar</span></div></div>
    <div className="jsf-plan-summary"><span><strong>{planned.length}</strong> planerade ordrar · {VIEWS.find(v=>v.id===view)?.label}</span><span>Klicka på en avdelningssymbol för att ändra status</span></div>
    {error&&<div className="jsf-plan-error" role="alert">{error}</div>}
    <div className="jsf-plan-weeks">
      {weeks.map(({year,week}) => {
        const key = weekKey(year,week);
        const days = grouped.get(key);
        const count = days ? [...days.values()].reduce((n,items)=>n+items.length,0) : 0;
        const current = key === weekKey(isoWeekInfo(today).year,isoWeekInfo(today).week);
        if (!count) return <div key={key} id={`jsf-week-${key}`} className={`jsf-plan-week-empty ${current?'current':''}`}>
          <span>Vecka {week} <span className="jsf-plan-year">– {year}</span></span><small>{current?'Aktuell vecka · ':''}Inga planerade ordrar</small>
        </div>;
        return <section key={key} id={`jsf-week-${key}`} className={`jsf-plan-week ${current?'current':''}`}>
          <div className="jsf-plan-week-title"><div className="jsf-plan-week-label"><strong>Vecka {week}</strong><span className="jsf-plan-year">{year}</span>{current && <span className="jsf-plan-current-tag">Aktuell vecka</span>}</div><span>{count} {count===1?'order':'ordrar'}</span></div>
          <div className="jsf-plan-table-wrap"><table className="jsf-plan-table">
            <thead><tr><th>Planerad</th><th>Order</th><th>Kund</th><th>Objekt</th><th>Leveransdag</th><th>Artikeltyp</th>
              {DEPARTMENTS.map(dept=><th key={dept} className="jsf-plan-dept-head">{dept}</th>)}
            </tr></thead>
            <tbody>{[...days.entries()].sort((a,b)=>a[0]-b[0]).flatMap(([day,items])=>items.map(order=><tr key={order.id}>
              <td className="jsf-plan-date"><b>{DAY_NAMES[day-1]}</b><small>v{week}:{day}</small></td>
              <td><button className="jsf-plan-link" onClick={()=>setSelectedOrder(order)}>#{orderNumber(order)}</button>{isPriority(order)&&<span className="jsf-plan-star" title="Prioriterad">★</span>}</td>
              <td>{orderCustomer(order)||'–'}</td>
              <td><button className="jsf-plan-object-link" onClick={()=>setSelectedOrder(order)}>{orderTitle(order)}</button></td>
              <td className="jsf-plan-delivery">{deliveryLabel(order)}</td>
              <td className="jsf-plan-article" title={articleLabel(order)}>{articleLabel(order)}</td>
              {DEPARTMENTS.map(dept=>{
                const enabled=order.productionPlan?.departments?.[dept]?.enabled;
                const status=statusOf(order,dept);
                const choice=STATUS_OPTIONS.find(x=>x.id===status)||STATUS_OPTIONS[0];
                const id=`${order.id}:${dept}`;
                return <td key={dept} className="jsf-plan-dept-cell">
                  {enabled ? <button type="button" disabled={!!saving} className={`jsf-plan-symbol status-${status}`}
                    title={`${dept}: ${choice.label}`} aria-label={`${dept}: ${choice.label}, ändra status`}
                    onClick={event=>{const r=event.currentTarget.getBoundingClientRect();setMenu(menu?.id===id?null:{id,order,dept,status,top:Math.min(r.bottom+5,window.innerHeight-208),left:Math.max(8,Math.min(r.left-65,window.innerWidth-190))});}}>
                    {saving===id?'…':<StatusIcon status={status}/>}
                  </button> : <span className="jsf-plan-disabled" title="Avdelningen är inte vald">·</span>}
                </td>;
              })}
            </tr>))}</tbody>
          </table></div>
        </section>;
      })}
    </div>
    {menu&&<><button className="jsf-plan-menu-backdrop" aria-label="Stäng statusmeny" onClick={()=>setMenu(null)}></button>
      <div className="jsf-plan-status-menu" style={{position:'fixed',top:menu.top,left:menu.left}} role="group" aria-label={`Status ${menu.dept}`}>
        <strong>{menu.dept}</strong>
        {STATUS_OPTIONS.map(option=><button key={option.id} className={option.id===menu.status?'chosen':''} onClick={()=>updateDepartment(menu.order,menu.dept,option.id)}><span><StatusIcon status={option.id}/></span>{option.label}</button>)}
      </div></>}
    {selectedOrder && <OrderAcknowledgementModal order={selectedOrder} variant="workOrder" onClose={() => setSelectedOrder(null)} />}
    </main></AdminLayout></PageContainer>;
}
