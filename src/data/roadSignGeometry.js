// Resize the flat middle; keep the bends and 25 mm profile at the outer edges.
function resizeRoadSignGeometry(geometry,spec){
 if(!spec.editableWidth&&!spec.editableHeight)return geometry;
 const original=spec.cadWidthMm/1000,next=spec.widthMm/1000,band=.006,inner=original/2-band,p=geometry.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i);p.setX(i,Math.abs(x)>=inner?Math.sign(x)*(next/2-(original/2-Math.abs(x))):x*(next-2*band)/(original-2*band));}
 if(spec.editableHeight){const base=spec.cadHeightMm/1000,target=spec.heightMm/1000;for(let i=0;i<p.count;i++){const y=p.getY(i);p.setY(i,Math.abs(y)>=base/2-band?Math.sign(y)*(target/2-(base/2-Math.abs(y))):y*(target-2*band)/(base-2*band));}}
 p.needsUpdate=true;geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}
module.exports={resizeRoadSignGeometry};
