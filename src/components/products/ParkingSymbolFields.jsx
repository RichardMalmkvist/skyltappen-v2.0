import {useRef,useState} from 'react';
import OptionSwitch from '../forms/OptionSwitch';
import DibondSymbolFields from './DibondSymbolFields';
import useSignEditorSelection from './useSignEditorSelection';
import {parkingSymbolSign,parkingConfig} from '../../data/parkingSign';
import './DibondFields.css';
export default function ParkingSymbolFields({product,form,onChange,credential}){
 const sign=parkingSymbolSign(product,form),scope=form.parkingSymbols||product;
 const [selection,select]=useSignEditorSelection(scope,{kind:'text',index:0,panel:0});
 const [pickerOpen,setPickerOpen]=useState(false),addMenu=useRef(null),moreMenu=useRef(null);
 const symbols=sign.symbols,active=selection?.kind==='symbol'&&symbols[selection.index]?selection:{kind:'text',index:0};
 const pick=(kind,index=0)=>{select({kind,index,panel:0});setPickerOpen(false);if(addMenu.current)addMenu.current.open=false;if(moreMenu.current)moreMenu.current.open=false;};
 const changeSymbols=({symbols:next})=>onChange('parkingSymbols',next.map(symbol=>{if(symbols.some(old=>old.id===symbol.id))return symbol;const c=parkingConfig(product);return {...symbol,xMm:Math.max(4,(sign.widthMm-Number(symbol.sizeMm)*Number(symbol.aspectRatio||1))/2),yMm:c.textAreaTopMm+Math.max(0,(c.textAreaHeightMm-Number(symbol.sizeMm))/2)};}));
 const text=[form.customTextLine1||'',...(form.parkingUseLine2||form.customTextLine2?[form.customTextLine2||'']:[])].join('\n');
 return <div className="jsf-dibond-fields jsf-sign-inspector jsf-editor-calm">
  <OptionSwitch label="Utan text" checked={form.parkingWithoutText} onChange={value=>onChange('parkingWithoutText',value)}/>
  <div className="jsf-editor-content"><section className="jsf-sign-content" aria-label="Skyltens innehåll"><div className="jsf-editor-object-bar">
   <label className="jsf-editor-object-select"><span>Redigera</span><select aria-label="Välj objekt att redigera" value={active.kind+':'+active.index} onChange={e=>{const [kind,index]=e.target.value.split(':');pick(kind,Number(index));}}><option value="text:0">Text</option>{symbols.map((symbol,index)=><option key={symbol.id} value={'symbol:'+index}>{symbol.name||'Symbol '+(index+1)}</option>)}</select></label>
   <details className="jsf-editor-menu" ref={moreMenu}><summary aria-label="Objektalternativ">···</summary><div className="jsf-editor-menu-popover"><button type="button" className="jsf-editor-delete" disabled={active.kind!=='symbol'} onClick={()=>{onChange('parkingSymbols',symbols.filter((_,i)=>i!==active.index));pick('text');}}>Ta bort symbol</button></div></details>
   <details className="jsf-editor-menu jsf-editor-add-menu" ref={addMenu}><summary>+ Lägg till</summary><div className="jsf-sign-add jsf-editor-menu-popover"><button type="button" onClick={()=>{onChange('parkingWithoutText',false);pick('text');}}>+ Text</button><button type="button" aria-expanded={pickerOpen} onClick={()=>{setPickerOpen(value=>!value);addMenu.current.open=false;}}>+ Symbol</button></div></details>
  </div></section>
  {active.kind==='text'&&!pickerOpen&&!form.parkingWithoutText&&<section className="jsf-sign-selected"><label className="jsf-editor-text-input"><span className="jsf-editor-visually-hidden">Text</span><textarea aria-label="Text" rows={4} value={text} onKeyDown={event=>{if(event.key==='Enter'&&event.currentTarget.value.includes('\n'))event.preventDefault();}} onChange={event=>{const lines=event.target.value.replace(/\r\n?/g,'\n').split('\n').slice(0,2).map(line=>line.slice(0,80));onChange('customTextLine1',lines[0]);onChange('customTextLine2',lines[1]||'');onChange('parkingUseLine2',lines.length>1);}}/></label></section>}
  <DibondSymbolFields compact sign={sign} credential={credential} onChange={changeSymbols} pickerOpen={pickerOpen} onPickerChange={setPickerOpen} selectedIndex={!pickerOpen&&active.kind==='symbol'?active.index:null} onSelect={index=>pick('symbol',index)}/>
  </div>
 </div>;
}
