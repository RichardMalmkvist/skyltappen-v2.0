import { useState } from "react";
import { getCatalogSnapshot, saveCatalog } from "../../data/catalogStore";
import { HOMEPAGE_IMAGE_SLOTS, getHomepageSlide, getHomepageSlideList } from "../../data/homepageImages";
import { HOMEPAGE_SLIDE_LIMIT, HOMEPAGE_IMAGE_TOTAL_LIMIT, HOMEPAGE_CONTENT_LIMITS } from "../../data/homepageSlideFields";
import { compressHomepageImage } from "../../data/prepareHomepageImage";

import { getPublicCategories } from "../../data/categoryAdmin";

export default function HomepageImagesEditor({ adminPassword, onCatalogChanged }) {
  const [draft, setDraft] = useState(() => getCatalogSnapshot().homepageImages || {});
  const [selected, setSelected] = useState({});
  const [busy, setBusy] = useState(false);
  const [imageState, setImageState] = useState({key:"", loading:false, error:""});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const update = (key, changes) => {setDraft(value => ({...value, [key]: {...value[key], ...changes}}));setMessage("");};
  function editSlide(key, index, changes) {
    setDraft(value => {
      const slides = getHomepageSlideList(value, key).map((slide, i) => i === index ? {...slide, ...changes} : slide);
      return {...value, [key]: {autoplay: value[key]?.autoplay === true, slides}};
    });
    setMessage("");
  }
  const destinations = getPublicCategories().filter(category => category.isImplemented);
  async function choose(key, index, file) {
    if (!file) return;
    setError(""); setMessage("");
    setImageState({key, loading:true, error:""});
    setBusy(true);
    try {
      const src = await compressHomepageImage(file);
      editSlide(key,index,{src,fileName:file.name});
      setImageState({key, loading:false, error:""});
    } catch(e) {
      setImageState({key, loading:false, error:e.message || "Kunde inte läsa bilden."});
    } finally {setBusy(false);}
  }
  async function save() {
    const slides = HOMEPAGE_IMAGE_SLOTS.flatMap(slot => getHomepageSlideList(draft, slot.key));
    if (slides.reduce((total, slide) => total + (slide.src?.length || 0), 0) > HOMEPAGE_IMAGE_TOTAL_LIMIT) {
      setError("Startsidesbilderna får tillsammans vara högst 12 MB efter komprimering.");
      return;
    }
    setBusy(true);setError("");setMessage("");
    try {await saveCatalog({...getCatalogSnapshot(),homepageImages:draft},adminPassword);await onCatalogChanged?.();setMessage("Startsidan är uppdaterad.");}
    catch(e) {setError(e.message || "Kunde inte spara bilderna.");}
    finally {setBusy(false);}
  }
  return <section className="groups-featured-manager homepage-images-editor" aria-labelledby="homepage-images-heading">
    <div className="kicker">STARTSIDAN</div><h2 id="homepage-images-heading">Bilder och texter på startsidan</h2>
    <p>Välj upp till {HOMEPAGE_SLIDE_LIMIT} bilder per fält. Varje bild kan ha egen text och knapp.</p>
    <div className="homepage-image-grid">{HOMEPAGE_IMAGE_SLOTS.map(slot=>{
      const key = slot.key;
      const slides = getHomepageSlideList(draft, key);
      const index = selected[key] || 0;
      const {image, content} = getHomepageSlide(draft, key, index);
      const changeSlide = changes => editSlide(key, index, changes);
      const updateContent = (field, value) => changeSlide({content: {...content, [field]: value}});
      const select = next => {setSelected(value => ({...value, [key]: next})); setImageState({key:'', loading:false, error:''});};
      return <fieldset key={slot.key} disabled={busy}><legend>{slot.label}</legend>
        <div className="homepage-slide-tabs" role="group" aria-label={`Bilder i ${slot.label}`}>
          {slides.map((_, i) => <button type="button" key={i} aria-pressed={i === index} onClick={() => select(i)}>Bild {i + 1}</button>)}
          {slides.length < HOMEPAGE_SLIDE_LIMIT && <button type="button" onClick={() => {
            update(key, {slides: [...slides, {}]}); select(slides.length);
          }}>Lägg till bild</button>}
        </div>
        {slides.length > 1 && <label className="homepage-slide-autoplay"><input type="checkbox" checked={draft[key]?.autoplay === true} onChange={event => update(key, {autoplay: event.target.checked})}/>Byt bilder automatiskt</label>}
        <div className="homepage-image-preview">{image.src?<img src={image.src} alt={image.alt} style={{objectPosition:image.position}}/>:<span>Ritningsillustration används</span>}</div>
        <label>Välj bild<input type="file" accept="image/jpeg,image/png,image/webp" onClick={e=>{e.currentTarget.value="";}} onChange={e=>choose(key,index,e.currentTarget.files?.[0])}/></label>
        {imageState.key===slot.key && imageState.loading && <p role="status">Läser in bilden…</p>}
        {imageState.key===slot.key && imageState.error && <p role="alert" className="groups-image-error">{imageState.error}</p>}
        {slides[index]?.fileName&&<p>{slides[index].fileName}</p>}
        <label>Bildbeskrivning<input value={image.alt} maxLength={180} onChange={e=>changeSlide({alt:e.target.value})}/></label>
        <label>Bildens fokus<select value={image.position} onChange={e=>changeSlide({position:e.target.value})}><option value="50% 50%">Mitten</option><option value="25% 50%">Vänster</option><option value="75% 50%">Höger</option><option value="50% 25%">Överkant</option><option value="50% 75%">Underkant</option></select></label>
        {slot.key === 'detail' && <p>Bakgrund över hela sektionen. Använd gärna 2400 × 1000 px, med plats för text till vänster.</p>}
        <div className="homepage-slide-tabs">
          <button type="button" onClick={()=>changeSlide({src:"",fileName:"",alt:slot.alt,position:"50% 50%"})}>Återställ standardbild</button>
          {slides.length > 1 && <button type="button" onClick={() => {
            const remaining = slides.filter((_, i) => i !== index);
            update(key, {slides: remaining, autoplay: remaining.length > 1 && draft[key]?.autoplay});
            select(Math.min(index, remaining.length - 1));
          }}>Ta bort bild {index + 1}</button>}
          {index > 0 && <button type="button" onClick={() => {
            update(key, {slides: [slides[index], ...slides.filter((_, i) => i !== index)]}); select(0);
          }}>Visa först</button>}
        </div>
        <details className="homepage-section-settings" open={slot.key === 'detail'}>
          <summary>Text och knapp</summary>
          <label>Överrubrik<input value={content.eyebrow} maxLength={HOMEPAGE_CONTENT_LIMITS.eyebrow} onChange={e=>updateContent('eyebrow',e.target.value)}/></label>
          <label>Rubrik<textarea rows={3} value={content.heading} maxLength={HOMEPAGE_CONTENT_LIMITS.heading} onChange={e=>updateContent('heading',e.target.value)}/></label>
          <label>Beskrivning<textarea rows={4} value={content.body} maxLength={HOMEPAGE_CONTENT_LIMITS.body} onChange={e=>updateContent('body',e.target.value)}/></label>
          <label>Knapptext<input value={content.buttonLabel} maxLength={HOMEPAGE_CONTENT_LIMITS.buttonLabel} onChange={e=>updateContent('buttonLabel',e.target.value)}/></label>
          <label>Knappen leder till<select value={content.buttonTarget} onChange={e=>updateContent('buttonTarget',e.target.value)}>
            <option value="catalog">Hela sortimentet</option><option value="account">Mitt konto</option><option value="none">Ingen knapp</option>
            {key === 'proof' && <option value="details">Visa mer information</option>}
            {destinations.map(category=><option key={category.id} value={category.id}>{category.title}</option>)}
          </select></label>
          {content.buttonTarget === 'details' && <label>Mer information<textarea rows={4} value={content.detailsText} maxLength={HOMEPAGE_CONTENT_LIMITS.detailsText} onChange={e=>updateContent('detailsText',e.target.value)}/></label>}
          <button type="button" onClick={()=>changeSlide({content:undefined})}>Återställ standardtexter</button>
        </details>
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
      .homepage-slide-tabs{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px}
      .homepage-slide-tabs button[aria-pressed=true]{background:#292929;color:white}
      .homepage-images-editor .homepage-slide-autoplay{display:flex;gap:6px;align-items:center}
      .homepage-images-editor label.homepage-slide-autoplay input{width:auto;height:auto;margin:0}
      @media(max-width:850px){.homepage-image-grid{grid-template-columns:1fr}}
    `}</style>
  </section>;
}
