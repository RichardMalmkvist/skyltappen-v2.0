import {parkingConfig} from '../../data/parkingSign';
export default function ParkingArticleFields({article,onChange}){
 const c=parkingConfig(article);
 const fields=[['widthMm','Tryckbredd (mm)'],['heightMm','Tryckhöjd (mm)'],['textHeightMm','Texthöjd (mm)'],['lineGapMm','Radmellanrum (mm)'],['textAreaLeftMm','Textyta – från vänster (mm)'],['textAreaTopMm','Textyta – från överkant (mm)'],['textAreaWidthMm','Textytans bredd (mm)'],['textAreaHeightMm','Textytans höjd (mm)']];
 return <fieldset className="wide" style={{border:'1px solid #e5e5e5',padding:16,minWidth:0}}><legend>Parkering – text och tryckmått</legend><p>En ensam rad centreras i textytan. Två rader centreras tillsammans. Texthöjden mäts som höjden på en versal i Arial Bold.</p><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12}}>{fields.map(([key,label])=><label key={key}><span>{label}</span><input type="number" min={['textAreaLeftMm','textAreaTopMm','lineGapMm'].includes(key)?0:.1} step="any" value={c[key]} onChange={e=>onChange({...article,parkingSignConfig:{...c,[key]:e.target.value===''?'':Number(e.target.value)}})}/></label>)}</div></fieldset>;
}
