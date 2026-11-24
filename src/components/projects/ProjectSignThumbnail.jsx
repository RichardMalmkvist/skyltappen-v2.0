import BadgePreview from '../products/BadgePreview';
import FittedProductPreview from '../products/FittedProductPreview';
import AreaPreview from '../products/AreaPreview';
import {isAreaPriced} from '../../data/areaPricing';
import {getFormPreviewConfig} from '../../data/previewHelpers';
import {hasPhotographicDoorPreview} from '../../data/doorPhotoPreview';

const supported=['parking_sign','badge','door_sign','hanging_sign','profession','destination_cube','dibond_sign','ot_board','elevator_board'];

// Render the saved sign, never the catalog's example picture or sample text.
export default function ProjectSignThumbnail({product,sign}){
 if(!product)return <span>{sign.position}</span>;
 const form={...(sign.configuration||{}),quantity:1};
 if(!form.hangingSignWithoutText&&![form.customText,form.customTextLine1,form.doorHeading,form.doorName].some(value=>String(value||'').trim()))form.customText=sign.text||sign.signText||'';
 const preview=getFormPreviewConfig(product);
 return <div className="project-sign-live-preview" role="img" aria-label={`${product.name}: ${sign.text||sign.position||''}`}>
  <FittedProductPreview>{isAreaPriced(product)?<AreaPreview product={product} form={form} maxWidth={430}/>:supported.includes(preview.previewType)||hasPhotographicDoorPreview(product)?<BadgePreview photographic product={product} productForm={form} badgeId={preview.badgeId} productType={preview.productType} maxWidth={430}/>:product.image?<img src={product.image} alt=""/>:<span>{sign.position}</span>}</FittedProductPreview>
 </div>;
}
