import OptionSwitch from '../forms/OptionSwitch';
import './HangingSymbolFields.css';
import {useState} from 'react';
import {getHangingSignSymbols,getHangingSignSymbolKind} from '../../data/hangingSignSymbols';
import {isGreenHanging} from '../../data/hangingTargetRules';
import {isDoubleLineHangingSign} from '../../data/hangingSignBackText';
const control={font:'inherit',fontSize:12,padding:'10px 12px',border:'1px solid #dcd8d2',borderRadius:3,background:'#fff',color:'#494540'};
export default function HangingSymbolFields({selectedBadge,productForm,updateFormValue,fieldId="hangingSignSymbols"}) {
 const [activeRow,setActiveRow]=useState(1);
 const legacy=productForm.hangingSignSymbol&&productForm.hangingSignSymbol!=='none'?[productForm.hangingSignSymbol]:[];
 const value=Array.isArray(productForm.hangingSignSymbols)?productForm.hangingSignSymbols:legacy;
 const library=getHangingSignSymbols({includeInactive:true}),kindOf=id=>getHangingSignSymbolKind(library.find(s=>s.id===id)||{id});
 const rows=Number(productForm.hangingTargetRows)===2?2:1,assignments=productForm.hangingTargetRowAssignments||{};
 const setSelection=next=>{updateFormValue('hangingSignSymbols',next);updateFormValue('hangingSignSymbol',next.find(Boolean)||'none');};
 return <div className="jsf-hanging-symbol-fields" id={fieldId} tabIndex={-1} style={{display:'grid',gap:14}}>{[{kind:'symbol',label:'Symboler',stateKey:'hangingUseSymbols'},{kind:'target',label:'Målpunkter',stateKey:'hangingUseTargets'}].filter(g=>!isGreenHanging(selectedBadge)||g.kind==='target').map(({kind,label,stateKey})=>{
  const symbols=library.filter(s=>getHangingSignSymbolKind(s)===kind&&(s.active!==false||value.includes(s.id)));
  const expanded=typeof productForm[stateKey]==='boolean'?productForm[stateKey]:value.some(id=>kindOf(id)===kind);
  return <div key={kind} style={{display:'grid',gap:10}}>
   <OptionSwitch label={label} checked={expanded} onChange={checked=>{updateFormValue(stateKey,checked);if(!checked){setSelection(value.filter(id=>kindOf(id)!==kind));if(kind==='target')updateFormValue('hangingSignWithoutText',false);}}}/>
   {expanded&&<>
    {kind==='target'&&!selectedBadge.hangingSignTextOnly&&<div style={{display:'grid',gap:12}}>
     <label style={{display:'grid',gap:6,fontSize:12}}>Målpunkternas placering<select aria-label="Målpunkternas placering" style={control} value={productForm.hangingTargetPosition||'right'} onChange={e=>updateFormValue('hangingTargetPosition',e.target.value)}><option value="right">Höger sida</option><option value="left">Från textens vänsterkant</option></select></label>
     <OptionSwitch label="Utan text på skylten" checked={productForm.hangingSignWithoutText} onChange={checked=>updateFormValue('hangingSignWithoutText',checked)}/>
     {isDoubleLineHangingSign(selectedBadge,productForm)&&<label style={{display:'grid',gap:6,fontSize:12}}>Antal rader för målpunkter<select aria-label="Antal rader för målpunkter" style={control} value={rows} onChange={e=>{const next=Number(e.target.value),targets=value.filter(id=>kindOf(id)==='target');updateFormValue('hangingTargetRows',next);updateFormValue('hangingTargetRowAssignments',Object.fromEntries(targets.map((id,i)=>[id,next===2&&i>=Math.ceil(targets.length/2)?2:1])));setActiveRow(1);}}><option value="1">En rad</option><option value="2">Två rader</option></select></label>}
     {rows===2&&isDoubleLineHangingSign(selectedBadge,productForm)&&<div role="group" aria-label="Välj målpunktens rad" style={{display:'flex',gap:8}}>{[1,2].map(row=><button key={row} type="button" aria-pressed={activeRow===row} onClick={()=>setActiveRow(row)} style={{...control,background:activeRow===row?'#eee':'#fff'}}>Rad {row}</button>)}</div>}
    </div>}
    <div role="group" aria-label={label} style={{display:'flex',flexWrap:'wrap',gap:10}}>{symbols.map(symbol=>{const active=value.includes(symbol.id),row=Number(assignments[symbol.id])===2?2:1;return <button key={symbol.id} type="button" aria-label={symbol.name} aria-pressed={active} onClick={()=>{
     if(kind==='target'&&rows===2&&active&&row!==activeRow){updateFormValue('hangingTargetRowAssignments',{...assignments,[symbol.id]:activeRow});return;}
     setSelection(active?value.filter(id=>id!==symbol.id):[...value,symbol.id]);if(kind==='target')updateFormValue('hangingTargetRowAssignments',{...assignments,[symbol.id]:rows===2?activeRow:1});
    }} style={{...control,position:'relative',width:94,minHeight:104,padding:10,display:'grid',gridTemplateRows:'58px auto',justifyItems:'center',gap:8,background:active?'#f0f0f0':'#fff'}}>
     {active&&<span style={{position:'absolute',top:3,right:4,fontSize:10}}>{kind==='target'&&rows===2?`Rad ${row}`:'✓'}</span>}<img src={symbol.image} alt="" style={{width:54,height:54,objectFit:'contain'}}/><span>{symbol.name}</span>
    </button>;})}</div>
    {!symbols.length&&<div style={{fontSize:12,color:'#77716a'}}>Inga {kind==='target'?'målpunkter':'symboler'} tillgängliga.</div>}
   </>}
  </div>;
 })}</div>;
}
