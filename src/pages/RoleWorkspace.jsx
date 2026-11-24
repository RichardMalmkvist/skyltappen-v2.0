import AccountOrdersBrowser from "../components/orders/AccountOrdersBrowser";
import BuyerDashboard from "./BuyerDashboard";
import { orderStatusLabel } from "../components/orders/OrderNotifications";
import PageContainer from "../components/layout/PageContainer";
import { AdminLayout } from "../components/admin/AdminNavigation";

export default function RoleWorkspace({ role, user, token, active = "dashboard", orders = [], initialOrderId, ...nav }) {
  const first = user?.firstName || "";
  const isCustomer = role === "bestallare";
  if (isCustomer && ["dashboard", "orders"].includes(active)) return <PageContainer><AdminLayout active={active} role={role} user={user} {...nav}>{active === "dashboard" ? <BuyerDashboard token={token} user={user} {...nav}/> : <main className="jsf-role-workspace" style={{padding:"30px 32px 45px",width:"100%",boxSizing:"border-box"}}><h1>Ordrar</h1><p>Följ beställningar och orderstatus. Visa alla beställare eller bara dina egna.</p><AccountOrdersBrowser token={token} user={user} initialOrderId={initialOrderId}/></main>}</AdminLayout></PageContainer>;
  const title = active === "orders" ? "Ordrar" : active === "articles" ? "Artiklar" : active === "projects" ? "Projekt" : active === "drawings" ? "Ritningar" : "Översikt";
  return <PageContainer><AdminLayout active={active} role={role} user={user} {...nav}>
    <main className="jsf-role-workspace" style={{maxWidth:1180,margin:"auto",padding:"38px 36px",color:"#17241d"}}>
      <div style={{fontSize:12,color:"#176b4a",fontWeight:800,letterSpacing:1}}>JSF FLOW · {isCustomer ? "BESTÄLLARE" : "PERSONAL"}</div>
      <h1 style={{fontSize:34,margin:"12px 0"}}>{active === "dashboard" ? `Välkommen${first ? `, ${first}` : ""}!` : title}</h1>
      <p style={{color:"#64746a",marginBottom:26}}>{isCustomer ? "Här kan du följa alla beställningar, filtrera på användare och fortsätta till beställningsportalen." : "Din arbetsyta för ordrar och produktionsplanering."}</p>
      {active === "orders" && isCustomer ? <AccountOrdersBrowser token={token} user={user}/> : active === "orders" ? <section style={card}>
        {orders.length ? orders.map(o => <div key={o.id} style={{padding:"12px 0",borderBottom:"1px solid #e7ece8"}}><b>{o.orderNumber || o.submissionNumber || "Beställning"}</b><div>{o.orderDetails?.projectName || o.delivery?.company || "Order"} · {orderStatusLabel(o.status)}</div></div>) : <p>{isCustomer ? "Du har ännu inga beställningar kopplade till ditt konto. Gästbeställningar kopplas inte automatiskt till ett konto." : "Det finns inga ordrar att visa."}</p>}
      </section> : active === "dashboard" ? <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16}}>
        <button style={tile} onClick={nav.onOpenOrders}><b>Ordrar</b><span>Se beställningar →</span></button>
        {!isCustomer && <button style={tile} onClick={nav.onOpenPlanning}><b>Planering</b><span>Öppna produktionsplaneringen →</span></button>}
        <button style={tile} onClick={nav.onOpenPortal}><b>Beställningsportalen</b><span>Visa produkter och beställ →</span></button>
      </div> : <section style={card}><p>{active === "articles" ? "Artiklar hanteras av Admin. Du kan se sortimentet i beställningsportalen." : "Den här funktionen utvecklas vidare. Din roll har inte tillgång till administratörens redigeringsverktyg."}</p><button onClick={nav.onOpenPortal} style={{background:"#164a35",color:"white",border:0,borderRadius:8,padding:"12px 16px",cursor:"pointer"}}>Till beställningsportalen</button></section>}
    </main>
  </AdminLayout></PageContainer>;
}
const card = {background:"white",border:"1px solid #e1e9e3",borderRadius:16,padding:24};
const tile = {...card,display:"grid",gap:12,textAlign:"left",cursor:"pointer",font:"inherit",color:"#183b2b"};
