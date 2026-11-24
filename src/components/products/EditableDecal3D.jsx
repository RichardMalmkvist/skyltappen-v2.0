import {editableSignThicknessMm} from '../../data/product3DView';
import {directionPanelHeight,directionPanelSigns,updateDirectionPanel} from '../../data/directionSigns';
import DibondInteraction from './DibondInteraction';
import {newDibondSign} from '../../data/dibondHelpers';
import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {dibondCornerRadius} from '../../data/dibondHelpers';

import {printTexture} from './liveSignTexture';

// Double-folded A4 acrylic: two leaves joined by a rounded bottom bend.
function syncAcrylicPocket(model,source,width,height,thickness,remove=false){
 const graphic=remove?null:source?.querySelector('[data-acrylic-pocket]');
 const old=model?.userData.acrylicPocket;
 const key=graphic?[graphic.getAttribute('transform'),width,height,thickness].join('|'):'';
 if(old?.userData.key===key)return;
 if(old){model.remove(old);old.traverse(object=>{object.geometry?.dispose();object.material?.dispose();});delete model.userData.acrylicPocket;}
 if(!graphic||!model)return;
 const offsets=(graphic.getAttribute('transform')||'').match(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/gi)||[];
 const x=(Number(offsets[0])||0)/1000-width/2,y=height/2-(Number(offsets[1])||0)/1000;
 const w=.210,h=.297,r=.00225,t=.0015,s=new THREE.Shape();
 s.moveTo(0,h);s.lineTo(0,r);s.quadraticCurveTo(0,0,-r,0);s.quadraticCurveTo(-2*r,0,-2*r,r);s.lineTo(-2*r,h-.003);s.lineTo(-2*r+t,h-.003);s.lineTo(-2*r+t,r);s.quadraticCurveTo(-2*r+t,t,-r,t);s.quadraticCurveTo(-t,t,-t,r);s.lineTo(-t,h);s.closePath();
 const geometry=new THREE.ExtrudeGeometry(s,{depth:w,bevelEnabled:false,curveSegments:20});geometry.rotateY(Math.PI/2);
 const material=new THREE.MeshPhysicalMaterial({color:0xe8f5fa,transparent:true,opacity:.23,roughness:.09,metalness:0,clearcoat:1,clearcoatRoughness:.05,side:THREE.DoubleSide,depthWrite:false});
 const pocket=new THREE.Group();pocket.userData.key=key;pocket.add(new THREE.Mesh(geometry,material));
 const edge=new THREE.LineSegments(new THREE.EdgesGeometry(geometry,35),new THREE.LineBasicMaterial({color:0x829ba5,transparent:true,opacity:.38}));pocket.add(edge);
 const glint=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(.018,h-.052,2*r+.0001),new THREE.Vector3(.043,h-.027,2*r+.0001),new THREE.Vector3(w-.044,.028,2*r+.0001),new THREE.Vector3(w-.018,.054,2*r+.0001)]);
 pocket.add(new THREE.LineSegments(glint,new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.65})));
 pocket.position.set(x,y-h,thickness/2+.0002);model.add(pocket);model.userData.acrylicPocket=pocket;
}

