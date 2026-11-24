import {WorkspaceStatus,WorkspaceSkeleton,WorkspaceFeedback} from '../workspace/WorkspaceUI';
import OrderPdfAttachments from "./OrderPdfAttachments";
import OrderAcknowledgementModal from "./OrderAcknowledgementModal";
import { useEffect, useMemo, useState } from "react";
import OrderUserFilter, { getOrderOwner, orderMatchesUser } from "./OrderUserFilter";
import { orderStatusLabel } from "./OrderNotifications";
import { orderMatchesSearch } from "../../data/orderSearch";
import { getCartItemDisplayRows } from "../../data/orderDisplayHelpers";
import { buyerOrderVisible } from "../../data/buyerOrders";
import { getOrderDetails } from "../../data/orderDetailsHelpers";
import { getOrderCustomer } from "../../data/orderCustomer";
import "./AccountOrdersBrowser.css";

export default function AccountOrdersBrowser({ token, user, initialOrderId }) {
  const [selectedId, setSelectedId] = useState(initialOrderId || null);
  const [status, setStatus] = useState('active');
  useEffect(() => { if(initialOrderId) {setSelectedId(initialOrderId);setStatus('all');setFilter('all');setSearch('');} }, [initialOrderId]);
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let disposed = false, fetching = false;
    let controller;
    async function load() {
      if (fetching || document.visibilityState === "hidden") return;
      fetching = true; controller = new AbortController();
      try {
        const response = await fetch("/api/account/orders?scope=all", { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "Logga in igen för att se beställningarna." : "Kunde inte hämta beställningarna.");
        const data = await response.json();
        if (!disposed) { setOrders((data.orders || []).filter(buyerOrderVisible)); setError(""); }
      } catch (failure) { if (!disposed && failure.name !== "AbortError") setError(failure.message); }
      finally { fetching = false; if (!disposed) setLoading(false); }
    }
    load();const interval = window.setInterval(load, 20000);
    window.addEventListener("focus", load);document.addEventListener("visibilitychange", load);
    return () => { disposed = true; controller?.abort(); window.clearInterval(interval); window.removeEventListener("focus", load); document.removeEventListener("visibilitychange", load); };
  }, [token, refresh]);
  const visible = useMemo(() => orders.filter(order => status === 'all' || (status === 'active' ? !['levererad','makulerad','avbruten'].includes(order.status) : order.status === status)).filter(order => orderMatchesUser(order, filter, user?.id, user?.email)).filter(order => !search.trim() || orderMatchesSearch(order, search.trim().toLowerCase()) || getOrderOwner(order).name.toLowerCase().includes(search.trim().toLowerCase())).sort((a, b) => {
    const latest = new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    return sort === "user" ? getOrderOwner(a).name.localeCompare(getOrderOwner(b).name, "sv") || latest : sort === "oldest" ? -latest : latest;
  }), [orders, filter, user?.id, user?.email, search, sort, status]);
  const selected = visible.find(order=>order.id===selectedId) || visible[0];
  return <div className="jsf-account-orders">
    <div className="jsf-account-orders-filters">
      <label>Sök<input type="search" aria-label="Sök bland beställningar" placeholder="Order, projekt, artikel eller namn" value={search} onChange={event => setSearch(event.target.value)}/></label>
      <OrderUserFilter orders={orders} userId={user?.id} value={filter} onChange={setFilter}/>
      <label>Status<select aria-label="Filtrera på orderstatus" value={status} onChange={event=>setStatus(event.target.value)}><option value="active">Alla aktiva</option><option value="all">Alla statusar</option>{[...new Set(orders.map(order=>order.status).filter(Boolean))].map(value=><option key={value} value={value}>{orderStatusLabel(value)}</option>)}</select></label>
      <label>Sortering<select aria-label="Sortera beställningar" value={sort} onChange={event => setSort(event.target.value)}><option value="newest">Senaste först</option><option value="oldest">Äldsta först</option><option value="user">Användare A–Ö</option></select></label>
      <button type="button" onClick={() => setRefresh(value => value + 1)}>Uppdatera</button>
    </div>
    {error&&<WorkspaceFeedback error>{error}</WorkspaceFeedback>}
    <p role="status" aria-live="polite">{loading ? "Hämtar beställningar …" : `${visible.length} beställningar`}</p>
    {loading&&!orders.length?<WorkspaceSkeleton kind="orders" label="Hämtar beställningar"/>:<div className="jsf-account-orders-workspace">
      <nav className="jsf-account-orders-list" aria-label="Orderlista">{visible.map(order => <button type="button" key={order.id} aria-pressed={selected?.id===order.id} onClick={()=>setSelectedId(order.id)}><div><strong>{order.orderNumber || order.submissionNumber || 'Beställning'}</strong><WorkspaceStatus status={order.status} label={orderStatusLabel(order.status)}/></div><span>{getOrderCustomer(order) || order.orderDetails?.projectName || 'Beställning'}</span><small>{getOrderOwner(order).name}</small><div><small>{date(order.createdAt)}</small><small>{money(total(order))}</small></div></button>)}{!loading && !visible.length && <p>Inga beställningar matchar ditt val.</p>}</nav>
      {selected ? <OrderDetail key={selected.id} order={selected} token={token}/> : <section className="account-order-detail"><p>{loading?'Hämtar beställningar …':'Ingen order vald.'}</p></section>}
    </div>}
  </div>;
}
const date=value=>value?new Date(value).toLocaleDateString('sv-SE'): '–';
const money=value=>Number.isFinite(Number(value))?Number(value).toLocaleString('sv-SE',{style:'currency',currency:'SEK'}):'–';
const rowTotal=item=>Number(item.lineTotal ?? item.totalPrice ?? (Number(item.unitPrice ?? item.price ?? 0)*Number(item.quantity ?? 1)));
const total=order=>order.orderTotal ?? order.totalPrice ?? order.total ?? (order.cart||[]).reduce((sum,item)=>sum+rowTotal(item),0);
function Info({title,rows}) {return <section className="account-info"><h3>{title}</h3><dl>{rows.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value||'–'}</dd></div>)}</dl></section>;}
function OrderDetail({order,token}) {
 const [showAcknowledgement,setShowAcknowledgement]=useState(false);
 const contact=order.orderer||{},details=getOrderDetails(order);
 return <section className="account-order-detail" aria-label="Vald order"><header><div><small>{order.orderNumber||order.submissionNumber}</small><h2>Order</h2><span>{date(order.createdAt)}</span></div><WorkspaceStatus status={order.status} label={orderStatusLabel(order.status)}/></header>
 <div className="account-order-info"><div><Info title="Kund / kontakt" rows={[["Kund / verksamhet",getOrderCustomer(order)||order.delivery?.company],["Kontakt",contact.ordererName],["E-post",contact.ordererEmail],["Telefon",contact.ordererPhone],["Ansvarsnummer",contact.accountNumber]]}/><Info title="Beställare" rows={[["Namn",contact.purchaserName||getOrderOwner(order).name],["Telefon",contact.purchaserPhone],["Mejl",contact.purchaserEmail||getOrderOwner(order).email]]}/></div><Info title="Projekt / objekt" rows={[["Referens",details.customerReference],["Projekt",details.projectName],["Projektkod",details.projectCode],["Förv. obj.",details.managementObject],["Målpunkt",details.targetPoint],["Fastighet",details.property],["Byggnad",details.building],["Plan / rum",[details.floor,details.room].filter(Boolean).join(' / ')],["Önskat datum",details.requestedCompletionDate],["Utförande",details.requestedExecutionNote],["Leveransdatum",order.productionPlan?.deliveryDate]]}/></div>
 <div className="account-articles"><table><thead><tr><th>Artikel</th><th>Beskrivning</th><th>Antal</th><th>Summa</th></tr></thead><tbody>{(order.cart||[]).map((item,index)=><tr key={index}><td>{item.badgeName||item.productName||item.name||'Artikel'}<small>Art.nr {item.articleNumber||'–'}</small></td><td>{getCartItemDisplayRows(item).map((row,i)=><div key={i}><span>{row.label}</span> {row.value}</div>)}</td><td>{item.quantity??1} st</td><td>{money(rowTotal(item))}</td></tr>)}</tbody><tfoot><tr><td colSpan="3">Ordersumma</td><td>{money(total(order))}</td></tr></tfoot></table></div>
 {contact.messageToSupplier&&<p>Orderinformation: {contact.messageToSupplier}</p>}<OrderPdfAttachments files={order.attachments||[]} orderId={order.id} headers={{Authorization:`Bearer ${token}`}}/>
 <div className="account-order-actions"><button type="button" onClick={()=>setShowAcknowledgement(true)}>Ordererkännande</button></div>
 {showAcknowledgement&&<OrderAcknowledgementModal order={order} onClose={()=>setShowAcknowledgement(false)}/>}
 </section>;
}

