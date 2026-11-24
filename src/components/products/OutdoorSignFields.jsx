import OptionSwitch from '../forms/OptionSwitch';
import {POST_MM,outdoorSpec,newOutdoorSign,resolveOutdoorArticle} from '../../data/outdoorBusinessSigns';
import {getCatalogArticles} from '../../data/catalogStore';
import {resizeDibondDimensions} from '../../data/dibondHelpers';
export default function OutdoorSignFields({product,sign,onChange}){
 if(!outdoorSpec(product))return null;
 const outdoor=sign.outdoorSign||newOutdoorSign(product),variant=resolveOutdoorArticle(product,{...sign,outdoorSign:outdoor},getCatalogArticles());
 return <section className="jsf-dibond-position" aria-label="Stolpställning och utförande">
  {outdoor.withPosts&&<div className="jsf-dibond-dimensions"><label>Total bredd inkl. stolpar (mm)<input type="number" min="300" max="3000" step="any" value={Number(sign.widthMm)+POST_MM*2} onChange={e=>onChange(resizeDibondDimensions(product,sign,{widthMm:Number(e.target.value)-POST_MM*2}))}/></label><label>Stolparnas totalhöjd (mm)<input type="number" min="100" max={product.profileSignConfig?.maxTotalHeightMm||3000} step="any" value={outdoor.totalHeightMm} onChange={e=>onChange({...sign,outdoorSign:{...outdoor,totalHeightMm:e.target.value}})}/></label></div>}
  {String(product.articleNumber)!=='0901'&&!product.profileSignConfig&&<OptionSwitch label="Dubbelsidig" checked={outdoor.doubleSided} onChange={checked=>onChange({...sign,outdoorSign:{...outdoor,doubleSided:checked}})}/>}
  <span>Art. {variant.articleNumber} · {Number(variant.unitPrice??variant.price).toLocaleString('sv-SE')} kr/st</span>
 </section>;
}
