import SignPositionFields from './SignPositionFields';
import {useEffect,useId,useState} from 'react';
import {fetchDibondSymbols,getDibondSymbols,dibondSymbolPreviewUrl} from '../../data/dibondSymbols';
import {DIBOND_MARGIN_MM,DIBOND_FRAME_MM,positionDibondSymbolCenter,resizeDibondSymbol} from '../../data/dibondHelpers';

export default function DibondSymbolFields({sign,onChange,credential,compact=false,selectedIndex=null,onSelect,pickerOpen=false,onPickerChange}){
 const [library,setLibrary]=useState(()=>getDibondSymbols()),[error,setError]=useState(''),[loading,setLoading]=useState(true),[showPicker,setShowPicker]=useState(()=>Boolean(sign.symbols?.length));
 useEffect(()=>{
  let active=true;const changed=()=>{if(active)setLibrary(getDibondSymbols());};
  window.addEventListener('jsf-dibond-symbols-changed',changed);
  fetchDibondSymbols(credential).then(()=>{if(active){changed();setError('');}}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;window.removeEventListener('jsf-dibond-symbols-changed',changed);};
 },[credential]);
 const symbols=sign.symbols||[];
 const pickerId=useId(),pickerVisible=compact?pickerOpen:showPicker;
 const choices=[...library];
 for(const selected of symbols)if(!choices.some(item=>item.id===selected.symbolId))choices.push({id:selected.symbolId,name:selected.name,image:selected.image,aspectRatio:selected.aspectRatio});
 function duplicate(symbol){
  if(symbols.length>=20)return;
  const x=Math.max(DIBOND_FRAME_MM,Math.min(Number(symbol.xMm)+5,Number(sign.widthMm)-DIBOND_FRAME_MM-Number(symbol.sizeMm)*Number(symbol.aspectRatio||1)));
  const y=Math.max(DIBOND_FRAME_MM,Math.min(Number(symbol.yMm)+5,Number(sign.heightMm)-DIBOND_FRAME_MM-Number(symbol.sizeMm)));
  onSelect?.(symbols.length);
  onChange({symbols:[...symbols,{...symbol,id:globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`,xMm:x,yMm:y}]});
 }
 const change=(id,patch)=>onChange({symbols:symbols.map(symbol=>symbol.id===id?{...symbol,...patch}:symbol)});
 function add(symbol){
  if(compact&&symbols.some(item=>item.symbolId===symbol.id)){onSelect?.(symbols.findIndex(item=>item.symbolId===symbol.id));onPickerChange?.(false);return;}
  if(symbols.some(item=>item.symbolId===symbol.id)){onChange({symbols:symbols.filter(item=>item.symbolId!==symbol.id)});return;}
  if(symbols.length>=20)return;
  const ratio=Number(symbol.aspectRatio)||1,size=Math.max(1,Math.min(30,(Number(sign.widthMm)-2*DIBOND_MARGIN_MM)/ratio,Number(sign.heightMm)-2*DIBOND_MARGIN_MM));
  onSelect?.(symbols.length);if(compact)onPickerChange?.(false);
  onChange({symbols:[...symbols,{id:globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`,symbolId:symbol.id,name:symbol.name,image:symbol.image,aspectRatio:ratio,sizeMm:Number(size.toFixed(2)),xMm:DIBOND_MARGIN_MM,yMm:DIBOND_MARGIN_MM}]});
 }
 return <section className={compact?"jsf-sign-symbol-inspector":"jsf-dibond-symbols"} aria-label="Symboler på Dibondskylten">
  {!compact&&<button className="jsf-dibond-symbol-toggle" type="button" disabled={loading} aria-label="Symboler" aria-controls={pickerId} aria-expanded={showPicker} aria-pressed={showPicker} onClick={()=>setShowPicker(value=>!value)}><span aria-hidden="true">{showPicker?"✓":"+"}</span>Symboler</button>}
  {pickerVisible&&<div id={pickerId} className="jsf-dibond-symbol-picker" role="group" aria-label="Välj symboler till Dibondskylten">{choices.map(symbol=>{const selected=symbols.some(item=>item.symbolId===symbol.id);return <button type="button" key={symbol.id} aria-label={symbol.name} aria-pressed={selected} disabled={!selected&&symbols.length>=20} onClick={()=>add(symbol)}>{selected&&<span className="jsf-dibond-symbol-check" aria-hidden="true">✓</span>}<img src={dibondSymbolPreviewUrl(symbol.image)} alt=""/><span>{symbol.name}</span></button>;})}{!choices.length&&<p className="jsf-dibond-symbol-empty">{loading?'Hämtar symboler…':compact?'Inga symboler tillgängliga just nu.':'Lägg till symbolbilder under Symboler → Dibondskyltar.'}</p>}</div>}
  {symbols.map((symbol,index)=>{if(compact&&index!==selectedIndex)return null;return <section key={symbol.id} className={compact?"jsf-sign-symbol-details":"jsf-dibond-symbol"} aria-label={`Symbol ${index+1}: ${symbol.name}`}>
   <div className="jsf-dibond-line-heading"><span>{symbol.name}</span><div className="jsf-dibond-symbol-row-actions"><button type="button" disabled={symbols.length>=20} aria-label={`Duplicera symbol ${index+1}`} onClick={()=>duplicate(symbol)}>Duplicera</button>{!compact&&<button type="button" aria-label={`Ta bort symbol ${index+1}`} onClick={()=>onChange({symbols:symbols.filter(item=>item.id!==symbol.id)})}>Ta bort</button>}</div></div>
   <div className="jsf-sign-symbol-size"><label>Höjd (mm)<input aria-label={`Symbol ${index+1} höjd (mm)`} type="number" min="1" max={sign.heightMm} step="any" value={symbol.sizeMm} onChange={e=>change(symbol.id,resizeDibondSymbol(symbol,e.target.value))}/></label></div><details className="jsf-sign-fine" open={compact?undefined:true}><summary>Finjustera symbolen</summary><div className="jsf-dibond-symbol-controls">
    
    <SignPositionFields sign={sign} kind="symbol" index={index} onChange={next=>onChange({symbols:next.symbols})}/></div>
   <div className="jsf-dibond-symbol-arrows" role="group" aria-label={`Flytta symbol ${index+1}`}>
    {[['←',-1,0,'vänster'],['→',1,0,'höger'],['↑',0,-1,'upp'],['↓',0,1,'ner']].map(([arrow,x,y,label])=><button type="button" key={arrow} aria-label={`Flytta symbol ${index+1} ${label} 1 mm`} onClick={()=>change(symbol.id,{xMm:Number(symbol.xMm)+x,yMm:Number(symbol.yMm)+y})}>{arrow}</button>)}
   </div>
   <div className="jsf-dibond-symbol-centering" role="group" aria-label={`Centrera symbol ${index+1}`}>
    <button type="button" aria-label={`Centrera symbol ${index+1} i sidled`} onClick={()=>change(symbol.id,positionDibondSymbolCenter(symbol,{xMm:Number(sign.widthMm)/2}))}>Centrera i sidled</button>
    <button type="button" aria-label={`Centrera symbol ${index+1} i höjdled`} onClick={()=>change(symbol.id,positionDibondSymbolCenter(symbol,{yMm:Number(sign.heightMm)/2}))}>Centrera i höjdled</button>
    <button type="button" aria-label={`Centrera symbol ${index+1} på skylten`} onClick={()=>change(symbol.id,positionDibondSymbolCenter(symbol,{xMm:Number(sign.widthMm)/2,yMm:Number(sign.heightMm)/2}))}>Centrera på skylten</button>
   </div>
  </details></section>;})}
  {error&&<p className="jsf-field-error" role="alert">{error}</p>}
 </section>;
}
