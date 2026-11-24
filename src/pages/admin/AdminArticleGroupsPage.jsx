import { useMemo, useState } from "react";
import HomepageImagesEditor from "./HomepageImagesEditor";
import HomepageNoticeEditor from "./HomepageNoticeEditor";
import PageContainer from "../../components/layout/PageContainer";
import { AdminLayout } from "../../components/admin/AdminNavigation";
import AdminCategoryTile from "../../components/admin/AdminCategoryTile";
import { getRuntimeProducts } from "../../data/products";
import { setHomepageFeaturedArticles } from "../../data/articleAdmin";
import {
  CATEGORY_STATUS_OPTIONS,
  addCustomCategory,
  deleteCustomCategory,
  getAllAdminCategories,
  getCategoryDefaultStatus,
  resetCategoryStatus,
  setCategoryStatus,
  setCategoryCoverImage,
} from "../../data/categoryAdmin";

export default function AdminArticleGroupsPage({
  onOpenDashboard,onOpenBadgeOrders,onOpenOrders,onOpenStatistics,onOpenPlanning,onOpenArticles,onOpenArticleGroups,onOpenProjects,onOpenUsers,onOpenDrawings,onOpenSettings,onOpenPortal,onOpenSymbols,onOpenApprovalOrders,onOpenProfile,role,user,onLogout,
  adminPassword,onCatalogChanged
}) {
  const [version,setVersion]=useState(0);
  const [search,setSearch]=useState("");
  const [showCreate,setShowCreate]=useState(false);
  const [newTitle,setNewTitle]=useState("");
  const [imageBusy,setImageBusy]=useState("");
  const [featuredSaving,setFeaturedSaving]=useState(false);
  const [featuredError,setFeaturedError]=useState("");
  const [imageError,setImageError]=useState("");
  const categories=getAllAdminCategories();
  const articles=getRuntimeProducts();
  const publicIds=new Set(categories.filter(c=>c.status==="open").map(c=>c.id));
  const eligible=articles.filter(a=>a.isImplemented&&a.storefrontOrderable!==false&&!a.adminArchived&&publicIds.has(a.categoryId));
  const chosen=eligible.filter(a=>Number(a.homepageFeaturedOrder)>0).sort((a,b)=>Number(a.homepageFeaturedOrder)-Number(b.homepageFeaturedOrder));
  const [featuredDraft,setFeaturedDraft]=useState(null);
  const slots=featuredDraft || Array.from({length:4},(_,i)=>chosen[i]?.id||"");
  async function saveFeatured(){
    setFeaturedError("");
    const ids=slots.filter(Boolean);
    if(new Set(ids).size!==ids.length){setFeaturedError("Samma artikel kan inte väljas flera gånger.");return;}
    if(ids.length!==4){setFeaturedError("Välj fyra olika aktiva artiklar.");return;}
    setFeaturedSaving(true);
    try{
      await setHomepageFeaturedArticles(ids,adminPassword);
      if(onCatalogChanged)await onCatalogChanged();
      setFeaturedDraft(null);refresh();
    }catch(error){setFeaturedError(error.message||"Kunde inte spara urvalet.");}
    finally{setFeaturedSaving(false);}
  }
  void version;
  const filtered=useMemo(()=>categories.filter(c=>c.title.toLowerCase().includes(search.trim().toLowerCase())),[categories,search]);
  const count=(id)=>articles.filter(p=>p.categoryId===id).length;
  function refresh(){setVersion(v=>v+1)}
  async function create(e){
    e.preventDefault();
    const c=await addCustomCategory({title:newTitle},adminPassword);
    if(c){setNewTitle("");setShowCreate(false);if(onCatalogChanged)await onCatalogChanged();refresh();}
  }
  async function remove(c){
    if(window.confirm(`Ta bort artikelgruppen “${c.title}”?`)){
      await deleteCustomCategory(c.id,adminPassword);
      if(onCatalogChanged)await onCatalogChanged();
      refresh();
    }
  }
  async function changeStatus(id,status){
    await setCategoryStatus(id,status,adminPassword);
    if(onCatalogChanged)await onCatalogChanged();
    refresh();
  }
  async function updateCover(id, image) {
    setImageBusy(id); setImageError("");
    try {
      await setCategoryCoverImage(id, image, adminPassword);
      if (onCatalogChanged) await onCatalogChanged();
      refresh();
    } catch (error) {
      setImageError(`Kunde inte spara bilden: ${error.message || "Okänt fel"}`);
    } finally { setImageBusy(""); }
  }
  async function uploadCover(id, file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setImageError("Välj en bildfil."); return; }
    if (file.size > 15 * 1024 * 1024) { setImageError("Bilden får vara högst 15 MB."); return; }
    setImageBusy(id); setImageError("");
    try {
      const bitmap = await new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Bilden kunde inte läsas.")); };
        img.src = url;
      });
      const scale = Math.min(1, 1100 / Math.max(bitmap.naturalWidth, bitmap.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(bitmap.naturalHeight * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Bildbehandling stöds inte i webbläsaren.");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      await updateCover(id, canvas.toDataURL("image/jpeg", 0.83));
    } catch (error) {
      setImageError(`Kunde inte läsa bilden: ${error.message || "Okänt fel"}`);
      setImageBusy("");
    }
  }
  async function restoreStatus(id){
    await resetCategoryStatus(id,adminPassword);
    if(onCatalogChanged)await onCatalogChanged();
    refresh();
  }

  return <PageContainer><AdminLayout active="articleGroups"
    onOpenDashboard={onOpenDashboard} onOpenBadgeOrders={onOpenBadgeOrders} onOpenOrders={onOpenOrders} onOpenStatistics={onOpenStatistics} onOpenPlanning={onOpenPlanning}
    onOpenArticles={onOpenArticles} onOpenArticleGroups={onOpenArticleGroups} onOpenProjects={onOpenProjects}
    onOpenUsers={onOpenUsers} onOpenDrawings={onOpenDrawings} onOpenSettings={onOpenSettings} onOpenPortal={onOpenPortal} onOpenSymbols={onOpenSymbols} onOpenApprovalOrders={onOpenApprovalOrders} onOpenProfile={onOpenProfile} role={role} user={user} onLogout={onLogout}>
    <main className="groups-main">
      <header className="groups-top">
        <div className="search"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Sök artikelgrupp..."/></div>
        <button className="new-button" onClick={()=>setShowCreate(true)}>＋ Ny artikelgrupp</button>
      </header>

      <section className="groups-featured-manager" aria-label="Utvalda produkter på startsidan">
        <div className="kicker">STARTSIDAN</div>
        <h2>Fyra utvalda produkter</h2>
        
        <div className="groups-featured-slots">
          {slots.map((id,index)=><label key={index}>Produkt {index+1}
            <select value={id} disabled={featuredSaving} onChange={e=>setFeaturedDraft(slots.map((value,i)=>i===index?e.target.value:value))}>
              <option value="">Välj artikel...</option>
              {eligible.map(a=><option key={a.id} value={a.id}>{a.articleNumber ? `${a.articleNumber} – ` : ""}{a.name}</option>)}
            </select>
          </label>)}
        </div>
        {featuredError&&<p role="alert" className="groups-image-error">{featuredError}</p>}
        <button type="button" className="groups-featured-save" disabled={featuredSaving||eligible.length<4} onClick={saveFeatured}>{featuredSaving?"Sparar...":"Spara utvalda produkter"}</button>
        {eligible.length<4&&<p>Det behövs minst fyra aktiva artiklar i öppna kategorier.</p>}
      </section>
      <HomepageNoticeEditor adminPassword={adminPassword}/>
      <HomepageImagesEditor adminPassword={adminPassword} onCatalogChanged={onCatalogChanged}/>
      <section className="groups-section">
        <div className="kicker">ADMINISTRATION</div>
        <h1>Artikelgrupper</h1>
        
        {showCreate&&<form className="create-row" onSubmit={create}><input autoFocus value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="Namn på ny artikelgrupp"/><button type="submit">Skapa grupp</button><button type="button" onClick={()=>setShowCreate(false)}>Avbryt</button></form>}
        {imageError && <p role="alert" className="groups-image-error">{imageError}</p>}
        <div className="category-grid">
          {filtered.map(c=>{
            const total=count(c.id); const original=getCategoryDefaultStatus(c);
            return <AdminCategoryTile key={c.id} title={c.title} count={total} status={c.status} onClick={onOpenArticles}>
              <div className="groups-cover-manager">
                <div className="groups-cover-preview">
                  {c.coverImage ? <img src={c.coverImage} alt={`Omslagsbild för ${c.title}`} /> : <span>Ingen egen kategoribild vald</span>}
                </div>
                <label className="groups-cover-upload">
                  {imageBusy===c.id ? "Sparar…" : c.coverImage ? "Byt bild" : "Välj kategoribild"}
                  <input type="file" accept="image/*" disabled={Boolean(imageBusy)} onChange={e=>{const file=e.target.files?.[0];if(file)uploadCover(c.id,file);e.target.value="";}} />
                </label>
                {c.coverImage && <button type="button" className="groups-cover-remove" disabled={Boolean(imageBusy)} onClick={()=>updateCover(c.id,"")}>Ta bort bild</button>}
              </div>
              <div className="tile-controls">
                <select value={c.status} onChange={e=>changeStatus(c.id,e.target.value)}>
                  {CATEGORY_STATUS_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <button type="button" onClick={onOpenArticles}>Visa artiklar</button>
                {c.status!==original&&<button type="button" onClick={()=>restoreStatus(c.id)}>Återställ</button>}
                {c.isCustom&&<button type="button" className="danger" onClick={()=>remove(c)}>Ta bort</button>}
              </div>
            </AdminCategoryTile>
          })}
        </div>
        {!filtered.length&&<div className="empty">Inga artikelgrupper matchar sökningen.</div>}
      </section>
      
    </main>
    <style>{`
      .groups-featured-manager{background:#fff;border:1px solid #e5eae6;border-radius:13px;padding:22px;margin-top:22px}
      .groups-featured-manager h2{font-size:21px;margin:6px 0 8px;letter-spacing:-.03em}
      .groups-featured-manager p{font-size:12px;color:#66746b;line-height:1.6;margin:0 0 16px}
      .groups-featured-slots{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}
      .groups-featured-slots label{font-size:11px;font-weight:700;color:#34473a;min-width:0}
      .groups-featured-slots select{display:block;margin-top:7px;width:100%;height:40px;border:1px solid #dce4dd;border-radius:8px;background:#fff;color:#26382c;font:inherit;font-weight:400;padding:0 8px}
      .groups-featured-save{background:#17583d;color:#fff;border:0;border-radius:8px;padding:12px 18px;font-weight:700;cursor:pointer}
      .groups-featured-save:disabled{opacity:.55;cursor:not-allowed}
      @media(max-width:1050px){.groups-featured-slots{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:550px){.groups-featured-slots{grid-template-columns:1fr}}
      .groups-image-error{padding:10px 12px;background:#fff1ef;border:1px solid #f1cbc6;border-radius:9px;color:#a53e36;font-size:12px}
      .groups-cover-manager{padding:10px 12px 12px;display:flex;gap:7px;flex-wrap:wrap;align-items:center;background:#f3f4f2}
      .groups-cover-preview{width:100%;height:105px;background:#e9ece9;border:1px solid #e0e5e1;border-radius:9px;display:flex;align-items:center;justify-content:center;overflow:hidden;color:#8a948d;font-size:10px;text-align:center}
      .groups-cover-preview img{width:100%;height:100%;object-fit:contain}
      .groups-cover-upload,.groups-cover-remove{display:inline-flex;align-items:center;justify-content:center;cursor:pointer;border-radius:8px;padding:8px 10px;font:inherit;font-size:10px;font-weight:700}
      .groups-cover-upload{background:#e2f0e8;border:1px solid #cce3d4;color:#1f6747}
      .groups-cover-upload input{display:none}
      .groups-cover-remove{background:#fff;border:1px solid #dfe3e0;color:#7d5652}
      .groups-cover-remove:disabled{opacity:.5;cursor:default}
      .groups-main{padding:18px 26px 48px;min-width:0;background:#f6f7f5;color:#171d1a;min-height:100vh}.groups-top{display:flex;align-items:center;justify-content:space-between;gap:14px;padding-bottom:18px;border-bottom:1px solid #e2e6e3}
      .search{height:42px;width:min(620px,65vw);background:#fff;border:1px solid #dfe4e1;border-radius:13px;display:flex;align-items:center;gap:10px;padding:0 14px;color:#75807a}.search input{width:100%;border:0;outline:0;background:transparent;color:#202723;font:inherit;font-size:12px}.search input::placeholder{color:#929b96}.new-button{border:0;background:#3e9a70;color:#fff;border-radius:11px;padding:11px 15px;font:inherit;font-size:11px;font-weight:700;cursor:pointer}.new-button:hover{background:#48a97c}
      .groups-section{padding-top:22px}.kicker{font-size:9px;letter-spacing:.16em;font-weight:800;color:#75817b}.groups-section h1{font-size:31px;letter-spacing:-.035em;margin:5px 0 5px}.groups-section>p{margin:0 0 18px;color:#6f7873;font-size:12px;max-width:760px}.category-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:11px}.tile-controls{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.tile-controls select,.tile-controls button{height:30px;border:1px solid #dfe3e0;background:#fff;border-radius:8px;padding:0 8px;font:inherit;font-size:9px;color:#36403b}.tile-controls select{flex:1;min-width:90px}.tile-controls button{cursor:pointer}.tile-controls button:hover{background:#e9eeeb}.tile-controls .danger{color:#9b4d48}.create-row{display:grid;grid-template-columns:minmax(240px,1fr) auto auto;gap:8px;background:#fff;border:1px solid #e1e5e2;border-radius:12px;padding:12px;margin-bottom:14px}.create-row input{border:1px solid #dce2de;border-radius:8px;background:#fff;color:#1f2723;padding:9px 11px;font:inherit}.create-row button{border:0;border-radius:8px;padding:9px 12px;font:inherit;font-size:10px;cursor:pointer}.create-row button:first-of-type{background:#3e9a70;color:#fff}.empty{padding:35px;border:1px dashed #ccd3cf;border-radius:12px;color:#7b8680;text-align:center;font-size:11px}.dev-note{font-size:9px;color:#7b8680;margin:12px 0 0}
      @media(max-width:1350px){.category-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}@media(max-width:1050px){.category-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:720px){.groups-main{padding:14px}.groups-top{align-items:stretch;flex-direction:column}.search{width:auto}.category-grid{grid-template-columns:1fr 1fr}.create-row{grid-template-columns:1fr}.new-button{align-self:flex-start}}@media(max-width:480px){.category-grid{grid-template-columns:1fr}}
    `}</style>
  </AdminLayout></PageContainer>
}
