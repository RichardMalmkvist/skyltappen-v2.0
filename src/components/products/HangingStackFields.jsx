import {roadSignModel} from '../../data/roadSignModels';
import {ROAD_SIGN_GAP_MM} from '../../data/roadSignAssembly';
import {isParkingPole} from '../../data/parkingPole';
import {newDibondSign} from '../../data/dibondHelpers';
import {useEffect,useRef,useState} from 'react';
import Field from '../forms/Field';
import {DEFAULT_FIELD_ORDER,renderConfiguredField} from '../../data/formFieldHelpers';
import {hasBadgeField} from '../../data/productHelpers';
import {getHangingSignInitialForm} from '../../data/formDefaults';
import {MAX_STACK_SIGNS,isHanging,hangingStackEntries,repackHangingStack,hangingProductSnapshot} from '../../data/hangingStack';
import './HangingStackFields.css';
import './DibondFields.css';
export default function HangingStackFields({product,form,setForm,articles,onRootChange,symbolCredential}){
 const road=Boolean(roadSignModel(product)),initial=article=>isParkingPole(article)?{poleHeightMm:3150}:roadSignModel(article)?{dibondSign:newDibondSign(article)}:getHangingSignInitialForm(article);
 const [active,setActive]=useState(0),entries=hangingStackEntries(product,form,articles),selected=Math.min(active,entries.length-1),entry=entries[selected],gap=road?ROAD_SIGN_GAP_MM:form.hangingStack?.gapMm??10;
 useEffect(()=>{
  if(road&&form.hangingStack&&form.hangingStack.gapMm!==ROAD_SIGN_GAP_MM)setForm(previous=>({...previous,hangingStack:{...previous.hangingStack,gapMm:ROAD_SIGN_GAP_MM}}));
 },[road,form.hangingStack,setForm]);
 const changeForm=updater=>setForm(previous=>{
  const current=hangingStackEntries(product,previous,articles)[selected],next=typeof updater==='function'?updater(current.form):updater;
  return selected===0?{...previous,...next}:{...previous,hangingStack:{...previous.hangingStack,items:previous.hangingStack.items.map((item,index)=>index===selected-1?{...item,configuration:next}:item)}};
 });
 const repack=(next,index)=>{const packed=repackHangingStack(next,gap);onRootChange(packed.product,road?{...packed.form,...(form.roadAssemblyTopMm!==undefined?{roadAssemblyTopMm:form.roadAssemblyTopMm}:{})}:packed.form);setActive(index);};
 const add=(chosen=road&&isParkingPole(entry.product)?entries.find(e=>roadSignModel(e.product)).product:entry.product)=>{const id=globalThis.crypto?.randomUUID?.()||'part-'+Date.now();const item={id,articleId:chosen.id,product:hangingProductSnapshot(chosen),configuration:initial(chosen)};setForm(previous=>({...previous,hangingStack:{gapMm:road?ROAD_SIGN_GAP_MM:previous.hangingStack?.gapMm??10,items:[...(previous.hangingStack?.items||[]),item]}}));setActive(entries.length);};
 const menu=useRef(null);
 const closeMenu=()=>{if(menu.current)menu.current.open=false;};
 const selectEntry=index=>{closeMenu();setActive(index);};
 const moveTarget=direction=>{if(road&&isParkingPole(entry.product))return -1;let target=selected+direction;while(target>=0&&target<entries.length&&road&&isParkingPole(entries[target].product))target+=direction;return target>=0&&target<entries.length?target:-1;};
 const move=direction=>{closeMenu();const next=[...entries],target=moveTarget(direction);if(target<0)return;[next[selected],next[target]]=[next[target],next[selected]];repack(next,target);};
 const inputStyle={width:'100%',boxSizing:'border-box',padding:'10px 12px',border:'1px solid #dcd8d2',borderRadius:3,font:'inherit'};
 return <div className="jsf-hanging-stack-fields">
  {road?<div className="jsf-road-stack-toolbar jsf-editor-calm"><div className="jsf-editor-panel-bar">
   <label><span>Skyltfält</span><select aria-label="Välj skyltfält" value={selected} onChange={event=>selectEntry(Number(event.target.value))}>{entries.map((item,index)=><option key={item.id} value={index}>{isParkingPole(item.product)?'Stolpe 1503':`Skyltfält ${entries.slice(0,index+1).filter(e=>!isParkingPole(e.product)).length} av ${entries.filter(e=>!isParkingPole(e.product)).length}`}</option>)}</select></label>
   <button className="jsf-editor-panel-add" type="button" disabled={entries.length>=MAX_STACK_SIGNS} aria-label="Lägg till skyltfält nedanför" title="Lägg till skyltfält nedanför" onClick={()=>add()}>+</button>
   <details className="jsf-editor-menu" ref={menu}><summary aria-label="Skyltfältets alternativ" title="Skyltfältets alternativ"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" fill="currentColor"><circle cx="3" cy="9" r="1"/><circle cx="9" cy="9" r="1"/><circle cx="15" cy="9" r="1"/></svg></summary><div className="jsf-editor-menu-popover">
    {!entries.some(e=>isParkingPole(e.product))&&articles.some(isParkingPole)&&<button type="button" disabled={entries.length>=MAX_STACK_SIGNS} onClick={()=>{closeMenu();add(articles.find(isParkingPole));}}>Lägg till stolpe 1503</button>}
    <button type="button" disabled={moveTarget(-1)<0} onClick={()=>move(-1)}>Flytta skyltfält upp</button>
    <button type="button" disabled={moveTarget(1)<0} onClick={()=>move(1)}>Flytta skyltfält ner</button>
    <button className="jsf-editor-delete" type="button" disabled={entries.length===1||(!isParkingPole(entry.product)&&entries.filter(e=>!isParkingPole(e.product)).length===1)} onClick={()=>{closeMenu();repack(entries.filter((_,i)=>i!==selected),Math.max(0,selected-1));}}>Ta bort {isParkingPole(entry.product)?'stolpe':'skyltfält'}</button>
   </div></details>
  </div></div>:<div className="jsf-stack-tabs" role="group" aria-label="Skyltar i samma upphängning">{entries.map((item,index)=><button type="button" key={item.id} aria-pressed={index===selected} onClick={()=>setActive(index)}>{isParkingPole(item.product)?"Stolpe":"Skylt "+(index+1)}</button>)}</div>}
  {!road&&<div className="jsf-stack-actions"><button type="button" disabled={entries.length>=MAX_STACK_SIGNS} onClick={()=>add()}>+ Lägg till skylt under</button><button type="button" aria-label="Flytta vald skylt upp" disabled={selected===0} onClick={()=>move(-1)}>↑</button><button type="button" aria-label="Flytta vald skylt ner" disabled={selected===entries.length-1} onClick={()=>move(1)}>↓</button><button type="button" disabled={entries.length===1} onClick={()=>repack(entries.filter((_,i)=>i!==selected),Math.max(0,selected-1))}>Ta bort vald skylt</button></div>}
  {road&&entries.some(e=>isParkingPole(e.product))&&<label>Översta skylten från stolpens överkant (mm)<input type="number" min="0" max="5000" value={form.roadAssemblyTopMm??100} onChange={e=>setForm(previous=>({...previous,roadAssemblyTopMm:e.target.value}))}/></label>}
  {!road&&entries.length>1&&<label>Mellanrum mellan skyltarna (mm)<input type="number" min="0" max="500" step="any" value={gap} onChange={e=>setForm(previous=>({...previous,hangingStack:{...previous.hangingStack,gapMm:e.target.value}}))}/></label>}
  <label>Artikel för skylt {road?entries.slice(0,selected+1).filter(e=>!isParkingPole(e.product)).length:selected+1}<select value={entry.product?.id||''} onChange={e=>{const chosen=articles.find(a=>String(a.id)===e.target.value),next=[...entries];next[selected]={...entry,product:chosen,form:initial(chosen)};repack(next,selected);}}>{articles.filter(a=>road?isParkingPole(entry.product)?isParkingPole(a):Boolean(roadSignModel(a)):isHanging(a)).map(a=><option key={a.id} value={a.id}>{a.articleNumber} · {a.name} · {a.format}</option>)}</select></label>
  {road&&isParkingPole(entry.product)&&<>
   <label>Antal stolpar<select value={entry.form.poleCount??1} onChange={e=>changeForm(old=>({...old,poleCount:Number(e.target.value)}))}><option value="1">En stolpe – centrerad</option><option value="2">Två stolpar</option></select></label>
   {Number(entry.form.poleCount)===2&&<div className="jsf-dibond-dimensions">
    <label>Stolpcentrum från vänster ytterkant (mm)<input type="number" min="30" step="any" value={entry.form.poleLeftInsetMm??100} onChange={e=>changeForm(old=>({...old,poleLeftInsetMm:e.target.value}))}/></label>
    <label>Stolpcentrum från höger ytterkant (mm)<input type="number" min="30" step="any" value={entry.form.poleRightInsetMm??100} onChange={e=>changeForm(old=>({...old,poleRightInsetMm:e.target.value}))}/></label>
   </div>}
  </>}
  {entry.product&&DEFAULT_FIELD_ORDER.filter(key=>key!=='quantity'&&hasBadgeField(entry.product,key)).map(key=>renderConfiguredField(key,{Field,selectedBadge:entry.product,productForm:entry.form,updateFormValue:(name,value)=>changeForm(old=>({...old,[name]:value})),setProductForm:changeForm,inputStyle,hideHelp:true,symbolCredential}))}
 </div>;
}
