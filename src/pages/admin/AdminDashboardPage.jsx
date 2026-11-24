import {isBadgeOrder,badgeKind} from "../../data/badgeProduction";
import { planningCustomer, planningObject, planningArticleGroups } from "../../data/planningOrderLabels";
import PageContainer from "../../components/layout/PageContainer";
import { AdminLayout } from "../../components/admin/AdminNavigation";
import WorkspaceIcon from '../../components/admin/WorkspaceIcon';

const INK = "#171a18";
const MUTED = "#747a76";
const LINE = "#e8eae7";
const PAPER = "#ffffff";
const GREEN = "#176b4a";
const SIDEBAR = "#10231d";

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("sv-SE", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
  } catch { return String(value); }
}

function getOrderType(order) {
  const names = new Set();
  (order.cart || []).forEach((item) => {
    if (item.productType === "namnbricka") names.add("Namnbricka");
    if (item.productType === "yrkestitelsskyltar" || item.productType === "yrkestitelsskylt") names.add("Yrkestitelsskylt");
  });
  return names.size ? Array.from(names).join(" + ") : "Beställning";
}

function getOrderQuantity(order) {
  return (order.cart || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

function StatusPill({ status }) {
  const normalized = String(status || "ny").toLowerCase();
  const labels = { ny: "Ny", väntar_godkännande: "Väntar godkännande", behöver_kompletteras: "Behöver kompletteras", godkänd: "Godkänd", påbörjad: "I produktion", klar: "Klar", levererad: "Levererad" };
  return <span className="dash-status">{labels[normalized] || status || "Ny"}</span>;
}

function Icon({ children }) { return <span className="dash-icon" aria-hidden="true"><WorkspaceIcon name={children}/></span>; }


function Metric({ icon, label, value, note, onClick }) {
  return (
    <button className="dash-metric" onClick={onClick}>
      <Icon>{icon}</Icon>
      <div className="dash-metric-copy"><div className="dash-metric-label">{label}</div><strong>{value}</strong><span>{note}</span></div>
      <span className="dash-arrow">→</span>
    </button>
  );
}

function QuickLink({ icon, title, onClick }) {
  return <button className="dash-quick" onClick={onClick}><Icon>{icon}</Icon><span>{title}</span><span className="dash-arrow">→</span></button>;
}

function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const year = d.getUTCFullYear();
  return { year, week: Math.ceil((((d - new Date(Date.UTC(year, 0, 1))) / 86400000) + 1) / 7) };
}
function dashboardPlanRows(orders, now) {
  const current = isoWeek(now);
  return orders.filter(order => {
    if (!order.productionPlan || !["godkänd", "påbörjad", "klar", "skickad"].includes(String(order.status || "").toLowerCase())) return false;
    const dateText = order.productionPlan.deliveryDate || order.deliveryDate || order.completionDate;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateText || ""))) return false;
    const date = new Date(`${dateText}T12:00:00`);
    const week = isoWeek(date);
    return week.week === current.week && week.year === current.year;
  }).map(order => {
    const date = new Date(`${order.productionPlan.deliveryDate || order.deliveryDate || order.completionDate}T12:00:00`);
    return { order, day: ((date.getDay() + 6) % 7) + 1 };
  }).sort((a, b) => a.day - b.day || String(a.order.orderNumber || "").localeCompare(String(b.order.orderNumber || "")));
}
const DASH_DAYS = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];
export default function AdminDashboardPage({
  orders = [], orderFetchError, onOpenBadgeOrders, onOpenProductionOrders, onOpenApprovalOrders,
  onOpenStatistics,onOpenPlanning, onOpenArticles, onOpenSymbols, onOpenArticleGroups, onOpenProjects, onOpenUsers, onOpenDrawings, onOpenSettings, onOpenPortal, onOpenProfile, role, user, onLogout,
}) {
  const activeProductionOrders = orders.filter(order => !isBadgeOrder(order) && ["godkänd", "påbörjad", "klar", "skickad"].includes(String(order.status || "").toLowerCase())).length;
  const pending = orders.filter((order) => !isBadgeOrder(order) && ["väntar_godkännande", "ny"].includes(String(order.status || "").toLowerCase())).length;
  const recentOrders = [...orders].sort((a,b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0,5);
  const now = new Date();
  const thisWeek = isoWeek(now);
  const weekRows = dashboardPlanRows(orders,now);
  const today = new Intl.DateTimeFormat("sv-SE", { weekday:"long", day:"numeric", month:"long", year:"numeric" }).format(now);
  const week = thisWeek.week;

  return (
    <PageContainer>
      {orderFetchError && <div role="alert" style={{background:"#fff4ec",border:"1px solid #e8bda2",borderRadius:10,padding:"12px 16px",color:"#813d22",margin:16}}>{orderFetchError}</div>}
      <AdminLayout active="dashboard" role={role} user={user} onLogout={onLogout}
        onOpenDashboard={() => {}} onOpenOrders={onOpenProductionOrders} onOpenBadgeOrders={onOpenBadgeOrders} onOpenApprovalOrders={onOpenApprovalOrders} onOpenStatistics={onOpenStatistics} onOpenPlanning={onOpenPlanning}
        onOpenArticles={onOpenArticles} onOpenSymbols={onOpenSymbols} onOpenArticleGroups={onOpenArticleGroups}
        onOpenProjects={onOpenProjects} onOpenUsers={onOpenUsers} onOpenDrawings={onOpenDrawings} onOpenSettings={onOpenSettings} onOpenPortal={onOpenPortal} onOpenProfile={onOpenProfile}>
        <main className="dash-main">
          <header className="dash-topbar">
            <div className="dash-search"><WorkspaceIcon name="search"/><span>Sök order, kund, artikel ...</span></div>
            <div className="dash-profile"><button aria-label="Notiser"><WorkspaceIcon name="bell"/></button><span>RM</span></div>
          </header>

          <section className="dash-hero" style={{ "--jsf-dashboard-image": `url("${process.env.PUBLIC_URL || ""}/landing-background.jpg")` }}>
            <div className="dash-hero-copy">
              <div className="dash-eyebrow">ÖVERSIKT</div>
              <h1>Välkommen tillbaka,<br/><strong>Richard</strong></h1>
              <p>Här får du en överblick över dina ordrar och planering.</p>
            </div>
            <div className="dash-date">{today} &nbsp;·&nbsp; v. {week}</div>
          </section>

          <section className="dash-metrics">
            <Metric icon="badgeProduction" label="Namnbrickor & yrkestitlar" value={orders.filter(isBadgeOrder).reduce((n,o)=>n+(o.cart || []).filter(badgeKind).reduce((v,i)=>v+Number(i.quantity || 0),0),0)} note="beställda exemplar totalt" onClick={onOpenBadgeOrders}/>
            <Metric icon="orders" label="Lagda ordrar" value={activeProductionOrders} note="aktiva produktionsordrar" onClick={onOpenProductionOrders}/>
            <Metric icon="approvalOrders" label="Ordrar att godkänna" value={pending} note="väntar på godkännande" onClick={onOpenApprovalOrders}/>
          </section>

          <section className="dash-card dash-planning">
            <div className="dash-card-head">
              <div><Icon>planning</Icon><h2>Veckans planering</h2><span className="dash-week-tag">Vecka {thisWeek.week} – {thisWeek.year}</span></div>
              <button className="dash-text-link" onClick={onOpenPlanning}>Öppna planeringen →</button>
            </div>
            <div className="dash-week-table-wrap"><table className="dash-week-table">
              <thead><tr><th>Dag</th><th>Order</th><th>Kund</th><th>Objekt</th><th>Artikeltyp</th><th>Orderstatus</th></tr></thead>
              <tbody>{weekRows.length ? weekRows.map(({order,day})=><tr key={order.id}>
                <td><b>{DASH_DAYS[day-1]}</b><small>v{thisWeek.week}:{day}</small></td>
                <td className="dash-week-order">#{order.orderNumber||order.submissionNumber||order.id}</td>
                <td>{planningCustomer(order)||"–"}</td><td>{planningObject(order)||"–"}</td><td>{planningArticleGroups(order)}</td>
                <td><StatusPill status={order.status}/></td>
              </tr>) : <tr><td colSpan="6" className="dash-empty">Inga slutleveranser planerade den här veckan.</td></tr>}</tbody>
            </table></div>
          </section>

          <section className="dash-bottom">
            <div className="dash-card dash-orders">
              <div className="dash-card-head"><div><Icon>orders</Icon><h2>Senaste beställningar</h2></div><button className="dash-text-link" onClick={onOpenProductionOrders}>Visa alla →</button></div>
              <div className="dash-table-wrap"><table><thead><tr><th>Ordernr</th><th>Beställare</th><th>Typ</th><th>Antal</th><th>Status</th><th>Skapad</th><th></th></tr></thead><tbody>
                {recentOrders.length ? recentOrders.map(order => <tr key={order.id || order.orderNumber}><td><b>{order.orderNumber || "-"}</b></td><td>{order.orderer?.ordererName || "-"}</td><td>{getOrderType(order)}</td><td>{getOrderQuantity(order)}</td><td><StatusPill status={order.status}/></td><td>{formatDate(order.createdAt)}</td><td>›</td></tr>) : <tr><td colSpan="7" className="dash-empty">Inga beställningar att visa ännu.</td></tr>}
              </tbody></table></div>
            </div>
            <div className="dash-card dash-shortcuts"><div className="dash-card-head"><h2>Snabblänkar</h2></div><div className="dash-quick-grid">
              <QuickLink icon="planning" title="Planering" onClick={onOpenPlanning}/><QuickLink icon="articles" title="Artiklar" onClick={onOpenArticles}/><QuickLink icon="articleGroups" title="Artikelgrupper" onClick={onOpenArticleGroups}/><QuickLink icon="projects" title="Projekt" onClick={onOpenProjects}/><QuickLink icon="users" title="Användare" onClick={onOpenUsers}/><QuickLink icon="drawings" title="Ritningar"/>
            </div></div>
          </section>
        </main>
      </AdminLayout>

      <style>{`
        .dash-shell{min-height:100vh;background:${PAPER};color:${INK};display:grid;grid-template-columns:220px minmax(0,1fr);font-family:Inter,Arial,sans-serif;margin:-24px -16px 0}
        .dash-sidebar{position:sticky;top:0;height:100vh;background:${SIDEBAR};padding:25px 14px 18px;display:flex;flex-direction:column;box-sizing:border-box}
        .dash-brand{height:58px;display:flex;align-items:flex-start;padding:0 10px 20px}.dash-brand img{width:166px;height:52px;object-fit:contain;object-position:left center;filter:brightness(0) invert(1);mix-blend-mode:screen}
        .dash-sidebar nav{display:grid;gap:5px}.dash-nav-item{width:100%;border:0;background:transparent;color:#d9e1dd;border-radius:10px;padding:12px 13px;display:flex;align-items:center;gap:13px;font-size:14px;text-align:left;cursor:pointer;transition:.16s ease}.dash-nav-item>span:first-child{width:22px;text-align:center;font-size:19px;color:#edf3f0}.dash-nav-item:hover{background:rgba(255,255,255,.06);color:#fff}.dash-nav-item.active{background:rgba(255,255,255,.09);box-shadow:inset 3px 0 0 #78c7a4;color:#fff}.dash-sidebar-bottom{margin-top:auto}
        .dash-main{min-width:0;padding:0 34px 42px}.dash-topbar{height:70px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid ${LINE};gap:20px}.dash-search{width:min(440px,48vw);height:38px;border:1px solid ${LINE};border-radius:10px;background:#fff;display:flex;align-items:center;gap:11px;padding:0 14px;color:#9a9e9b;font-size:13px;box-shadow:0 2px 8px rgba(20,30,25,.025)}.dash-profile{display:flex;align-items:center;gap:13px}.dash-profile button{border:0;background:transparent;font-size:21px}.dash-profile span{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:${SIDEBAR};color:white;font-size:12px}
        .dash-hero{height:180px;position:relative;margin:0 -34px 0;padding:25px 34px;box-sizing:border-box;background:linear-gradient(90deg,#ffffff 0%,rgba(255,255,255,.96) 36%,rgba(255,255,255,.72) 58%,rgba(255,255,255,.18) 100%),url('/landing-background.jpg') center 44%/cover no-repeat;display:flex;justify-content:space-between;align-items:flex-start}.dash-hero-copy{position:relative;z-index:1}.dash-eyebrow{font-size:11px;font-weight:800;letter-spacing:.08em;margin-bottom:7px}.dash-hero h1{font-size:28px;line-height:1.05;font-weight:400;margin:0}.dash-hero h1 strong{font-size:48px;letter-spacing:-.035em}.dash-hero p{margin:7px 0 0;color:${MUTED};font-size:14px}.dash-date{text-transform:capitalize;font-size:11px;margin-top:4px;white-space:nowrap}
        .dash-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:4px;margin-bottom:14px}.dash-metric{min-height:124px;border:1px solid ${LINE};border-radius:14px;background:rgba(255,255,255,.94);padding:18px 18px;display:grid;grid-template-columns:52px 1fr auto;gap:14px;align-items:center;text-align:left;cursor:pointer;box-shadow:0 5px 20px rgba(25,35,30,.035);transition:.16s ease}.dash-metric:hover,.dash-quick:hover{transform:translateY(-1px);box-shadow:0 8px 22px rgba(25,35,30,.065);border-color:#daddd9}.dash-icon{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:#f0f2ef;color:#17251f;font-size:18px;flex:0 0 auto}.dash-metric-copy{min-width:0}.dash-metric-label{font-size:13px;font-weight:700;line-height:1.25;min-height:32px}.dash-metric strong{display:block;font-size:29px;line-height:1;margin:5px 0 5px}.dash-metric-copy>span{color:${MUTED};font-size:12px}.dash-arrow{font-size:19px;color:#5e6561}
        .dash-card{background:#fff;border:1px solid ${LINE};border-radius:14px;box-shadow:0 5px 20px rgba(25,35,30,.03)}.dash-card-head{min-height:57px;padding:0 18px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid ${LINE};gap:14px}.dash-card-head>div{display:flex;align-items:center;gap:10px}.dash-card-head .dash-icon{width:31px;height:31px;font-size:14px}.dash-card h2{font-size:18px;margin:0;letter-spacing:-.015em}.dash-planning{margin-bottom:14px;overflow:hidden}.dash-plan-controls{display:flex;align-items:center;gap:9px;font-size:12px}.dash-plan-controls button{width:32px;height:32px;border:1px solid ${LINE};background:#fff;border-radius:50%;cursor:pointer}.dash-plan-controls .dash-period{width:auto;border-radius:8px;padding:0 12px;margin-left:6px}.dash-plan-scroll{overflow-x:auto}.dash-plan-grid{min-width:900px;padding:0 16px 13px}.dash-plan-days{display:grid;grid-template-columns:120px repeat(10,minmax(72px,1fr));min-height:54px}.dash-plan-days>span{display:flex;flex-direction:column;align-items:center;justify-content:center;border-left:1px solid #f0f1ef;font-size:11px}.dash-plan-days>span:first-child{border-left:0}.dash-plan-days small{font-size:9px;color:#9a9e9b;margin-top:3px}.dash-plan-row{display:grid;grid-template-columns:120px 1fr;min-height:43px}.dash-lane-name{display:flex;align-items:center;font-size:12px;font-weight:600}.dash-lane-grid{display:grid;grid-template-columns:repeat(10,minmax(72px,1fr));position:relative;border-top:1px solid #eff0ee}.dash-lane-grid i{border-left:1px solid #f0f1ef}.dash-plan-bar{grid-row:1;align-self:center;z-index:2;background:#e9ecea;border:1px solid #e0e4e1;border-radius:5px;margin:5px 5px;padding:6px 9px;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#303531}
        .dash-bottom{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(300px,.85fr);gap:14px}.dash-orders,.dash-shortcuts{overflow:hidden}.dash-text-link{border:0;background:transparent;color:${GREEN};font-weight:700;font-size:12px;cursor:pointer}.dash-table-wrap{overflow-x:auto;padding:0 14px 10px}.dash-table-wrap table{width:100%;border-collapse:collapse;min-width:690px;font-size:11px}.dash-table-wrap th{font-weight:600;color:${MUTED};text-align:left;padding:11px 8px;border-bottom:1px solid ${LINE}}.dash-table-wrap td{padding:10px 8px;border-bottom:1px solid #f0f1ef;color:#4b504d}.dash-table-wrap tr:last-child td{border-bottom:0}.dash-table-wrap td:first-child{color:${INK}}.dash-status{display:inline-flex;padding:4px 9px;border-radius:999px;background:#eef0ee;color:#59605c;font-size:10px}.dash-empty{text-align:center;padding:28px!important;color:${MUTED}!important}.dash-quick-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;padding:14px}.dash-quick{border:1px solid ${LINE};background:#fff;border-radius:10px;min-height:58px;padding:9px 10px;display:grid;grid-template-columns:34px 1fr auto;align-items:center;gap:8px;text-align:left;font-size:12px;font-weight:700;cursor:pointer;transition:.16s ease}.dash-quick .dash-icon{width:32px;height:32px;font-size:14px}
        @media(max-width:1050px){.dash-shell{grid-template-columns:72px minmax(0,1fr)}.dash-brand{padding:0 0 20px}.dash-brand img{width:45px;object-fit:cover;object-position:left}.dash-nav-item{justify-content:center;padding:12px}.dash-nav-item>span:last-child{display:none}.dash-main{padding-left:22px;padding-right:22px}.dash-hero{margin-left:-22px;margin-right:-22px;padding-left:22px;padding-right:22px}.dash-metrics{grid-template-columns:1fr}.dash-bottom{grid-template-columns:1fr}}
        @media(max-width:700px){.dash-shell{display:block;margin:-24px -16px 0}.dash-sidebar{position:relative;height:auto;padding:10px 12px;display:block}.dash-brand{height:45px;padding:0}.dash-brand img{width:145px;height:42px;object-fit:contain}.dash-sidebar nav{display:flex;overflow-x:auto;padding:5px 0}.dash-nav-item{width:auto;min-width:max-content}.dash-nav-item>span:last-child{display:inline}.dash-sidebar-bottom{display:none}.dash-main{padding:0 14px 28px}.dash-topbar{height:58px}.dash-search{width:70%;}.dash-hero{height:160px;margin:0 -14px;padding:20px 14px}.dash-hero h1{font-size:23px}.dash-hero h1 strong{font-size:39px}.dash-date{display:none}.dash-metric{min-height:105px}.dash-bottom{grid-template-columns:1fr}.dash-quick-grid{grid-template-columns:1fr 1fr}}

        .dash-week-tag{font-size:11px;font-weight:600;color:#819086;background:#f3f6f3;padding:5px 9px;border-radius:20px}
        .dash-week-table-wrap{overflow-x:auto;padding:0 16px 12px}
        .dash-week-table{width:100%;border-collapse:collapse;min-width:560px;font-size:12px}
        .dash-week-table th{text-align:left;font-size:11px;font-weight:600;color:#78857c;padding:13px 9px;border-bottom:1px solid #e8ede9}
        .dash-week-table td{padding:11px 9px;border-bottom:1px solid #eff1ef;color:#3c4b40}
        .dash-week-table tr:last-child td{border-bottom:0}
        .dash-week-table td small{display:block;color:#99a49a;font-size:10px;margin-top:2px}
        .dash-week-order{color:#176b4a!important;font-weight:700}
        .dash-week-status{font-weight:800;color:#9da8a0;font-size:17px}
        .dash-week-status.status-klar{color:#278b57}.dash-week-status.status-paborjad{color:#3374ae}.dash-week-status.status-pausad{color:#c18b31}
      `}</style>
    </PageContainer>
  );
}
