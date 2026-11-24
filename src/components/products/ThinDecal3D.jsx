import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {DECAL_3D_PROFILES,curlDecalPoint,curlDiamondPoint} from '../../data/decal3D';

// Preserve the flame from the existing 0737 photo. Rebuild the flat paper and
// red border so the photographed curl/shadow are not printed onto the 3D face.
async function decalTexture(imageUrl,articleNumber){
 const image=new Image();image.crossOrigin='anonymous';image.src=imageUrl;await image.decode();
 const profile=DECAL_3D_PROFILES[articleNumber];
 if(profile){
  const source=document.createElement('canvas');source.width=image.naturalWidth;source.height=image.naturalHeight;const sourceCtx=source.getContext('2d',{willReadFrequently:true});sourceCtx.drawImage(image,0,0);const pixels=sourceCtx.getImageData(0,0,source.width,source.height).data;
  const canvas=document.createElement('canvas');canvas.width=Math.round(1600*profile.width/Math.max(profile.width,profile.height));canvas.height=Math.round(1600*profile.height/Math.max(profile.width,profile.height));const ctx=canvas.getContext('2d'),result=ctx.createImageData(canvas.width,canvas.height),[tl,tr,br,bl]=profile.quad;
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
   const u=x/(canvas.width-1),v=y/(canvas.height-1),sx=(tl[0]*(1-u)*(1-v)+tr[0]*u*(1-v)+br[0]*u*v+bl[0]*(1-u)*v)*source.width,sy=(tl[1]*(1-u)*(1-v)+tr[1]*u*(1-v)+br[1]*u*v+bl[1]*(1-u)*v)*source.height,i=(Math.max(0,Math.min(source.height-1,Math.round(sy)))*source.width+Math.max(0,Math.min(source.width-1,Math.round(sx))))*4,o=(y*canvas.width+x)*4,r=pixels[i],g=pixels[i+1],b=pixels[i+2];
   const red=r>90&&r>g*1.7&&r>b*1.4,black=Math.max(r,g,b)<150&&Math.max(r,g,b)-Math.min(r,g,b)<35,inside=u>.015&&u<.985&&v>.015&&v<.985&&!(u>.80&&v<.21)&&!(u>.91&&v<.34);
   const amount=inside&&black?Math.min(1,(150-Math.max(r,g,b))/35):0;
   result.data[o]=red&&inside?225:Math.round(255-225*amount);result.data[o+1]=red&&inside?12:Math.round(255-225*amount);result.data[o+2]=red&&inside?20:Math.round(255-225*amount);result.data[o+3]=255;
  }
  ctx.putImageData(result,0,0);
  // The photo's peeled corner hides a short section of the printed border.
  // Continue that border on the unfolded texture before bending the paper.
  const landscape=articleNumber==='0724',right=landscape?.87:.895,top=.10,radius=landscape?.045:.075,sy=canvas.width/canvas.height;
  ctx.strokeStyle='#1e1e1e';ctx.lineWidth=canvas.width*(landscape?.010:.018);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(canvas.width*.775,canvas.height*top);ctx.lineTo(canvas.width*(right-radius),canvas.height*top);ctx.quadraticCurveTo(canvas.width*right,canvas.height*top,canvas.width*right,canvas.height*(top+radius*sy));ctx.lineTo(canvas.width*right,canvas.height*.245);ctx.stroke();
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
 }
 const sample=document.createElement('canvas');sample.width=1024;sample.height=1024;
 const ctx=sample.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,1024,1024);
 const pixels=ctx.getImageData(0,0,1024,1024),ink=document.createElement('canvas');ink.width=ink.height=1024;const inkCtx=ink.getContext('2d'),mask=inkCtx.createImageData(1024,1024);let count=0;
 for(let y=230;y<740;y++)for(let x=280;x<750;x++){
  const i=(y*1024+x)*4,r=pixels.data[i],g=pixels.data[i+1],b=pixels.data[i+2];
  if(Math.max(r,g,b)<150&&Math.max(r,g,b)-Math.min(r,g,b)<30){mask.data[i]=mask.data[i+1]=mask.data[i+2]=30;mask.data[i+3]=Math.min(255,(150-Math.max(r,g,b))*4);count++;}
 }
 if(count<1000)throw new Error('Dekalens motiv kunde inte läsas.');inkCtx.putImageData(mask,0,0);
 ctx.clearRect(0,0,1024,1024);const diamond=(inset,color)=>{ctx.beginPath();ctx.moveTo(512,inset);ctx.lineTo(1024-inset,512);ctx.lineTo(512,1024-inset);ctx.lineTo(inset,512);ctx.closePath();ctx.fillStyle=color;ctx.fill();};
 diamond(0,'#fff');diamond(10,'#e30921');diamond(96,'#fff');ctx.drawImage(ink,0,0);
 const texture=new THREE.CanvasTexture(sample);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
}
export default function ThinDecal3D({image,articleNumber='0737',onUnavailable}){
 const profile=DECAL_3D_PROFILES[articleNumber],width=profile?.width||.15,height=profile?.height||.15;
 const host=useRef(null),shadow=useRef(null),resetRef=useRef(null),failure=useRef(onUnavailable);failure.current=onUnavailable;
 const [ready,setReady]=useState(false);
 useEffect(()=>{
  let disposed=false,renderer,controls,observer,texture,body,face,frame=0;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.01,2),model=new THREE.Group(),container=host.current;
  const schedule=()=>{if(!disposed&&!frame)frame=requestAnimationFrame(()=>{frame=0;const moving=controls?.update();if(renderer&&face){renderer.render(scene,camera);renderer.domElement.style.visibility='visible';const box=new THREE.Box3().setFromObject(model),points=[];for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])points.push(new THREE.Vector3(x,y,z).project(camera));const w=container.clientWidth,h=container.clientHeight,left=(Math.min(...points.map(p=>p.x))+1)*w/2,right=(Math.max(...points.map(p=>p.x))+1)*w/2,bottom=(1-Math.min(...points.map(p=>p.y)))*h/2;Object.assign(shadow.current.style,{left:(left+right)/2+'px',top:Math.min(bottom+52,h-34)+'px',width:(right-left)*.65+'px',opacity:'.12'});}if(moving)schedule();});};
  const distance=()=>{const tan=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));return Math.max(width/(2*tan*camera.aspect*.68),height/(2*tan*.68));};
  const reset=()=>{if(!controls)return;controls.target.set(0,0,0);camera.position.set(profile?.08:.20,.025,1).normalize().multiplyScalar(distance());controls.update();schedule();};resetRef.current=reset;
  const start=async()=>{try{
   renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0xffffff,0);renderer.domElement.style.visibility='hidden';renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','3D-dekal. Dra för att rotera, nyp för att zooma. Home återställer vyn.');container.append(renderer.domElement);
   controls=new OrbitControls(camera,renderer.domElement);controls.enablePan=false;controls.enableDamping=true;controls.dampingFactor=.12;controls.minDistance=.18;controls.maxDistance=1.2;controls.addEventListener('change',schedule);
   scene.add(new THREE.HemisphereLight(0xffffff,0xaaaaaa,1));const light=new THREE.DirectionalLight(0xffffff,1.5);light.position.set(-1,2,3);scene.add(light);
   const resize=()=>{const {width,height}=container.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();if(face)reset();};observer=new ResizeObserver(resize);observer.observe(container);resize();
   texture=await decalTexture(image,articleNumber);if(disposed){texture.dispose();return;}
   let geometry;
   if(profile){
    geometry=new THREE.PlaneGeometry(width,height,100,140);const p=geometry.attributes.position;for(let i=0;i<p.count;i++){const [x,y,z]=curlDecalPoint(p.getX(i),p.getY(i),width,height);p.setXYZ(i,x,y,z);}geometry.computeVertexNormals();
    body=new THREE.Mesh(geometry.clone(),new THREE.MeshStandardMaterial({color:0xf7f7f7,roughness:.45,metalness:0,side:THREE.BackSide}));body.position.z=-.00015;model.add(body);
   }else{
    // A densely subdivided square, rotated into the diamond silhouette. Its
    // right-hand tip peels forward; the underside remains plain white.
    geometry=new THREE.PlaneGeometry(.15/Math.SQRT2,.15/Math.SQRT2,140,140);geometry.rotateZ(Math.PI/4);const uv=geometry.attributes.uv,p=geometry.attributes.position;
    for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);uv.setXY(i,(x+.075)/.15,(y+.075)/.15);const point=curlDiamondPoint(x,y);p.setXYZ(i,...point);}uv.needsUpdate=true;geometry.computeVertexNormals();
    body=new THREE.Mesh(geometry.clone(),new THREE.MeshStandardMaterial({color:0xf7f7f7,roughness:.45,metalness:0,side:THREE.BackSide}));body.position.z=-.00015;model.add(body);
   }
   face=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({map:texture,roughness:.5,metalness:0,emissive:0xffffff,emissiveMap:texture,emissiveIntensity:.28,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4}));face.position.z=.00002;model.add(face);scene.add(model);reset();setReady(true);schedule();
   renderer.domElement.addEventListener('keydown',event=>{if(event.key==='Home'){event.preventDefault();reset();}else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();const s=new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));s.theta+=event.key==='ArrowLeft'?-.12:event.key==='ArrowRight'?.12:0;s.phi+=event.key==='ArrowUp'?-.12:event.key==='ArrowDown'?.12:0;s.makeSafe();camera.position.setFromSpherical(s).add(controls.target);controls.update();schedule();}});
  }catch(error){if(!disposed)failure.current?.();}};start();
  return()=>{disposed=true;cancelAnimationFrame(frame);observer?.disconnect();controls?.dispose();texture?.dispose();for(const mesh of [body,face]){mesh?.geometry.dispose();mesh?.material.dispose();}renderer?.dispose();renderer?.forceContextLoss();renderer?.domElement.remove();resetRef.current=null;};
 },[image,articleNumber,width,height,profile]);
 return <div className="jsf-door-3d" data-thin-decal={articleNumber}><div ref={shadow} className="jsf-door-3d-shadow" aria-hidden="true"/><div ref={host} className="jsf-door-3d-canvas"/>{!ready?<p role="status" className="jsf-door-3d-status">Laddar 3D-vyn…</p>:<button type="button" className="jsf-door-3d-reset" onClick={()=>resetRef.current?.()}>Återställ vy</button>}</div>;
}
