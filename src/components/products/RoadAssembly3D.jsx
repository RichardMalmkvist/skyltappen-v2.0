import {resizeRoadSignGeometry} from '../../data/roadSignGeometry';
import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {roadSignModel} from '../../data/roadSignModels';
import {hangingStackEntries} from '../../data/hangingStack';
import {roadAssemblyLayout} from '../../data/roadSignAssembly';
import {getCatalogArticles} from '../../data/catalogStore';
import {printTexture} from './liveSignTexture';
import {createParkingPole} from './ParkingPole3D';

export default function RoadAssembly3D({product,form,sourceRef,onUnavailable}){
 const host=useRef(null),api=useRef(null),failure=useRef(onUnavailable);failure.current=onUnavailable;
 const [ready,setReady]=useState(false);
 useEffect(()=>{
  let renderer,controls,observer,frame=0,disposed=false,model=new THREE.Group(),version=0,shape='';
  const container=host.current;
  const abort=new AbortController(),cache=new Map(),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.005,60);
  const disposeGroup=group=>{const materials=new Set();group.traverse(node=>{node.geometry?.dispose();if(node.material)materials.add(node.material);});materials.forEach(material=>{material.map?.dispose();material.dispose();});};
  const draw=()=>{if(disposed||frame)return;frame=requestAnimationFrame(()=>{frame=0;if(disposed||host.current!==container)return;const moving=controls.update();renderer.render(scene,camera);if(moving)draw();});};
  const reset=()=>{if(!model.children.length)return;const size=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()),distance=Math.max(size.y,size.x/camera.aspect)/(2*Math.tan(THREE.MathUtils.degToRad(16))*.72);controls.enableDamping=false;camera.position.set(distance*.10,distance*.04,distance);controls.target.set(0,0,0);controls.maxDistance=distance*4;controls.update();controls.enableDamping=true;draw();};
  async function geometryFor(spec){
   const cacheKey=spec.file+':'+spec.widthMm+':'+spec.heightMm;if(!cache.has(cacheKey))cache.set(cacheKey,(async()=>{const response=await fetch((process.env.PUBLIC_URL||'')+'/models/'+spec.file,{signal:abort.signal});if(!response.ok)throw Error('Modellen kunde inte hämtas.');const imported=(await new GLTFLoader().parseAsync(await response.arrayBuffer(),'')).scene;imported.updateMatrixWorld(true);let geometry;imported.traverse(node=>{if(node.isMesh){geometry=node.geometry.clone().applyMatrix4(node.matrixWorld);}});imported.traverse(node=>{node.geometry?.dispose();[].concat(node.material||[]).forEach(m=>m.dispose());});geometry.computeBoundingBox();const center=geometry.boundingBox.getCenter(new THREE.Vector3());geometry.translate(spec.centered?-center.x:-(spec.cadWidthMm||spec.widthMm)/2000,spec.centered?-center.y:-(spec.cadHeightMm||spec.heightMm)/2000,0);resizeRoadSignGeometry(geometry,spec);if(spec.cadScale)geometry.scale(spec.cadScale,spec.cadScale,1);return geometry;})());
   return (await cache.get(cacheKey)).clone();
  }
  try{
   renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0xffffff,0);renderer.domElement.setAttribute('aria-label','3D-vy av skyltar på samma stolpe. Dra för att rotera.');host.current.append(renderer.domElement);
   controls=new OrbitControls(camera,renderer.domElement);controls.enablePan=false;controls.enableDamping=true;controls.addEventListener('change',draw);scene.add(model);
   scene.add(new THREE.HemisphereLight(0xffffff,0x899397,1.8));const light=new THREE.DirectionalLight(0xffffff,2.5);light.position.set(-2,3,5);scene.add(light);
   api.current={reset,update:async(currentProduct,currentForm)=>{
    const request=++version,layout=roadAssemblyLayout(hangingStackEntries(currentProduct,currentForm,getCatalogArticles()),currentForm.hangingStack?.gapMm??10,currentForm.roadAssemblyTopMm??100),next=new THREE.Group();
    try{
     for(const x of layout.poleXs){const pole=createParkingPole(layout.height);pole.position.set((x-layout.width/2)/1000,0,-.056);next.add(pole);}
     for(const [index,panel] of layout.panels.entries()){
      const spec=roadSignModel(panel.product,panel.form?.dibondSign),geometry=await geometryFor(spec),body=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0xc0c3c6,roughness:.5,metalness:.08,side:THREE.DoubleSide}));
      body.scale.y=panel.height/spec.heightMm;
      body.position.y=(layout.height/2-panel.y-panel.height/2)/1000;next.add(body);
      const source=sourceRef.current?.querySelector(`[data-road-part="${index}"]`);if(!source)throw Error('Förhandsvisningen är inte redo.');
      const texture=await printTexture(source,panel.width,panel.height,abort.signal),face=new THREE.Mesh((spec.shape==='circle'?new THREE.CircleGeometry(panel.width/2000,128):new THREE.PlaneGeometry(panel.width/1000,panel.height/1000)),new THREE.MeshBasicMaterial({color:panel.product.roadSignVariableWidth||panel.form.dibondSign?.roadSupplement||panel.form.dibondSign?.uploadedArtwork||panel.product.defaultSignArtwork?0xffffff:0xc8cbce,map:texture,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4}));face.position.set(0,body.position.y,(spec.frontZMm||0)/1000+.00002);next.add(face);
     }
     if(disposed||host.current!==container||request!==version){disposeGroup(next);return;}
     scene.remove(model);disposeGroup(model);model=next;scene.add(model);
     const nextShape=[layout.width,layout.height,...layout.panels.map(p=>p.y)].join(':');if(shape!==nextShape){shape=nextShape;reset();}setReady(true);host.current.dataset.assemblyPanels=layout.panels.length;host.current.dataset.assemblyHeight=layout.height;draw();
    }catch(error){disposeGroup(next);if(!disposed&&error.name!=='AbortError')failure.current?.();}
   }};
   observer=new ResizeObserver(()=>{if(disposed||host.current!==container)return;const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();reset();});observer.observe(host.current);
  }catch{failure.current?.();}
  return()=>{disposed=true;abort.abort();cancelAnimationFrame(frame);observer?.disconnect();controls?.dispose();disposeGroup(model);for(const promise of cache.values())promise.then(g=>g.dispose()).catch(()=>{});renderer?.dispose();renderer?.forceContextLoss();renderer?.domElement.remove();api.current=null;};
 },[sourceRef]);
 useEffect(()=>{const timer=setTimeout(()=>api.current?.update(product,form),80);return()=>clearTimeout(timer);},[product,form]);
 return <div className="jsf-door-3d" data-road-assembly-ready={ready||undefined}><div className="jsf-door-3d-canvas" ref={host}/>{ready?<button type="button" className="jsf-door-3d-reset" onClick={()=>api.current?.reset()}>Återställ vy</button>:<p className="jsf-door-3d-status" role="status">Laddar 3D-vyn…</p>}</div>;
}
