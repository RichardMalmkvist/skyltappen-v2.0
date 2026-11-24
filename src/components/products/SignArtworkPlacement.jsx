import {useState} from 'react';
import {artworkBounds,placeArtwork} from '../../data/signArtwork';
import SignPositionFields from './SignPositionFields';
import useSignEditorSelection from './useSignEditorSelection';
import './SignArtworkPlacement.css';

function NumberField({value,onChange,...props}){
 const [draft,setDraft]=useState(null);
 return <input {...props} type="number" step="any" value={draft??value} onFocus={()=>setDraft(String(value))} onBlur={()=>setDraft(null)} onChange={e=>{setDraft(e.target.value);if(e.target.value!==''&&Number.isFinite(Number(e.target.value)))onChange(Number(e.target.value));}}/>;
}
export default function SignArtworkPlacement({sign,onChange,config={},resizeSurface}){
 const [,select]=useSignEditorSelection(sign),b=artworkBounds(sign);
 if(!b)return null;
 const update=change=>onChange(placeArtwork(sign,change));
 const surface=changes=>{const next=resizeSurface?resizeSurface(changes):{...sign,...changes};onChange(placeArtwork(next));};
 return <div className="jsf-artwork-placement" onFocus={()=>select({kind:'artwork',index:0,panel:0},{focusPreview:true})}>
  <div className="jsf-artwork-size">
   <label>Motivets bredd (mm)<NumberField min="0.1" max={sign.widthMm} value={Number(b.width.toFixed(3))} onChange={widthMm=>update({widthMm})}/></label>
   <label>Motivets höjd (mm)<NumberField min="0.1" max={sign.heightMm} value={Number(b.height.toFixed(3))} onChange={heightMm=>update({heightMm})}/></label>
  </div>
  <div className="jsf-artwork-actions"><button type="button" onClick={()=>onChange({...sign,artworkPlacement:undefined})}>Anpassa till skylten</button><button type="button" onClick={()=>update({xMm:(Number(sign.widthMm)-b.width)/2,yMm:(Number(sign.heightMm)-b.height)/2})}>Centrera motivet</button></div>
  <details><summary>Placering</summary><SignPositionFields sign={sign} kind="artwork" index={0} onChange={onChange}/></details>
  {!config.fixedDimensions&&<details><summary>Skyltens mått</summary><div className="jsf-artwork-size"><label>Skyltens bredd (mm)<NumberField min={config.minWidthMm||1} max={config.maxWidthMm||5000} value={sign.widthMm} onChange={widthMm=>{if(widthMm>=(config.minWidthMm||1)&&widthMm<=(config.maxWidthMm||5000))surface({widthMm});}}/></label><label>Skyltens höjd (mm)<NumberField min={config.minHeightMm||1} max={config.maxHeightMm||5000} value={sign.heightMm} onChange={heightMm=>{if(heightMm>=(config.minHeightMm||1)&&heightMm<=(config.maxHeightMm||5000))surface({heightMm});}}/></label></div></details>}
 </div>;
}
