import {isFoldedAluminium} from './aluminiumArticles';
import {roadSignModel} from './roadSignModels';
export function supportsBentMetal3D(product){return Boolean(roadSignModel(product))||isFoldedAluminium(product)||String(product?.articleNumber)==='1501';}
// Translate the edge bands without scaling their bend radii or the 25 mm depth.
export function stretchBentCoordinate(value,originalSize,nextSize,edgeBand=.006){
 const inner=originalSize/2-edgeBand;
 if(Math.abs(value)>=inner)return Math.sign(value)*(nextSize/2-(originalSize/2-Math.abs(value)));
 return value*(nextSize-2*edgeBand)/(originalSize-2*edgeBand);
}
export function resizeBentGeometry(geometry,original,width,height){
 const p=geometry.attributes.position;for(let i=0;i<p.count;i++)p.setXYZ(i,stretchBentCoordinate(original[i*3],.3,width),stretchBentCoordinate(original[i*3+1],.21,height),original[i*3+2]);p.needsUpdate=true;geometry.computeBoundingBox();geometry.computeBoundingSphere();
}
