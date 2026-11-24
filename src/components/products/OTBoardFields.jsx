import "../../styles/otBoard.css";
import "./OTBoardFields.css";

export default function OTBoardFields({board,onChange,allowStructure=false,showHelp=true}){
  const twoColumns=Number(board.columns)===2;
  const columnLength=Math.ceil(board.rows.length/2);
  const pairs=Array.from({length:columnLength},(_,index)=>({left:board.rows[index],right:board.rows[columnLength+index]||null}));
  const blank=()=>({text:"",target:"",floor:""});
  function savePairs(next){
    // Keep the existing column-major storage so saved boards and exports retain their positions.
    const left=next.map(pair=>pair.left||blank());
    const right=next.map(pair=>pair.right);
    while(right.length&&right[right.length-1]===null)right.pop();
    onChange({...board,rows:[...left,...right.map(row=>row||blank())]});
  }
  function changePair(index,side,key,value){savePairs(pairs.map((pair,i)=>i===index?{...pair,[side]:{...(pair[side]||blank()),[key]:value}}:pair));}
  function movePair(index,direction){const next=[...pairs];[next[index],next[index+direction]]=[next[index+direction],next[index]];savePairs(next);}
  const change=(index,key,value)=>onChange({...board,rows:board.rows.map((row,i)=>i===index?{...row,[key]:value}:row)});
  function move(index,direction){const rows=[...board.rows];[rows[index],rows[index+direction]]=[rows[index+direction],rows[index]];onChange({...board,rows});}
  return <div className={`jsf-ot-fields${board.showFloor?" jsf-ot-with-floors":""}`}>
    {allowStructure&&<><div><label htmlFor="otColumns">Layout</label><select id="otColumns" value={board.columns||1} onChange={event=>onChange({...board,columns:Number(event.target.value),targetBackground:Number(event.target.value)===1})}><option value="1">En kolumn</option><option value="2">Två kolumner</option></select></div><div><label htmlFor="otTargetBackground">Målpunktens utseende</label><select id="otTargetBackground" value={board.targetBackground===false?"plain":"boxed"} onChange={event=>onChange({...board,targetBackground:event.target.value==="boxed"})}><option value="boxed">Vit text i svart ruta</option><option value="plain">Svart text utan ruta</option></select></div></>}
    <div><label htmlFor="otShowFloor">Plan på tavlan</label><select id="otShowFloor" value={board.showFloor?"yes":"no"} onChange={event=>onChange({...board,showFloor:event.target.value==="yes"})}><option value="no">Utan plan</option><option value="yes">Visa plan</option></select></div>
    {showHelp&&twoColumns&&<p>Fyll i vänster och höger sida för rad 1, därefter båda sidor för rad 2.</p>}
    <div><label htmlFor="otLineStyle">Linje till målpunkt</label><select id="otLineStyle" value={board.lineStyle||"dotted"} onChange={event=>onChange({...board,lineStyle:event.target.value})}><option value="dotted">Prickad</option><option value="dashed">Streckad</option><option value="solid">Heldragen</option></select></div>
    {allowStructure&&<div className="jsf-ot-row-fields"><label>Vänster kolumnrubrik<input maxLength="80" value={board.title} onChange={e=>onChange({...board,title:e.target.value})}/></label><label>Höger kolumnrubrik<input maxLength="40" value={board.targetTitle} onChange={e=>onChange({...board,targetTitle:e.target.value})}/></label></div>}
    {twoColumns?<div className="jsf-ot-rows jsf-ot-paired-rows">{pairs.map((pair,index)=><section className="jsf-ot-row jsf-ot-paired-row" key={index} aria-label={`Rad ${index+1}, vänster och höger`}>
      <div className="jsf-ot-row-heading"><span>Rad {index+1}</span><div><button type="button" aria-label={`Flytta rad ${index+1} upp`} disabled={index===0} onClick={()=>movePair(index,-1)}>↑</button><button type="button" aria-label={`Flytta rad ${index+1} ner`} disabled={index===pairs.length-1} onClick={()=>movePair(index,1)}>↓</button><button type="button" aria-label={`Ta bort rad ${index+1}, båda sidor`} disabled={pairs.length<=1} onClick={()=>savePairs(pairs.filter((_,i)=>i!==index))}>Ta bort raden</button></div></div>
      <div className="jsf-ot-pair-columns">{[["left","Vänster"],["right","Höger"]].map(([side,label])=><div className="jsf-ot-pair-side" key={side}>
        <span className="jsf-ot-side-title">{label}</span>
        <div className="jsf-ot-row-fields"><label>Avdelning / mottagning – {label.toLowerCase()}, rad {index+1}<input maxLength="120" value={pair[side]?.text||""} onChange={event=>changePair(index,side,"text",event.target.value)}/></label><label>Målpunkt – {label.toLowerCase()}, rad {index+1}<input maxLength="10" value={pair[side]?.target||""} onChange={event=>changePair(index,side,"target",event.target.value)}/></label>{board.showFloor&&<label>Plan – {label.toLowerCase()}, rad {index+1}<input maxLength="10" value={pair[side]?.floor||""} onChange={event=>changePair(index,side,"floor",event.target.value)}/></label>}</div>
      </div>)}</div>
    </section>)}</div>:<div className="jsf-ot-rows">{board.rows.map((row,index)=><section className="jsf-ot-row" key={index} aria-label={`Rad ${index+1}`}>
      <div className="jsf-ot-row-heading"><span>Rad {index+1}</span><div><button type="button" aria-label={`Flytta rad ${index+1} upp`} disabled={index===0} onClick={()=>move(index,-1)}>↑</button><button type="button" aria-label={`Flytta rad ${index+1} ner`} disabled={index===board.rows.length-1} onClick={()=>move(index,1)}>↓</button><button type="button" aria-label={`Ta bort rad ${index+1}`} disabled={board.rows.length<=1} onClick={()=>onChange({...board,rows:board.rows.filter((_,i)=>i!==index)})}>Ta bort</button></div></div>
      <div className="jsf-ot-row-fields"><label>Avdelning / mottagning {index+1}<input maxLength="120" value={row.text} onChange={e=>change(index,"text",e.target.value)}/></label><label>Målpunkt {index+1}<input maxLength="10" value={row.target} onChange={e=>change(index,"target",e.target.value)}/></label>{board.showFloor&&<label>Plan {index+1}<input maxLength="10" value={row.floor||""} onChange={e=>change(index,"floor",e.target.value)}/></label>}</div>
    </section>)}</div>}
    <button type="button" disabled={twoColumns?pairs.length>=100:board.rows.length>=100} onClick={()=>twoColumns?savePairs([...pairs.map(pair=>({...pair,right:pair.right||blank()})),{left:blank(),right:blank()}]):onChange({...board,rows:[...board.rows,blank()]})}>{twoColumns?"+ Lägg till rad på båda sidor":"+ Lägg till rad"}</button>
  </div>;
}
