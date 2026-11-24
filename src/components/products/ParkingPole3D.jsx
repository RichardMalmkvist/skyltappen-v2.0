import {useEffect,useRef} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {poleHeight} from '../../data/parkingPole';

// True hollow tube: 60 mm outside, 51.6 mm inside, open ends.
export function createParkingPole(heightMm=3150){
 const group=new THREE.Group(),height=heightMm/1000;
 const metal=new THREE.MeshStandardMaterial({color:0xb8bdc1,metalness:.72,roughness:.53,side:THREE.DoubleSide});
 for(const radius of [.030,.0258])group.add(new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,64,1,true),metal));
 for(const y of [-height/2,height/2]){const ring=new THREE.Mesh(new THREE.RingGeometry(.0258,.030,64),metal);ring.rotation.x=-Math.PI/2;ring.position.y=y;group.add(ring);}
 return group;
}
export default function ParkingPole3D({form,onUnavailable}){
 const host=useRef(null),api=useRef(null),failure=useRef(onUnavailable);failure.current=onUnavailable;
 const height=poleHeight(form)||3150;
 useEffect(()=>{
  let renderer,controls,observer,frame=0,model,disposed=false;
  const container=host.current;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.005,60);
  const draw=()=>{if(disposed||frame)return;frame=requestAnimationFrame(()=>{frame=0;if(disposed||host.current!==container)return;const moving=controls.update();renderer.render(scene,camera);if(moving)draw();});};
  const disposeModel=()=>{const materials=new Set();model?.traverse(node=>{node.geometry?.dispose();if(node.material)materials.add(node.material);});materials.forEach(material=>material.dispose());if(model)scene.remove(model);};
  const reset=()=>{if(!model)return;const size=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()),distance=Math.max(size.y,size.x/camera.aspect)/(2*Math.tan(THREE.MathUtils.degToRad(16))*.72);controls.enableDamping=false;camera.position.set(distance*.15,distance*.08,distance);controls.target.set(0,0,0);controls.maxDistance=distance*4;controls.update();controls.enableDamping=true;draw();};
  try{
   renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0xffffff,0);renderer.domElement.setAttribute('aria-label','3D-vy av galvaniserad stolpe. Dra för att rotera.');host.current.append(renderer.domElement);
   controls=new OrbitControls(camera,renderer.domElement);controls.enablePan=false;controls.enableDamping=true;controls.addEventListener('change',draw);
   scene.add(new THREE.HemisphereLight(0xffffff,0x68737a,2));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(-2,3,5);scene.add(light);
   api.current={update:heightMm=>{disposeModel();model=createParkingPole(heightMm);scene.add(model);reset();},reset};
   observer=new ResizeObserver(()=>{if(disposed||host.current!==container)return;const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();reset();});observer.observe(host.current);
  }catch{failure.current?.();}
  return()=>{disposed=true;cancelAnimationFrame(frame);observer?.disconnect();controls?.dispose();disposeModel();renderer?.dispose();renderer?.forceContextLoss();renderer?.domElement.remove();api.current=null;};
 },[]);
 useEffect(()=>{api.current?.update(Math.max(100,Math.min(6000,height)));},[height]);
 return <div className="jsf-door-3d"><div className="jsf-door-3d-canvas" ref={host}/><button type="button" className="jsf-door-3d-reset" onClick={()=>api.current?.reset()}>Återställ vy</button></div>;
}
