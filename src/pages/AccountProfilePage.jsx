import {showFieldError} from "../components/forms/InlineValidation";
import { useEffect, useState } from "react";
import { AdminLayout } from "../components/admin/AdminNavigation";

const fields = [["firstName", "Förnamn"], ["lastName", "Efternamn"], ["phone", "Telefon"], ["organization", "Organisation / företag"], ["department", "Avdelning / enhet"]];
const roleNames = { bestallare: "Beställare", personal: "Personal", admin: "Admin" };
export default function AccountProfilePage({ user, token, onUserUpdated, ...nav }) {
  const [form, setForm] = useState({});
  const [password, setPassword] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { setForm(Object.fromEntries(fields.map(([key]) => [key, user?.[key] || ""]))); }, [user]);
  async function request(path, body) {
    const response = await fetch(path, { method: path.endsWith("change-password") ? "POST" : "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Kunde inte spara ändringarna.");
    return data;
  }
  async function saveProfile(e) {
    e.preventDefault(); setSaving(true); setError(""); setMessage("");
    try { const data = await request("/api/account/me", form); onUserUpdated(data.user); setMessage("Dina uppgifter har sparats."); }
    catch (err) { setError(err.message); } finally { setSaving(false); }
  }
  async function savePassword(e) {
    e.preventDefault(); setSaving(true); setError(""); setMessage("");
    if (password.newPassword !== password.confirm) { const confirm=e.currentTarget.querySelectorAll('input[autocomplete="new-password"]')[1];showFieldError(confirm,"De nya lösenorden stämmer inte överens.");confirm?.focus();setSaving(false);return; }
    try { const data = await request("/api/account/change-password", { currentPassword: password.currentPassword, newPassword: password.newPassword }); setPassword({ currentPassword: "", newPassword: "", confirm: "" }); setMessage(data.message); }
    catch (err) { setError(err.message); } finally { setSaving(false); }
  }
  return <AdminLayout active="profile" user={user} {...nav}>
    <main className="jsf-profile-page">
      <div className="jsf-profile-kicker">MITT KONTO</div><h1>Min sida</h1>
      {error && <p className="jsf-profile-alert error" role="alert">{error}</p>}{message && <p className="jsf-profile-alert success" role="status">{message}</p>}
      <div className="jsf-profile-grid">
        <form className="jsf-profile-card" onSubmit={saveProfile}><h2>Mina uppgifter</h2><div className="jsf-profile-fields">
          {fields.map(([key,label]) => <label key={key}>{label}<input value={form[key] || ""} onChange={e => setForm(v => ({ ...v, [key]: e.target.value }))} required={["firstName","lastName","organization"].includes(key)} maxLength={200}/></label>)}
          <label>E-postadress<input value={user?.email || ""} readOnly /></label>
          <label>Roll<input value={roleNames[user?.role] || user?.role || ""} readOnly /></label>
          <label>Kontostatus<input value={user?.status === "approved" ? "Godkänd" : user?.status || ""} readOnly /></label>
        </div><button disabled={saving} type="submit">Spara ändringar</button></form>
        <form className="jsf-profile-card" onSubmit={savePassword}><h2>Byt lösenord</h2>
          <label>Nuvarande lösenord<input type="password" autoComplete="current-password" required value={password.currentPassword} onChange={e=>setPassword(v=>({...v,currentPassword:e.target.value}))}/></label>
          <label>Nytt lösenord (minst 12 tecken)<input type="password" autoComplete="new-password" minLength={12} required value={password.newPassword} onChange={e=>setPassword(v=>({...v,newPassword:e.target.value}))}/></label>
          <label>Bekräfta nytt lösenord<input type="password" autoComplete="new-password" minLength={12} required value={password.confirm} onChange={e=>setPassword(v=>({...v,confirm:e.target.value}))}/></label>
          <button disabled={saving} type="submit">Ändra lösenord</button>
        </form>
      </div>
    </main><style>{`.jsf-profile-page{padding:38px 40px 70px;background:#f8f9f7;min-height:100vh;box-sizing:border-box;color:#15241d}.jsf-profile-kicker{font-size:11px;color:#25744f;font-weight:800;letter-spacing:.12em}.jsf-profile-page h1{font-size:36px;margin:7px 0}.jsf-profile-page>p{color:#718078;margin:0 0 26px}.jsf-profile-grid{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(270px,1fr);gap:20px;max-width:1100px}.jsf-profile-card{border:1px solid #e0e7e2;background:white;border-radius:17px;padding:27px;display:flex;flex-direction:column;gap:17px;align-self:start;box-shadow:0 8px 25px #102a1908}.jsf-profile-card h2{font-size:19px;margin:0}.jsf-profile-card p{font-size:13px;color:#748179;margin:0}.jsf-profile-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}.jsf-profile-card label{display:grid;gap:7px;font-size:12px;font-weight:650;color:#2d4436}.jsf-profile-card input{box-sizing:border-box;width:100%;height:43px;border:1px solid #dce5de;border-radius:9px;padding:0 12px;background:#fff;color:#172c20;font:inherit;font-weight:400}.jsf-profile-card input[readonly]{background:#f5f7f5;color:#66736a}.jsf-profile-card button{align-self:flex-start;border:0;border-radius:10px;background:#165039;color:white;padding:13px 19px;font-weight:700;cursor:pointer}.jsf-profile-card button:disabled{opacity:.55}.jsf-profile-alert{padding:13px;border-radius:10px;max-width:1050px}.jsf-profile-alert.error{background:#fff0ee;color:#9c3029}.jsf-profile-alert.success{background:#e9f6ed;color:#176344}@media(max-width:900px){.jsf-profile-grid{grid-template-columns:1fr}}@media(max-width:620px){.jsf-profile-page{padding:24px 17px}.jsf-profile-fields{grid-template-columns:1fr}}`}</style>
  </AdminLayout>;
}
