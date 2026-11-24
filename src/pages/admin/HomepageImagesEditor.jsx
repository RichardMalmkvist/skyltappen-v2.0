import { useState } from "react";
import { getCatalogSnapshot, saveCatalog } from "../../data/catalogStore";
import { HOMEPAGE_IMAGE_SLOTS, getHomepageImage, getHomepageDetailContent } from "../../data/homepageImages";

import { getPublicCategories } from "../../data/categoryAdmin";

export default function HomepageImagesEditor({ adminPassword, onCatalogChanged }) {
  const [draft, setDraft] = useState(() => getCatalogSnapshot().homepageImages || {});
  const [busy, setBusy] = useState(false);
  const [imageState, setImageState] = useState({key:"", loading:false, error:""});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const update = (key, changes) => {setDraft(value => ({...value, [key]: {...value[key], ...changes}}));setMessage("");};
  const detailContent = getHomepageDetailContent(draft);
  const updateContent = (key, value) => update("detail", {content: {...detailContent, [key]: value}});
  const destinations = getPublicCategories().filter(category => category.isImplemented);
  async function choose(key, file) {
    if (!file) return;
    setError(""); setMessage("");
    setImageState({key, loading:true, error:""});
    setBusy(true);
    try {
      if (!/^image\/(jpeg|png|webp)$/i.test(file.type) && !/\.(jpe?g|png|webp)$/i.test(file.name)) throw new Error("Välj en JPG-, PNG- eller WebP-bild.");
      if (file.size > 15*1024*1024) throw new Error("Bilden får vara högst 15 MB.");
      // Read the selected file directly. Data URLs also work when blob URLs
      // are unavailable or blocked by browser policy.
      const data = await new Promise((resolve,reject)=>{
        const reader = new FileReader();
        reader.onload=()=>resolve(reader.result);
        reader.onerror=()=>reject(new Error("Filen kunde inte läsas. Om den ligger i OneDrive, ladda ned den till datorn först."));
        reader.onabort=()=>reject(new Error("Bildvalet avbröts. Välj bilden igen."));
        reader.readAsDataURL(file);
      });
      const image = await new Promise((resolve,reject)=>{
        const img = new Image();
        img.onload=()=>resolve(img);
        img.onerror=()=>reject(new Error("Bilden kunde inte öppnas. Prova att spara den som JPG eller PNG."));
        img.src=data;
      });
      const scale=Math.min(1,2400/Math.max(image.naturalWidth,image.naturalHeight));
      const canvas=document.createElement("canvas");
      canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
      const ctx=canvas.getContext("2d");
      if(!ctx) throw new Error("Bildbehandling stöds inte i webbläsaren.");
      ctx.fillStyle="#ffffff";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
      let src=canvas.toDataURL("image/jpeg",.86);
      if(src.length>2800000) src=canvas.toDataURL("image/jpeg",.65);
      if(src.length>3000000) throw new Error("Välj en mindre bild.");
      if(!src.startsWith('data:image/jpeg;base64,')) throw new Error("Bilden kunde inte bearbetas. Prova en annan bild.");
      update(key,{src,fileName:file.name});
      setImageState({key, loading:false, error:""});
    } catch(e) {
      setImageState({key, loading:false, error:e.message || "Kunde inte läsa bilden."});
    } finally {setBusy(false);}
  }
  async function save() {
    setBusy(true);setError("");setMessage("");
    try {await saveCatalog({...getCatalogSnapshot(),homepageImages:draft},adminPassword);await onCatalogChanged?.();setMessage("Startsidan är uppdaterad.");}
    catch(e) {setError(e.message || "Kunde inte spara bilderna.");}
    finally {setBusy(false);}
  }
  return <section className="groups-featured-manager homepage-images-editor" aria-labelledby="homepage-images-heading">
    <div className="kicker">STARTSIDAN</div><h2 id="homepage-images-heading">Bilder och texter på startsidan</h2>
    <p>Byt bilder utan att ändra kod. Förhandsvisningen visar ditt bildval. Klicka på Spara startsidan när du är klar.</p>
    <div className="homepage-image-grid">{HOMEPAGE_IMAGE_SLOTS.map(slot=>{
      const image=getHomepageImage(draft,slot.key);
      return <fieldset key={slot.key} disabled={busy}><legend>{slot.label}</legend>
        <div className="homepage-image-preview">{image.src?<img src={image.src} alt={image.alt} style={{objectPosition:image.position}}/>:<span>Ritningsillustration används</span>}</div>
        <label>Välj bild<input type="file" accept="image/jpeg,image/png,image/webp" onClick={e=>{e.currentTarget.value="";}} onChange={e=>{choose(slot.key,e.currentTarget.files?.[0]);}}/></label>
        {imageState.key===slot.key && imageState.loading && <p role="status">Läser in bilden…</p>}
        {imageState.key===slot.key && imageState.error && <p role="alert" className="groups-image-error">{imageState.error}</p>}
        {draft[slot.key]?.fileName&&<p>{draft[slot.key].fileName}</p>}
        <label>Bildbeskrivning<input value={draft[slot.key]?.alt??slot.alt} maxLength={180} onChange={e=>update(slot.key,{alt:e.target.value})}/></label>
        <label>Bildens fokus<select value={image.position} onChange={e=>update(slot.key,{position:e.target.value})}><option value="50% 50%">Mitten</option><option value="25% 50%">Vänster</option><option value="75% 50%">Höger</option><option value="50% 25%">Överkant</option><option value="50% 75%">Underkant</option></select></label>
        {slot.key === 'detail' && <p>Bakgrund över hela sektionen. Använd gärna 2400 × 1000 px, med plats för text till vänster.</p>}
        <button type="button" onClick={()=>{setDraft(value=>({...value,[slot.key]:{...value[slot.key],src:"",fileName:"",alt:slot.alt,position:"50% 50%"}}));setMessage("");}}>Återställ standardbild</button>
        {slot.key === 'detail' && <details className="homepage-section-settings" open>
          <summary>Text och knapp</summary>
          <label>Överrubrik<input value={detailContent.eyebrow} maxLength={120} onChange={e=>updateContent('eyebrow',e.target.value)}/></label>
          <label>Rubrik<textarea rows={3} value={detailContent.heading} maxLength={240} onChange={e=>updateContent('heading',e.target.value)}/></label>
          <label>Beskrivning<textarea rows={4} value={detailContent.body} maxLength={600} onChange={e=>updateContent('body',e.target.value)}/></label>
          <label>Knapptext<input value={detailContent.buttonLabel} maxLength={80} onChange={e=>updateContent('buttonLabel',e.target.value)}/></label>
          <label>Knappen leder till<select value={detailContent.buttonTarget} onChange={e=>updateContent('buttonTarget',e.target.value)}>
            <option value="catalog">Hela sortimentet</option><option value="account">Mitt konto</option><option value="none">Ingen knapp</option>
            {destinations.map(category=><option key={category.id} value={category.id}>{category.title}</option>)}
          </select></label>
          <button type="button" onClick={()=>update('detail',{content:undefined})}>Återställ standardtexter</button>
        </details>}
      </fieldset>;
    })}</div>
    {error&&<p role="alert" className="groups-image-error">{error}</p>}{message&&<p role="status">{message}</p>}
    <button type="button" disabled={busy} onClick={save}>{busy?"Sparar…":"Spara startsidan"}</button>
    <style>{`
      .homepage-image-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;margin:22px 0}
      .homepage-images-editor fieldset{min-width:0;margin:0;border:1px solid #dededb;border-radius:8px;padding:16px}
      .homepage-images-editor legend{font-size:14px;padding:0 5px}
      .homepage-image-preview{height:170px;background:#f1f1ef;display:flex;align-items:center;justify-content:center;margin-bottom:14px;overflow:hidden}
      .homepage-image-preview img{width:100%;height:100%;object-fit:cover}
      .homepage-images-editor label{display:block;font-size:13px;margin:12px 0}
      .homepage-images-editor :is(input:not([type=file]),select){display:block;width:100%;box-sizing:border-box;height:40px;margin-top:6px;border:1px solid #d6d6d2;border-radius:5px;background:white;padding:8px;font:inherit}
      .homepage-section-settings{border-top:1px solid #dededb;margin-top:20px;padding-top:16px}
      .homepage-section-settings summary{cursor:pointer;font-size:14px}
      .homepage-section-settings textarea{display:block;box-sizing:border-box;width:100%;padding:10px;margin-top:6px;border:1px solid #d6d6d2;border-radius:5px;font:inherit;resize:vertical}
      .homepage-images-editor input[type=file]{display:block;width:100%;margin:10px 0;font-size:13px}
      .homepage-images-editor button{border:1px solid #d5d5d2;border-radius:7px;background:#fff;color:#292929;padding:10px 14px;font:inherit;font-size:13px;cursor:pointer}
      .homepage-images-editor > button{background:#292929;color:white;padding:12px 18px}
      .homepage-images-editor button:disabled{opacity:.5;cursor:wait}
      .homepage-images-editor .homepage-image-grid p{overflow-wrap:anywhere;font-size:12px;margin:8px 0}
      @media(max-width:850px){.homepage-image-grid{grid-template-columns:1fr}}
    `}</style>
  </section>;
}
