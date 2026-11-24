import {supportsOutdoorStand3D} from './outdoorStand3D';
import {supportsHangingSign3D} from './hangingSign3D';
import {supportsFlagSign3D} from './flagSign3D';
import {supportsNameBadge3D} from './nameBadge3D';
import {supportsBentMetal3D} from './bentMetalModel';
import {roadSignModel} from './roadSignModels';

export function product3DView(product,form={}){
 if(!product)return null;
 if(roadSignModel(product)&&form.hangingStack?.items?.length)return 'road-assembly';
 if(product.previewType==='parking_pole')return 'pole';
 const number=String(product.articleNumber||'');
 if(supportsOutdoorStand3D(product))return 'outdoor';
 if(supportsHangingSign3D(product,form))return 'hanging';
 if(supportsFlagSign3D(product))return 'flag';
 if(supportsNameBadge3D(product))return 'badge';
 if(['1003','1004','1005','1006','1103','1104','1105','1106','1302','1402'].includes(number))return 'editable';
 if(supportsBentMetal3D(product))return 'bent';
 if(product.previewType==='dibond_sign')return 'editable';
 if(['0737','0720','0721','0722','0723','0724'].includes(number))return 'decal';
 if(['0601','0602','0603','0604','0607','0608','0609','0610','0614','0616'].includes(number.padStart(4,'0')))return 'door';
 return null;
}

// Thickness affects the preview only; production dimensions stay unchanged.
export function editableSignThicknessMm(product={}){
 const number=String(product.articleNumber||'').trim();
 if(['1003','1004','1103','1104','1302','1402'].includes(number))return 4;
 if(product.productType==='dekal'||['1005','1006','1105','1106'].includes(number))return .2;
 return product.previewType==='dibond_sign'?3:.2;
}