function decalShape(width,height,radius){
 const x=-width/2,y=-height/2,r=Math.max(0,Math.min(radius,width/2,height/2)),shape=new THREE.Shape();
 shape.moveTo(x+r,y);shape.lineTo(x+width-r,y);shape.quadraticCurveTo(x+width,y,x+width,y+r);shape.lineTo(x+width,y+height-r);shape.quadraticCurveTo(x+width,y+height,x+width-r,y+height);shape.lineTo(x+r,y+height);shape.quadraticCurveTo(x,y+height,x,y+height-r);shape.lineTo(x,y+r);shape.quadraticCurveTo(x,y,x+r,y);return shape;
}
export default function EditableDecal3D({sourceRef,form,product,articleNumber,onUnavailable,onEditFront,onSignChange,frontViewRequest=0}){
 const thicknessMm=editableSignThicknessMm({...product,articleNumber}),thickness=thicknessMm/1000;
 const defaultWidth=Number(product?.dibondConfig?.defaultWidthMm)||300,defaultHeight=Number(product?.dibondConfig?.defaultHeightMm)||210;
 const editor=useRef(null),editingRef=useRef(false),host=useRef(null),shadow=useRef(null),api=useRef(null),failure=useRef(onUnavailable);failure.current=onUnavailable;
 const [loaded,setLoaded]=useState(false),[ready,setReady]=useState(false),[editing,setEditing]=useState(false);
 editingRef.current=editing;
 const beginEdit=()=>{editingRef.current=true;setEditing(true);api.current?.reset();onEditFront?.();};
 useEffect(()=>{
  let disposed=false,renderer,controls,observer,model,plate,front,back,outline,dimensions,frame=0,visible=false;const abort=new AbortController(),container=host.current,scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.005,30);
  const bounds=()=>new THREE.Box3().setFromObject(model);
  const schedule=()=>{if(!disposed&&!frame)frame=requestAnimationFrame(()=>{frame=0;const moving=controls?.update();if(visible&&renderer){renderer.render(scene,camera);renderer.domElement.style.visibility='visible';const b=bounds(),points=[];for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z])points.push(new THREE.Vector3(x,y,z).project(camera));const w=container.clientWidth,h=container.clientHeight,left=(Math.min(...points.map(p=>p.x))+1)*w/2,right=(Math.max(...points.map(p=>p.x))+1)*w/2,bottom=(1-Math.min(...points.map(p=>p.y)))*h/2;Object.assign(shadow.current.style,{left:(left+right)/2+'px',top:Math.min(bottom+50,h-34)+'px',width:(right-left)*.65+'px',opacity:'.14'});if(editor.current){const dims=plate.geometry.boundingBox.getSize(new THREE.Vector3()),a=new THREE.Vector3(-dims.x/2,dims.y/2,front.position.z).project(camera),b=new THREE.Vector3(dims.x/2,-dims.y/2,front.position.z).project(camera);Object.assign(editor.current.style,{left:(a.x+1)*w/2+'px',top:(1-a.y)*h/2+'px',width:(b.x-a.x)*w/2+'px',height:(a.y-b.y)*h/2+'px'});}}if(moving)schedule();});};
  const fit=()=>{const size=bounds().getSize(new THREE.Vector3()),tan=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));return Math.max(size.x/(2*tan*camera.aspect*.72),size.y/(2*tan*.68))+size.z;};
  const reset=(frontView=false)=>{if(!model)return;const damping=controls.enableDamping;controls.enableDamping=false;controls.update();camera.position.set(frontView?0:.30,frontView?0:.12,1).normalize().multiplyScalar(fit());controls.target.set(0,0,0);controls.maxDistance=Math.max(1.2,fit()*4);controls.update();controls.enableDamping=damping;schedule();};
  const start=async()=>{try{
   renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0xffffff,0);const canvas=renderer.domElement;canvas.style.visibility='hidden';canvas.tabIndex=0;canvas.setAttribute('aria-label',(thicknessMm>=1?'3D-vy av skylt, '+thicknessMm+' mm tjock.':'3D-vy av dekal.')+' Dra för att rotera. Home återställer vyn.');container.append(canvas);
   controls=new OrbitControls(camera,canvas);controls.enablePan=false;controls.enableDamping=true;controls.dampingFactor=.12;controls.minDistance=.06;controls.addEventListener('change',schedule);controls.addEventListener('start',()=>{editingRef.current=false;setEditing(false);});scene.add(new THREE.HemisphereLight(0xffffff,0x999999,1.5));const light=new THREE.DirectionalLight(0xffffff,2.5);light.position.set(-1,2,3);scene.add(light);
   const resize=()=>{const {width,height}=container.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();if(model)reset(editingRef.current);};observer=new ResizeObserver(resize);observer.observe(container);resize();
   plate=new THREE.Mesh(new THREE.BoxGeometry(1,1,thickness),new THREE.MeshStandardMaterial({color:0xf4f4f4,roughness:.65,metalness:0}));
   front=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({color:0xffffff,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4}));front.position.z=thickness/2+.00002;
   back=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({color:0xffffff,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4}));back.position.z=-thickness/2-.00002;back.rotation.y=Math.PI;
   model=new THREE.Group();model.add(plate,front,back);scene.add(model);
   api.current={reset:()=>reset(true),update:async(width,height,radius,doubleSided,texture,panels)=>{
    const layoutKey=JSON.stringify(panels),changed=!dimensions||dimensions.width!==width||dimensions.height!==height||dimensions.radius!==radius||dimensions.layoutKey!==layoutKey;
    if(changed){const shapes=panels.map(panel=>new THREE.Shape(decalShape(width,panel.height,radius).getPoints(64).map(point=>new THREE.Vector2(point.x,point.y+height/2-panel.top-panel.height/2))));plate.geometry.dispose();plate.geometry=new THREE.ExtrudeGeometry(shapes,{depth:thickness,bevelEnabled:false,curveSegments:16});plate.geometry.translate(0,0,-thickness/2);plate.geometry.computeBoundingBox();for(const face of [front,back]){face.geometry.dispose();face.geometry=new THREE.ShapeGeometry(shapes,16);const uv=face.geometry.attributes.uv,p=face.geometry.attributes.position;for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/width+.5,p.getY(i)/height+.5);uv.needsUpdate=true;}if(outline){model.remove(outline);outline.geometry.dispose();outline.material.dispose();}outline=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(shapes.flatMap(shape=>{const points=shape.getPoints();return points.flatMap((point,index)=>{const next=points[(index+1)%points.length];return [new THREE.Vector3(point.x,point.y,thickness/2+.00004),new THREE.Vector3(next.x,next.y,thickness/2+.00004)];});})),new THREE.LineBasicMaterial({color:0xc9c9c9,depthTest:false,transparent:true,opacity:.65}));model.add(outline);dimensions={width,height,radius,layoutKey};}
    syncAcrylicPocket(model,sourceRef.current,width,height,thickness);front.material.map?.dispose();front.material.map=texture;front.material.needsUpdate=true;back.material.map=doubleSided?texture:null;back.material.needsUpdate=true;
    if(!visible||changed)reset(editingRef.current);visible=true;setReady(true);schedule();
   }};setLoaded(true);
   canvas.addEventListener('keydown',event=>{if(event.key==='Home'){event.preventDefault();editingRef.current=true;setEditing(true);reset(true);}else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();editingRef.current=false;setEditing(false);const s=new THREE.Spherical().setFromVector3(camera.position);s.theta+=event.key==='ArrowLeft'?-.12:event.key==='ArrowRight'?.12:0;s.phi+=event.key==='ArrowUp'?-.12:event.key==='ArrowDown'?.12:0;s.makeSafe();camera.position.setFromSpherical(s);controls.update();schedule();}});
  }catch(error){if(!disposed&&error.name!=='AbortError')failure.current?.();}};start();
  return()=>{disposed=true;abort.abort();cancelAnimationFrame(frame);observer?.disconnect();controls?.dispose();syncAcrylicPocket(model,null,0,0,0,true);for(const m of [plate,front,back,outline]){m?.geometry.dispose();if(m===front)m?.material.map?.dispose();m?.material.dispose();}renderer?.dispose();renderer?.forceContextLoss();renderer?.domElement.remove();api.current=null;};
 },[articleNumber,thickness,thicknessMm,sourceRef]);
 useEffect(()=>{if(!loaded)return;let disposed=false,version=0,timer;const abort=new AbortController();const update=()=>{clearTimeout(timer);const request=++version;timer=setTimeout(async()=>{try{await document.fonts.ready;const sign=form?.dibondSign,w=Math.max(30,Number(sign?.widthMm)||defaultWidth),direction=sign?.outdoorSign?.kind==='direction',h=direction?directionPanelHeight(sign):Math.max(30,Number(sign?.heightMm)||defaultHeight);let top=0;const panels=direction?directionPanelSigns(sign).map(panel=>{const item={height:Number(panel.heightMm)/1000,top:top/1000};top+=Number(panel.heightMm)+Number(sign.outdoorSign.panelGapMm??25);return item;}):[{height:h/1000,top:0}];const texture=await printTexture(sourceRef.current,w,h,abort.signal);if(disposed||request!==version||!api.current){texture.dispose();return;}await api.current.update(w/1000,h/1000,dibondCornerRadius(product,form?.dibondSign)/1000,form?.dibondSign?.outdoorSign?.doubleSided??['1004','1006','1104','1106'].includes(articleNumber),texture,panels);}catch(error){if(!disposed&&error.name!=='AbortError')failure.current?.();}},editingRef.current?16:80);};const observer=new MutationObserver(update);observer.observe(sourceRef.current,{childList:true,subtree:true,attributes:true,characterData:true});update();return()=>{disposed=true;abort.abort();clearTimeout(timer);observer.disconnect();};},[loaded,form,sourceRef,defaultWidth,defaultHeight,product,articleNumber]);
 useEffect(()=>{if(ready&&frontViewRequest){editingRef.current=true;setEditing(true);api.current?.reset();}},[frontViewRequest,ready]);
 useEffect(()=>{if(editing)api.current?.reset();},[editing]);
 const editableSign=form?.dibondSign||newDibondSign(product);
 return <div className="jsf-door-3d" data-editable-decal={articleNumber} data-thickness-mm={thicknessMm} data-front-editing={editing||undefined}><div className="jsf-door-3d-shadow" ref={shadow} aria-hidden="true"/><div className="jsf-door-3d-canvas" ref={host}/>
 {editing&&['dibond_sign','parking_sign'].includes(product?.previewType)&&<svg ref={editor} className="jsf-bent-direct-editor" viewBox={'0 0 '+editableSign.widthMm+' '+(editableSign.outdoorSign?.kind==='direction'?directionPanelHeight(editableSign):editableSign.heightMm)} style={{position:'absolute',overflow:'visible',pointerEvents:'none',zIndex:2}}><g style={{pointerEvents:'auto'}}>{editableSign.outdoorSign?.kind==='direction'?directionPanelSigns(editableSign).map((panel,index,panels)=><g key={index} transform={'translate(0 '+(panels.slice(0,index).reduce((sum,p)=>sum+Number(p.heightMm),0)+index*Number(editableSign.outdoorSign.panelGapMm??25))+')'}><DibondInteraction sign={panel} selectionScope={editableSign} selectionPanel={index} onChange={next=>onSignChange(updateDirectionPanel(editableSign,index,next))}/></g>):<DibondInteraction sign={editableSign} selectionScope={editableSign} onChange={onSignChange}/>}</g></svg>}
 {ready?<button type="button" className="jsf-door-3d-reset" onClick={beginEdit}>Återställ vy</button>:<p role="status" className="jsf-door-3d-status">Laddar 3D-vyn…</p>}</div>;
}
