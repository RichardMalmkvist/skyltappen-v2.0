import {newElevatorBoard} from "../orders/ElevatorBoardPreview";
import "../../pages/admin/AdminDrawingLibraryPage.css";
export default function ElevatorBoardFields({board,onChange,allowStructure=false}){
  const value=board || newElevatorBoard();
  const change=(index,key,next)=>onChange({...value,floors:value.floors.map((floor,i)=>i===index?{...floor,[key]:next}:floor)});
  return <div className="jsf-elevator-fields">{allowStructure&&<div className="drawing-field-grid"><label>Bredd (mm)<input type="number" min="100" max="2000" value={value.widthMm} onChange={event=>onChange({...value,widthMm:Number(event.target.value)})}/></label><label>Höjd (mm)<input type="number" min="100" max="2000" value={value.heightMm} onChange={event=>onChange({...value,heightMm:Number(event.target.value)})}/></label></div>}{value.floors.map((floor,index)=><section className="jsf-elevator-floor" key={index}>
    <div><strong>{floor.heading || `Plan ${index+1}`}</strong>{allowStructure&&<button type="button" disabled={value.floors.length<=1} onClick={()=>onChange({...value,floors:value.floors.filter((_,i)=>i!==index)})}>Ta bort plan</button>}</div>
    <label>Planrubrik {index+1}<input value={floor.heading} maxLength="60" onChange={event=>change(index,"heading",event.target.value)}/></label>
    <label>Text på {floor.heading || `plan ${index+1}`}<textarea rows="3" value={floor.text} onChange={event=>change(index,"text",event.target.value)}/></label>
    <label>Grönmarkerad textrad {index+1}<select value={floor.highlightLine} onChange={event=>change(index,"highlightLine",Number(event.target.value))}><option value="-1">Ingen</option>{floor.text.split(/\r?\n/).map((line,i)=><option key={i} value={i}>{line||`Rad ${i+1}`}</option>)}</select></label>
    <label className="drawing-check"><input type="checkbox" checked={floor.marker} onChange={event=>change(index,"marker",event.target.checked)}/>Blå markering vid {floor.heading || `plan ${index+1}`}</label>
  </section>)}{allowStructure&&<button type="button" disabled={value.floors.length>=30} onClick={()=>onChange({...value,floors:[...value.floors,{heading:`Plan ${value.floors.length+1}`,text:"",highlightLine:-1,marker:false}]})}>+ Lägg till plan</button>}</div>;
}
