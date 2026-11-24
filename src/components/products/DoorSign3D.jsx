import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {whiteboardPaperCanvas} from './whiteboardPaperCanvas';
import {doorPaperCanvas} from './doorPaperCanvas';
import {slidingPaperCanvas} from './slidingPaperCanvas';
import {configureSlidingHatch} from './slidingDoorModel';

function disposeModel(model){const geometries=new Set(),materials=new Set();model?.traverse(node=>{if(node.geometry)geometries.add(node.geometry);for(const material of [].concat(node.material||[]))materials.add(material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>{m.map?.dispose();m.dispose();});}
export default function DoorSign3D({articleNumber='0602',sourceRef,form,onEdit,slidePosition=1,onSlide,onUnavailable}){
 const whiteboard=['0603','0604','0607','0616'].includes(articleNumber);
 const sliding=['0607','0608','0609','0610','0614'].includes(articleNumber);
 const hasInkRef=useRef(false);
 const shadow=useRef(null),host=useRef(null),api=useRef(null),edit=useRef(onEdit),slide=useRef(onSlide),position=useRef(slidePosition),unavailable=useRef(onUnavailable);
 const [status,setStatus]=useState('Laddar 3D-modellen…'),[ready,setReady]=useState(false),[hasInk,setHasInk]=useState(false);
 hasInkRef.current=hasInk;edit.current=onEdit;slide.current=onSlide;position.current=slidePosition;unavailable.current=onUnavailable;
 useEffect(()=>{
  const container=host.current,abort=new AbortController();let renderer,controls,model,observer,frame=0,disposed=false,overlay,bounds,hatchControl,overlays=[],texturesReady=false;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.01,2);
  const schedule=()=>{if(!disposed&&!frame)frame=requestAnimationFrame(()=>{
   frame=0;if(document.hidden)return;const moving=controls?.update();if(texturesReady&&renderer){renderer.render(scene,camera);renderer.domElement.style.visibility="visible";renderer.domElement.style.pointerEvents="auto";}
   if(texturesReady&&bounds&&shadow.current){const points=[];for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])points.push(new THREE.Vector3(x,y,z).project(camera));const w=container.clientWidth,h=container.clientHeight,left=(Math.min(...points.map(p=>p.x))+1)*w/2,right=(Math.max(...points.map(p=>p.x))+1)*w/2,bottom=(1-Math.min(...points.map(p=>p.y)))*h/2;Object.assign(shadow.current.style,{left:(left+right)/2+'px',top:Math.min(bottom+58,h-30)+'px',width:Math.min((right-left)*.72,w*.85)+'px',opacity:'.16'});}
   if(moving)schedule();
  });};
  const fittedDistance=()=>{if(!bounds)return .39;const frame=sourceRef.current?.querySelector(['0610','0616'].includes(articleNumber)?'[data-three-panel-preview]>svg':['0607','0608','0610','0616'].includes(articleNumber)||!sliding?'svg[aria-label="Produktfoto med anpassningsbar textyta"]':'.jsf-sliding-room-sign>svg')?.getBoundingClientRect(),rect=container.getBoundingClientRect(),size=bounds.getSize(new THREE.Vector3()),width=frame?.width||rect.width*.82,height=frame?.height||rect.height*.55,tan=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));const distance=Math.max(size.x/(2*tan*camera.aspect*(width/rect.width)),size.y/(2*tan*(height/rect.height)))+size.z/2;return ['0607','0610','0616'].includes(articleNumber)?distance*1.22:distance;};
  const reset=()=>{if(!model)return;controls.reset();camera.position.set(0,0,fittedDistance());controls.target.set(0,0,0);controls.update();schedule();};
  const setSlide=value=>{hatchControl?.setPosition(value);schedule();};
  const start=async()=>{
   try{
    renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0xffffff,0);
    const canvas=renderer.domElement;canvas.style.visibility='hidden';canvas.style.pointerEvents='none';canvas.tabIndex=0;canvas.setAttribute('aria-label',sliding?'3D-skylt. Dra luckan i sidled eller dra ramen för att rotera.':'3D-skylt. Dra för att rotera, nyp för att zooma. Piltangenter roterar och Home återställer.');container.append(canvas);
    scene.add(new THREE.HemisphereLight(0xffffff,0x777777,2.6));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(-1,2,3);scene.add(light);const rim=new THREE.DirectionalLight(0xffffff,1.5);rim.position.set(2,-1,-2);scene.add(rim);
    controls=new OrbitControls(camera,canvas);controls.enablePan=false;controls.enableDamping=true;controls.dampingFactor=.12;controls.minDistance=.16;controls.maxDistance=.8;controls.addEventListener('change',schedule);
    const resize=()=>{const {width,height}=container.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();if(model){camera.position.sub(controls.target).normalize().multiplyScalar(fittedDistance()).add(controls.target);controls.update();}schedule();};observer=new ResizeObserver(resize);observer.observe(container);resize();
    const response=await fetch((process.env.PUBLIC_URL||'')+'/models/'+(articleNumber==='0601'?'0602':articleNumber==='0603'?'0604':articleNumber)+'.glb',{signal:abort.signal});if(!response.ok)throw new Error('Modellen kunde inte hämtas.');
    const gltf=await new GLTFLoader().parseAsync(await response.arrayBuffer(),'');model=gltf.scene;if(disposed){disposeModel(model);return;}
    let textPaper,statusPaper,middlePaper,whiteboardPaper;model.traverse(node=>{if(!node.isMesh)return;if(/^paper.?middle/i.test(node.parent?.name||''))middlePaper=node;else if(/^whiteboard/i.test(node.parent?.name||''))whiteboardPaper=node;else if(/^paper/i.test(node.parent?.name||''))textPaper=node;else if(/^(smitta.papper|upptaget)/i.test(node.parent?.name||''))statusPaper=node;});
    const paper=textPaper||statusPaper;if(!paper)throw new Error('Pappersytan saknas i modellen.');
    for(const [surface,kind] of [[textPaper,'text'],[middlePaper,'middle'],[whiteboardPaper,'whiteboard'],[statusPaper,['0603','0604'].includes(articleNumber)?'whiteboard':'status']]){
     if(!surface)continue;surface.geometry.computeBoundingBox();const box=surface.geometry.boundingBox,size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
     const mesh=new THREE.Mesh(new THREE.PlaneGeometry(size.x,size.y),new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false,side:THREE.FrontSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));mesh.name='editable-paper-'+kind;mesh.position.set(center.x,center.y,box.max.z+.005);surface.add(mesh);overlays.push({mesh,kind});if(kind==='text')overlay=mesh;
    }
    if(sliding){hatchControl=configureSlidingHatch(model,statusPaper);hatchControl.setPosition(position.current);}
    bounds=new THREE.Box3().setFromObject(model);model.position.sub(bounds.getCenter(new THREE.Vector3()));scene.add(model);bounds=new THREE.Box3().setFromObject(model);reset();resize();api.current={reset,schedule,overlays,setSlide,reveal:()=>{texturesReady=true;schedule();},clear:()=>{const wb=overlays.find(s=>s.kind==='whiteboard');if(wb?.original){wb.mesh.material.map.image.getContext('2d').drawImage(wb.original,0,0);wb.mesh.material.map.needsUpdate=true;setHasInk(false);schedule();}}};setReady(true);schedule();
    const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
    const rayFor=event=>{const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);return ray;};
    let down=null,drag=null;
    const moveHatch=value=>{position.current=THREE.MathUtils.clamp(value,0,1);setSlide(position.current);slide.current?.(position.current);};
    // Capture hatch gestures before OrbitControls so dragging the hatch never rotates the sign.
    canvas.addEventListener('pointerdown',event=>{
     down=[event.clientX,event.clientY];
     const wb=overlays.find(s=>s.kind==='whiteboard');
     if(wb?.mesh.material.map&&event.button===0&&event.isPrimary!==false){const hit=rayFor(event).intersectObject(wb.mesh)[0];if(hit){drag={id:event.pointerId,whiteboard:wb,last:hit.uv.clone()};if(!hasInkRef.current){wb.mesh.material.map.image.getContext('2d').drawImage(wb.blank,0,0);hasInkRef.current=true;}wb.mesh.material.map.needsUpdate=true;schedule();controls.enabled=false;event.preventDefault();event.stopImmediatePropagation();canvas.setPointerCapture(event.pointerId);return;}}
     if(!hatchControl||event.button!==0||event.isPrimary===false)return;
     const first=rayFor(event).intersectObject(model,true)[0];let node=first?.object;
     while(node&&node!==hatchControl.hatch)node=node.parent;if(!node)return;
     const plane=new THREE.Plane().setFromNormalAndCoplanarPoint(new THREE.Vector3(0,0,1).transformDirection(paper.matrixWorld),first.point);
     const point=ray.ray.intersectPlane(plane,new THREE.Vector3());if(!point)return;
     drag={id:event.pointerId,plane,x:hatchControl.hatch.parent.worldToLocal(point).x,start:position.current};controls.enabled=false;event.preventDefault();event.stopImmediatePropagation();canvas.setPointerCapture(event.pointerId);
    },true);
    canvas.addEventListener('pointermove',event=>{
     if(!drag||drag.id!==event.pointerId)return;event.preventDefault();event.stopImmediatePropagation();
     if(drag.whiteboard){const hit=rayFor(event).intersectObject(drag.whiteboard.mesh)[0];if(hit){const texture=drag.whiteboard.mesh.material.map,c=texture.image,ctx=c.getContext('2d');ctx.strokeStyle='#161616';ctx.lineWidth=c.width*.006;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(drag.last.x*c.width,(1-drag.last.y)*c.height);ctx.lineTo(hit.uv.x*c.width,(1-hit.uv.y)*c.height);ctx.stroke();drag.last.copy(hit.uv);texture.needsUpdate=true;schedule();}return;}
     const point=rayFor(event).ray.intersectPlane(drag.plane,new THREE.Vector3());if(point)moveHatch(drag.start+(hatchControl.hatch.parent.worldToLocal(point).x-drag.x)/hatchControl.travel);
    },true);
    const finish=event=>{if(!drag||drag.id!==event.pointerId)return false;if(drag.whiteboard)setHasInk(true);drag=null;down=null;controls.enabled=true;event.stopImmediatePropagation();if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);schedule();return true;};
    canvas.addEventListener('pointerup',event=>{if(finish(event))return;if(!down||Math.hypot(event.clientX-down[0],event.clientY-down[1])>5)return;down=null;if(overlay&&rayFor(event).intersectObject(overlay).length)edit.current?.();},true);
    canvas.addEventListener('pointercancel',finish,true);canvas.addEventListener('lostpointercapture',event=>{if(drag?.id===event.pointerId){drag=null;down=null;controls.enabled=true;schedule();}});
    canvas.addEventListener('keydown',event=>{if(event.key==='Home'){event.preventDefault();reset();return;}if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();const spherical=new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));if(event.key==='ArrowLeft')spherical.theta-=.12;if(event.key==='ArrowRight')spherical.theta+=.12;if(event.key==='ArrowUp')spherical.phi-=.12;if(event.key==='ArrowDown')spherical.phi+=.12;spherical.makeSafe();camera.position.setFromSpherical(spherical).add(controls.target);controls.update();schedule();});
   }catch(error){if(!disposed&&error.name!=='AbortError'){setStatus('');unavailable.current?.();}}
  };start();
  const visible=()=>schedule();document.addEventListener('visibilitychange',visible);
  return()=>{disposed=true;abort.abort();cancelAnimationFrame(frame);observer?.disconnect();controls?.dispose();disposeModel(model);renderer?.dispose();renderer?.forceContextLoss();renderer?.domElement.remove();api.current=null;document.removeEventListener('visibilitychange',visible);};
 },[articleNumber,sourceRef,sliding,whiteboard]);
 useEffect(()=>{if(ready)api.current?.setSlide(slidePosition);},[ready,slidePosition]);
 useEffect(()=>{
  if(!ready)return;let timeout,version=0,disposed=false;const abort=new AbortController();
  const update=()=>{clearTimeout(timeout);const request=++version;timeout=setTimeout(async()=>{try{await document.fonts?.ready;const surfaces=api.current?.overlays||[];const canvases=await Promise.all(surfaces.map(surface=>surface.kind==='whiteboard'?whiteboardPaperCanvas(articleNumber,{signal:abort.signal}):surface.kind==='middle'?doorPaperCanvas(sourceRef.current.querySelector('[data-door-panel="middle"]'),{signal:abort.signal,articleNumber:'0602'}):surface.kind==='status'?slidingPaperCanvas(sourceRef.current,articleNumber==='0610'?'0614':articleNumber,{signal:abort.signal}):doorPaperCanvas(sourceRef.current,{signal:abort.signal,articleNumber})));if(disposed||request!==version||!api.current)return;surfaces.forEach((surface,index)=>{if(surface.kind==='whiteboard'&&hasInkRef.current)return;const result=canvases[index];if(surface.kind==='whiteboard'){surface.original=result.original;surface.blank=result.blank;}const texture=new THREE.CanvasTexture(surface.kind==='whiteboard'?result.canvas:result);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;const material=surface.mesh.material;material.map?.dispose();material.map=texture;material.needsUpdate=true;});api.current.reveal();setStatus('');}catch(error){if(!disposed&&error.name!=='AbortError')unavailable.current?.();}},90);};
  const observer=new MutationObserver(update);if(sourceRef.current&&(!sliding||['0607','0608','0610','0616'].includes(articleNumber)))observer.observe(sourceRef.current,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['font-size','x','y','href']});update();
  return()=>{disposed=true;abort.abort();clearTimeout(timeout);observer.disconnect();};
 },[ready,sourceRef,form,articleNumber,sliding]);
 return <div className="jsf-door-3d" data-hatch-position={sliding?slidePosition:undefined}><button hidden={!hasInk} style={{position:"absolute",right:24,top:20,zIndex:3,border:"1px solid #e4e2de",borderRadius:6,background:"white",padding:"6px 12px",color:"#595650"}} type="button" className="jsf-whiteboard-clear" onClick={()=>{hasInkRef.current=false;api.current?.clear();}}>Sudda</button><div ref={shadow} className="jsf-door-3d-shadow" aria-hidden="true"/><div className="jsf-door-3d-canvas" ref={host}/>{status&&<p className="jsf-door-3d-status" role="status">{status}</p>}{ready&&!status&&<><button type="button" className="jsf-door-3d-reset" onClick={()=>api.current?.reset()}>Återställ vy</button></>}</div>;
}
