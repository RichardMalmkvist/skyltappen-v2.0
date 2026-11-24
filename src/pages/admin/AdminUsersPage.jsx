import { readApiResponse } from "../../data/apiResponse";
import { useCallback, useEffect, useState } from "react";
import { AdminLayout } from "../../components/admin/AdminNavigation";

const roles = { bestallare: "Beställare", personal: "Personal", admin: "Admin" };
const statuses = { pending: "Väntar på godkännande", approved: "Godkänd", rejected: "Nekad / spärrad" };
export default function AdminUsersPage({ adminPassword, ...nav }) {
  const [users, setUsers] = useState([]); const [error, setError] = useState(""); const [busy, setBusy] = useState("");
  const load = useCallback(async () => {
    try { const r = await fetch("/api/admin/users", { headers: { "x-admin-password": adminPassword } }); const d = await readApiResponse(r); setUsers(d.users || []); }
    catch (e) { setError(e.message); }
  }, [adminPassword]);
  useEffect(() => { load(); }, [load]);
  async function update(id, patch) {
    setBusy(id); setError("");
    try { const r = await fetch(`/api/admin/users/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json", "x-admin-password": adminPassword }, body: JSON.stringify(patch) }); await readApiResponse(r); await load(); }
    catch (e) { setError(e.message); } finally { setBusy(""); }
  }
  return <AdminLayout active="users" {...nav} adminPassword={adminPassword}><main className="jsf-users-page" style={{padding:"32px",maxWidth:1180,margin:"auto"}}><span style={{color:"#607c6d",fontSize:12,fontWeight:700}}>ADMINISTRATION</span><h1 style={{fontSize:32,margin:"10px 0"}}>Användare & behörigheter</h1>{error && <p role="alert" style={{color:"#b32c2c"}}>{error}</p>}
  <div style={{display:"grid",gap:14,marginTop:28}}>{users.length === 0 && <p>Inga registrerade konton ännu.</p>}{users.slice().sort((a,b) => (a.status === "pending" ? -1 : 0) - (b.status === "pending" ? -1 : 0)).map(u => <section key={u.id} style={{background:"white",border:"1px solid #e1e8e2",borderRadius:14,padding:22}}><div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><div><strong style={{fontSize:17}}>{u.firstName} {u.lastName}</strong><div style={{color:"#6b7b71",marginTop:5}}>{u.email} · {u.organization}{u.department ? ` / ${u.department}` : ""}</div><div style={{color:"#6b7b71",marginTop:4,fontSize:13}}>{u.phone || ""}</div></div><span style={{color:u.status === "pending" ? "#a26b0e" : "#32674a",fontSize:13}}>{statuses[u.status]}</span></div><div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginTop:18}}><label>Roll <select value={u.role} disabled={busy===u.id} onChange={e => update(u.id,{role:e.target.value})} style={{padding:9,borderRadius:8,border:"1px solid #d9e4dc"}}>{Object.entries(roles).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>{u.status === "pending" && <button disabled={busy===u.id} onClick={() => update(u.id,{status:"approved"})} style={{background:"#1c593c",color:"white",border:0,borderRadius:8,padding:"10px 17px",cursor:"pointer"}}>Godkänn</button>}{u.status !== "rejected" ? <button disabled={busy===u.id} onClick={() => { if (window.confirm(u.status === "pending" ? "Neka kontoansökan?" : "Spärra kontot? Användaren kan då inte logga in.")) update(u.id,{status:"rejected"}); }} style={{background:"#f6eded",color:"#8c3838",border:0,borderRadius:8,padding:"10px 17px",cursor:"pointer"}}>{u.status === "pending" ? "Neka" : "Spärra konto"}</button> : <button disabled={busy===u.id} onClick={() => update(u.id,{status:"approved"})} style={{background:"#eaf3ed",color:"#1c593c",border:0,borderRadius:8,padding:"10px 17px",cursor:"pointer"}}>Aktivera konto</button>}</div></section>)}</div></main></AdminLayout>;
}
