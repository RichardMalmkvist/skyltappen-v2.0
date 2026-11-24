import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {flagPhotoPoint} from '../../data/flagSign3D';

async function flagTexture(imageUrl,articleNumber){
 const image=new Image();image.crossOrigin='anonymous';image.src=imageUrl;await image.decode();
 const source=document.createElement('canvas');source.width=image.naturalWidth;source.height=image.naturalHeight;const input=source.getContext('2d',{willReadFrequently:true});input.drawImage(image,0,0);const pixels=input.getImageData(0,0,source.width,source.height).data;
 const canvas=document.createElement('canvas');canvas.width=1190;canvas.height=1610;const ctx=canvas.getContext('2d'),output=ctx.createImageData(canvas.width,canvas.height);
 for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
  const quad=articleNumber==='0710'?[[424/1343,151/1171],[999/1343,195/1171],[990/1343,977/1171],[426/1343,1030/1171]]:undefined;
  const [u,v]=flagPhotoPoint(x/(canvas.width-1),y/(canvas.height-1),quad),sx=Math.max(0,Math.min(source.width-1.001,u*source.width)),sy=Math.max(0,Math.min(source.height-1.001,v*source.height)),ix=Math.floor(sx),iy=Math.floor(sy),fx=sx-ix,fy=sy-iy,o=(y*canvas.width+x)*4;
  const sample=k=>pixels[(iy*source.width+ix)*4+k]*(1-fx)*(1-fy)+pixels[(iy*source.width+ix+1)*4+k]*fx*(1-fy)+pixels[((iy+1)*source.width+ix)*4+k]*(1-fx)*fy+pixels[((iy+1)*source.width+ix+1)*4+k]*fx*fy,r=sample(0),g=sample(1),b=sample(2);
  // Remove photographic lighting from the white aluminium and printed colours.
  const red=r>g*1.35&&r>b*1.15,green=g>r*1.25&&g>b*1.08,coverage=red?Math.min(1,Math.max(0,(r-Math.max(g,b)-5)/24)):green?Math.min(1,Math.max(0,(g-r-5)/24)):0,ink=red?[193,15,48]:[0,140,77];
  for(let k=0;k<3;k++)output.data[o+k]=Math.round(255+(ink[k]-255)*coverage);output.data[o+3]=255;
 }
 ctx.putImageData(output,0,0);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
}
// Only the speech-bubble tip changes direction. Keep the lettering readable.
function wallFacingBackTexture(frontTexture){
 const source=frontTexture.image,canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;const ctx=canvas.getContext('2d'),tipTop=Math.floor(canvas.height*.70);ctx.drawImage(source,0,0);ctx.save();ctx.translate(canvas.width,0);ctx.scale(-1,1);ctx.drawImage(source,0,tipTop,canvas.width,canvas.height-tipTop,0,tipTop,canvas.width,canvas.height-tipTop);ctx.restore();
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
}
function flagFaceGeometry(){
 const w=.17,h=.23,r=.0127,shape=new THREE.Shape();shape.moveTo(-w/2+r,-h/2);shape.lineTo(w/2-r,-h/2);shape.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);shape.lineTo(w/2,h/2-r);shape.quadraticCurveTo(w/2,h/2,w/2-r,h/2);shape.lineTo(-w/2+r,h/2);shape.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);shape.lineTo(-w/2,-h/2+r);shape.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
 const geometry=new THREE.ShapeGeometry(shape,16),p=geometry.attributes.position,uv=geometry.attributes.uv;for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/w+.5,p.getY(i)/h+.5);return geometry;
}
export default function FlagSign3D({image,articleNumber,onUnavailable}){
 const width=.17,height=.23;
 const host=useRef(null),shadow=useRef(null),resetRef=useRef(null),failure=useRef(onUnavailable);failure.current=onUnavailable;
 const [ready,setReady]=useState(false);
 useEffect(()=>{
  let disposed=false,renderer,controls,observer,texture,backTexture,body,face,back,frame=0;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.01,2),model=new THREE.Group(),container=host.current;
  const schedule=()=>{if(!disposed&&!frame)frame=requestAnimationFrame(()=>{frame=0;const moving=controls?.update();if(renderer&&face){renderer.render(scene,camera);renderer.domElement.style.visibility='visible';const box=new THREE.Box3().setFromObject(model),points=[];for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])points.push(new THREE.Vector3(x,y,z).project(camera));const w=container.clientWidth,h=container.clientHeight,left=(Math.min(...points.map(p=>p.x))+1)*w/2,right=(Math.max(...points.map(p=>p.x))+1)*w/2,bottom=(1-Math.min(...points.map(p=>p.y)))*h/2;Object.assign(shadow.current.style,{left:(left+right)/2+'px',top:Math.min(bottom+52,h-34)+'px',width:(right-left)*.65+'px',opacity:'.12'});}if(moving)schedule();});};
  const distance=()=>{const tan=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));return Math.max(width/(2*tan*camera.aspect*.68),height/(2*tan*.68));};
  const reset=()=>{if(!controls)return;const damping=controls.enableDamping;controls.enableDamping=false;controls.update();controls.target.set(0,0,0);camera.position.set(-.25,.08,1).normalize().multiplyScalar(distance());controls.update();controls.enableDamping=damping;schedule();};resetRef.current=reset;
  const start=async()=>{try{
   renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0xffffff,0);renderer.domElement.style.visibility='hidden';renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','3D-flaggskylt med tryck på båda sidor. Dra för att rotera, nyp för att zooma. Home återställer vyn.');container.append(renderer.domElement);
   controls=new OrbitControls(camera,renderer.domElement);controls.enablePan=false;controls.enableDamping=true;controls.dampingFactor=.12;controls.minDistance=.18;controls.maxDistance=1.2;controls.addEventListener('change',schedule);
   scene.add(new THREE.AmbientLight(0xffffff,2.3));const light=new THREE.DirectionalLight(0xffffff,.16);light.position.set(-1,2,3);scene.add(light);
   const resize=()=>{const {width,height}=container.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();if(face)reset();};observer=new ResizeObserver(resize);observer.observe(container);resize();
   texture=await flagTexture(image,articleNumber);if(disposed){texture.dispose();return;}
   const response=await fetch((process.env.PUBLIC_URL||'')+'/models/flag-sign.glb');if(!response.ok)throw new Error('Modellen kunde inte hämtas.');const gltf=await new GLTFLoader().parseAsync(await response.arrayBuffer(),'');gltf.scene.updateMatrixWorld(true);let mesh;gltf.scene.traverse(node=>{if(node.isMesh)mesh=node;});if(!mesh)throw new Error('Flaggskyltens geometri saknas.');
   const geometry=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);geometry.rotateY(-Math.PI/2);geometry.translate(-.085,-.115,-.00075);geometry.computeVertexNormals();gltf.scene.traverse(node=>{node.geometry?.dispose();for(const material of [].concat(node.material||[]))material.dispose();});if(disposed){geometry.dispose();return;}
   body=new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({color:0xffffff,emissive:0xffffff,emissiveIntensity:.12,side:THREE.DoubleSide}));model.add(body);
   // Separate outward-facing planes keep the back print readable, not mirrored.
   face=new THREE.Mesh(flagFaceGeometry(),new THREE.MeshBasicMaterial({map:texture,color:0xfafafa}));face.position.z=.00078;
   backTexture=articleNumber==='0739'?wallFacingBackTexture(texture):texture;
   back=new THREE.Mesh(flagFaceGeometry(),new THREE.MeshBasicMaterial({map:backTexture,color:0xfafafa}));back.rotation.y=Math.PI;back.position.z=-.00078;model.add(face,back);scene.add(model);reset();setReady(true);schedule();
   renderer.domElement.addEventListener('keydown',event=>{if(event.key==='Home'){event.preventDefault();reset();}else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();const s=new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));s.theta+=event.key==='ArrowLeft'?-.12:event.key==='ArrowRight'?.12:0;s.phi+=event.key==='ArrowUp'?-.12:event.key==='ArrowDown'?.12:0;s.makeSafe();camera.position.setFromSpherical(s).add(controls.target);controls.update();schedule();}});
  }catch(error){if(!disposed)failure.current?.();}};start();
  return()=>{disposed=true;cancelAnimationFrame(frame);observer?.disconnect();controls?.dispose();texture?.dispose();if(backTexture!==texture)backTexture?.dispose();for(const mesh of [body,face,back]){mesh?.geometry.dispose();mesh?.material.dispose();}renderer?.dispose();renderer?.forceContextLoss();renderer?.domElement.remove();resetRef.current=null;};
 },[image,articleNumber,width,height]);
 return <div className="jsf-door-3d" data-flag-sign-3d={articleNumber}><div ref={shadow} className="jsf-door-3d-shadow" aria-hidden="true"/><div ref={host} className="jsf-door-3d-canvas"/>{!ready?<p role="status" className="jsf-door-3d-status">Laddar 3D-vyn…</p>:<button type="button" className="jsf-door-3d-reset" onClick={()=>resetRef.current?.()}>Återställ vy</button>}</div>;
}
