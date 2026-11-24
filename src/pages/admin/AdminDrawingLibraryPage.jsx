import WorkspaceIcon from '../../components/admin/WorkspaceIcon';
import {WorkspaceMenu} from '../../components/workspace/WorkspaceUI';
import DrawingBoardPdfDialog from './DrawingBoardPdfDialog';
import { useEffect, useRef, useState } from "react";
import PageContainer from "../../components/layout/PageContainer";
import { AdminLayout } from "../../components/admin/AdminNavigation";
import ElevatorBoardPreview,{newElevatorBoard} from "../../components/orders/ElevatorBoardPreview";
import "./AdminDrawingLibraryPage.css";
import OTBoardPreview,{newOTBoard} from "../../components/orders/OTBoardPreview";
import OTBoardFields from "../../components/products/OTBoardFields";
import ProjectDrawingPlanner from "./ProjectDrawingPlanner";
import DrawingLibraryOrganizeDialog from "./DrawingLibraryOrganizeDialog";
import DrawingBoardDetails from "../../components/orders/DrawingBoardDetails";

export default function AdminDrawingLibraryPage({adminPassword,...nav}){
  const readOnly = nav.role !== "admin";
  const [library,setLibrary]=useState({folders:[],items:[]});const [folderId,setFolderId]=useState(null);
  const [sortOrder,setSortOrder]=useState("name");
  const [organize,setOrganize]=useState(null);
  const [pdfDialog,setPdfDialog]=useState(false);
  const [search,setSearch]=useState(""),[typeFilter,setTypeFilter]=useState("Alla"),[menuId,setMenuId]=useState(null);
  const [loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
  const [showFolder,setShowFolder]=useState(false),[folderName,setFolderName]=useState(""),[standard,setStandard]=useState(true);
  const [draft,setDraft]=useState(null),[dirty,setDirty]=useState(false),[filePreview,setFilePreview]=useState(null),[registerItem,setRegisterItem]=useState(null);
  const svg=useRef(null),printSvg=useRef(null),upload=useRef(null);
  const browsePosition=useRef(0),openedItemId=useRef(null);
  const [catalog,setCatalog]=useState({categories:[],articles:[]});const [,setPublishPrice]=useState(0);
  useEffect(()=>{
    let active=true;
    fetch("/api/catalog",{headers:{"x-admin-password":adminPassword},cache:"no-store"})
      .then(async response=>{if(!response.ok)throw new Error(response.status===401?"Logga in igen för att hämta artiklarna till ritningen.":"Kunde inte hämta artikelregistret till ritningen.");return response.json();})
      .then(data=>{if(active)setCatalog(data);})
      .catch(error=>{if(active)setError(error.message);});
    return()=>{active=false;};
  },[adminPassword]);
  useEffect(()=>{let active=true;async function load(){try{const response=await fetch("/api/drawing-library",{headers:{"x-admin-password":adminPassword}});if(!response.ok)throw new Error(response.status===404?"Starta om appen med npm run dev för att aktivera ritningsbiblioteket.":"Kunde inte hämta ritningsbiblioteket.");const data=await response.json();if(!Array.isArray(data.folders)||!Array.isArray(data.items))throw new Error("Starta om appen med npm run dev för att aktivera ritningsbiblioteket.");if(active){setLibrary(data);setLoaded(true);}}catch(failure){if(active)setError(failure.message);}}load();return()=>{active=false};},[adminPassword]);
  useEffect(()=>{const url=filePreview?.url;return()=>{if(url)URL.revokeObjectURL(url);};},[filePreview]);
  async function api(path,method="GET",body){if(readOnly && method!=="GET")throw new Error("Du har endast läsbehörighet.");const response=await fetch(`/api/drawing-library${path}`,{method,headers:{"x-admin-password":adminPassword,...(body?{"Content-Type":"application/json"}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await response.json();if(!response.ok)throw new Error(data.message||"Kunde inte spara ändringen.");return data;}
  async function action(fn){if(busy)return;setBusy(true);setError("");setMessage("");try{await fn();}catch(failure){setError(failure.message || "Kunde inte slutföra åtgärden.");}finally{setBusy(false);}}
  async function refresh(){const data=await api("");setLibrary(data);setLoaded(true);return data;}
  const breadcrumbs=[];let parent=folderId;const visited=new Set();while(parent&&!visited.has(parent)){visited.add(parent);const currentParent=parent;const folder=library.folders.find(item=>item.id===currentParent);if(!folder)break;breadcrumbs.unshift(folder);parent=folder.parentId;}
  const currentFolder=library.folders.find(folder=>folder.id===folderId);
  const kindOf=folder=>{const value=(folder?.kind||folder?.type||folder?.name||"").toLocaleLowerCase("sv");return value.includes("planritning")?"plans":value.includes("hisstav")?"elevators":value.includes("ot-tav")?"ot":"general";};
  const folderKind=kindOf(currentFolder);
  const effectiveKind=folderKind==="general"?(standardAncestorKind()||folderKind):folderKind;
  function standardAncestorKind(){return [...breadcrumbs].reverse().map(kindOf).find(kind=>kind!=="general");}
  const isOT=draft?.type==="ot";
  const boardLabel=isOT?"OT-tavla":"Hisstavla";
  const otArticle=(catalog.articles||[]).find(article=>String(article.articleNumber||"").trim()===String(draft?.articleNumber||"").trim());
  const standardAncestor=[...breadcrumbs].reverse().find(folder=>kindOf(folder)!=="general");
  const tabParent=standardAncestor?library.folders.find(folder=>folder.id===standardAncestor.parentId):currentFolder;
  const tabKinds=["plans","elevators","ot"];
  const tabs=tabParent?library.folders.filter(folder=>folder.parentId===tabParent.id&&tabKinds.includes(kindOf(folder))).sort((a,b)=>tabKinds.indexOf(kindOf(a))-tabKinds.indexOf(kindOf(b))):[];
  const hasOverview=Boolean(tabParent&&(library.items.some(item=>item.folderId===tabParent.id)||library.folders.some(folder=>folder.parentId===tabParent.id&&kindOf(folder)==="general")));
  function navigateFolder(id){
    if(draft&&dirty&&!window.confirm("Lämna utan att spara ändringarna?"))return;
    setDraft(null);setDirty(false);setFilePreview(null);setRegisterItem(null);
    const children=library.folders.filter(folder=>folder.parentId===id);
    const onlyTabs=id!==null&&children.length>0&&children.every(folder=>kindOf(folder)!=="general")&&!library.items.some(item=>item.folderId===id);
    const target=onlyTabs?[...children].sort((a,b)=>tabKinds.indexOf(kindOf(a))-tabKinds.indexOf(kindOf(b)))[0].id:id;
    setFolderId(target);setSearch("");setTypeFilter("Alla");setMenuId(null);setShowFolder(false);setError("");setMessage("");
  }
  function startBoard(){setDraft({type:"elevator",folderId,name:"Hisstavla",articleNumber:"",completeArticleNumber:"",printArticleNumber:"",floorCopies:newElevatorBoard().floors.length,cabinCopies:0,board:newElevatorBoard()});setPublishPrice(0);setDirty(false);setMessage("");setError("");}
  function startOTBoard(){setDraft({type:"ot",folderId,name:"Entré 10",articleNumber:"",board:newOTBoard()});setDirty(false);setMessage("");setError("");}
  function duplicateOTBoard() {
    const {folderId, name, articleNumber, unitPrice, board} = draft;
    setDraft({type:"ot",folderId,name:name.slice(0,112)+" – kopia",articleNumber,unitPrice,board:JSON.parse(JSON.stringify(board))});
    setDirty(true);
    setError("");
    setMessage("");
  }
  function startFolder(){document.querySelector(".drawing-create-menu")?.removeAttribute("open");setShowFolder(value=>!value);setStandard(!folderId);setMenuId(null);}
  function closeDrawing(){setFilePreview(null);setRegisterItem(null);setMessage("");window.requestAnimationFrame(()=>{window.scrollTo(0,browsePosition.current);[...document.querySelectorAll("[data-drawing-item-id]")].find(element=>element.dataset.drawingItemId===openedItemId.current)?.focus({preventScroll:true});});}
  const pageTitle=standardAncestor&&currentFolder?.id===standardAncestor.id?(tabParent?.name||currentFolder?.name):currentFolder?.name;
  const pathFolders=breadcrumbs.filter(folder=>!tabParent||folder.id!==standardAncestor?.id||folder.id!==currentFolder?.id);
  const backFolder=standardAncestor?.id===currentFolder?.id&&tabParent?tabParent:currentFolder;
  const backTarget=backFolder?.parentId||null;
  const backName=library.folders.find(folder=>folder.id===backTarget)?.name||"ritningar";
  const renderPath=()=> folderId&&<nav className="drawing-breadcrumbs" aria-label="Mappsökväg"><button onClick={()=>navigateFolder(null)}>Ritningar</button>{pathFolders.map(folder=><span key={folder.id}>/ <button onClick={()=>navigateFolder(folder.id)}>{folder.name}</button></span>)}</nav>;
  const changedDate=item=>{const value=item.updatedAt||item.createdAt;const date=value?new Date(value):null;return date&&!Number.isNaN(date.getTime())?date.toLocaleDateString("sv-SE",{day:"numeric",month:"short",year:"numeric"}):"–";};
  const fileType=item=>item.type==="ot"?"OT-tavla":item.type==="elevator"?"Hisstavla":item.mime==="application/pdf"?"PDF":"Bild";
  const canAddElevator=folderKind==="elevators"||folderKind==="general";
  const canAddOT=effectiveKind==="ot"||effectiveKind==="general";
  const canUpload=folderKind==="plans"||folderKind==="general";
  const openLibraryItem=(item)=>{browsePosition.current=window.scrollY;openedItemId.current=item.id;setMenuId(null);if(["elevator","ot"].includes(item.type)){window.scrollTo(0,0);setDraft(JSON.parse(JSON.stringify(item)));setPublishPrice((catalog.articles||[]).find(article=>article.id===item.catalogArticleId)?.elevatorBoards?.find(variant=>variant.id===item.id)?.unitPrice||0);setDirty(false);setMessage("");setError("");}else openFile(item);};
  const folders=library.folders.filter(folder=>folder.parentId===folderId).sort((a,b)=>a.name.localeCompare(b.name,"sv"));
  const items=library.items.filter(item=>item.folderId===folderId).sort((a,b)=>a.name.localeCompare(b.name,"sv"));
  const updateDraft=(key,value)=>{setDraft(previous=>({...previous,[key]:value}));setDirty(true);setMessage("");};
  const updateBoard=(key,value)=>{setDraft(previous=>{
    const count=previous.board.floors?.length||0,total=Number(previous.floorCopies??1);
    const perFloor=count&&total%count===0?total/count:null;
    return {...previous,...(key==='floors'&&perFloor!==null?{floorCopies:value.length*perFloor}:{}),board:{...previous.board,[key]:value}};
  });setDirty(true);setMessage("");};
  const updateFloor=(index,key,value)=>{updateBoard("floors",draft.board.floors.map((floor,i)=>i===index?{...floor,[key]:value}:floor));};
  function leaveEditor(){if(dirty&&!window.confirm("Lämna utan att spara ändringarna?"))return;setDraft(null);setDirty(false);setError("");setMessage("");}
  function moveFloor(index,direction){const floors=[...draft.board.floors];[floors[index],floors[index+direction]]=[floors[index+direction],floors[index]];updateBoard("floors",floors);}
  function downloadSvg(){
    if(isOT){
      if(!svg.current)return;
      const clone=svg.current.cloneNode(true);clone.removeAttribute("style");
      const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)],{type:"image/svg+xml;charset=utf-8"}));
      const link=document.createElement("a");link.href=url;link.download=`${(draft.name||"OT-tavla").replace(/[^a-zA-Z0-9åäöÅÄÖ_-]/g,"-")}.svg`;link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);return;
    }
    if(!printSvg.current||!draft?.board)return;
    const floors=draft.board.floors||[];
    const floorCopies=Math.max(0,Math.floor(Number(draft.floorCopies)||0));
    const cabinCopies=Math.max(0,Math.floor(Number(draft.cabinCopies)||0));
    const total=floorCopies+cabinCopies;
    if(!total){setError("Ange minst ett exemplar innan du hämtar SVG.");return;}
    if(floorCopies&&!floors.length){setError("Lägg till våningsplan innan du hämtar SVG.");return;}
    const width=Math.max(100,Number(draft.board.widthMm)||420);
    const height=Math.max(100,Number(draft.board.heightMm)||460);
    const gap=20;
    const columns=Math.min(3,total);
    const rows=Math.ceil(total/columns);
    const ns="http://www.w3.org/2000/svg";
    const sheet=document.createElementNS(ns,"svg");
    sheet.setAttribute("xmlns",ns);
    sheet.setAttribute("width",`${columns*width+(columns-1)*gap}mm`);
    sheet.setAttribute("height",`${rows*height+(rows-1)*gap}mm`);
    sheet.setAttribute("viewBox",`0 0 ${columns*width+(columns-1)*gap} ${rows*height+(rows-1)*gap}`);
    // Export only the paper insert (no complete-board header or frame).
    // Every insert is positioned at the paper dimensions entered under Ritningar.
    for(let i=0;i<total;i++){
      const isCabin=i>=floorCopies;
      const floorIndex=isCabin?-1:i%floors.length;
      const clone=printSvg.current.cloneNode(true);
      clone.removeAttribute("style");
      clone.removeAttribute("width");
      clone.removeAttribute("height");
      clone.removeAttribute("xmlns");
      clone.removeAttribute("role");
      clone.removeAttribute("aria-label");
      // Remove the default dot and place it beside the correct floor heading.
      clone.querySelectorAll('[data-elevator-marker]').forEach(node=>node.remove());
      if(floorIndex>=0){
        const target=clone.querySelector(`[data-elevator-floor="${floorIndex}"]`);
        const bar=target?.querySelector('[data-elevator-heading-bar]');
        if(bar){
          const dot=document.createElementNS(ns,"circle");
          dot.setAttribute("cx",String(Number(bar.getAttribute("x"))-8));
          dot.setAttribute("cy",String(Number(bar.getAttribute("y"))+Number(bar.getAttribute("height"))/2));
          dot.setAttribute("r",String(Math.min(5.5,Number(bar.getAttribute("height"))*.24)));
          dot.setAttribute("fill","#0087b8");
          target.appendChild(dot);
        }
      }
      const group=document.createElementNS(ns,"g");
      group.setAttribute("transform",`translate(${(i%columns)*(width+gap)} ${Math.floor(i/columns)*(height+gap)})`);
      while(clone.firstChild)group.appendChild(clone.firstChild);
      sheet.appendChild(group);
    }
    const xml=new XMLSerializer().serializeToString(sheet);
    const url=URL.createObjectURL(new Blob([xml],{type:"image/svg+xml;charset=utf-8"}));
    const link=document.createElement("a");link.href=url;
    link.download=`${(draft.name||"Hisstavla").replace(/[^a-zA-Z0-9åäöÅÄÖ_-]/g,"-")}-${total}st.svg`;
    link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  async function addFile(file){if(!file)return;await action(async()=>{if(file.size>20*1024*1024)throw new Error("Filen får vara högst 20 MB.");const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error("Kunde inte läsa filen."));reader.readAsDataURL(file);});await api("/items","POST",{type:"file",folderId,name:file.name,dataUrl});await refresh();setMessage("Filen har lagts till.");});if(upload.current)upload.current.value="";}
  async function openFile(item){browsePosition.current=window.scrollY;openedItemId.current=item.id;await action(async()=>{const response=await fetch(`/api/drawing-library/items/${encodeURIComponent(item.id)}/file`,{headers:{"x-admin-password":adminPassword}});if(!response.ok)throw new Error("Kunde inte öppna filen.");setFilePreview({url:URL.createObjectURL(await response.blob()),mime:item.mime,name:item.name});setRegisterItem(item);window.scrollTo(0,0);});}
  const matches=(name)=>name.toLocaleLowerCase("sv").includes(search.trim().toLocaleLowerCase("sv"));
  const visibleFolders=folders.filter(folder=>(typeFilter==="Alla"||typeFilter==="Mappar")&&matches(folder.name));
  const visibleItems=items.filter(item=>matches(item.name)&&(typeFilter==="Alla"||(typeFilter!=="Mappar"&&(typeFilter==="Hisstavlor"?item.type==="elevator":typeFilter==="OT-tavlor"?item.type==="ot":item.type==="file"))));
  const sortedFolders=[...visibleFolders].sort((a,b)=>a.name.localeCompare(b.name,"sv"));
  const sortedItems=[...visibleItems].sort((a,b)=>sortOrder==="recent"?String(b.updatedAt||b.createdAt||"").localeCompare(String(a.updatedAt||a.createdAt||"")):a.name.localeCompare(b.name,"sv",{numeric:true}));
  if(filePreview&&registerItem)return <PageContainer><AdminLayout active="drawings" {...nav}><main className="jsf-drawing-library drawing-library-workspace">
    {renderPath()}
    <ProjectDrawingPlanner readOnly={readOnly} registerMode registerUrl={filePreview.url} project={{id:"register",number:"Befintliga skyltar"}} drawing={registerItem} headers={{"x-admin-password":adminPassword}} catalog={catalog} onClose={closeDrawing} onSaved={()=>{}} onRegisterSave={async changes=>{const result=await api(`/items/${registerItem.id}/register`,"PATCH",changes);setRegisterItem(result.item);await refresh();}}/>
  </main></AdminLayout></PageContainer>;
  return <PageContainer><AdminLayout active="drawings" {...nav}><main className={`jsf-drawing-library drawing-library-clean ${draft?"drawing-library-editing":""}`}>
    {!draft&&(folderId||nav.onOpenDashboard)&&<div className="drawing-library-back"><button type="button" className="jsf-back-link" onClick={()=>folderId?navigateFolder(backTarget):nav.onOpenDashboard()}>{folderId?`← Till ${backName}`:"← Till översikten"}</button></div>}
    {renderPath()}
    {pdfDialog&&draft&&!readOnly&&<DrawingBoardPdfDialog draft={draft} location={breadcrumbs.map(folder=>folder.name).join(' / ')} adminPassword={adminPassword} onClose={()=>setPdfDialog(false)}/>}
    {organize&&<DrawingLibraryOrganizeDialog key={`${organize.mode}-${organize.entry.id}`} mode={organize.mode} entry={organize.entry} folders={library.folders} onClose={()=>setOrganize(null)} onSave={async value=>{
      if(organize.mode==="move")await api(`/items/${encodeURIComponent(organize.entry.id)}/move`,"PATCH",{folderId:value||null});
      else await api(`/folders/${encodeURIComponent(organize.entry.id)}`,"PATCH",{name:value});
      await refresh();
      setMessage(organize.mode==="move"?"Ritningen har flyttats.":"Mappnamnet har ändrats.");setOrganize(null);
    }}/>}
    <header className="drawing-page-header"><div><h1>{draft?draft.name||boardLabel:pageTitle||"Ritningar"}</h1></div></header>
    {error&&<p className="drawing-error" role="alert">{error}</p>}{message&&<p className="drawing-message" role="status">{message}</p>}
    {draft&&readOnly?<section>
      <button type="button" className="jsf-back-link" onClick={leaveEditor}>← Till mappen</button>
      <DrawingBoardDetails item={draft} location={breadcrumbs.map(folder=>folder.name).join(' / ')}/>
    </section>:draft?<>
      <div className="drawing-editor-actions"><button className="jsf-back-link" onClick={leaveEditor} disabled={busy}>← Till mappen</button><span>{dirty?"Osparade ändringar":boardLabel}</span>{isOT&&draft.id&&<button type="button" disabled={busy} onClick={duplicateOTBoard}>Duplicera OT-tavla</button>}<button type="button" disabled={busy} onClick={()=>setPdfDialog(true)}>Hämta PDF</button><button onClick={downloadSvg}>Hämta SVG</button><button className="drawing-primary" disabled={busy} onClick={()=>action(async()=>{const data=await api(draft.id?`/items/${encodeURIComponent(draft.id)}`:"/items",draft.id?"PUT":"POST",draft);setDraft(data.item);setDirty(false);await refresh();await nav.onCatalogChanged?.();setMessage(isOT?"OT-tavlan är sparad.":"Hisstavlan är sparad.");})}>{busy?"Sparar …":isOT?"Spara OT-tavla":"Spara hisstavla"}</button></div>
      {isOT?<div className="drawing-editor">
        <div className="drawing-fields">
          <div className="drawing-field-grid"><label>Namn<input value={draft.name} onChange={event=>updateDraft("name",event.target.value)} placeholder="Till exempel Entré 10"/></label><label>Artikelnummer<input list="ot-article-numbers" value={draft.articleNumber||""} onChange={event=>updateDraft("articleNumber",event.target.value)}/></label><datalist id="ot-article-numbers">{(catalog.articles||[]).filter(article=>article.previewType!=="elevator_board").map(article=><option key={article.id} value={article.articleNumber}>{article.name}</option>)}</datalist><label>Bredd (mm)<input type="number" min="100" max="2000" value={draft.board.widthMm} onChange={event=>updateBoard("widthMm",event.target.value)}/></label><label>Höjd (mm)<input type="number" min="100" max="2000" value={draft.board.heightMm} onChange={event=>updateBoard("heightMm",event.target.value)}/></label><label>Pris per tavla (kr exkl. moms)<input type="number" min="0" step="0.01" value={draft.unitPrice??""} placeholder="Artikelns ordinarie pris" onChange={event=>updateDraft("unitPrice",event.target.value)}/></label></div>
          
          {draft.articleNumber&&(!otArticle||otArticle.previewType==="elevator_board")&&<p role="alert" className="drawing-error">{otArticle?"Välj en egen artikel för OT-tavlor. Detta artikelnummer används för hisstavlor.":`Artikel ${draft.articleNumber} saknas i sortimentet. Skapa den under Artiklar för att göra tavlan beställningsbar.`}</p>}
          <OTBoardFields showHelp={false} board={draft.board} allowStructure onChange={board=>updateDraft("board",board)}/>
        </div>
        <div className="drawing-preview"><h2>Förhandsvisning</h2><OTBoardPreview ref={svg} board={draft.board} label={draft.name||"OT-tavla"}/></div>
      </div>:<div className="drawing-editor">
        <div className="drawing-fields"><div className="drawing-field-grid"><label>Namn<input value={draft.name} onChange={event=>updateDraft("name",event.target.value)}/></label><label>Artikelnummer – komplett hisstavla<input value={draft.completeArticleNumber||""} onChange={event=>updateDraft("completeArticleNumber",event.target.value)}/></label><label>Artikelnummer – endast pappersutskrift<input value={draft.printArticleNumber||draft.articleNumber||""} onChange={event=>{updateDraft("printArticleNumber",event.target.value);}}/></label><label>Hissbeteckning (på komplett tavla)<input maxLength="5" value={draft.board.liftLetter||""} onChange={event=>updateBoard("liftLetter",event.target.value)} placeholder="Exempelvis G"/></label><label>Bredd (mm)<input type="number" min="100" max="2000" value={draft.board.widthMm} onChange={event=>updateBoard("widthMm",event.target.value)}/></label><label>Höjd (mm)<input type="number" min="100" max="2000" value={draft.board.heightMm} onChange={event=>updateBoard("heightMm",event.target.value)}/></label></div>
          <div className="drawing-field-grid"><label>Exemplar per våningsplan<input type="number" min="0" step="1" placeholder="Ojämnt fördelat" value={draft.board.floors.length&&Number(draft.floorCopies??1)%draft.board.floors.length===0?Number(draft.floorCopies??1)/draft.board.floors.length:""} onChange={event=>updateDraft("floorCopies",Number(event.target.value)*draft.board.floors.length)}/></label><label>Antal våningsplansexemplar<input type="number" min="0" step="1" value={draft.floorCopies??1} onChange={event=>updateDraft("floorCopies",event.target.value)}/></label><label>Antal exemplar i hisskorgar<input type="number" min="0" step="1" value={draft.cabinCopies??0} onChange={event=>updateDraft("cabinCopies",event.target.value)}/></label></div><p className="drawing-hint">Fast antal: {(Number(draft.floorCopies)||0)+(Number(draft.cabinCopies)||0)} st.</p>
          {draft.board.floors.map((floor,index)=><section className="drawing-floor" key={index}>
            <div className="drawing-floor-head"><h2>Plan {index+1}</h2><div><button aria-label={`Flytta plan ${index+1} upp`} disabled={index===0} onClick={()=>moveFloor(index,-1)}>↑</button><button aria-label={`Flytta plan ${index+1} ner`} disabled={index===draft.board.floors.length-1} onClick={()=>moveFloor(index,1)}>↓</button><button disabled={draft.board.floors.length===1} onClick={()=>updateBoard("floors",draft.board.floors.filter((_,i)=>i!==index))}>Ta bort</button></div></div>
            <label>Planrubrik<input value={floor.heading} maxLength="60" onChange={event=>updateFloor(index,"heading",event.target.value)}/></label>
            <label>Text på planet<textarea rows="4" value={floor.text} onChange={event=>updateFloor(index,"text",event.target.value)}/></label>
            <label>Grönmarkerad textrad<select value={floor.highlightLine} onChange={event=>updateFloor(index,"highlightLine",Number(event.target.value))}><option value="-1">Ingen</option>{floor.text.split(/\r?\n/).map((line,i)=><option key={i} value={i}>{line||`Rad ${i+1}`}</option>)}</select></label>
            <label className="drawing-check"><input type="checkbox" checked={floor.marker} onChange={event=>updateBoard("floors",draft.board.floors.map((f,i)=>({...f,marker:event.target.checked?i===index:false})))}/>Blå markering vid detta plan</label>
          </section>)}
          <button disabled={draft.board.floors.length>=30} onClick={()=>updateBoard("floors",[...draft.board.floors,{heading:`Plan ${draft.board.floors.length+1}`,text:"",marker:false,highlightLine:-1}])}>+ Lägg till plan</button>
        </div>
        <div className="drawing-preview"><h2>Förhandsvisning</h2><ElevatorBoardPreview ref={svg} board={draft.board} label={draft.name||"Hisstavla"} mode="complete"/><div style={{position:"absolute",width:1,height:1,overflow:"hidden",pointerEvents:"none"}} aria-hidden="true"><ElevatorBoardPreview ref={printSvg} board={draft.board} label={draft.name||"Hisstavla"} mode="print"/></div></div>
      </div>}
    </>:<>
      {tabs.length>0&&<nav className="drawing-folder-tabs" aria-label="Ritningskategorier">{hasOverview&&<button type="button" aria-current={folderId===tabParent.id?"page":undefined} onClick={()=>navigateFolder(tabParent.id)}>Översikt</button>}{tabs.map(folder=><button type="button" key={folder.id} aria-current={standardAncestor?.id===folder.id?"page":undefined} onClick={()=>navigateFolder(folder.id)}>{folder.name}</button>)}</nav>}
      <div className="drawing-library-toolbar">
        <label className="drawing-library-search"><span className="drawing-visually-hidden">Sök i ritningsbiblioteket</span><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><input aria-label="Sök i ritningsbiblioteket" placeholder={currentFolder?`Sök i ${currentFolder.name}`:"Sök mappar och dokument"} value={search} onChange={event=>setSearch(event.target.value)}/></label>
        <select aria-label="Sortera innehåll" value={sortOrder} onChange={event=>setSortOrder(event.target.value)}><option value="name">Namn A–Ö</option><option value="recent">Senast ändrad</option></select>
        {folderKind==="general"&&<select aria-label="Filtrera innehåll" value={typeFilter} onChange={event=>setTypeFilter(event.target.value)}><option value="Alla">Alla typer</option><option>Mappar</option><option>Planritningar</option><option>Hisstavlor</option><option>OT-tavlor</option></select>}
        {!readOnly && (canAddElevator&&folderKind==="general"?<details className="drawing-create-menu"><summary>+ Skapa</summary><div><button disabled={!loaded||busy} onClick={startFolder}>Ny mapp</button><button disabled={!loaded||busy} onClick={startBoard}>Ny hisstavla</button><button disabled={!loaded||busy} onClick={startOTBoard}>Ny OT-tavla</button></div></details>:<button disabled={!loaded||busy} onClick={startFolder}>+ Ny mapp</button>)}
        {!readOnly&&canAddElevator&&folderKind==="elevators"&&<button className="drawing-primary" disabled={!loaded||busy} onClick={startBoard}>+ Ny hisstavla</button>}
        {!readOnly&&canAddOT&&effectiveKind==="ot"&&<button className="drawing-primary" disabled={!loaded||busy} onClick={startOTBoard}>+ Ny OT-tavla</button>}
        {!readOnly&&canUpload&&<button className="drawing-primary" disabled={!loaded||busy} onClick={()=>upload.current?.click()}>Ladda upp ritning</button>}
        <input ref={upload} type="file" accept="application/pdf,image/png,image/jpeg" hidden onChange={event=>addFile(event.target.files?.[0])}/>
      </div>
      {showFolder&&<form className="drawing-folder-form" onSubmit={event=>{event.preventDefault();action(async()=>{const data=await api("/folders","POST",{name:folderName,parentId:folderId,standardFolders:standard});const nextLibrary=await refresh();const plan=standard?nextLibrary.folders.find(folder=>folder.parentId===data.folder.id&&kindOf(folder)==="plans"):null;setFolderId(plan?.id||data.folder.id);setSearch("");setTypeFilter("Alla");setShowFolder(false);setFolderName("");});}}><label>Mappnamn<input autoFocus value={folderName} onChange={event=>setFolderName(event.target.value)} placeholder="Till exempel Ryhov"/></label><label className="drawing-check"><input type="checkbox" checked={standard} onChange={event=>setStandard(event.target.checked)}/>Skapa även Planritningar, Hisstavlor och OT-tavlor</label><button disabled={busy||!folderName.trim()} type="submit">Skapa mapp</button><button type="button" disabled={busy} onClick={()=>setShowFolder(false)}>Avbryt</button></form>}
      {!loaded&&!error&&<p>Hämtar ritningar …</p>}
      <div className="drawing-list-heading"><span>{sortedFolders.length+sortedItems.length} {sortedFolders.length?"objekt":folderKind==="elevators"?"hisstavlor":effectiveKind==="ot"?"OT-tavlor":"dokument"}</span></div>
      <div className="drawing-library-list drawing-library-browser" hidden={loaded&&!visibleFolders.length&&!visibleItems.length} role="list" aria-label="Mappar och ritningar">
        {!!sortedFolders.length&&<div className="drawing-folder-grid" role="presentation">{sortedFolders.map(folder=><div className="drawing-folder-card" role="listitem" key={folder.id}>
          <button type="button" className="drawing-folder-card-open" title={folder.name} onClick={()=>navigateFolder(folder.id)}>
            <WorkspaceIcon name="projects"/>
            <span><strong>{folder.name}</strong><small>{library.folders.filter(child=>child.parentId===folder.id).length} undermappar · {library.items.filter(item=>item.folderId===folder.id).length} dokument</small></span>
            <span aria-hidden="true">›</span>
          </button>
          {!readOnly&&<WorkspaceMenu className="drawing-folder-card-menu" label={`Åtgärder för ${folder.name}`}>
            <button type="button" disabled={busy} onClick={()=>setOrganize({mode:"rename",entry:folder})}>Byt namn</button>
            <button type="button" data-danger="true" disabled={busy} onClick={()=>{if(window.confirm(`Ta bort den tomma mappen ${folder.name}?`))action(async()=>{await api(`/folders/${folder.id}`,"DELETE");await refresh();});}}>Ta bort mapp</button>
          </WorkspaceMenu>}
        </div>)}</div>}
        {!!sortedItems.length&&<div className="drawing-library-grid" role="presentation">
        {sortedItems.map(item=><div className="drawing-library-row drawing-library-card" role="listitem" key={item.id}>
          <button className="drawing-library-open" title={item.name} data-drawing-item-id={item.id} onClick={()=>openLibraryItem(item)}>
            <LibraryCardContent name={item.name} type={fileType(item)} description={item.type==="ot"?`${item.articleNumber||"OT-tavla"} · ${item.board?.rows?.length||0} rader`:item.type==="elevator"?`${item.printArticleNumber||item.articleNumber||"Hisstavla"} · ${item.board?.floors?.length||0} plan · ${(Number(item.floorCopies??1)+Number(item.cabinCopies??0))} ex`:"Planritning / fil"} meta={changedDate(item)==='–'?'':`Ändrad ${changedDate(item)}`}/>
          </button>
          {!readOnly && <div className="drawing-menu-wrap"><button className="drawing-menu-button" aria-label={`Åtgärder för ${item.name}`} aria-expanded={menuId===item.id} onClick={()=>setMenuId(menuId===item.id?null:item.id)}>⋮</button>{menuId===item.id&&<div className="drawing-menu">{item.type==="file"&&<button disabled={busy} onClick={()=>{setMenuId(null);setOrganize({mode:"move",entry:item});}}>Flytta till mapp</button>}{item.type==="file"&&<button disabled={busy} onClick={()=>{setMenuId(null);const name=window.prompt("Nytt ritningsnamn",item.name);if(name?.trim())action(async()=>{await api(`/items/${item.id}/register`,"PATCH",{name:name.trim(),markers:item.markers||[]});await refresh();});}}>Byt namn</button>}<button disabled={busy} onClick={()=>{setMenuId(null);if(window.confirm(`Ta bort ${item.name}?`))action(async()=>{await api(`/items/${item.id}`,"DELETE");await refresh();if(["ot","elevator"].includes(item.type))await nav.onCatalogChanged?.();});}}>Ta bort</button></div>}</div>}
        </div>)}
        </div>}
      </div>{loaded&&!visibleFolders.length&&!visibleItems.length&&<p className="drawing-empty">{search||typeFilter!=="Alla"?"Inga objekt matchar din sökning eller ditt filter.":"Mappen är tom."}</p>}
      {sortedItems.some(item=>item.type==="file")&&null}
    </>}
  </main></AdminLayout></PageContainer>;
}

function LibraryCardContent({folder=false,name,type,description,meta}){
  return <>
    <span className="drawing-card-heading"><span className="drawing-card-icon"><svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={folder?'M3 6h7l2 2h9v12H3V6ZM3 6V4h7l2 2':'M5 3h9l5 5v13H5V3ZM14 3v6h5M8 13h8M8 17h6'}/></svg></span><span className="drawing-card-kind">{type}</span></span>
    <span className="drawing-card-title">{name}</span>
    <span className="drawing-card-description">{description}</span>
    <span className="drawing-card-footer"><span>{meta}</span><span className="drawing-card-link">{folder?'Öppna mapp':'Öppna dokument'} <span aria-hidden="true">→</span></span></span>
  </>;
}
