import {useEffect,useState} from 'react';
import {newDibondSign,getDibondConfig} from '../../data/dibondHelpers';
import SignArtworkField from './SignArtworkField';
import SignArtworkPlacement from './SignArtworkPlacement';

// These articles have a fixed design maintained in Artiklar. The project only
// decides which articles are mounted together and where the assembly is placed.
export default function RoadSignMotif({product,sign,onChange,credential}){
 const [widthDraft,setWidthDraft]=useState(null);
 const artwork=product.defaultSignArtwork;
 const variable=product.roadSignVariableWidth===true;
 const width=product.dibondConfig?.defaultWidthMm,height=product.dibondConfig?.defaultHeightMm;
 const customContent=Boolean((!product.roadSignBlank&&sign.artworkPlacement)||sign.separatorEnabled||sign.additionalSeparators?.length||sign.symbols?.length||sign.lines?.some(line=>line.text?.trim()));
 useEffect(()=>{
  if((!product.roadSignBlank&&sign.uploadedArtwork?.id!==artwork?.id)||customContent||(!variable&&Number(sign.widthMm)!==Number(width))||Number(sign.heightMm)!==Number(height))onChange({dibondSign:{...newDibondSign(product),...(variable?{widthMm:Number(sign.widthMm)>=50&&Number(sign.widthMm)<=3000?Number(sign.widthMm):Number(width)}:{}),...(product.roadSignBlank&&sign.uploadedArtwork?{uploadedArtwork:sign.uploadedArtwork,artworkPlacement:sign.artworkPlacement}:{})}});
 },[artwork?.id,sign.uploadedArtwork,sign.artworkPlacement,customContent,sign.widthMm,sign.heightMm,width,height,product,onChange,variable]);
 if(product.roadSignBlank)return <>{variable&&<div className="jsf-dibond-dimensions"><label><span>Bredd (mm)</span><input type="number" min="50" max="3000" step="1" value={widthDraft??sign.widthMm} onFocus={()=>setWidthDraft(String(sign.widthMm))} onBlur={()=>setWidthDraft(null)} onChange={event=>{const value=event.target.value;setWidthDraft(value);if(value!==''&&Number(value)>=50&&Number(value)<=3000)onChange({dibondSign:{...sign,widthMm:Number(value),heightMm:200}});}}/></label><label><span>Höjd (mm)</span><input type="number" value="200" readOnly/></label></div>}<SignArtworkField value={sign.uploadedArtwork} credential={credential} onChange={art=>onChange({dibondSign:{...sign,uploadedArtwork:art,artworkPlacement:undefined}})}/>{sign.uploadedArtwork&&<SignArtworkPlacement sign={sign} config={{...getDibondConfig(product),...(variable?{fixedDimensions:true}:{})}} onChange={next=>onChange({dibondSign:next})}/>}</>;
 return <p className="jsf-road-sign-motif" role="status">{artwork?'Motivet hämtas från artikeln.':'Original saknas. Lägg till SVG eller PDF på artikeln under Artiklar.'}</p>;
}
