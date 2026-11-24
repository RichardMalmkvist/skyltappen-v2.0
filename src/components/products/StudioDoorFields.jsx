import OptionSwitch from '../forms/OptionSwitch';
import {hasBadgeField} from '../../data/productHelpers';
import {getDoorSignSymbols,getDoorSignSymbolById} from '../../data/doorSignSymbols';

// Compact storefront controls keep the existing order and production fields.
export default function StudioDoorFields({Field,selectedBadge,productForm:f,updateFormValue:set,inputStyle}){
 const numberPanel=String(selectedBadge.articleNumber)==='0610',dual=String(selectedBadge.articleNumber)==='0616';
 const symbols=getDoorSignSymbols({includeInactive:true}).filter(symbol=>symbol.active!==false||symbol.id===f.doorSymbol);
 const previous=getDoorSignSymbolById(f.doorSymbol);
 if(previous&&!symbols.some(symbol=>symbol.id===previous.id))symbols.push(previous);
 const toggle=(key,clearKey)=>{const enabled=!f[key];set(key,enabled);if(!enabled&&clearKey)set(clearKey,'');};
 const side=(key,label,fallback='right')=><div className="jsf-studio-door-row"><span>{label}</span><div className="jsf-studio-side-choice" role="group" aria-label={label}>{[['left','Vänster'],['right','Höger']].map(([value,name])=><button type="button" key={value} aria-pressed={(f[key]||fallback)===value} onClick={()=>set(key,value)}>{name}</button>)}</div></div>;
 const switchRow=(key,label,clearKey)=><OptionSwitch label={label} checked={f[key]} onChange={()=>toggle(key,clearKey)}/>;
 return <div className="jsf-studio-door-fields">
  <Field label={dual?"Text i överdelen":"Textrad 1"} htmlFor="doorHeading"><input id="doorHeading" type="text" style={inputStyle} value={f.doorHeading||f.customText||''} onChange={event=>{set('doorHeading',event.target.value);set('customText','');}}/></Field>
  {!dual&&<Field label={dual?"Text i mittdelen":"Textrad 2 (valfri)"} htmlFor="doorExtra"><textarea id="doorExtra" rows={(f.doorExtra||'').includes('\n')?2:1} style={inputStyle} value={f.doorUseLine2?f.doorExtra||'':f.customTextLine2||''} onChange={event=>{const value=event.target.value.replace(/\r\n?/g,'\n').split('\n').slice(0,2).join('\n');set('doorExtra',value);set('doorUseLine2',Boolean(value));set('customTextLine2','');}}/></Field>}
  {!numberPanel&&<><Field label={dual?"Namn i överdelen (valfritt)":"Namn (valfritt)"} htmlFor="doorName"><textarea id="doorName" rows={(f.doorName||'').includes('\n')?2:1} style={inputStyle} value={f.doorUseName?f.doorName||'':''} onChange={event=>{const value=event.target.value.split(/\r?\n/).slice(0,2).join('\n');set('doorName',value);set('doorUseName',Boolean(value.trim()));}}/></Field>
  <Field label={dual?"Titel i överdelen (valfri)":"Titel (valfri)"} htmlFor="doorTitle"><input id="doorTitle" type="text" style={inputStyle} value={f.doorUseTitle?f.doorTitle||'':''} onChange={event=>{set('doorTitle',event.target.value);set('doorUseTitle',Boolean(event.target.value.trim()));}}/></Field>
  </>}
  {dual&&<>
  <Field label={dual?"Text i mittdelen":"Textrad 2 (valfri)"} htmlFor="doorExtra"><textarea id="doorExtra" rows={(f.doorExtra||'').includes('\n')?2:1} style={inputStyle} value={f.doorUseLine2?f.doorExtra||'':f.customTextLine2||''} onChange={event=>{const value=event.target.value.replace(/\r\n?/g,'\n').split('\n').slice(0,2).join('\n');set('doorExtra',value);set('doorUseLine2',Boolean(value));set('customTextLine2','');}}/></Field>
   <Field label="Namn i mittdelen (valfritt)" htmlFor="doorMiddleName"><textarea id="doorMiddleName" rows={(f.doorMiddleName||'').includes('\n')?2:1} style={inputStyle} value={f.doorMiddleName||''} onChange={e=>set('doorMiddleName',e.target.value.split(/\r?\n/).slice(0,2).join('\n'))}/></Field>
   <Field label="Titel i mittdelen (valfri)" htmlFor="doorMiddleTitle"><input id="doorMiddleTitle" type="text" style={inputStyle} value={f.doorMiddleTitle||''} onChange={e=>set('doorMiddleTitle',e.target.value)}/></Field>
  </>}
  {numberPanel&&<Field label="Stor siffra i mittdelen" htmlFor="doorNumber"><input id="doorNumber" type="text" inputMode="numeric" maxLength={4} value={f.doorNumber||''} style={inputStyle} onChange={e=>{set('doorNumber',e.target.value.replace(/\D/g,''));set('doorUseNumber',true);}}/></Field>}
  {!numberPanel&&hasBadgeField(selectedBadge,'doorNumber')&&<>{switchRow('doorUseNumber','Siffra','doorNumber')}{f.doorUseNumber&&<><Field label="Siffra på skylten" htmlFor="doorNumber"><input id="doorNumber" type="text" inputMode="numeric" pattern="[0-9]+" required value={f.doorNumber||''} style={inputStyle} onChange={event=>set('doorNumber',event.target.value.replace(/\D/g,''))}/></Field>{side('doorNumberSide','Siffrans placering','left')}</>}</>}
  {hasBadgeField(selectedBadge,'doorSymbol')&&<>{switchRow('doorUseSymbol','Symbol','doorSymbol')}{f.doorUseSymbol&&<><Field label="Välj symbol" htmlFor="doorSymbol"><select id="doorSymbol" required style={inputStyle} value={f.doorSymbol||''} onChange={event=>{set('doorSymbol',event.target.value);set('doorSymbolName',getDoorSignSymbolById(event.target.value)?.name||'');}}><option value="">Välj symbol</option>{symbols.map(symbol=><option value={symbol.id} key={symbol.id}>{symbol.name}</option>)}</select></Field>{!symbols.length&&<p className="jsf-studio-symbol-empty">Inga symboler finns tillgängliga.</p>}{side('doorSymbolSide','Placering')}</>}</>}
 </div>;
}
