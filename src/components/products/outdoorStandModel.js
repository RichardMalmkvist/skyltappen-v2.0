import * as THREE from 'three';

// Preserve the supplied post/rail cross-sections. Only their long axes change.
export function outdoorStandTemplates(scene){
 const templates=new Map();scene.updateMatrixWorld(true);
 scene.traverse(node=>{if(!node.isMesh)return;const geometry=node.geometry.clone().applyMatrix4(node.matrixWorld);geometry.computeBoundingBox();const box=geometry.boundingBox.clone(),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());geometry.translate(-center.x,-center.y,-center.z);templates.set(node.parent.name,{geometry,size,center,box});});
 if(!templates.has('stolprör1')||!templates.has('skyltlist1')||!templates.has('topplock1'))throw new Error('Stolpens delar saknas i 3D-modellen.');
 return templates;
}

export function buildOutdoorStand(templates,layout,textures){
 const model=new THREE.Group(),height=layout.heightMm/1000,panelWidth=layout.panelWidthMm/1000;
 // The visible opening is 1341 x 450 mm in the supplied assembly. Anchor
 // each profile to that opening using its original assembled coordinates.
 // This retains mating offsets; arbitrary centre positions leave gaps.
 const leftEdge=templates.get('skyltlist_stolpe1').box.max.x,rightEdge=templates.get('skyltlist_stolpe2').box.min.x;
 const referenceWidth=rightEdge-leftEdge,referenceCenter=(leftEdge+rightEdge)/2;
 const pipeTopInset=Math.max(0,templates.get('topplock1').box.max.y-templates.get('stolprör1').box.max.y);
 const anchoredX=(name,side)=>(side?panelWidth/2:-panelWidth/2)+templates.get(name).center.x-(side?rightEdge:leftEdge);
 const hardware=new THREE.MeshStandardMaterial({color:0x171717,roughness:.6,metalness:.08});
 const add=(name,x,y,z,axis,length)=>{const template=templates.get(name);if(!template)return;const mesh=new THREE.Mesh(template.geometry.clone(),hardware);mesh.name=name;if(axis)mesh.scale[axis]=length/template.size[axis];mesh.position.set(x,y,z);model.add(mesh);};
 for(const side of [0,1]){
  const post=side?'stolprör2':'stolprör1',cap=side?'topplock_MIR1':'topplock1';
  add(post,anchoredX(post,side),-pipeTopInset/2,.00025,'y',height-pipeTopInset);
  add(cap,anchoredX(cap,side),height/2-(templates.get(cap).box.max.y-templates.get(cap).center.y),.0002);
 }
 for(const [index,panel] of layout.panels.entries()){
  const panelHeight=panel.heightMm/1000,top=height/2-panel.topMm/1000,bottom=top-panelHeight;
  add('skyltlist2',templates.get('skyltlist2').center.x-referenceCenter,top+.015,.00025,'x',panelWidth+templates.get('skyltlist2').size.x-referenceWidth);
  add('skyltlist1',templates.get('skyltlist1').center.x-referenceCenter,bottom-.015,.00025,'x',panelWidth+templates.get('skyltlist1').size.x-referenceWidth);
  add('skyltlist_stolpe1',anchoredX('skyltlist_stolpe1',0),(top+bottom)/2,.00025,'y',panelHeight);
  add('skyltlist_stolpe2',anchoredX('skyltlist_stolpe2',1),(top+bottom)/2,.00025,'y',panelHeight);
  const plate=new THREE.Mesh(new THREE.BoxGeometry(panelWidth,panelHeight,.004),new THREE.MeshStandardMaterial({color:0xfafafa,roughness:.65}));plate.position.y=(top+bottom)/2;model.add(plate);
  for(const back of [false,true]){const material=new THREE.MeshBasicMaterial({color:0xffffff,map:!back||layout.doubleSided?textures[index]:null,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4});const face=new THREE.Mesh(new THREE.PlaneGeometry(panelWidth,panelHeight),material);face.position.set(0,(top+bottom)/2,back?-.00203:.00203);if(back)face.rotation.y=Math.PI;model.add(face);}
 }
 if(layout.profileStyle){
  // A folded canopy: a flat top with rounded lips on both printed sides.
  const section=new THREE.Shape();section.moveTo(-.045,0);section.lineTo(.045,0);section.quadraticCurveTo(.07,-.035,.075,-.09);section.lineTo(.071,-.09);section.quadraticCurveTo(.066,-.039,.042,-.004);section.lineTo(-.042,-.004);section.quadraticCurveTo(-.066,-.039,-.071,-.09);section.lineTo(-.075,-.09);section.quadraticCurveTo(-.07,-.035,-.045,0);
  const length=panelWidth+.06,geometry=new THREE.ExtrudeGeometry(section,{depth:length,bevelEnabled:false,curveSegments:24});geometry.rotateY(Math.PI/2);geometry.translate(-length/2,height/2-.04,0);
  const canopy=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0x303030,roughness:.45,metalness:.15,side:THREE.DoubleSide}));canopy.name='profile-canopy';model.add(canopy);
 }
 // Cover strips between the sign openings retain their actual profile as well.
 // Cover strips stop at the pipe, underneath the cap. The former start at
 // the cap's outer top made a short profile protrude through its curved lid.
 let cursor=pipeTopInset;
 const intervals=layout.panels.map(panel=>[panel.topMm/1000-.03,(panel.topMm+panel.heightMm)/1000+.03]).sort((a,b)=>a[0]-b[0]);
 const gaps=[];for(const [start,end] of intervals){if(start>cursor)gaps.push([cursor,start]);cursor=Math.max(cursor,end);}if(cursor<height)gaps.push([cursor,height]);
 for(const [start,end] of gaps)for(const side of [0,1]){
  const upper=start===pipeTopInset;
  const name=upper?(side?'täcklist_stolpe_35_MIR1':'täcklist_stolpe_351'):(side?'täcklist_stolpe_705_MIR1':'täcklist_stolpe_7051');
  add(name,anchoredX(name,side),height/2-(start+end)/2,.00025,'y',end-start);
 }
 model.userData={widthMm:layout.widthMm,heightMm:layout.heightMm,panelCount:layout.panels.length};
 return model;
}

export function disposeOutdoorStand(model){
 const materials=new Set(),textures=new Set();model?.traverse(node=>{node.geometry?.dispose();for(const material of [].concat(node.material||[])){materials.add(material);if(material.map)textures.add(material.map);}});textures.forEach(texture=>texture.dispose());materials.forEach(material=>material.dispose());
}
