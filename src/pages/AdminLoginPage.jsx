import { useState } from "react";
import { readApiResponse } from "../data/apiResponse";
import NoiseRevealLogo from "../components/layout/NoiseRevealLogo";
import "./AccountPage.css";
import "../styles/loginCalm.css";

const initialFields = { firstName: "", lastName: "", email: "", phone: "", organization: "", department: "", password: "", confirm: "" };
function Field({ name, label, error, children }) {
  return <div className={`jsf-login-control${error ? " has-error" : ""}`}>
    <label htmlFor={`login-${name}`}>{label}</label>{children}
    {error && <p className="jsf-login-field-error" id={`login-${name}-error`}>{error}</p>}
  </div>;
}
export default function AdminLoginPage({ goBackToLanding, onAccountLogin }) {
  const [view, setView] = useState("login");
  const [fields, setFields] = useState(initialFields);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const email = fields.email;
  const update = (key, value) => {
    setFields(previous => ({ ...previous, [key]: value }));
    setErrors(previous => { const next = { ...previous }; delete next[key]; if (key === "password") delete next.confirm; return next; });
  };
  const inputProps = name => ({ id: `login-${name}`, "aria-invalid": errors[name] ? true : undefined, "aria-describedby": errors[name] ? `login-${name}-error` : undefined });
  const textField = (name, label, extra = {}) => <Field name={name} label={label} error={errors[name]}><input {...extra} {...inputProps(name)} value={fields[name]} onChange={event => update(name, event.target.value)}/></Field>;
  function changeView(next) { setView(next); setMessage(""); setErrors({}); setShowPassword(false); }
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setMessage(""); setSuccess(false);
    const next = {};
    if (view === "register") {
      if (!fields.firstName.trim()) next.firstName = "Fyll i ditt förnamn.";
      if (!fields.lastName.trim()) next.lastName = "Fyll i ditt efternamn.";
    }
    if (!email.trim()) next.email = "Fyll i din e-postadress.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = "Ange en giltig e-postadress, till exempel namn@foretag.se.";
    if (view === "register" && !fields.organization.trim()) next.organization = "Fyll i din organisation eller verksamhet.";
    if (!fields.password) next.password = "Fyll i ditt lösenord.";
    else if (view === "register" && fields.password.length < 12) next.password = "Välj ett lösenord med minst 12 tecken.";
    if (view === "register") {
      if (!fields.confirm) next.confirm = "Skriv lösenordet igen för att bekräfta.";
      else if (fields.password !== fields.confirm) next.confirm = "Lösenorden matchar inte.";
    }
    setErrors(next);
    if (Object.keys(next).length) { document.getElementById(`login-${Object.keys(next)[0]}`)?.focus(); return; }
    setBusy(true);
    try {
      const response = await fetch(view === "register" ? "/api/account/register" : "/api/account/login", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...fields, email: email.trim() })
      });
      const data = await readApiResponse(response);
      if (view === "register") { setFields(previous => ({ ...previous, password: "", confirm: "" })); changeView("login"); setMessage(data.message || "Ansökan skickad."); }
      else {
        setSuccess(true);
        await onAccountLogin?.(data.user, data.token);
      }
    } catch (error) { setSuccess(false); setMessage(error.message || "Ett fel inträffade."); }
    finally { setBusy(false); }
  }
  return <main className={`jsf-login-screen jsf-calm-login${success ? " jsf-login-success" : ""}`}>
    <button type="button" className="jsf-login-back jsf-back-link" onClick={goBackToLanding}>← Till beställningssidan</button>
    <div className="jsf-login-shell">
      <div className="jsf-login-brands">
        <NoiseRevealLogo className="jsf-login-logo" src="/jsf-logo.jpg" alt="Jönköpings Skyltfabrik"/>
        <NoiseRevealLogo className="jsf-login-region-logo" src="/logoRJL_transparent.png" alt="Region Jönköpings län" delay={400} duration={3200}/>
      </div>
      <div className="jsf-login-content">
        <h1>{view === "login" ? "Logga in" : "Ansök om konto"}</h1>
        <p className="jsf-login-subtitle">{view === "login" ? "Ange dina uppgifter för att komma till ditt konto." : "Fyll i dina uppgifter. En administratör granskar ansökan innan kontot aktiveras."}</p>
        <form onSubmit={submit} noValidate className="jsf-login-form">
          {view === "register" && <div className="jsf-login-grid">{textField("firstName", "Förnamn", { required: true, autoComplete: "given-name" })}{textField("lastName", "Efternamn", { required: true, autoComplete: "family-name" })}</div>}
          <Field name="email" label="E-postadress" error={errors.email}><div className="jsf-login-field"><input {...inputProps("email")} type="email" required autoComplete="email" placeholder="namn@foretag.se" value={email} onChange={event => update("email", event.target.value)}/><span aria-hidden="true">✉</span></div></Field>
          {view === "register" && <><div className="jsf-login-grid">{textField("phone", "Telefon", { type: "tel", autoComplete: "tel" })}{textField("organization", "Organisation / verksamhet", { required: true })}</div>{textField("department", "Avdelning / enhet")}</>}
          <Field name="password" label="Lösenord" error={errors.password}><div className="jsf-login-field"><input {...inputProps("password")} type={showPassword ? "text" : "password"} required minLength={view === "register" ? 12 : undefined} autoComplete={view === "register" ? "new-password" : "current-password"} placeholder="Ange ditt lösenord" value={fields.password} onChange={event => update("password", event.target.value)}/><button className="jsf-login-eye" type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Dölj lösenord" : "Visa lösenord"}>{showPassword ? "Dölj" : "Visa"}</button></div></Field>
          {view === "register" && <>{textField("confirm", "Bekräfta lösenord", { type: showPassword ? "text" : "password", required: true, minLength: 12, autoComplete: "new-password" })}<p className="jsf-login-help">Minst 12 tecken. Nya konton får rollen Beställare efter godkännande.</p></>}
          {view === "login" && <div className="jsf-login-options"><button type="button" onClick={() => setMessage("Lösenordsåterställning via e-post är ännu inte aktiverad. Kontakta administratören för hjälp.")}>Glömt lösenord?</button></div>}
          {Object.keys(errors).length > 0 && <p className="jsf-login-validation-summary" role="alert">Kontrollera de markerade fälten.</p>}
          {message && <p className="jsf-login-notice" role="status">{message}</p>}
          <button className="jsf-login-submit" disabled={busy} type="submit">{success ? "Öppnar ditt konto …" : busy ? "Vänta..." : view === "register" ? "Skicka ansökan" : "Logga in"} <span aria-hidden="true">→</span></button>
        </form>
        <div className="jsf-login-divider"><span>eller</span></div>
        <button type="button" className={`jsf-login-alternate${view === "register" ? " jsf-back-link" : ""}`} onClick={() => changeView(view === "register" ? "login" : "register")}>{view === "register" ? "← Tillbaka till inloggning" : "Ansök om konto"}</button>
        <p className="jsf-login-caption">{view === "register" ? "Du kan beställa utan konto medan din ansökan granskas." : "Alla kontoansökningar granskas innan kontot aktiveras."}</p>
      </div>
    </div>
  </main>;
}
