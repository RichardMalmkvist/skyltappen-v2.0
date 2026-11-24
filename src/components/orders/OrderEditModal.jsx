import {BusyLabel,WorkspaceFeedback} from '../workspace/WorkspaceUI';
import DatePicker from '../forms/DatePicker';
import {showFieldError,fieldValidationMessage} from "../forms/InlineValidation";
import { useMemo, useRef, useState } from "react";

const FIELD_GROUPS = {
  orderer: [
    ["customer", "Kund / verksamhet"],
    ["ordererName", "Kontakt"],
    ["ordererEmail", "E-post"],
    ["ordererPhone", "Telefon"],
    ["purchaserName", "Beställare"],
    ["purchaserPhone", "Beställarens telefonnummer"],
    ["purchaserEmail", "Beställarens mejl"],
    ["accountNumber", "Ansvarsnummer / ansvarskod"],
    ["messageToSupplier", "Beskrivning", "textarea"],
  ],
  orderDetails: [
    ["customerReference", "Kundens ordernummer / referens"],
    ["projectName", "Projekt"],
    ["projectCode", "Projektkod"],
    ["managementObject", "Förvaltningsobjekt"],
    ["targetPoint", "Målpunkt"],
    ["property", "Fastighet"],
    ["building", "Byggnad / hus"],
    ["floor", "Plan"],
    ["room", "Rum"],
    ["priority", "Prioritet", "priority"],
    ["requestedCompletionDate", "Önskat datum", "date"],
    ["requestedExecutionNote", "Utförande / tid", "textarea"],
  ],
};

