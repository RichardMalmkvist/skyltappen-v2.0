import * as THREE from 'three';
export function configureSlidingHatch(model,paper){
 let hatch;model.traverse(node=>{if(node.name.startsWith('skjutlucka'))hatch=node;});
 if(!hatch)throw new Error('Luckan saknas i modellen.');
 // Compensate for the bright studio lights while keeping the handle's 3D shading.
 hatch.traverse(node=>{if(!node.isMesh)return;const tune=material=>{const copy=material.clone();copy.color.set('#c0c0c0');copy.roughness=.8;copy.metalness=0;return copy;};node.material=Array.isArray(node.material)?node.material.map(tune):tune(node.material);});
 model.updateMatrixWorld(true);
 const paperBounds=new THREE.Box3().setFromObject(paper),initialBounds=new THREE.Box3().setFromObject(hatch);
 const travel=(paperBounds.max.x-paperBounds.min.x)/2;
 hatch.scale.x*=travel/(initialBounds.max.x-initialBounds.min.x);model.updateMatrixWorld(true);
 const hatchBounds=new THREE.Box3().setFromObject(hatch);
 const closedX=hatch.position.x+paperBounds.max.x-hatchBounds.max.x;
 const openX=closedX-travel;
 return {hatch,travel,setPosition(value){hatch.position.x=THREE.MathUtils.lerp(openX,closedX,THREE.MathUtils.clamp(value,0,1));hatch.updateMatrixWorld(true);}};
}
