import {isFoldedAluminium} from "../../data/aluminiumArticles";
import {applyDibondPreset,getDibondConfig} from "../../data/dibondHelpers";
export default function DibondArticleFields({article,onChange}){
  const c=getDibondConfig(article);
  const change=(key,value)=>onChange({...article,dibondConfig:{...c,[key]:value}});
  return <div className="wide" style={{display:"grid",gap:14,border:"1px solid #e5e1da",padding:16,borderRadius:5}}>
    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{[300,600].map(maximum=><button type="button" key={maximum} onClick={()=>onChange(applyDibondPreset(article,maximum))}>Max {maximum} × {maximum} mm</button>)}</div>
    
    <label><input type="checkbox" checked={c.fixedDimensions} onChange={event=>change("fixedDimensions",event.target.checked)}/> Fasta mått (A4/A5 eller annat fast format)</label>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12}}>{[["maxWidthMm","Maxbredd (mm)"],["maxHeightMm","Maxhöjd (mm)"],["defaultWidthMm","Förvald bredd (mm)"],["defaultHeightMm","Förvald höjd (mm)"],["defaultTextSizeMm","Förvald texthöjd (mm)"]].map(([key,label])=><label key={key}><span>{label}</span><input type="number" min={key==="defaultTextSizeMm"?1:30} max={key==="defaultTextSizeMm"?500:3000} value={article.dibondConfig?.[key]??c[key]} onChange={event=>change(key,event.target.value)}/></label>)}</div>
    {!isFoldedAluminium(article)&&<label><span>Förvald hörnradie (mm)</span><input type="number" min="0" max={Math.min(c.defaultWidthMm,c.defaultHeightMm)/2} step="any" value={article.dibondConfig?.defaultCornerRadiusMm??c.defaultCornerRadiusMm} onChange={event=>change("defaultCornerRadiusMm",event.target.value)}/></label>}
  </div>;
}
