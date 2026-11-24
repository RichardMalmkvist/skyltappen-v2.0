import {lazy,Suspense,useCallback,useEffect,useRef,useState} from 'react';
import {isRoadSupplement} from '../../data/roadSupplement';
import {roadSignModel} from '../../data/roadSignModels';
import {product3DView} from '../../data/product3DView';
import {newDibondSign} from '../../data/dibondHelpers';
import FittedProductPreview from '../products/FittedProductPreview';
import './ProjectProduct3DPreview.css';

function Unavailable({onUnavailable}){useEffect(()=>{onUnavailable?.();},[onUnavailable]);return null;}
const viewer=load=>lazy(()=>load().catch(()=>({default:Unavailable})));
// These are the same viewers, materials and live textures as the storefront.
const Pole=viewer(()=>import('../products/ParkingPole3D'));
const RoadAssembly=viewer(()=>import('../products/RoadAssembly3D'));
const Outdoor=viewer(()=>import('../products/OutdoorStand3D'));
const Hanging=viewer(()=>import('../products/HangingSign3D'));
const Flag=viewer(()=>import('../products/FlagSign3D'));
const Badge=viewer(()=>import('../products/NameBadge3D'));
const Editable=viewer(()=>import('../products/EditableDecal3D'));
const Bent=viewer(()=>import('../products/BentMetal3D'));
const Decal=viewer(()=>import('../products/ThinDecal3D'));
const Door=viewer(()=>import('../products/DoorSign3D'));

export default function ProjectProduct3DPreview({product,form,onChange,children,readOnly=false}){
 const source=useRef(null),[unavailable,setUnavailable]=useState(false),[front,setFront]=useState(0),[slide,setSlide]=useState(1);
 const kind=product3DView(product,form),enabled=Boolean(kind)&&!unavailable;
 const fallback=useCallback(()=>setUnavailable(true),[]);
 useEffect(()=>{if(product.previewType==='dibond_sign'&&!form.dibondSign&&!readOnly)onChange?.({dibondSign:newDibondSign(product)});},[product,form.dibondSign,onChange,readOnly]);
 const signChange=sign=>!readOnly&&onChange?.(product.previewType==='parking_sign'?{parkingSymbols:sign.symbols}:{dibondSign:sign});
 const props={product,form,sourceRef:source,onUnavailable:fallback};
 const number=String(product.articleNumber||'');
 const direct=!readOnly&&(!roadSignModel(product)||isRoadSupplement(product))&&['outdoor','editable','bent'].includes(kind);
 const editText=()=>{if(readOnly)return;source.current?.closest('.jsf-sign-config-grid')?.querySelector('.jsf-sign-fields textarea,.jsf-sign-fields input[type="text"]')?.focus();};
 return <div className="jsf-project-3d-preview" data-project-3d={enabled?kind:undefined}>
  <div ref={source} className="jsf-project-3d-source" data-three={enabled||undefined} aria-hidden={enabled||undefined}><FittedProductPreview>{children}</FittedProductPreview></div>
  {direct&&enabled&&<button type="button" className="jsf-project-3d-front" onClick={()=>setFront(value=>value+1)}>◇ Redigera framifrån</button>}
  {enabled&&<Suspense fallback={<p className="jsf-door-3d-status" role="status">Laddar 3D-vyn…</p>}>
   {kind==='road-assembly'?<RoadAssembly {...props}/>:kind==='pole'?<Pole {...props}/>:kind==='outdoor'?<Outdoor {...props} frontViewRequest={front} onSignChange={signChange}/>
    :kind==='hanging'?<Hanging {...props}/>
    :kind==='flag'?<Flag {...props} articleNumber={number} image={product.image||product.images?.[0]}/>
    :kind==='badge'?<Badge {...props}/>
    :kind==='editable'?<Editable {...props} articleNumber={number} frontViewRequest={front} onSignChange={signChange}/>
    :kind==='bent'?<Bent {...props} articleNumber={number} frontViewRequest={front} onSignChange={signChange}/>
    :kind==='decal'?<Decal {...props} articleNumber={number} image={product.image||product.images?.[0]}/>
    :<Door {...props} articleNumber={number.padStart(4,'0')} slidePosition={slide} onSlide={setSlide} onEdit={editText}/>}
  </Suspense>}
 </div>;
}
