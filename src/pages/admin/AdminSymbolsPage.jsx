import {fetchDibondSymbols,saveDibondSymbols,dibondSymbolImage,dibondSymbolPreviewUrl} from "../../data/dibondSymbols";
import {showFieldError} from "../../components/forms/InlineValidation";
import { getDoorSignSymbols } from "../../data/doorSignSymbols";
import { saveSignSymbolLibrary } from "../../data/catalogStore";
import { useMemo, useRef, useState } from "react";
import { AdminLayout } from "../../components/admin/AdminNavigation";
import {
  getHangingSignSymbols,
  getHangingSignSymbolKind,
  DEFAULT_HANGING_SIGN_SYMBOLS,
} from "../../data/hangingSignSymbols";

function makeId() {
  return `symbol-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AdminSymbolsPage(props) {
  const [library, setLibrary] = useState("hanging");
  const [dirty,setDirty]=useState(false);
  const symbolGrid=useRef(null);
  const [uploading, setUploading] = useState(false);
  const [symbols, setSymbols] = useState(() => getHangingSignSymbols({ includeInactive: true }));
  const [name, setName] = useState("");
  const [kind, setKind] = useState("symbol");
  const [message, setMessage] = useState("");
  const fileRef = useRef(null);

  const activeCount = useMemo(() => symbols.filter((s) => s.active !== false).length, [symbols]);

  function persist(next) {
    setSymbols(next);
    setDirty(true);
  }

  async function saveChanges(){
    const invalid=[...(symbolGrid.current?.querySelectorAll('input[aria-label="Symbolnamn"]')||[])].find(input=>!input.value.trim());
    if(invalid){showFieldError(invalid,"Fyll i symbolnamn.");invalid.focus();return false;}
    setUploading(true);setMessage("");
    try{
      const saved=library==="dibond"
        ? await saveDibondSymbols(symbols,props.adminPassword)
        : await saveSignSymbolLibrary(library,symbols,props.adminPassword);
      setSymbols(saved);setDirty(false);setMessage("Symbolbiblioteket är sparat.");return true;
    }
    catch(error){setMessage(error.message);return false;}
    finally{setUploading(false);}
  }
  async function chooseLibrary(value){
    if(uploading||value===library)return;
    if(dirty&&!await saveChanges())return;
    if(value==="dibond"){
      setUploading(true);setMessage("");
      try{const saved=await fetchDibondSymbols(props.adminPassword);setSymbols(saved);setLibrary(value);}
      catch(error){setMessage(error.message);return;}
      finally{setUploading(false);}
    }else{setLibrary(value);setSymbols(value==="door"?getDoorSignSymbols({includeInactive:true}):getHangingSignSymbols({includeInactive:true}));}
    setName("");setMessage("");if(fileRef.current)fileRef.current.value="";
  }
  async function handleFiles(files) {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    try {
    const picture=library==="dibond"?await dibondSymbolImage(file):{image:await fileToDataUrl(file)};
    const nextName = name.trim() || file.name.replace(/\.[^.]+$/, "") || "Ny symbol";
    const next = [
      ...symbols,
      { id: makeId(), name: nextName, ...picture, active: true, isDefault: false, ...(library==="hanging" ? {kind} : {}) },
    ];
    persist(next);
    setName("");
    setMessage(`${nextName} lades till.`);
    if (fileRef.current) fileRef.current.value = "";
    setTimeout(() => setMessage(""), 2200);
    } catch(error) { setMessage(error.message||"Kunde inte läsa symbolbilden. Försök igen."); }
    finally { setUploading(false); }
  }

  function updateSymbol(id, patch) {
    persist(symbols.map((symbol) => (symbol.id === id ? { ...symbol, ...(library==="hanging" ? {kind:getHangingSignSymbolKind(symbol)} : {}), ...patch } : symbol)));
  }

  function removeSymbol(id) {
    persist(symbols.filter((symbol) => symbol.id !== id));
  }

  function resetLibrary() {
    if(library==="dibond"){persist(symbols.filter(symbol=>symbol.builtin).map(symbol=>({...symbol,active:false})));return;}
    persist(library === "door" ? [] : DEFAULT_HANGING_SIGN_SYMBOLS);
  }

  return (
    <AdminLayout active="symbols" {...props}>
      <main className="symbols-page">
        <div className="symbols-head">
          <div>
            <div className="eyebrow">PRODUKTER</div>
            <h1>Symbolbibliotek</h1>
            
          </div>
          <div className="count-pill">{activeCount} aktiva</div>
        </div>

        <div className="symbol-library-tabs" role="tablist" aria-label="Symbolbibliotek">
          {[["hanging","Pendlade skyltar"],["door","Dörrskyltar"],["dibond","Dibondskyltar"]].map(([value,label])=><button key={value} type="button" role="tab" aria-selected={library===value} disabled={uploading} onClick={()=>chooseLibrary(value)}>{label}</button>)}
        </div>
        <div className="dibond-symbol-save"><button type="button" disabled={uploading||!dirty} onClick={saveChanges}>{uploading?"Vänta…":"Spara symboler"}</button>{dirty&&<span>Osparade ändringar</span>}</div>
        <section className="upload-panel">
          <div>
            <b>Lägg till symbol</b>
            
          </div>
          <div className="upload-actions">
            {library==="hanging" && <label className="symbol-kind">Typ<select aria-label="Typ av ny bild" value={kind} onChange={e=>setKind(e.target.value)}><option value="symbol">Symbol</option><option value="target">Målpunkt</option></select></label>}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label="Namn på ny symbol" placeholder={library==="door"?"Namn, t.ex. Återvinning":"Namn, t.ex. Väntrum"}
            />
            <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading?"Läser bild...":"+ Välj bild"}</button>
            <input
              ref={fileRef}
              disabled={uploading}
              hidden
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
        </section>

        {message ? <div className="symbols-message">{message}</div> : null}

        <section ref={symbolGrid} className="symbols-grid">
          {symbols.map((symbol) => (
            <article className={`symbol-card ${symbol.active === false ? "inactive" : ""}`} key={symbol.id}>
              <div className="symbol-image"><img src={library==="dibond"?dibondSymbolPreviewUrl(symbol.image):symbol.image} alt={symbol.name} /></div>
              <div className="symbol-body">
                <input
                  value={symbol.name}
                  onChange={(e) => updateSymbol(symbol.id, { name: e.target.value })}
                  disabled={uploading} aria-label="Symbolnamn"
                />
                {library==="hanging" && <label className="symbol-kind">Typ<select aria-label={`Typ för ${symbol.name}`} value={getHangingSignSymbolKind(symbol)} onChange={e=>updateSymbol(symbol.id,{kind:e.target.value})}><option value="symbol">Symbol</option><option value="target">Målpunkt</option></select></label>}
                <div className="symbol-actions">
                  <button
                    type="button"
                    disabled={uploading} className={symbol.active === false ? "secondary" : "active"}
                    onClick={() => updateSymbol(symbol.id, { active: symbol.active === false })}
                  >
                    {symbol.active === false ? "Aktivera" : "Aktiv"}
                  </button>
                  {!symbol.builtin&&<button type="button" className="danger" disabled={uploading} onClick={() => removeSymbol(symbol.id)}>Ta bort</button>}
                </div>
              </div>
            </article>
          ))}
        </section>

        <button type="button" disabled={uploading} className="reset-link" onClick={resetLibrary}>{library==="dibond"?"Töm dibondskyltarnas symboler":library==="door"?"Töm dörrskyltarnas symboler":"Återställ standardbilder"}</button>
      </main>

      <style>{`
        .symbol-library-tabs{display:flex;flex-wrap:wrap;gap:18px;border-bottom:1px solid #e5e5e5;margin:0 0 20px}.symbol-library-tabs button{background:transparent;border:0;border-bottom:2px solid transparent;border-radius:0;color:#777;font:400 13px Arial,sans-serif;padding:12px 0;cursor:pointer}.symbol-library-tabs button[aria-selected="true"]{border-bottom-color:#353535;color:#353535}.dibond-symbol-save{display:flex;align-items:center;gap:12px;margin-bottom:16px}.dibond-symbol-save button{border:1px solid #353535;background:#353535;color:#fff;padding:10px 14px;border-radius:5px;font:400 12px Arial,sans-serif;cursor:pointer}.dibond-symbol-save button:disabled{opacity:.5}.dibond-symbol-save span{color:#777;font-size:12px}

        .symbol-kind{display:grid;gap:5px;font-size:11px;color:#666}.symbol-kind select{font:inherit;color:#353535;background:#fff;border:1px solid #d9dfdb;border-radius:7px;padding:9px;min-height:38px;max-width:100%}.upload-actions{flex-wrap:wrap}.upload-panel{flex-wrap:wrap}

        .symbol-library-choice{display:flex;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px;font:400 13px Arial,sans-serif;color:#706b66}.symbol-library-choice select{padding:10px 12px;border:1px solid #dcd8d2;border-radius:3px;background:#fff;color:#353535;font:inherit;min-height:44px}
        .symbols-page{max-width:1280px;margin:0 auto;padding:34px 34px 60px;color:#171a18}.symbols-head{display:flex;justify-content:space-between;gap:20px;align-items:flex-end;margin-bottom:24px}.symbols-head h1{font-size:34px;letter-spacing:-.03em;margin:4px 0 6px}.symbols-head p{margin:0;color:#747b77}.eyebrow{font-size:10px;font-weight:800;letter-spacing:.14em;color:#6e7b74}.count-pill{padding:8px 12px;border:1px solid #dfe4e1;border-radius:999px;background:#fff;font-size:11px;color:#53605a}.upload-panel{border:1px solid #e1e5e2;border-radius:16px;background:#fff;padding:18px;display:flex;align-items:center;justify-content:space-between;gap:18px;box-shadow:0 8px 28px rgba(25,35,30,.035)}.upload-panel>div:first-child{display:grid;gap:4px}.upload-panel span{font-size:11px;color:#7c8580}.upload-actions{display:flex;gap:8px;align-items:center}.upload-actions input{height:40px;border:1px solid #d9dfdb;border-radius:10px;padding:0 12px;min-width:230px}.upload-actions button{height:40px;border:1px solid #bcd7c9;background:#edf6f1;color:#236947;border-radius:10px;padding:0 15px;font-weight:700;cursor:pointer}.symbols-message{margin-top:12px;padding:10px 12px;border-radius:10px;background:#edf6f1;color:#27694a;font-size:12px}.arrow-panel{margin-top:18px;border:1px solid #e1e5e2;border-radius:16px;background:#fff;padding:18px;box-shadow:0 8px 28px rgba(25,35,30,.035)}.arrow-panel-head{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin-bottom:14px}.arrow-panel-head>div{display:grid;gap:4px}.arrow-panel-head span,.arrow-panel-head small,.arrow-note{font-size:11px;color:#7c8580}.arrow-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.arrow-card{border:1px solid #e1e5e2;border-radius:13px;padding:10px;background:#fafbf9;cursor:pointer;display:grid;gap:6px;transition:.15s ease}.arrow-card:hover{border-color:#bfd8ca;background:#f5faf7;transform:translateY(-1px)}.arrow-preview{height:72px;border-radius:10px;background:#fff;display:grid;place-items:center;padding:8px}.arrow-preview img{max-width:100%;max-height:100%;object-fit:contain}.arrow-preview span{font-size:10px;color:#9aa29e}.arrow-card>b{font-size:12px}.arrow-card>span{font-size:10px;color:#2f7655}.arrow-note{margin:12px 0 0}.symbols-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px;margin-top:18px}.symbol-card{border:1px solid #e1e5e2;border-radius:15px;background:#fff;overflow:hidden;box-shadow:0 7px 24px rgba(25,35,30,.035);transition:.15s ease}.symbol-card:hover{transform:translateY(-1px);box-shadow:0 10px 27px rgba(25,35,30,.065)}.symbol-card.inactive{opacity:.58}.symbol-image{height:150px;background:#f6f7f5;display:grid;place-items:center;padding:24px}.symbol-image img{width:auto;height:auto;max-width:112px;max-height:112px;object-fit:contain;display:block}.symbol-body{padding:12px}.symbol-body>input{width:100%;box-sizing:border-box;border:0;border-bottom:1px solid #e1e5e2;padding:7px 2px;font-weight:700;background:transparent;outline:none}.symbol-actions{display:flex;justify-content:space-between;gap:8px;margin-top:12px}.symbol-actions button{border-radius:9px;border:1px solid #dce2de;background:#fff;padding:7px 10px;font-size:10px;cursor:pointer}.symbol-actions button.active{background:#edf6f1;border-color:#c8dfd2;color:#286a4b}.symbol-actions button.danger{color:#92504a}.reset-link{margin-top:18px;border:0;background:transparent;color:#5c6b63;text-decoration:underline;cursor:pointer;font-size:11px}@media(max-width:760px){.arrow-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.arrow-panel-head{align-items:flex-start;flex-direction:column}.symbols-page{padding:24px 16px 45px}.symbols-head,.upload-panel{align-items:stretch;flex-direction:column}.upload-actions{flex-direction:column;align-items:stretch}.upload-actions input{min-width:0}}
      `}</style>
    </AdminLayout>
  );
}
