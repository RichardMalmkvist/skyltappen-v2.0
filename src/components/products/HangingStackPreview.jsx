import {renderMeasuredHangingFace} from './BadgePreview';
import {hangingStackEntries,hangingDimensions} from '../../data/hangingStack';
import {isDoubleSidedHangingSign} from '../../data/hangingSignBackText';
export default function HangingStackPreview({product,form,articles=[],maxWidth=600,mini=false}){
 const entries=hangingStackEntries(product,form,articles,{preferSaved:true}),sizes=entries.map(e=>hangingDimensions(e.product||undefined)),maxMm=Math.max(...sizes.map(s=>s.width)),width=Math.min(maxWidth,mini?220:600),scale=width/maxMm,gap=Number(form.hangingStack?.gapMm??10)*scale,wireTop=Math.max(16,120*scale),back=entries.some(e=>e.product&&isDoubleSidedHangingSign(e.product));
 const anchors=(width-Math.min(...sizes.map(s=>s.width))*scale)/2+Math.min(...sizes.map(s=>s.width))*scale*.08;
 const face=isBack=><div data-hanging-stack-face={isBack?'back':'front'} style={{position:'relative',display:'flex',flexDirection:'column',alignItems:'center',gap,paddingTop:wireTop,width}}>
  {[anchors,width-anchors].map(x=><span key={x} aria-hidden="true" style={{position:'absolute',top:0,bottom:0,left:x,width:1,background:'#666',zIndex:0}}/>)}
  {entries.map((e,i)=><div key={e.id} data-hanging-stack-part={i+1} style={{position:'relative',zIndex:1}}>{e.product?renderMeasuredHangingFace({badge:e.product,productForm:isBack&&!isDoubleSidedHangingSign(e.product)?{hangingSignWithoutText:true,arrowPlacement:'none',leftArrowDirection:'none',rightArrowDirection:'none',hangingSignSymbols:[]}:e.form,maxWidth:sizes[i].width*scale,mini,back:isBack&&isDoubleSidedHangingSign(e.product),suspension:false,backLabel:false}):<span>Artikeln saknas</span>}</div>)}
 </div>;
 return <div data-hanging-stack="true" style={{display:'grid',justifyItems:'center',gap:22,width:'100%'}}>{back&&<small>Framsida</small>}{face(false)}{back&&<><small>Baksida</small>{face(true)}</>}</div>;
}
