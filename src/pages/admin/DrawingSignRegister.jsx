import DatePicker from '../../components/forms/DatePicker';
import {useEffect,useRef,useState} from "react";
import {openPdf} from "../../data/browserPdf";
import "./DrawingSignRegister.css";
export default function DrawingSignRegister({item,url,onClose,onSave,catalog}){
 const canvas=useRef(null),stage=useRef(null),doc=useRef(null);
 const [name,setName]=useState(item.name),[markers,setMarkers]=useState(item.markers||[]),[selected,setSelected]=useState(null),[placing,setPlacing]=useState(false),[page,setPage]=useState(1),[pages,setPages]=useState(1),[zoom,setZoom]=useState(1),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const [search,setSearch]=useState(""),[group,setGroup]=useState("Alla"),[pan,setPan]=useState(null);
 const [imageSize,setImageSize]=useState({width:850,height:1100});
 useEffect(()=>{
  const controller=new AbortController(), {signal}=controller;
  let task;
  if(item.mime==="application/pdf"){
   (async()=>{
    try{
     const response=await fetch(url,{signal});
     if(!response.ok)throw new Error("Kunde inte hämta ritningen.");
     const data=new Uint8Array(await response.arrayBuffer());
     if(signal.aborted)return;
     task=openPdf(data);
     const pdf=await task.promise;
     if(!signal.aborted){doc.current=pdf;setPages(pdf.numPages);}
    }catch(error){if(!signal.aborted)setError("Kunde inte visa ritningen.");}
   })();
  }else{
   const image=new Image();
   image.onload=()=>{if(!signal.aborted){doc.current=image;setImageSize({width:image.naturalWidth,height:image.naturalHeight});setPages(1);}};
   image.src=url;
  }
  return()=>{controller.abort();task?.destroy().catch(()=>{});doc.current=null;};
 },[url,item.mime]);
 useEffect(()=>{let cancelled=false;async function render(){const target=canvas.current;if(!target||!doc.current)return;try{if(item.mime==="application/pdf"){const pdfPage=await doc.current.getPage(page);const viewport=pdfPage.getViewport({scale:1.4});target.width=Math.round(viewport.width);target.height=Math.round(viewport.height);setImageSize({width:target.width,height:target.height});const task=pdfPage.render({canvasContext:target.getContext("2d"),viewport});await task.promise;}else{target.width=imageSize.width;target.height=imageSize.height;target.getContext("2d").drawImage(doc.current,0,0);}}catch(e){if(!cancelled)setError("Kunde inte rendera sidan.");}}render();return()=>{cancelled=true};},[page,pages,imageSize.width,imageSize.height,item.mime]);
 const active=markers.filter(m=>m.page===page);
 const articleFor=m=>(catalog?.articles||[]).find(a=>a.articleNumber===m.articleNumber||a.id===m.articleId);
 const groups=[...new Set((catalog?.articles||[]).map(a=>a.category||a.groupId).filter(Boolean))];
 const filtered=active.filter(m=>{const a=articleFor(m);return (group==="Alla"||String(a?.category||a?.groupId||"")===group)&&[m.articleNumber,m.signText,m.notes,a?.name].join(" ").toLowerCase().includes(search.toLowerCase())});
 const scroll=useRef(null);
 function locate(m){setPage(m.page);setSelected(m.id);setPlacing(false);const el=scroll.current;if(el){el.scrollLeft=Math.max(0,m.x*imageSize.width*zoom-el.clientWidth/2);el.scrollTop=Math.max(0,m.y*imageSize.height*zoom-el.clientHeight/2)}}
 function startPan(e){if(placing||e.target.closest("button")||e.button!==0)return;setPan({x:e.clientX,y:e.clientY,left:scroll.current.scrollLeft,top:scroll.current.scrollTop})}
 function movePan(e){if(!pan)return;scroll.current.scrollLeft=pan.left+pan.x-e.clientX;scroll.current.scrollTop=pan.top+pan.y-e.clientY}

 function addAt(e){if(!placing)return;const rect=stage.current.getBoundingClientRect();const x=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width)),y=Math.max(0,Math.min(1,(e.clientY-rect.top)/rect.height));const id=String(Date.now())+"-"+Math.random().toString(36).slice(2);const marker={id,number:markers.length+1,page,x,y,articleNumber:"",signText:"",notes:"",checkedAt:""};setMarkers(v=>[...v,marker]);setSelected(id);setPlacing(false);}
 function update(key,value){setMarkers(v=>v.map(m=>m.id===selected?{...m,[key]:value}:m));}
 async function save(){setBusy(true);setError("");try{await onSave({name,markers});}catch(e){setError(e.message||"Kunde inte spara.");}finally{setBusy(false);}}
 const current=markers.find(m=>m.id===selected);
 return <div className="drawing-register">
 <div className="drawing-register-top"><button className="jsf-back-link" onClick={onClose}>← Till ritningslistan</button><label>Ritningens namn<input value={name} onChange={e=>setName(e.target.value)}/></label><button className="drawing-register-save" disabled={busy||!name.trim()} onClick={save}>{busy?"Sparar...":"Spara ändringar"}</button></div>
 {error&&<p role="alert" className="drawing-error">{error}</p>}
 <div className="drawing-register-heading"><div><strong>{name}</strong><small>{markers.length} skyltar registrerade · Befintliga skyltar</small></div><button className={placing?"active":""} onClick={()=>setPlacing(v=>!v)}>{placing?"Klicka på ritningen...":"＋ Placera skylt"}</button></div>
 <div className="drawing-register-toolbar"><button disabled={page===1} onClick={()=>setPage(v=>v-1)}>‹ Föregående</button><span>Sida {page} av {pages}</span><button disabled={page===pages} onClick={()=>setPage(v=>v+1)}>Nästa ›</button><span className="drawing-register-spacer"/><button onClick={()=>setZoom(v=>Math.max(.5,v-.2))}>−</button><span>{Math.round(zoom*100)} %</span><button onClick={()=>setZoom(v=>Math.min(3,v+.2))}>＋</button></div>
 <div className="drawing-register-body"><div ref={scroll} className="drawing-register-scroll" onPointerDown={startPan} onPointerMove={movePan} onPointerUp={()=>setPan(null)} onPointerLeave={()=>setPan(null)} style={{cursor:placing?"crosshair":pan?"grabbing":"grab"}}><div ref={stage} className={placing?"drawing-register-stage placing":"drawing-register-stage"} style={{width:imageSize.width*zoom,height:imageSize.height*zoom}} onClick={addAt}><canvas ref={canvas} style={{width:"100%",height:"100%"}}/>{filtered.map(m=><svg key={m.id} role="button" tabIndex={0} aria-label={`Visa skylt ${String(m.number).padStart(3,"0")}`} className={selected===m.id?"drawing-register-marker selected":"drawing-register-marker"} viewBox="0 0 40 40" width="40" height="40" style={{left:`${m.x*100}%`,top:`${m.y*100}%`,transform:`translate(-50%,-50%) scale(${1/zoom})`}} onClick={e=>{e.stopPropagation();setSelected(m.id);setPlacing(false)}} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();e.stopPropagation();setSelected(m.id);setPlacing(false)}}}><circle className="drawing-register-marker-ring" cx="20" cy="20" r="18"/><circle className="drawing-register-marker-disc" cx="20" cy="20" r="15"/><text x="20" y="20" textAnchor="middle" dominantBaseline="central">{String(m.number).padStart(3,"0")}</text></svg>)}</div></div>
 <aside className="drawing-register-panel"><h2>Skyltregister</h2>
 <fieldset className="drawing-register-filters"><legend>Visa skyltgrupper</legend><label><input type="radio" name="register-group" checked={group==="Alla"} onChange={()=>setGroup("Alla")}/>Alla</label>{groups.map(g=><label key={g}><input type="radio" name="register-group" checked={group===g} onChange={()=>setGroup(g)}/>{catalog?.categories?.find(c=>c.id===g)?.name||g}</label>)}</fieldset>
 <label className="drawing-register-search">Sök skyltar<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Artikelnummer, namn eller skylttext"/></label>
 <h3>Skyltar på denna sida ({filtered.length})</h3><div className="drawing-register-index">{filtered.map(m=><div key={m.id} className={selected===m.id?"drawing-register-result selected":"drawing-register-result"}><button onClick={()=>locate(m)}><strong>S{String(m.number).padStart(3,"0")}</strong><small>Art. {m.articleNumber||"–"}</small><span>{articleFor(m)?.name||m.articleNumber||"Befintlig skylt"}</span><span>{m.signText||"Ingen skylttext registrerad"}</span></button><button className="drawing-register-locate" onClick={()=>locate(m)}>Visa på ritningen →</button></div>)}{!filtered.length&&<p>Inga skyltar matchar filtret.</p>}</div>
 </aside></div>
 {current&&<div className="drawing-register-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}><div className="drawing-register-dialog" role="dialog" aria-modal="true" aria-label="Redigera befintlig skylt"><div className="drawing-register-dialog-head"><div><small>SKYLT {String(current.number).padStart(3,"0")} · {name}</small><h2>Redigera befintlig skylt</h2></div><button onClick={()=>setSelected(null)}>✕</button></div><div className="drawing-register-dialog-fields"><label>Artikelnummer<input value={current.articleNumber||""} onChange={e=>update("articleNumber",e.target.value)} list="drawing-register-articles"/></label><datalist id="drawing-register-articles">{(catalog?.articles||[]).map(a=><option key={a.id} value={a.articleNumber||""}>{a.name}</option>)}</datalist><label>Skylttext<textarea rows="4" value={current.signText||""} onChange={e=>update("signText",e.target.value)}/></label><label>Kommentar / placering<textarea rows="3" value={current.notes||""} onChange={e=>update("notes",e.target.value)}/></label><label>Senast kontrollerad<DatePicker value={current.checkedAt||""} onChange={e=>update("checkedAt",e.target.value)}/></label></div><div className="drawing-register-dialog-foot"><button onClick={()=>{setMarkers(v=>v.filter(m=>m.id!==selected));setSelected(null)}}>Ta bort skylt</button><button onClick={()=>setSelected(null)}>Stäng</button><button className="drawing-register-save" onClick={async()=>{await save();setSelected(null)}}>Spara ändringar</button></div></div></div>}
 </div>;
}
