import DatePicker from '../../components/forms/DatePicker';
import OrderPdfAttachments from "../../components/orders/OrderPdfAttachments";
import { useMemo, useState } from "react";
import PageContainer from "../../components/layout/PageContainer";
import { AdminLayout } from "../../components/admin/AdminNavigation";
import { getCartItemDisplayRows } from "../../data/orderDisplayHelpers";
import { getOrderDetails } from "../../data/orderDetailsHelpers";


const GREEN = "#176b4a";
const INK = "#171a18";
const MUTED = "#6f7571";
const LINE = "#e4e7e3";

function money(value) {
  return new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 2 }).format(Number(value || 0));
}

function dateTime(value) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("sv-SE", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  } catch {
    return String(value);
  }
}

function qty(order) {
  return (order.cart || []).reduce((sum, item) => sum + Math.max(1, Number(item.quantity) || 1), 0);
}

function statusLabel(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "behöver_kompletteras") return "Behöver kompletteras";
  return "Väntar på godkännande";
}

export default function AdminApprovalOrdersPage({
  orders = [],
  role, user, onLogout,
  orderFetchError,
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
  onOpenPortal, onOpenProfile,
}) {
  const [selectedId, setSelectedId] = useState(null);
  const [plans, setPlans] = useState({});
  const currentYear = new Date().getFullYear();
  const departments = ["Layout", "Produktion", "Montering", "Packning"];
  const initialPlan = () => ({ year: currentYear, departments: Object.fromEntries(departments.map(name => [name, { enabled: true, week: "", day: "" }])), deliveryDate: "", installationDate: "" });
  const updatePlan = (orderId, fn) => setPlans(previous => ({ ...previous, [orderId]: fn(previous[orderId] || initialPlan()) }));
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const pendingOrders = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return [...orders]
      .filter((order) => ["väntar_godkännande", "behöver_kompletteras", "ny"].includes(String(order.status || "").toLowerCase()))
      .filter((order) => {
        if (!needle) return true;
        const haystack = [
          order.submissionNumber,
          order.orderNumber,
          order.orderer?.ordererName,
          order.orderer?.ordererEmail,
          order.orderer?.accountNumber,
          order.delivery?.company,
          order.delivery?.recipient,
          ...(order.cart || []).flatMap((item) => [item.articleNumber, item.badgeName, item.name, item.title, item.customText, item.customTextLine2]),
        ].filter(Boolean).join(" ").toLowerCase();
        return haystack.includes(needle);
      })
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [orders, search]);

  const selectedOrder = pendingOrders.find((order) => order.id === selectedId) || pendingOrders[0] || null;

  async function setApproval(action) {
    if (!selectedOrder || busy) return;
    if (action === "approve") {
      const draft = plans[selectedOrder.id] || initialPlan();
      if (!draft.deliveryDate && !draft.installationDate) { setError("Ange leveransdatum eller montagedatum innan godkännande."); return; }
      if (!departments.some(name => draft.departments[name]?.enabled && draft.departments[name]?.week && draft.departments[name]?.day)) { setError("Planera minst en avdelning med vecka och färdigdag."); return; }
      if (departments.some(name => draft.departments[name]?.enabled && (!draft.departments[name]?.week || !draft.departments[name]?.day))) { setError("Alla aktiva avdelningar behöver vecka och färdigdag."); return; }
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/orders/${selectedOrder.id}/approval`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-password": adminPassword },
        body: JSON.stringify({ action, ...(action === "approve" ? { productionPlan: plans[selectedOrder.id] || initialPlan() } : {}) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Kunde inte uppdatera beställningen.");
      setMessage(action === "approve" ? `Ordern är godkänd och har fått ordernummer ${data.order?.orderNumber || "-"}.` : "Beställningen markerades som behöver kompletteras.");
      setSelectedId(null);
      if (onOrdersChanged) await onOrdersChanged();
    } catch (err) {
      setError(err.message || "Kunde inte uppdatera beställningen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageContainer>
      {orderFetchError && <div role="alert" style={{background:"#fff4ec",border:"1px solid #e8bda2",borderRadius:10,padding:"12px 16px",color:"#813d22",margin:16}}>{orderFetchError}</div>}
      <AdminLayout
        role={role} user={user} onLogout={onLogout}
        active="approvalOrders"
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
        onOpenPortal={onOpenPortal} onOpenProfile={onOpenProfile}
      >
        <main className="approval-page">
          <header className="approval-head">
            <div>
              <div className="eyebrow">ORDERFLÖDE</div>
              <h1>Ordrar att godkänna</h1>
              
            </div>
            <div className="approval-count"><strong>{pendingOrders.length}</strong><span>väntar</span></div>
          </header>

          {message ? <div className="flash success">{message}</div> : null}
          {error ? <div className="flash error">{error}</div> : null}

          <div className="approval-toolbar">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Sök beställare, artikel, ansvarsnummer ..." />
            <button type="button" onClick={() => onOrdersChanged && onOrdersChanged()}>Uppdatera</button>
          </div>

          <div className="approval-layout">
            <section className="approval-list">
              {pendingOrders.length ? pendingOrders.map((order) => (
                <button key={order.id} type="button" className={`approval-card ${selectedOrder?.id === order.id ? "active" : ""}`} onClick={() => setSelectedId(order.id)}>
                  <div className="approval-card-top">
                    <span className="ref">{order.submissionNumber || order.orderNumber || "Ny beställning"}</span>
                    <span className={`status ${String(order.status).toLowerCase() === "behöver_kompletteras" ? "warn" : ""}`}>{statusLabel(order.status)}</span>
                  </div>
                  <strong>{order.orderer?.ordererName || order.delivery?.recipient || "Okänd beställare"}</strong>
                  <span>{order.delivery?.company || order.orderer?.ordererEmail || "-"}</span>
                  <div className="approval-card-meta"><span>{qty(order)} st</span><span>{money(order.orderTotal)}</span><span>{dateTime(order.createdAt)}</span></div>
                </button>
              )) : <div className="empty-state"><span>✓</span><h3>Inga ordrar väntar</h3></div>}
            </section>

            <section className="approval-detail">
              {selectedOrder ? (
                <>
                  <div className="detail-head">
                    <div><span className="detail-ref">{selectedOrder.submissionNumber || selectedOrder.orderNumber}</span><h2>{selectedOrder.orderer?.ordererName || "Beställning"}</h2><p>Inkommen {dateTime(selectedOrder.createdAt)}</p></div>
                    <span className={`status big ${String(selectedOrder.status).toLowerCase() === "behöver_kompletteras" ? "warn" : ""}`}>{statusLabel(selectedOrder.status)}</span>
                  </div>

                  <div className="detail-grid">
                    <div style={{ display: "grid", gap: 12, alignContent: "start", minWidth: 0 }}>
                      <div className="info-block"><h3>Kund / kontakt</h3><p><b>Kund / verksamhet</b>{selectedOrder.orderer?.customer || selectedOrder.delivery?.company || "-"}</p><p><b>Kontakt</b>{selectedOrder.orderer?.ordererName || "-"}</p><p><b>E-post</b>{selectedOrder.orderer?.ordererEmail || "-"}</p><p><b>Telefon</b>{selectedOrder.orderer?.ordererPhone || "-"}</p><p><b>Ansvarsnummer</b>{selectedOrder.orderer?.accountNumber || "-"}</p></div>
                    {(selectedOrder.orderer?.purchaserName || selectedOrder.orderer?.purchaserPhone || selectedOrder.orderer?.purchaserEmail) && (
                      <div className="info-block" aria-label="Beställare">
                        <h3>Beställare</h3>
                        <p><b>Namn</b><span>{selectedOrder.orderer?.purchaserName || "-"}</span></p>
                        <p><b>Telefon</b><span>{selectedOrder.orderer?.purchaserPhone || "-"}</span></p>
                        <p><b>Mejl</b><span style={{ overflowWrap: "anywhere", minWidth: 0 }}>{selectedOrder.orderer?.purchaserEmail || "-"}</span></p>
                      </div>
                    )}
                    </div>
                    
                    <div className="info-block"><h3>Projekt / objekt</h3><p><b>Referens</b>{getOrderDetails(selectedOrder).customerReference || "-"}</p><p><b>Projekt</b>{getOrderDetails(selectedOrder).projectName || "-"}</p><p><b>Projektkod</b>{getOrderDetails(selectedOrder).projectCode || "-"}</p><p><b>Förv. obj.</b>{getOrderDetails(selectedOrder).managementObject || "-"}</p><p><b>Målpunkt</b>{getOrderDetails(selectedOrder).targetPoint || "-"}</p><p><b>Fastighet</b>{getOrderDetails(selectedOrder).property || "-"}</p><p><b>Byggnad</b>{getOrderDetails(selectedOrder).building || "-"}</p><p><b>Plan / rum</b>{[getOrderDetails(selectedOrder).floor, getOrderDetails(selectedOrder).room].filter(Boolean).join(" / ") || "-"}</p><p><b>Prioritet</b>{(getOrderDetails(selectedOrder).priority === "snarast" ? "Snarast" : getOrderDetails(selectedOrder).priority === "datum" ? "Önskat datum: " + (getOrderDetails(selectedOrder).requestedCompletionDate || "Ej angivet") : "Planeringsbar")}</p><p><b>Utförande</b>{getOrderDetails(selectedOrder).requestedExecutionNote || "-"}</p></div>

                    
                  </div>

                  <OrderPdfAttachments files={selectedOrder.attachments||[]} orderId={selectedOrder.id} headers={{"x-admin-password":adminPassword}}/>
                  {selectedOrder.orderer?.messageToSupplier ? <div className="message-box"><b>Beskrivning</b><p>{selectedOrder.orderer.messageToSupplier}</p></div> : null}

                  <div className="items-title"><h3>Artiklar</h3><span>{qty(selectedOrder)} st totalt</span></div>
                  <div className="items-list">
                    {(selectedOrder.cart || []).map((item, index) => (
                      <article className="item-row" key={item.id || `${item.articleNumber}-${index}`}>
                        <div className="item-index">{index + 1}</div>
                        <div className="item-main">
                          <div className="item-heading"><div><strong>{item.badgeName || item.name || "Artikel"}</strong><span>{item.articleNumber ? `Art.nr ${item.articleNumber}` : ""}</span></div><div className="item-price"><strong>{item.quantity || 1} st</strong><span>{money(item.lineTotal ?? (Number(item.unitPrice || 0) * Number(item.quantity || 1)))}</span></div></div>
                          <div className="item-data">{getCartItemDisplayRows(item).filter((row) => row.label !== "Antal").map((row, rowIndex) => <span key={`${row.label}-${rowIndex}`}><b>{row.label}</b>{row.value}</span>)}</div>
                        </div>
                      </article>
                    ))}
                  </div>

                  <section className="production-planning" key={selectedOrder.id}>
                    <h3>Produktionsplanering före godkännande</h3>
                    
                    {departments.map(name => {
                      const row = (plans[selectedOrder.id] || initialPlan()).departments[name];
                      const setRow = changes => updatePlan(selectedOrder.id, old => ({...old, departments: {...old.departments, [name]: {...old.departments[name], ...changes}}}));
                      return <div className="planning-department" key={name}>
                        <label><input type="checkbox" checked={row.enabled} onChange={e => setRow({enabled:e.target.checked})} /> {name}</label>
                        <input aria-label={`${name} färdigvecka och dag`} disabled={!row.enabled} type="text" inputMode="numeric" placeholder="42:3" value={row.week && row.day ? `${row.week}:${row.day}` : (row.entry || "")} onChange={e => { const entry=e.target.value.replace(/[^0-9:]/g,""); const match=/^(\d{1,2}):([1-5])$/.exec(entry); setRow({entry,week:match && Number(match[1])>=1 && Number(match[1])<=53 ? String(Number(match[1])) : "",day:match && Number(match[1])>=1 && Number(match[1])<=53 ? match[2] : ""}); }} style={{maxWidth:125}} />
                        <strong>{row.enabled && row.week && row.day ? `v.${row.week}:${row.day}` : ""}</strong>
                      </div>;
                    })}
                    <div className="planning-dates"><label>Bekräftat leveransdatum<DatePicker value={(plans[selectedOrder.id] || initialPlan()).deliveryDate} onValueChange={value => updatePlan(selectedOrder.id, old => ({...old, deliveryDate:value}))}/></label><label>Bekräftat montagedatum<DatePicker value={(plans[selectedOrder.id] || initialPlan()).installationDate} onValueChange={value => updatePlan(selectedOrder.id, old => ({...old, installationDate:value}))}/></label></div>
                  </section>
                  <div className="order-total"><span>Ordersumma</span><strong>{money(selectedOrder.orderTotal)}</strong></div>
                  <div className="approval-actions">
                    <button type="button" className="secondary" disabled={busy} onClick={() => setApproval("needs_info")}>Behöver kompletteras</button>
                    <button type="button" className="primary" disabled={busy} onClick={() => setApproval("approve")}>{busy ? "Sparar ..." : "Godkänn order"}</button>
                  </div>
                </>
              ) : <div className="empty-detail">Välj en beställning för att granska den.</div>}
            </section>
          </div>
        </main>
        <style>{`
          .production-planning{border:1px solid #d9e5dd;border-radius:14px;background:#f8fbf9;padding:20px;margin-top:20px}.production-planning h3{margin:0 0 5px;font-size:16px}.production-planning p{font-size:12px;color:#6f7571}.production-planning label{font-size:12px;font-weight:650}.production-planning input,.production-planning select{border:1px solid #dbe3dd;border-radius:8px;background:white;padding:9px;min-width:0}.planning-department{display:grid;grid-template-columns:minmax(115px,1fr) 110px 135px 65px;align-items:center;gap:9px;margin:10px 0}.planning-department label{display:flex;gap:8px;align-items:center}.planning-department strong{font-size:12px;color:#176b4a}.planning-dates{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:18px}.planning-dates label{display:grid;gap:7px}@media(max-width:650px){.planning-department{grid-template-columns:1fr 1fr}.planning-dates{grid-template-columns:1fr}}
          .approval-page{min-height:100vh;background:#ffffff;padding:34px 36px 60px;color:${INK};font-family:Inter,Arial,sans-serif}.approval-head{display:flex;justify-content:space-between;gap:24px;align-items:flex-end;max-width:1400px;margin:0 auto 24px}.eyebrow{font-size:11px;font-weight:800;letter-spacing:.09em;color:${GREEN};margin-bottom:8px}.approval-head h1{font-size:38px;letter-spacing:-.035em;margin:0 0 7px}.approval-head p{margin:0;color:${MUTED}}.approval-count{width:92px;height:72px;border:1px solid ${LINE};border-radius:16px;background:#fff;display:grid;place-items:center;align-content:center;box-shadow:0 6px 20px rgba(20,30,25,.04)}.approval-count strong{font-size:25px}.approval-count span{font-size:11px;color:${MUTED}}
          .flash{max-width:1400px;margin:0 auto 14px;border-radius:12px;padding:12px 15px;font-size:13px}.flash.success{background:#edf7f2;color:#145a40;border:1px solid #cde7d9}.flash.error{background:#fff1f0;color:#9e312d;border:1px solid #f1cfcc}
          .approval-toolbar{max-width:1400px;margin:0 auto 14px;display:flex;gap:10px}.approval-toolbar input{flex:1;min-width:0;height:42px;border:1px solid ${LINE};border-radius:10px;background:#fff;padding:0 14px;font:inherit}.approval-toolbar button{height:42px;border:1px solid ${LINE};border-radius:10px;background:#fff;padding:0 15px;font-weight:700;cursor:pointer}
          .approval-layout{max-width:1400px;margin:0 auto;display:grid;grid-template-columns:minmax(300px,390px) minmax(0,1fr);gap:16px;align-items:start}.approval-list,.approval-detail{background:#fff;border:1px solid ${LINE};border-radius:16px;box-shadow:0 7px 24px rgba(25,35,30,.035)}.approval-list{padding:10px;display:grid;gap:8px;max-height:calc(100vh - 205px);overflow:auto}.approval-card{border:1px solid transparent;background:#fafbf9;border-radius:12px;padding:14px;text-align:left;cursor:pointer;color:${INK};transition:.15s ease}.approval-card:hover{border-color:#d9ded9;background:#fff}.approval-card.active{border-color:#94bbaa;background:#f5faf7;box-shadow:inset 3px 0 0 ${GREEN}}.approval-card-top,.approval-card-meta{display:flex;justify-content:space-between;gap:9px;align-items:center}.approval-card .ref{font-size:11px;font-weight:800;color:${GREEN}}.approval-card>strong{display:block;font-size:15px;margin:10px 0 3px}.approval-card>span{font-size:12px;color:${MUTED}}.approval-card-meta{margin-top:12px;color:${MUTED};font-size:10px}.status{display:inline-flex;align-items:center;border-radius:999px;padding:5px 8px;background:#edf6f1;color:#176044;font-size:9px;font-weight:800;white-space:nowrap}.status.warn{background:#fff5df;color:#8a641d}.status.big{font-size:10px;padding:6px 10px}.empty-state{padding:48px 18px;text-align:center;color:${MUTED}}.empty-state>span{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:#edf6f1;color:${GREEN};font-size:20px;margin:0 auto}.empty-state h3{color:${INK};margin:13px 0 5px}.empty-state p{margin:0;font-size:12px}
          .approval-detail{padding:22px;min-height:560px}.detail-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;padding-bottom:18px;border-bottom:1px solid ${LINE}}.detail-ref{font-size:11px;color:${GREEN};font-weight:800}.detail-head h2{font-size:25px;margin:5px 0 3px}.detail-head p{font-size:12px;color:${MUTED};margin:0}.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0}.info-block{border:1px solid #edf0ed;border-radius:12px;padding:14px;background:#fcfcfb}.info-block h3,.items-title h3{font-size:13px;margin:0 0 11px}.info-block p{display:grid;grid-template-columns:105px 1fr;gap:8px;margin:7px 0;font-size:11px}.info-block b{color:${MUTED};font-weight:600}.message-box{background:#f6f8f6;border-radius:12px;padding:13px 14px;margin:10px 0 17px;font-size:11px}.message-box b{font-size:11px}.message-box p{margin:5px 0 0;color:#505652}.items-title{display:flex;justify-content:space-between;align-items:center;margin:19px 0 9px}.items-title h3{margin:0}.items-title span{font-size:10px;color:${MUTED}}.items-list{display:grid;gap:8px}.item-row{display:grid;grid-template-columns:28px 1fr;gap:10px;border:1px solid #e8ebe8;border-radius:12px;padding:12px}.item-index{width:26px;height:26px;border-radius:8px;background:#f0f3f0;display:grid;place-items:center;font-size:10px;font-weight:800}.item-heading{display:flex;justify-content:space-between;gap:14px}.item-heading>div:first-child{display:grid;gap:2px}.item-heading strong{font-size:12px}.item-heading span{font-size:9px;color:${MUTED}}.item-price{text-align:right;display:grid;gap:2px}.item-price strong{font-size:11px}.item-price span{font-size:10px;color:${MUTED}}.item-data{display:flex;flex-wrap:wrap;gap:6px 15px;margin-top:9px}.item-data span{display:flex;gap:5px;font-size:10px;color:#4f5551}.item-data b{color:#858a86;font-weight:600}.order-total{display:flex;justify-content:space-between;align-items:center;margin-top:14px;border-top:1px solid ${LINE};padding:17px 2px 2px}.order-total span{font-size:12px}.order-total strong{font-size:22px}.approval-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px}.approval-actions button{border-radius:10px;min-height:43px;padding:0 17px;font:inherit;font-size:12px;font-weight:800;cursor:pointer}.approval-actions .secondary{background:#fff;border:1px solid ${LINE};color:#464b48}.approval-actions .primary{background:${GREEN};border:1px solid ${GREEN};color:#fff}.approval-actions button:disabled{opacity:.6;cursor:wait}.empty-detail{min-height:500px;display:grid;place-items:center;color:${MUTED};font-size:13px}
          @media(max-width:1000px){.approval-layout{grid-template-columns:1fr}.approval-list{max-height:none}.approval-detail{min-height:0}}@media(max-width:720px){.approval-page{padding:24px 14px 40px}.approval-head h1{font-size:30px}.approval-count{display:none}.detail-grid{grid-template-columns:1fr}.item-heading{display:block}.item-price{text-align:left;margin-top:8px}.approval-actions{display:grid}.approval-actions button{width:100%}}
        `}</style>
      </AdminLayout>
    </PageContainer>
  );
}
