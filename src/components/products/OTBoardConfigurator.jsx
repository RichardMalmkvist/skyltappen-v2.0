import SignArtworkPlacement from './SignArtworkPlacement';
import SignArtworkField from './SignArtworkField';
import {useEffect,useState} from "react";
import useDrawingBoardVariants from "../../hooks/useDrawingBoardVariants";
import Field from "../forms/Field";
import OTBoardFields from "./OTBoardFields";
import "./OTBoardConfigurator.css";

export default function OTBoardConfigurator({product,form,onChange,credential}){
  const {variants,error}=useDrawingBoardVariants(product.otBoards||[],"ot",form.otBoardId,{credential});
  const selected=variants.find(item=>item.id===form.otBoardId);
  const [chosenLocation,setLocation]=useState("");
  const location=selected?(selected.location||"Övrigt"):chosenLocation;
  const [query,setQuery]=useState("");
  const locations=[...new Set(variants.map(item=>item.location||"Övrigt"))].sort((a,b)=>a.localeCompare(b,"sv"));
  const visible=variants.filter(item=>(item.location||"Övrigt")===location&&`${item.location} ${item.name}`.toLocaleLowerCase("sv").includes(query.toLocaleLowerCase("sv")));
  const board=form.otBoard||selected?.board;
  const sourceChanged=Boolean(selected&&form.otSourceBoard&&JSON.stringify(form.otSourceBoard)!==JSON.stringify(selected.board));
  function applySavedBoard(){onChange({otBoard:JSON.parse(JSON.stringify(selected.board)),otSourceBoard:JSON.parse(JSON.stringify(selected.board)),otBoardEdited:false});}
  useEffect(()=>{
    if(!selected||form.otBoardEdited)return;
    if(JSON.stringify(form.otBoard)!==JSON.stringify(selected.board)||JSON.stringify(form.otSourceBoard)!==JSON.stringify(selected.board))onChange({otBoard:JSON.parse(JSON.stringify(selected.board)),otSourceBoard:JSON.parse(JSON.stringify(selected.board)),otBoardEdited:false});
  },[selected,form.otBoardEdited,form.otBoard,form.otSourceBoard,onChange]);
  const ownArtwork=<SignArtworkField credential={credential} value={form.otBoard?.uploadedArtwork} onChange={art=>onChange({otBoard:art?{widthMm:board?.widthMm||art.widthMm,heightMm:board?.heightMm||art.heightMm,uploadedArtwork:art}:null,otBoardId:'',otBoardName:'',otBoardLocation:'',otSourceBoard:null,otBoardEdited:Boolean(art)})}/>;
  if(form.otBoard?.uploadedArtwork)return <div className="jsf-ot-configurator">{ownArtwork}<SignArtworkPlacement sign={form.otBoard} onChange={otBoard=>onChange({otBoard,otBoardEdited:true})}/><label>Antal<input type="number" min="1" step="1" value={form.quantity||1} onChange={e=>onChange({quantity:e.target.value})}/></label></div>;
  return <div className="jsf-ot-configurator">{ownArtwork}
    {error&&<p role="alert">{error}</p>}
    {sourceChanged&&form.otBoardEdited&&<div role="status"><p>Tavlan har uppdaterats sedan du började ändra texten. Din text finns kvar.</p><button type="button" onClick={applySavedBoard}>Använd den uppdaterade tavlan</button></div>}
    {!variants.length?<p>Det finns inga sparade OT-tavlor för denna artikel ännu.</p>:<>
      <div><label htmlFor="otBoardLocation">Plats</label><select id="otBoardLocation" value={location} onChange={event=>{setLocation(event.target.value);setQuery("");onChange({otBoardId:"",otBoard:null,otBoardName:"",otBoardLocation:"",otSourceBoard:null,otBoardEdited:false});}}><option value="">Välj plats …</option>{locations.map(value=><option key={value} value={value}>{value}</option>)}</select></div>
      <label>Sök OT-tavla<input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Till exempel Entré 10"/></label>
      <Field label="Välj OT-tavla" htmlFor="otBoardId"><select id="otBoardId" disabled={!location} value={form.otBoardId||""} onChange={event=>{const variant=variants.find(item=>item.id===event.target.value);setLocation(location);onChange({otBoardId:variant?.id||"",otBoardName:variant?.name||"",otBoardLocation:variant?.location||"",otBoard:variant?JSON.parse(JSON.stringify(variant.board)):null,otSourceBoard:variant?JSON.parse(JSON.stringify(variant.board)):null,otBoardEdited:false});}}><option value="">Välj tavla …</option>{[...new Map([...visible,...(selected&&!visible.includes(selected)?[selected]:[])].map(item=>[item.id,item])).values()].map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
      {location&&!visible.length&&<p>Inga tavlor matchar sökningen.</p>}
    </>}
    {selected&&board&&<><p>{selected.location} · {selected.name}<br/>{board.widthMm} × {board.heightMm} mm<br/><span data-ot-unit-price="true">Pris per tavla: {Number(selected.unitPrice??product.unitPrice??0).toLocaleString("sv-SE",{minimumFractionDigits:2,maximumFractionDigits:2})} kr exkl. moms</span></p><OTBoardFields board={board} onChange={value=>onChange({otBoard:value,otBoardEdited:true})}/><Field label="Antal" htmlFor="quantity"><input id="quantity" type="number" min="1" step="1" value={form.quantity||1} onChange={event=>onChange({quantity:event.target.value})}/></Field></>}
  </div>;
}
