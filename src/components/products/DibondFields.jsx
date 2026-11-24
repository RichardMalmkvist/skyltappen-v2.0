import {isRoadSupplement,ROAD_SUPPLEMENT_HEIGHTS} from '../../data/roadSupplement';
import SignArtworkPlacement from './SignArtworkPlacement';
import {roadSignModel} from '../../data/roadSignModels';
import RoadSignMotif from './RoadSignMotif';
import SignArtworkField from './SignArtworkField';
import SignPositionFields from './SignPositionFields';
import OptionSwitch from '../forms/OptionSwitch';
import {useCallback,useEffect,useId,useRef,useState} from 'react';
import DirectionSignFields from './DirectionSignFields';
import OutdoorSignFields from './OutdoorSignFields';
import {MAX_SEPARATORS,dibondSeparators,setDibondSeparatorOffset} from '../../data/dibondSeparators';
import {supportsAcrylicPocket,newAcrylicPocket,A4_WIDTH_MM,A4_HEIGHT_MM} from '../../data/acrylicPocket';
import DibondSymbolFields from './DibondSymbolFields';
import useSignEditorSelection from './useSignEditorSelection';
import {isFoldedAluminium} from '../../data/aluminiumArticles';
import {resizeDibondDimensions,dibondCornerRadius,getDibondConfig,newDibondSign,validateDibondSign,getDibondBlockBottoms,withDibondAbsolutePositions} from '../../data/dibondHelpers';
import './DibondFields.css';
export default function DibondFields(props){
 const sign=props.form.dibondSign||newDibondSign(props.product);
 if(isRoadSupplement(props.product))return <RoadSupplementEditor {...props} sign={sign}/>;
 if(roadSignModel(props.product)&&!isRoadSupplement(props.product))return <RoadSignMotif product={props.product} sign={sign} onChange={props.onChange} credential={props.symbolCredential}/>;
 const artworkField=props.panelOnly||isRoadSupplement(props.product)?null:<SignArtworkField value={sign.uploadedArtwork} credential={props.symbolCredential} onChange={art=>props.onChange({dibondSign:{...sign,uploadedArtwork:art,artworkPlacement:undefined}})}/>;
 if(sign.uploadedArtwork&&!isRoadSupplement(props.product))return <div>{artworkField}<SignArtworkPlacement sign={sign} config={getDibondConfig(props.product)} resizeSurface={changes=>resizeDibondDimensions(props.product,sign,changes)} onChange={next=>props.onChange({dibondSign:next})}/>{sign.outdoorSign?.withPosts&&<label>Stolparnas totalhöjd (mm)<input type="number" min={Number(sign.heightMm)+100} max="4000" value={sign.outdoorSign.totalHeightMm} onChange={e=>props.onChange({dibondSign:{...sign,outdoorSign:{...sign.outdoorSign,totalHeightMm:e.target.value}}})}/></label>}</div>;
 if(sign.outdoorSign?.kind==='direction'&&!props.panelOnly)return <DirectionSignFields product={props.product} sign={sign} onChange={next=>props.onChange({dibondSign:next})} showHelp={props.showHelp} editorView={props.editorView} symbolCredential={props.symbolCredential}/>;
 return <>{artworkField}<SignInspector {...props} sign={sign}/></>;
}
function RoadSupplementEditor(props){
 const {sign,product,onChange}=props;
 useEffect(()=>{if(!sign.roadSupplement)onChange({dibondSign:{...newDibondSign(product),...sign,roadSupplement:true,frameEnabled:false,cornerRadiusMm:0}});},[sign,product,onChange]);
 const artworkField=<SignArtworkField value={sign.uploadedArtwork} credential={props.symbolCredential} onChange={art=>onChange({dibondSign:{...sign,uploadedArtwork:art,artworkPlacement:undefined}})}/>;
 return <>{artworkField}{sign.uploadedArtwork?<SignArtworkPlacement sign={sign} config={getDibondConfig(product)} resizeSurface={changes=>resizeDibondDimensions(product,sign,changes)} onChange={next=>onChange({dibondSign:next})}/>:<SignInspector {...props} sign={{...sign,roadSupplement:true}}/>}</>;
}
function SignInspector({product,sign,onChange,showHelp=true,symbolCredential,panelOnly=false,selectionScope=sign,selectionPanel=0,editorHeader,extraSettings,editorView}){
 const dynamic=isRoadSupplement(product);
 const c=getDibondConfig(product),absolute=withDibondAbsolutePositions(sign);
 const [selection,select]=useSignEditorSelection(selectionScope,{kind:'text',index:0,panel:selectionPanel});
 const [pickerOpen,setPickerOpen]=useState(false),[view,setView]=useState('content');
 useEffect(()=>{if(editorView)setView(editorView);},[editorView]);
 const root=useRef(null),addMenu=useRef(null),moreMenu=useRef(null),uid=useId();
 const closeMenus=useCallback(()=>{if(addMenu.current)addMenu.current.open=false;if(moreMenu.current)moreMenu.current.open=false;},[]);
 useEffect(()=>{const chosen=event=>{if(event.detail?.scope===selectionScope){setView('content');closeMenus();}};window.addEventListener('jsf-sign-editor-selection',chosen);return()=>window.removeEventListener('jsf-sign-editor-selection',chosen);},[selectionScope,closeMenus]);
 useEffect(()=>{const dismiss=event=>{for(const menu of root.current?.querySelectorAll('.jsf-editor-menu[open]')||[])if(event.type==='keydown'?event.key==='Escape':!menu.contains(event.target))menu.open=false;};document.addEventListener('pointerdown',dismiss);document.addEventListener('keydown',dismiss);return()=>{document.removeEventListener('pointerdown',dismiss);document.removeEventListener('keydown',dismiss);};},[]);
 const pick=(kind,index=0)=>{select({kind,index,panel:selectionPanel},{focusPreview:true});setPickerOpen(false);closeMenus();};
 const update=changes=>onChange({dibondSign:{...absolute,...changes}});
 const lineChange=(index,changes)=>update({lines:absolute.lines.map((line,i)=>i===index?{...line,...changes,lineSpacingMode:'uniform'}:line)});
 const bottoms=getDibondBlockBottoms(sign),defaultBottoms=getDibondBlockBottoms({...sign,textOffsetYMm:0,lines:sign.lines.map(line=>({...line,firstLineBottomMm:undefined,offsetYMm:0}))});
 const separators=dibondSeparators(sign),error=validateDibondSign(product,sign);
 const items=[...sign.lines.map((line,index)=>({kind:'text',index,label:'Textblock '+(index+1),description:line.text?.trim().replace(/\s+/g,' ')||'Tom text'})),...separators.map(line=>({kind:'separator',index:line.index,label:'Streck '+(line.index+1),description:'1 mm'})),...(sign.symbols||[]).map((symbol,index)=>({kind:'symbol',index,label:symbol.name||'Symbol '+(index+1),description:'Symbol'})),...(sign.acrylicPocket?.enabled?[{kind:'pocket',index:0,label:'Akrylficka A4',description:'210 × 297 mm'}]:[])];
 const active=items.find(item=>selection?.panel===selectionPanel&&item.kind===selection?.kind&&item.index===selection?.index)||items[0];
 const line=active?.kind==='text'?sign.lines[active.index]:null,index=active?.index??0;
 const separatorChange=(index,value)=>update(setDibondSeparatorOffset(absolute,index,value));
 const addText=()=>{pick('text',sign.lines.length);update({lines:[...absolute.lines,{text:'',sizeMm:sign.lines.at(-1)?.sizeMm||c.defaultTextSizeMm,bold:false,offsetYMm:0,lineSpacingMode:"uniform",lineGapMm:4}]});};
 const addSeparator=()=>{
  const index=!sign.separatorEnabled?0:(sign.additionalSeparators||[]).length+1;pick('separator',index);
  if(!sign.separatorEnabled){update({separatorEnabled:true,separatorOffsetYMm:0});return;}
  const limit=Number(sign.heightMm)/2-12.5,offset=Math.min(limit,Math.max(-limit,Number(separators.at(-1)?.offsetYMm||0)+30));
  update({additionalSeparators:[...(sign.additionalSeparators||[]),{offsetYMm:offset}]});
 };
 const removeActive=()=>{
  if(active.kind==='text')update({lines:absolute.lines.filter((_,i)=>i!==index)});
  if(active.kind==='separator')update(index===0?{separatorEnabled:false}:{additionalSeparators:sign.additionalSeparators.filter((_,i)=>i!==index-1)});
  if(active.kind==='symbol')update({symbols:sign.symbols.filter((_,i)=>i!==index)});
  if(active.kind==='pocket')update({acrylicPocket:{...sign.acrylicPocket,enabled:false}});
  pick('text',0);
 };
 return <div ref={root} data-external-view={editorView ? "true" : undefined} className="jsf-dibond-fields jsf-sign-inspector jsf-editor-calm">
  {editorHeader}
  <div className="jsf-editor-tabs" role="tablist" aria-label="Skyltredigering">{[['content','Innehåll'],['settings','Mått & utförande']].map(([key,label])=><button type="button" role="tab" key={key} id={uid+'-'+key+'-tab'} aria-selected={view===key} aria-controls={uid+'-'+key} tabIndex={view===key?0:-1} onKeyDown={event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?'content':event.key==='End'?'settings':view==='content'?'settings':'content';setView(next);document.getElementById(uid+'-'+next+'-tab')?.focus();}}} onClick={()=>{setView(key);closeMenus();}}>{label}</button>)}</div>
  <section className="jsf-editor-settings" id={uid+'-settings'} role="tabpanel" aria-labelledby={uid+'-settings-tab'} hidden={view!=='settings'}><div className="jsf-sign-section-body">
    {extraSettings}
    {!panelOnly&&<OutdoorSignFields product={product} sign={absolute} onChange={next=>onChange({dibondSign:next})}/>}
    {showHelp&&!dynamic&&<p>{c.fixedDimensions?`Fasta mått: ${c.defaultWidthMm} × ${c.defaultHeightMm} mm.`:`Valfria mått upp till ${c.maxWidthMm} × ${c.maxHeightMm} mm.`}</p>}
    {dynamic&&product.roadSupplementCustomSize?<p>{sign.widthMm} × {sign.heightMm} mm</p>:dynamic?<label>Höjd (mm)<select value={sign.heightMm} onChange={event=>onChange({dibondSign:resizeDibondDimensions(product,absolute,{heightMm:Number(event.target.value)})})}>{(product.roadSupplementCustomSize?[c.defaultHeightMm]:ROAD_SUPPLEMENT_HEIGHTS).map(height=><option key={height} value={height}>{height} mm</option>)}</select></label>:<div className="jsf-dibond-dimensions"><label>{sign.outdoorSign?"Skyltfältets bredd (mm)":"Bredd (mm)"}<input type="number" disabled={c.fixedDimensions} min={c.minWidthMm} max={c.maxWidthMm} step="1" value={sign.widthMm} onChange={e=>onChange({dibondSign:resizeDibondDimensions(product,absolute,{widthMm:e.target.value})})}/></label><label>{sign.outdoorSign?"Skyltfältets höjd (mm)":"Höjd (mm)"}<input type="number" disabled={c.fixedDimensions} min={c.minHeightMm} max={c.maxHeightMm} step="1" value={sign.heightMm} onChange={e=>onChange({dibondSign:resizeDibondDimensions(product,absolute,{heightMm:e.target.value})})}/></label></div>}
    
    {!dynamic&&!isFoldedAluminium(product)&&<div className="jsf-dibond-dimensions"><label>Hörnradie (mm)<input type="number" min="0" max={Math.min(Number(sign.widthMm),Number(sign.heightMm))/2} step="any" value={sign.cornerRadiusAuto?Number(dibondCornerRadius(product,sign).toFixed(3)):sign.cornerRadiusMm??dibondCornerRadius(product,sign)} onChange={e=>update({cornerRadiusAuto:true,cornerRadiusMm:e.target.value,cornerRadiusBaseWidthMm:Number(sign.widthMm),cornerRadiusBaseHeightMm:Number(sign.heightMm)})}/></label></div>}
    {!dynamic&&!isFoldedAluminium(product)&&<OptionSwitch label="Svart ram (4 mm)" checked={sign.frameEnabled!==false} onChange={checked=>update({frameEnabled:checked})}/>}

  </div></section>
  <div className="jsf-editor-content" role="tabpanel" id={uid+'-content'} aria-labelledby={uid+'-content-tab'} hidden={view!=='content'}>
  <section className="jsf-sign-content" aria-label="Skyltens innehåll"><div className="jsf-editor-object-bar"><label className="jsf-editor-object-select"><span>Redigera</span><select aria-label="Välj objekt att redigera" value={active?active.kind+':'+active.index:''} onChange={event=>{const [kind,index]=event.target.value.split(':');pick(kind,Number(index));}}>{items.map(item=><option key={item.kind+':'+item.index} value={item.kind+':'+item.index}>{item.label}{item.description&&item.description!=='Tom text'?' · '+item.description:''}</option>)}</select></label>
   <details className="jsf-editor-menu" ref={moreMenu}><summary aria-label="Objektalternativ" title="Objektalternativ">···</summary><div className="jsf-editor-menu-popover"><button type="button" className="jsf-editor-delete" disabled={!active||(active.kind==='text'&&sign.lines.length<=1)} aria-label={'Ta bort '+(active?.kind==='text'?'textblock '+(index+1):active?.kind==='separator'?'streck '+(index+1):active?.kind==='symbol'?'symbol '+(index+1):'akrylfickan')} onClick={removeActive}>Ta bort {active?.label.toLocaleLowerCase('sv')}</button></div></details>
   <details className="jsf-editor-menu jsf-editor-add-menu" ref={addMenu}><summary>+ Lägg till</summary>   <div className="jsf-sign-add jsf-editor-menu-popover" role="group" aria-label="Lägg till innehåll"><button type="button" disabled={sign.lines.length>=30} onClick={addText}>+ Text</button><button type="button" aria-expanded={pickerOpen} onClick={()=>{setPickerOpen(value=>!value);closeMenus();}}>+ Symbol</button><button type="button" disabled={separators.length>=MAX_SEPARATORS||(sign.additionalSeparators||[]).length>=MAX_SEPARATORS-1} onClick={addSeparator}>+ Streck</button>{supportsAcrylicPocket(product)&&!sign.acrylicPocket?.enabled&&<button type="button" onClick={()=>{pick('pocket');update({acrylicPocket:{...(sign.acrylicPocket||newAcrylicPocket(sign)),enabled:true}});}}>+ Akrylficka A4</button>}</div>
   </details></div>
  </section>
  {active&&active.kind!=='symbol'&&!pickerOpen&&<section className="jsf-sign-selected" aria-label={'Redigera '+active.label} onFocusCapture={()=>select({...active,panel:selectionPanel},{focusPreview:true})}>
   {line&&<><label className="jsf-editor-text-input"><span className="jsf-editor-visually-hidden">Text</span><textarea aria-label={'Text – rad '+(index+1)} rows="4" maxLength="200" value={line.text} onChange={e=>lineChange(index,{text:e.target.value})}/></label>
    <div className="jsf-sign-text-toolbar"><label>Texthöjd (mm)<input aria-label={'Texthöjd (mm) – rad '+(index+1)} type="number" min="1" max="500" step="any" value={line.sizeMm} onChange={e=>lineChange(index,{sizeMm:e.target.value})}/></label><label>Justering<select aria-label={'Textjustering – textblock '+(index+1)} value={line.align||'center'} onChange={e=>lineChange(index,{align:e.target.value})}><option value="left">Vänster</option><option value="center">Centrerad</option><option value="right">Höger</option></select></label>{!dynamic&&<label className="jsf-dibond-bold jsf-editor-bold" title="Fetstil"><input type="checkbox" aria-label={'Fetstil – rad '+(index+1)} checked={Boolean(line.bold)} onChange={e=>lineChange(index,{bold:e.target.checked})}/><span aria-hidden="true">B</span></label>}</div>
    <details className="jsf-sign-fine"><summary>Finjustera</summary><div className="jsf-dibond-dimensions"><label>Radavstånd (mm)<input aria-label={'Radavstånd (mm) – textblock '+(index+1)} type="number" min="0" max="500" step="0.5" value={line.lineGapMm??4} onChange={e=>lineChange(index,{lineGapMm:e.target.value})}/></label></div>
     <SignPositionFields key={index} sign={absolute} kind="text" index={index} onChange={next=>onChange({dibondSign:next})}/><label>Ovankant till underkant första raden (mm)<input aria-label={'Ovankant till underkant första raden – textblock '+(index+1)+' (mm)'} type="number" min="0" max={sign.heightMm} step="any" value={line.firstLineBottomMm??Number(bottoms[index].toFixed(2))} onChange={e=>lineChange(index,{firstLineBottomMm:e.target.value})}/></label>
     <div className="jsf-sign-nudge"><button type="button" aria-label={'Flytta textblock '+(index+1)+' upp 1 mm'} onClick={()=>lineChange(index,{firstLineBottomMm:Number((bottoms[index]-1).toFixed(2))})}>↑ 1 mm</button><button type="button" aria-label={'Flytta textblock '+(index+1)+' ner 1 mm'} onClick={()=>lineChange(index,{firstLineBottomMm:Number((bottoms[index]+1).toFixed(2))})}>↓ 1 mm</button><button type="button" aria-label={'Återställ textblock '+(index+1)} onClick={()=>lineChange(index,{offsetXMm:0,firstLineBottomMm:defaultBottoms[index]})}>Återställ placering</button></div>
    </details></>}
   {active.kind==='separator'&&<><p>Svart streck · 1 mm</p><details className="jsf-sign-fine"><summary>Finjustera</summary><label>Höjd från mitten (mm)<input aria-label={'Höjdplacering streck '+(index+1)+' (mm från mitten)'} type="number" step="any" value={separators.find(line=>line.index===index)?.offsetYMm??0} onChange={e=>separatorChange(index,e.target.value)}/></label><div className="jsf-sign-nudge"><button type="button" onClick={()=>separatorChange(index,Number(separators.find(line=>line.index===index)?.offsetYMm||0)-1)}>↑ 1 mm</button><button type="button" onClick={()=>separatorChange(index,Number(separators.find(line=>line.index===index)?.offsetYMm||0)+1)}>↓ 1 mm</button><button type="button" onClick={()=>separatorChange(index,0)}>Centrera strecket</button></div></details></>}
   {active.kind==='pocket'&&<><p>210 × 297 mm</p><details className="jsf-sign-fine"><summary>Finjustera</summary><div className="jsf-dibond-dimensions"><label>Från vänster (mm)<input type="number" min="4" max={Number(sign.widthMm)-4-A4_WIDTH_MM} step="any" value={sign.acrylicPocket.xMm} onChange={e=>update({acrylicPocket:{...sign.acrylicPocket,xMm:e.target.value}})}/></label><label>Från ovankant (mm)<input type="number" min="4" max={Number(sign.heightMm)-4-A4_HEIGHT_MM} step="any" value={sign.acrylicPocket.yMm} onChange={e=>update({acrylicPocket:{...sign.acrylicPocket,yMm:e.target.value}})}/></label></div><button type="button" onClick={()=>update({acrylicPocket:{...sign.acrylicPocket,xMm:(Number(sign.widthMm)-A4_WIDTH_MM)/2}})}>Centrera fickan i sidled</button></details></>}
  </section>}
  <DibondSymbolFields compact sign={sign} onChange={update} credential={symbolCredential} pickerOpen={pickerOpen} onPickerChange={setPickerOpen} selectedIndex={!pickerOpen&&active?.kind==='symbol'?index:null} onSelect={index=>pick('symbol',index)}/>
  </div>
  {error&&!error.startsWith('Skriv minst')&&<p role="alert" className="jsf-dibond-error jsf-field-error">{error}</p>}
 </div>;
}
