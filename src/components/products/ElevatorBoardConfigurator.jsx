import {useEffect,useState} from "react";
import useDrawingBoardVariants from "../../hooks/useDrawingBoardVariants";
import Field from "../forms/Field";
import {newElevatorBoard} from "../orders/ElevatorBoardPreview";
export default function ElevatorBoardConfigurator({product,form,onChange,articles,credential}){
  const [query,setQuery]=useState("");const [activeFloor,setActiveFloor]=useState(0);
  const {variants,error}=useDrawingBoardVariants(product.elevatorBoards||[],"elevator",form.elevatorBoardId,{articles,credential});
  const selected=variants.find(variant=>variant.id===form.elevatorBoardId);
  const board=form.elevatorBoard || selected?.board || product.elevatorBoardConfig || newElevatorBoard();
  const visible=variants.filter(variant=>variant.id===form.elevatorBoardId || `${variant.location} ${variant.name}`.toLocaleLowerCase("sv").includes(query.toLocaleLowerCase("sv")));
  const floor=board.floors?.[activeFloor];
  useEffect(()=>{
    if(!selected)return;
    const {board,...selection}=selected;
    if(JSON.stringify(form.elevatorBoardVariant)!==JSON.stringify(selection))onChange({elevatorBoardVariant:selection});
  },[selected,form.elevatorBoardVariant,onChange]);
  const sourceChanged=Boolean(selected&&form.elevatorSourceBoard&&JSON.stringify(form.elevatorSourceBoard)!==JSON.stringify(selected.board));
  function applySavedBoard(){onChange({elevatorBoard:JSON.parse(JSON.stringify(selected.board)),elevatorSourceBoard:JSON.parse(JSON.stringify(selected.board)),elevatorBoardEdited:false,quantity:Number(selected.floorCopies??1)+Number(selected.cabinCopies??0)});}
  useEffect(()=>{
    if(!selected||form.elevatorBoardEdited)return;
    const quantity=Number(selected.floorCopies??1)+Number(selected.cabinCopies??0);
    if(JSON.stringify(form.elevatorBoard)!==JSON.stringify(selected.board)||JSON.stringify(form.elevatorSourceBoard)!==JSON.stringify(selected.board)||Number(form.quantity)!==quantity)onChange({elevatorBoard:JSON.parse(JSON.stringify(selected.board)),elevatorSourceBoard:JSON.parse(JSON.stringify(selected.board)),elevatorBoardEdited:false,quantity});
  },[selected,form.elevatorBoardEdited,form.elevatorBoard,form.elevatorSourceBoard,form.quantity,onChange]);
  useEffect(()=>{setActiveFloor(index=>Math.min(index,Math.max(0,(board.floors?.length||1)-1)));},[board.floors?.length]);
  const mode=form.elevatorOrderMode||"print";
  const option=selected?.options?.[mode];
  function changeFloor(key,value){onChange({elevatorBoardEdited:true,elevatorBoard:{...board,floors:board.floors.map((f,i)=>i===activeFloor?{...f,[key]:value}:f)}});}
  return <div className="jsf-elevator-fields">
    {error&&<p role="alert">{error}</p>}
    {sourceChanged&&form.elevatorBoardEdited&&<div role="status"><p>Tavlan har uppdaterats sedan du började ändra texten. Din text finns kvar.</p><button type="button" onClick={applySavedBoard}>Använd den uppdaterade tavlan</button></div>}
    {variants.length>0&&<><div style={{marginBottom:18}}><div style={{marginBottom:10}}>Vad vill du beställa?</div><div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10}}>{[["complete","Komplett hisstavla","Tavla med ram"],["print","Endast pappersutskrift","Papper till befintlig tavla"]].map(([value,label,description])=><button key={value} type="button" aria-pressed={mode===value} onClick={()=>onChange({elevatorOrderMode:value})} style={{textAlign:"left",padding:"14px 12px",border:"1px solid "+(mode===value?"#8d8b86":"#d9d6d0"),background:mode===value?"#efefef":"#fff",borderRadius:5,cursor:"pointer",color:"#292929"}}><span style={{display:"flex",justifyContent:"space-between",gap:6,alignItems:"center"}}><strong style={{fontWeight:500,fontSize:13}}>{label}</strong><span aria-hidden="true" style={{border:"1px solid #999",borderRadius:"50%",width:19,height:19,textAlign:"center",background:mode===value?"#777":"transparent",color:"white",flexShrink:0}}>{mode===value?"✓":""}</span></span><small style={{display:"block",marginTop:7,color:"#777"}}>{description}</small></button>)}</div></div><label>Sök hisstavla<input aria-label="Sök hisstavla" placeholder="Till exempel Ryhov eller Hiss T" value={query} onChange={event=>setQuery(event.target.value)}/></label><Field label="Välj hiss" htmlFor="elevatorBoardId"><select id="elevatorBoardId" value={form.elevatorBoardId||""} onChange={event=>{const variant=variants.find(v=>v.id===event.target.value);setActiveFloor(0);onChange({elevatorBoardId:variant?.id||"",elevatorBoard:variant?JSON.parse(JSON.stringify(variant.board)):null,elevatorSourceBoard:variant?JSON.parse(JSON.stringify(variant.board)):null,elevatorBoardEdited:false,quantity:variant?Number(variant.floorCopies??1)+Number(variant.cabinCopies??0):1});}}><option value="">Välj hiss …</option>{visible.map(variant=><option key={variant.id} value={variant.id}>{variant.location?variant.location+" · ":""}{variant.name}</option>)}</select></Field></>}
    {selected&&!option?.articleId&&<p role="alert" style={{color:"#9b392f"}}>Artikelnumret för detta val saknas i artikelregistret. Kontakta leverantören.</p>}
    {selected&&<p>Artikelnummer: <strong>{option?.articleNumber||"Artikel saknas"}</strong><br/><strong>{selected.name}</strong> · {board.widthMm} × {Number(board.heightMm)+(form.elevatorOrderMode==="complete"?100:0)} mm<br/>Våningsplan: {selected.floorCopies??1} st · Hisskorgar: {selected.cabinCopies??0} st · <strong>Totalt {Number(selected.floorCopies??1)+Number(selected.cabinCopies??0)} st (fast antal)</strong></p>}
    {(!variants.length||selected)&&<><div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:16}}>{board.floors.map((f,i)=><button type="button" key={i} onClick={()=>setActiveFloor(i)} aria-pressed={activeFloor===i} style={{padding:"9px 15px",borderRadius:6,border:"1px solid #b9c8c0",background:activeFloor===i?"#efefef":"#fff",color:"#333",cursor:"pointer"}}>{activeFloor===i?"✓  ":""}{f.heading||`Plan ${i+1}`}</button>)}</div>{floor&&<div><label>Text på {floor.heading}<textarea rows="5" value={floor.text||""} onChange={event=>changeFloor("text",event.target.value)} style={{display:"block",width:"100%",marginTop:8}}/></label><p style={{whiteSpace:"pre-line",padding:12,background:"#f4f7f5",borderRadius:6}}><strong>{floor.heading}</strong><br/>{floor.text}</p></div>}</>}
  </div>;
}
