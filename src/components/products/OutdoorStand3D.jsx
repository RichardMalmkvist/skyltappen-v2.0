import {useCallback,useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {newDibondSign} from '../../data/dibondHelpers';
import {outdoorStandLayout} from '../../data/outdoorStand3D';
import {updateDirectionPanel} from '../../data/directionSigns';
import DibondInteraction from './DibondInteraction';
import {printTexture} from './liveSignTexture';
import {outdoorStandTemplates,buildOutdoorStand,disposeOutdoorStand} from './outdoorStandModel';

export default function OutdoorStand3D({product,form,sourceRef,onUnavailable,onSignChange,frontViewRequest=0}){
 const host=useRef(null),shadow=useRef(null),editor=useRef(null),api=useRef(null),failure=useRef(onUnavailable),editingRef=useRef(false);
 const focusedRef=useRef(null),activePanelRef=useRef(0);
 failure.current=onUnavailable;
 const [loaded,setLoaded]=useState(false),[ready,setReady]=useState(false),[editing,setEditing]=useState(false);
 const [focusedPanel,setFocusedPanel]=useState(null);
 editingRef.current=editing;
 const sign=form?.dibondSign||newDibondSign(product),layout=outdoorStandLayout(sign);
 const focusPanel=useCallback(index=>{activePanelRef.current=index;focusedRef.current=index;setFocusedPanel(index);editingRef.current=true;setEditing(true);api.current?.focus(index);},[]);
 const overview=()=>{focusedRef.current=null;setFocusedPanel(null);editingRef.current=false;setEditing(false);api.current?.overview();};
 useEffect(()=>{
  let disposed=false,renderer,controls,observer,model,templates,frame=0,dimensions='',currentLayout,animation;
  const abort=new AbortController(),container=host.current,scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.01,40);
  const schedule=()=>{if(disposed||frame)return;frame=requestAnimationFrame(()=>{
   frame=0;
   if(animation){const progress=Math.min(1,(performance.now()-animation.started)/animation.duration),ease=1-Math.pow(1-progress,3);camera.position.lerpVectors(animation.fromPosition,animation.position,ease);controls.target.lerpVectors(animation.fromTarget,animation.target,ease);if(progress===1)animation=null;}
   const moving=controls?.update();
   if(model&&renderer){
    renderer.render(scene,camera);renderer.domElement.style.visibility='visible';
    const box=new THREE.Box3().setFromObject(model),points=[];
    for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])points.push(new THREE.Vector3(x,y,z).project(camera));
    const w=container.clientWidth,h=container.clientHeight,left=(Math.min(...points.map(p=>p.x))+1)*w/2,right=(Math.max(...points.map(p=>p.x))+1)*w/2,bottom=(1-Math.min(...points.map(p=>p.y)))*h/2;
    Object.assign(shadow.current.style,{left:(left+right)/2+'px',top:Math.min(bottom+45,h-34)+'px',width:(right-left)*.7+'px',opacity:focusedRef.current==null?'.14':'0'});
    if(editor.current){const {widthMm,heightMm}=model.userData,a=new THREE.Vector3(-widthMm/2000,heightMm/2000,.00203).project(camera),b=new THREE.Vector3(widthMm/2000,-heightMm/2000,.00203).project(camera);Object.assign(editor.current.style,{left:(a.x+1)*w/2+'px',top:(1-a.y)*h/2+'px',width:(b.x-a.x)*w/2+'px',height:(a.y-b.y)*h/2+'px'});}
   }
   if(moving||animation)schedule();
  });};
  const reset=(front=false)=>{
   animation=null;
   if(!model)return;const size=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()),tan=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
   const distance=Math.max(size.x/(2*tan*camera.aspect*.76),size.y/(2*tan*.71))+size.z;
   const damping=controls.enableDamping;controls.enableDamping=false;controls.update();controls.target.set(0,0,0);camera.position.set(front?0:.27,front?0:.09,1).normalize().multiplyScalar(distance);controls.maxDistance=distance*4;controls.update();controls.enableDamping=damping;schedule();
  };
  const focus=(index,animate=true)=>{
   if(!model||!currentLayout)return;
   const panel=currentLayout.panels[Math.min(Math.max(0,index),currentLayout.panels.length-1)];if(!panel)return;
   const target=new THREE.Vector3(0,currentLayout.heightMm/2000-(panel.topMm+panel.heightMm/2)/1000,0);
   const tan=Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),distance=Math.max(panel.widthMm/1000/(2*tan*camera.aspect*.82),panel.heightMm/1000/(2*tan*.60))+.08;
   const position=target.clone().add(new THREE.Vector3(0,0,distance));
   const damping=controls.enableDamping;controls.enableDamping=false;controls.update();controls.enableDamping=damping;
   if(animate&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches)animation={started:performance.now(),duration:300,fromPosition:camera.position.clone(),fromTarget:controls.target.clone(),position,target};
   else{animation=null;camera.position.copy(position);controls.target.copy(target);}
   schedule();
  };
  const start=async()=>{try{
   renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0xffffff,0);
   const canvas=renderer.domElement;canvas.style.visibility='hidden';canvas.tabIndex=0;canvas.setAttribute('aria-label','3D-vy av skylt med stolpar. Dra för att rotera. Home återställer vyn.');container.append(canvas);
   controls=new OrbitControls(camera,canvas);controls.enablePan=false;controls.enableDamping=true;controls.dampingFactor=.12;controls.minDistance=.15;controls.addEventListener('change',schedule);controls.addEventListener('start',()=>{animation=null;editingRef.current=false;setEditing(false);});
   scene.add(new THREE.HemisphereLight(0xffffff,0x999999,1.4));const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(-2,3,4);scene.add(light);
   const resize=()=>{const {width,height}=container.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();if(focusedRef.current!=null)focus(focusedRef.current,false);else reset(editingRef.current);};observer=new ResizeObserver(resize);observer.observe(container);resize();
   const response=await fetch((process.env.PUBLIC_URL||'')+'/models/outdoor-stand.glb',{signal:abort.signal});if(!response.ok)throw new Error('Stolpmodellen kunde inte hämtas.');
   const gltf=await new GLTFLoader().parseAsync(await response.arrayBuffer(),'');
   if(disposed){disposeOutdoorStand(gltf.scene);return;}
   templates=outdoorStandTemplates(gltf.scene);disposeOutdoorStand(gltf.scene);
   api.current={focus,overview:()=>reset(false),update:(next,textures)=>{
    if(disposed){textures.forEach(t=>t.dispose());return;}
    const key=JSON.stringify([next.widthMm,next.heightMm,next.panels.map(p=>[p.topMm,p.heightMm])]),changed=dimensions!==key;
    const previous=model;model=buildOutdoorStand(templates,next,textures);scene.add(model);if(previous){scene.remove(previous);disposeOutdoorStand(previous);}dimensions=key;currentLayout=next;
    if(changed){if(focusedRef.current!=null)focus(focusedRef.current,false);else reset(editingRef.current);}setReady(true);schedule();
   }};
   canvas.addEventListener('keydown',event=>{
    if(event.key==='Home'){event.preventDefault();focusedRef.current=null;setFocusedPanel(null);editingRef.current=false;setEditing(false);reset(false);}
    else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();animation=null;editingRef.current=false;setEditing(false);const spherical=new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));spherical.theta+=event.key==='ArrowLeft'?-.12:event.key==='ArrowRight'?.12:0;spherical.phi+=event.key==='ArrowUp'?-.12:event.key==='ArrowDown'?.12:0;spherical.makeSafe();camera.position.setFromSpherical(spherical).add(controls.target);controls.update();schedule();}
   });setLoaded(true);
  }catch(error){if(!disposed&&error.name!=='AbortError')failure.current?.();}};start();
  return()=>{disposed=true;abort.abort();cancelAnimationFrame(frame);observer?.disconnect();controls?.dispose();disposeOutdoorStand(model);templates?.forEach(template=>template.geometry.dispose());renderer?.dispose();renderer?.forceContextLoss();renderer?.domElement.remove();api.current=null;};
 },[product.id]);
 useEffect(()=>{
  if(!loaded||!sourceRef.current)return;let disposed=false,version=0,timer;const abort=new AbortController();
  const update=()=>{clearTimeout(timer);const request=++version;timer=setTimeout(async()=>{
   const textures=[];
   try{
    await document.fonts.ready;const next=outdoorStandLayout(form?.dibondSign||newDibondSign(product));if(!next)return;
    const source=sourceRef.current,panels=[...source.querySelectorAll('[data-direction-panel] > svg')];
    for(const [index,panel] of next.panels.entries()){
     const svg=panels[index]||source.querySelector('svg > svg')||source.querySelector('svg');
     textures.push(await printTexture({querySelector:()=>svg},panel.widthMm,panel.heightMm,abort.signal));
    }
    if(disposed||request!==version||!api.current){textures.forEach(t=>t.dispose());return;}api.current.update(next,textures);
   }catch(error){textures.forEach(t=>t.dispose());if(!disposed&&error.name!=='AbortError')failure.current?.();}
  },editingRef.current?16:80);};
  const observer=new MutationObserver(update);observer.observe(sourceRef.current,{childList:true,subtree:true,attributes:true,characterData:true});update();
  return()=>{disposed=true;abort.abort();clearTimeout(timer);observer.disconnect();};
 },[loaded,form,product,sourceRef]);
 useEffect(()=>{if(ready&&frontViewRequest)focusPanel(activePanelRef.current);},[frontViewRequest,ready,focusPanel]);
 useEffect(()=>{const receive=event=>{if(event.detail?.scope===sign&&event.detail.focusPreview){const index=Math.max(0,Number(event.detail.selection?.panel)||0);focusPanel(index);}};window.addEventListener('jsf-sign-editor-selection',receive);return()=>window.removeEventListener('jsf-sign-editor-selection',receive);},[sign,focusPanel]);
 return <div className="jsf-door-3d" style={{overflow:'hidden'}} data-outdoor-stand-3d={product.articleNumber} data-stand-width-mm={layout?.widthMm} data-stand-height-mm={layout?.heightMm} data-focused-panel={focusedPanel??undefined} data-front-editing={editing||undefined}>
  <div className="jsf-door-3d-shadow" ref={shadow} aria-hidden="true"/><div className="jsf-door-3d-canvas" ref={host}/>
  {editing&&layout&&<svg ref={editor} className="jsf-bent-direct-editor" viewBox={`0 0 ${layout.widthMm} ${layout.heightMm}`} style={{position:'absolute',overflow:'visible',pointerEvents:'none',zIndex:2}}>{layout.panels.map((panel,index)=><g key={index} transform={`translate(100 ${panel.topMm})`} style={{pointerEvents:'auto'}}><DibondInteraction sign={panel.sign} selectionScope={sign} selectionPanel={index} onChange={next=>onSignChange(sign.outdoorSign?.kind==='direction'?updateDirectionPanel(sign,index,next):next)}/></g>)}</svg>}
  {ready?<button type="button" className="jsf-door-3d-reset" onClick={overview}>Återställ vy</button>:<p role="status" className="jsf-door-3d-status">Laddar 3D-vyn…</p>}
 </div>;
}