function clone(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function makeCartItem(article) {
  const unitPrice = Math.max(0, Number(article?.price ?? article?.unitPrice ?? 0) || 0);
  return {
    id: `${article?.id || article?.articleNumber || "article"}-${Date.now()}`,
    articleId: article?.id || "",
    articleNumber: article?.articleNumber || "",
    badgeName: article?.name || article?.title || `Art.nr ${article?.articleNumber || ""}`,
    desc: article?.desc || article?.description || "",
    productType: article?.productType || "standard",
    productTypeLabel: article?.productTypeLabel || article?.group || "Artikel",
    quantity: 1,
    unitPrice,
    lineTotal: unitPrice,
    currency: "SEK",
    customText: "",
    customTextLine2: "",
    name: "",
    title: "",
    extraFields: [],
  };
}

export default function OrderEditModal({ order, catalogArticles = [], onClose, onSave, saving = false, creating = false, error="" }) {
  const [draft, setDraft] = useState(() => {
    const initial = clone(order);
    initial.orderer = { ...(initial.orderer || {}), customer: initial.orderer?.customer || initial.delivery?.company || "" };
    return initial;
  });
  const [articleToAdd, setArticleToAdd] = useState("");
  const panel=useRef(null);
  const [itemError,setItemError]=useState("");

  const sortedArticles = useMemo(() => [...catalogArticles].sort((a, b) =>
    String(a.articleNumber || "").localeCompare(String(b.articleNumber || ""), "sv", { numeric: true })
  ), [catalogArticles]);

  function setSectionField(section, key, value) {
    setDraft((prev) => {
      const next = { ...prev, [section]: { ...(prev[section] || {}), [key]: value } };
      if (section === "orderer" && key === "customer") {
        next.delivery = { ...(prev.delivery || {}), company: value };
      }
      return next;
    });
  }

  function setItem(index, key, value) {
    setDraft((prev) => {
      const cart = [...(prev.cart || [])];
      cart[index] = { ...cart[index], [key]: value };
      return { ...prev, cart };
    });
  }

  function setExtraField(itemIndex, fieldIndex, value) {
    setDraft((prev) => {
      const cart = [...(prev.cart || [])];
      const extraFields = [...(cart[itemIndex]?.extraFields || [])];
      extraFields[fieldIndex] = { ...extraFields[fieldIndex], value };
      cart[itemIndex] = { ...cart[itemIndex], extraFields };
      return { ...prev, cart };
    });
  }

  function removeItem(index) {
    if ((draft.cart || []).length <= 1) {
      setItemError("Ordern måste innehålla minst en artikel.");
      return;
    }
    setDraft((prev) => ({ ...prev, cart: (prev.cart || []).filter((_, i) => i !== index) }));
  }

  function addArticle() {
    const article = sortedArticles.find((a) => String(a.id || a.articleNumber) === articleToAdd);
    if (!article) return;
    setDraft((prev) => ({ ...prev, cart: [...(prev.cart || []), makeCartItem(article)] }));
    setArticleToAdd("");
    setItemError("");
  }

  return (
    <div className="oe-backdrop" role="dialog" aria-modal="true">
      <div ref={panel} className="oe-modal">
        <header className="oe-header">
          <div><span>ORDER</span><h2>{creating ? "Ny order" : `Redigera ${order.orderNumber || order.submissionNumber}`}</h2></div>
          <button type="button" onClick={onClose} aria-label="Stäng">×</button>
        </header>

        <div className="oe-body">
          {error&&<WorkspaceFeedback error>{error}</WorkspaceFeedback>}
          <section className="oe-section"><h3>Beställare</h3><div className="oe-grid">
            {FIELD_GROUPS.orderer.map(([key, label, type]) => type === "textarea" ? (
              <label className="oe-wide" key={key}><span>{label}</span><textarea value={draft.orderer?.[key] || ""} onChange={(e) => setSectionField("orderer", key, e.target.value)} /></label>
            ) : (
              <label key={key}><span>{label}</span><input data-order-field={key} type={key.toLowerCase().includes("email")?"email":type || "text"} required={creating&&["customer","ordererName"].includes(key)} value={draft.orderer?.[key] || ""} onChange={(e) => setSectionField("orderer", key, e.target.value)} /></label>
            ))}
          </div></section>

          <section className="oe-section"><h3>Projekt / objekt</h3><div className="oe-grid">
            {FIELD_GROUPS.orderDetails.map(([key, label, type]) => type === "textarea" ? (
              <label className="oe-wide" key={key}><span>{label}</span><textarea value={draft.orderDetails?.[key] || ""} onChange={(e) => setSectionField("orderDetails", key, e.target.value)} /></label>
            ) : type === "priority" ? (
              <label key={key}><span>{label}</span><select value={draft.orderDetails?.priority || "planeringsbar"} onChange={(e) => setSectionField("orderDetails", "priority", e.target.value)}><option value="planeringsbar">Planeringsbar</option><option value="snarast">Snarast</option><option value="datum">Önskat datum</option></select></label>
            ) : (
              <label key={key}><span>{label}</span>{type === "date" ? <DatePicker value={draft.orderDetails?.[key] || ""} onChange={(e) => setSectionField("orderDetails", key, e.target.value)} /> : <input type={type || "text"} value={draft.orderDetails?.[key] || ""} onChange={(e) => setSectionField("orderDetails", key, e.target.value)} />}</label>
            ))}
          </div></section>

          <section className="oe-section">
            <div className="oe-section-head"><h3>Artiklar</h3><span>{(draft.cart || []).length} rader</span></div>
            <div className="oe-add-row">
              <select value={articleToAdd} onChange={(e) => setArticleToAdd(e.target.value)}>
                <option value="">Välj artikel att lägga till ...</option>
                {sortedArticles.map((article) => <option key={article.id || article.articleNumber} value={String(article.id || article.articleNumber)}>{article.articleNumber ? `${article.articleNumber} – ` : ""}{article.name || article.title || "Artikel"}</option>)}
              </select>
              <button type="button" onClick={addArticle} disabled={!articleToAdd}>+ Lägg till artikel</button>
            </div>

            {itemError&&<p className="jsf-field-error" role="alert">{itemError}</p>}
            <div className="oe-items">
              {(draft.cart || []).map((item, index) => (
                <article className="oe-item" key={item.id || `${item.articleNumber}-${index}`}>
                  <div className="oe-item-head"><strong>{index + 1}. {item.badgeName || item.name || "Artikel"}</strong><button type="button" onClick={() => removeItem(index)}>Ta bort rad</button></div>
                  <div className="oe-grid oe-item-grid">
                    <label><span>Artikelnummer</span><input value={item.articleNumber || ""} onChange={(e) => setItem(index, "articleNumber", e.target.value)} /></label>
                    <label><span>Benämning</span><input value={item.badgeName || ""} onChange={(e) => setItem(index, "badgeName", e.target.value)} /></label>
                    <label><span>Antal</span><input type="number" min="1" value={item.quantity || 1} onChange={(e) => setItem(index, "quantity", e.target.value)} /></label>
                    <label><span>Á-pris (kr)</span><input type="number" min="0" step="0.01" value={item.unitPrice ?? 0} onChange={(e) => setItem(index, "unitPrice", e.target.value)} /></label>
                    <label><span>Textrad 1 / egen text</span><input value={item.customText || item.name || ""} onChange={(e) => { setItem(index, "customText", e.target.value); if ("name" in item) setItem(index, "name", e.target.value); }} /></label>
                    <label><span>Textrad 2 / titel</span><input value={item.customTextLine2 || item.title || ""} onChange={(e) => { setItem(index, "customTextLine2", e.target.value); if ("title" in item) setItem(index, "title", e.target.value); }} /></label>
                    {(item.extraFields || []).map((field, fieldIndex) => (
                      <label key={`${field.label}-${fieldIndex}`}><span>{field.label || `Val ${fieldIndex + 1}`}</span><input value={field.value ?? ""} onChange={(e) => setExtraField(index, fieldIndex, e.target.value)} /></label>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <footer className="oe-footer"><button type="button" className="secondary" onClick={onClose}>Avbryt</button><button type="button" className="primary" disabled={saving} aria-busy={saving} onClick={() => {
          const fields=[...panel.current.querySelectorAll('input,select,textarea')];
          const invalid=fields.filter(field=>field.willValidate&&!field.validity.valid);
          if(invalid.length){invalid.forEach(field=>showFieldError(field,fieldValidationMessage(field),{custom:false}));invalid[0].focus();invalid[0].scrollIntoView({block:'nearest'});return;}
          onSave(draft);
        }}><BusyLabel busy={saving}>{saving?"Sparar\u2026":creating?"Skapa order":"Spara ändringar"}</BusyLabel></button></footer>
      </div>
      <style>{`
        .oe-backdrop{position:fixed;inset:0;background:rgba(18,24,21,.58);z-index:3000;display:grid;place-items:center;padding:20px}.oe-modal{width:min(1050px,96vw);max-height:94vh;background:#fff;border-radius:18px;overflow:hidden;display:grid;grid-template-rows:auto 1fr auto;box-shadow:0 30px 80px rgba(0,0,0,.25);font-family:Inter,Arial,sans-serif;color:#171a18}.oe-header{display:flex;justify-content:space-between;align-items:center;padding:20px 24px;border-bottom:1px solid #e4e7e3}.oe-header span{font-size:10px;font-weight:800;letter-spacing:.1em;color:#176b4a}.oe-header h2{margin:4px 0 0;font-size:24px}.oe-header>button{border:0;background:transparent;font-size:28px;cursor:pointer}.oe-body{overflow:auto;padding:20px 24px 28px;background:#fafbf9}.oe-section{background:#fff;border:1px solid #e4e7e3;border-radius:14px;padding:16px;margin-bottom:12px}.oe-section h3{margin:0 0 13px;font-size:14px}.oe-section-head{display:flex;justify-content:space-between}.oe-section-head span{font-size:11px;color:#6f7571}.oe-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}.oe-grid label{display:grid;gap:5px}.oe-grid label>span{font-size:10px;font-weight:700;color:#626864}.oe-grid input,.oe-grid textarea,.oe-grid select,.oe-add-row select{border:1px solid #dfe4df;border-radius:9px;padding:10px 11px;font:inherit;font-size:12px;background:#fff}.oe-grid textarea{min-height:72px;resize:vertical}.oe-wide{grid-column:1/-1}.oe-add-row{display:grid;grid-template-columns:1fr auto;gap:9px;margin-bottom:13px}.oe-add-row button,.oe-item-head button{border:1px solid #cfe2d8;background:#f1f8f4;color:#176b4a;border-radius:9px;padding:0 13px;font-weight:800;cursor:pointer}.oe-add-row button:disabled{opacity:.45;cursor:not-allowed}.oe-items{display:grid;gap:10px}.oe-item{border:1px solid #e7eae7;border-radius:12px;padding:13px;background:#fcfcfb}.oe-item-head{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:11px}.oe-item-head strong{font-size:12px}.oe-item-head button{height:32px;color:#9e312d;background:#fff6f5;border-color:#efd5d2}.oe-footer{display:flex;justify-content:flex-end;gap:9px;padding:15px 24px;border-top:1px solid #e4e7e3}.oe-footer button{height:42px;border-radius:9px;padding:0 17px;font:inherit;font-weight:800;cursor:pointer}.oe-footer .secondary{background:#fff;border:1px solid #dfe4df}.oe-footer .primary{background:#176b4a;color:#fff;border:0}.oe-footer .primary:disabled{opacity:.6}.oe-item-grid{grid-template-columns:repeat(2,minmax(0,1fr))}@media(max-width:700px){.oe-grid,.oe-item-grid{grid-template-columns:1fr}.oe-wide{grid-column:auto}.oe-add-row{grid-template-columns:1fr}.oe-modal{max-height:97vh}}
      `}</style>
    </div>
  );
}
