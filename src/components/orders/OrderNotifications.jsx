import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import useModalFocus from "../../hooks/useModalFocus";
import { getCartItemDisplayRows } from "../../data/orderDisplayHelpers";
import "./OrderNotifications.css";

export const orderStatusLabel = status => ({
  proof_requested:"Korrektur att godkänna", proof_approved:"Korrektur godkänt", proof_changes_requested:"Ändringar begärda i korrektur", proof_commented:"Ny kommentar till korrektur",
  ny: "Ny", väntar_godkännande: "Väntar på godkännande", behöver_kompletteras: "Behöver kompletteras",
  godkänd: "Godkänd", påbörjad: "I produktion", klar: "Klar", skickad: "Skickad", levererad: "Levererad",
}[status] || status || "Ny");
const dateTime = value => new Date(value).toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" });

export default function OrderNotifications({ session, onOrdersUpdated, onOpenProject }) {
  const [notifications, setNotifications] = useState([]);
  const [orders, setOrders] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [readError, setReadError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const panel = useRef(null);
  const toggle = useRef(null);
  const seenNotifications = useRef(new Set());
  const locallyRead = useRef(new Set());
  const locallyCleared = useRef(new Set());
  const readRequests = useRef(new Map());
  useModalFocus(open, panel, () => setOpen(false));

  useEffect(() => {
    let disposed = false;
    let controller = null;
    let loading = false;
    async function poll() {
      if (loading || document.visibilityState === "hidden") return;
      loading = true;
      controller = new AbortController();
      try {
        const response = await fetch("/api/account/notifications", { headers: { Authorization: `Bearer ${session.token}` }, signal: controller.signal, cache: "no-store" });
        if (response.status === 404) throw new Error("Notisfunktionen saknas på servern. Stoppa appen med Ctrl+C och starta om med npm run dev. Logga sedan in igen.");
        if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "Logga in igen för att hämta dina notiser." : `Kunde inte uppdatera notiser (serverfel ${response.status}). Försök igen.`);
        let data;
        try { data = await response.json(); } catch { throw new Error("Servern svarar inte med notisdata. Starta om appen med npm run dev och logga in igen."); }
        if (!Array.isArray(data.notifications) || !Array.isArray(data.orders)) throw new Error("Servern behöver uppdateras. Stoppa appen med Ctrl+C och starta om med npm run dev.");
        if (!disposed) {
          setNotifications(data.notifications.filter(event => !locallyCleared.current.has(event.id) && ["godkänd", "levererad", "proof_requested", "proof_approved", "proof_changes_requested", "proof_commented"].includes(event.status)).map(event => locallyRead.current.has(event.id) ? { ...event, readAt: event.readAt || true } : event));
          setOrders(data.orders || []);
          onOrdersUpdated({ token: session.token, orders: data.orders || [] });
          setLoaded(true);
          setError("");
        }
      } catch (failure) { if (!disposed && failure.name !== "AbortError") setError(failure.message || "Kunde inte hämta notiser."); }
      finally { loading = false; }
    }
    poll();
    const interval = window.setInterval(poll, 20000);
    window.addEventListener("focus", poll);
    document.addEventListener("visibilitychange", poll);
    return () => { disposed = true; controller?.abort(); window.clearInterval(interval); window.removeEventListener("focus", poll); document.removeEventListener("visibilitychange", poll); };
  }, [session.token, onOrdersUpdated, refresh]);
  useEffect(() => {
    const requests = readRequests.current;
    return () => requests.forEach(controller => controller.abort());
  }, []);

  useEffect(() => {
    const unseen = notifications.some(event => !event.readAt && !seenNotifications.current.has(event.id));
    notifications.forEach(event => seenNotifications.current.add(event.id));
    if (!unseen || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || !toggle.current?.animate) return;
    const animation = toggle.current.animate([
      { transform: "translateX(0) rotate(0)" },
      { transform: "translateX(-4px) rotate(-2deg)" },
      { transform: "translateX(4px) rotate(2deg)" },
      { transform: "translateX(-3px) rotate(-1deg)" },
      { transform: "translateX(3px) rotate(1deg)" },
      { transform: "translateX(0) rotate(0)" },
    ], { duration: 600, easing: "ease-in-out" });
    return () => animation.cancel();
  }, [notifications]);

  async function openNotification(event) {
    if(event.kind==='project-proof'){setSelectedId(null);setOpen(false);event.proofId?onOpenProject?.(event.projectId,event.proofId):onOpenProject?.(event.projectId);}else setSelectedId(event.orderId);
    setReadError("");
    if (event.readAt || readRequests.current.has(event.id)) return;
    const controller = new AbortController();
    readRequests.current.set(event.id, controller);
    setBusyId(event.id);
    try {
      const response = await fetch(`/api/account/notifications/${encodeURIComponent(event.id)}/read`, { method: "PATCH", headers: { Authorization: `Bearer ${session.token}` }, signal: controller.signal });
      if (!response.ok) throw new Error("Kunde inte markera notisen som läst. Försök igen.");
      locallyRead.current.add(event.id);
      setNotifications(previous => previous.map(item => item.id === event.id ? { ...item, readAt: true } : item));
    } catch (failure) { if (failure.name !== "AbortError") setReadError(failure.message); }
    finally { readRequests.current.delete(event.id); if (!controller.signal.aborted) setBusyId(null); }
  }
  async function clearRead() {
    if (clearing || busyId) return;
    setClearing(true); setReadError("");
    const controller = new AbortController();
    readRequests.current.set("clear-read", controller);
    try {
      const response = await fetch("/api/account/notifications/clear-read", { method: "POST", headers: { Authorization: `Bearer ${session.token}` }, signal: controller.signal });
      if (!response.ok) throw new Error("Kunde inte rensa lästa notiser. Försök igen.");
      const data = await response.json();
      if (!Array.isArray(data.clearedIds)) throw new Error("Starta om appen med npm run dev för att aktivera rensningen.");
      data.clearedIds.forEach(id => locallyCleared.current.add(id));
      setNotifications(previous => previous.filter(event => !locallyCleared.current.has(event.id)));
      setSelectedId(null);
    } catch (failure) { if (failure.name !== "AbortError") setReadError(failure.message); }
    finally { readRequests.current.delete("clear-read"); if (!controller.signal.aborted) setClearing(false); }
  }
  const unread = notifications.filter(event => !event.readAt).length;
  const selected = orders.find(order => order.id === selectedId);
  return createPortal(<div className="jsf-order-notifications">
    <button ref={toggle} type="button" className={`jsf-notification-toggle${unread ? " has-unread" : ""}`} aria-label={`Notiser${unread ? `, ${unread} olästa` : ""}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => { setOpen(true); setRefresh(value => value + 1); }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/></svg>
      Notiser {error && <span className="jsf-notification-count" title="Notiser kunde inte hämtas">!</span>} {unread > 0 && <span className="jsf-notification-count">{unread}</span>}
    </button>
    <span className="jsf-notification-announcement" role="status" aria-live="polite">{unread ? `Du har ${unread} olästa notiser.` : ""}</span>
    {open && <div className="jsf-notification-backdrop" onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section ref={panel} className="jsf-notification-panel" role="dialog" aria-modal="true" aria-label="Dina notiser" tabIndex={-1}>
        <header><div><h2>Notiser</h2><p>{error ? "Kunde inte hämta notiser" : !loaded ? "Hämtar notiser …" : unread ? `${unread} olästa` : "Du är uppdaterad"}</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Stäng notiser">×</button></header>
        <div className="jsf-notification-tools"><span>Lästa visas i 30 dagar.</span><button type="button" disabled={clearing || Boolean(busyId) || !notifications.some(event => event.readAt)} onClick={clearRead}>{clearing ? "Rensar …" : "Rensa lästa"}</button></div>
        <div className="jsf-notification-scroll">
          {(error || readError) && <p role="alert">{error || readError} <button type="button" onClick={() => {setRefresh(value => value + 1);setReadError("");}}>Uppdatera</button></p>}
          {selected ? <article className="jsf-notification-order">
            <button type="button" className="jsf-back-link" onClick={() => setSelectedId(null)}>← Alla notiser</button>
            <h3>Order {selected.orderNumber || selected.submissionNumber}</h3>
            <p>Aktuell status: <strong>{orderStatusLabel(selected.status)}</strong></p>
            {selected.productionPlan?.deliveryDate && <p>Leveransdatum: {selected.productionPlan.deliveryDate}</p>}
            {(selected.cart || []).map((item, index) => <div className="jsf-notification-item" key={item.id || index}><strong>{item.articleNumber ? `${item.articleNumber} · ` : ""}{item.badgeName || item.productName || item.name || "Artikel"}</strong>{getCartItemDisplayRows(item).map((row, rowIndex) => <div key={rowIndex}>{row.label}: {row.value}</div>)}</div>)}
            <h3>Statushistorik</h3>
            {notifications.filter(event => event.orderId === selected.id).map(event => <div className="jsf-notification-history" key={event.id}><span>{orderStatusLabel(event.status)}</span><time dateTime={event.createdAt}>{dateTime(event.createdAt)}</time></div>)}
          </article> : notifications.length ? <ul>{notifications.map(event => <li key={event.id}><button type="button" className={event.readAt ? "" : "unread"} disabled={clearing || busyId === event.id} onClick={() => openNotification(event)}>
            <span>{event.kind==='project-proof'?`${event.proofNumber||"Projekt "+event.projectNumber} · ${event.projectName} · Version ${event.version}`:`Order ${event.orderNumber}`}</span><strong>{orderStatusLabel(event.status)}</strong>{event.comment&&<span className="jsf-proof-notification-comment">{event.sign?`${event.sign.position} · ${event.sign.drawingName} – `:""}{event.changeType==="move"?"Flytta skylten · ":event.changeType==="adjust"?"Justera skylten · ":""}{event.commentedBy}: {event.comment}</span>}<time dateTime={event.createdAt}>{dateTime(event.createdAt)}</time>{!event.readAt && <small>Oläst</small>}
          </button></li>)}</ul> : <p className="jsf-notification-empty">Inga notiser.</p>}
        </div>
      </section>
    </div>}
  </div>, document.body);
}


