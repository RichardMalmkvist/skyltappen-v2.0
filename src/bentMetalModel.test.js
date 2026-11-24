import fs from 'fs';
import path from 'path';
import {stretchBentCoordinate,supportsBentMetal3D} from './data/bentMetalModel';
test('Changing width translates each bend without changing its radius',()=>{
 const old=[.144,.146,.148,.150];const next=old.map(x=>stretchBentCoordinate(x,.3,.6));expect(next[3]-next[0]).toBeCloseTo(.006,8);expect(next[3]).toBeCloseTo(.3,8);expect(stretchBentCoordinate(0,.3,.6)).toBe(0);
});
test('The actual imported plate retains depth when stretched to the largest article',()=>{
 const file=fs.readFileSync(path.join(__dirname,'../public/models/bent-metal-300x210x25.glb')),jsonLength=file.readUInt32LE(12),gltf=JSON.parse(file.subarray(20,20+jsonLength).toString()),binary=file.subarray(28+jsonLength),accessor=gltf.accessors[0],view=gltf.bufferViews[accessor.bufferView],stride=view.byteStride||12;
 const points=Array.from({length:accessor.count},(_,i)=>[0,1,2].map(k=>binary.readFloatLE((view.byteOffset||0)+(accessor.byteOffset||0)+i*stride+k*4)*.01));
 const min=[0,1,2].map(k=>Math.min(...points.map(p=>p[k]))),max=[0,1,2].map(k=>Math.max(...points.map(p=>p[k]))),center=min.map((v,k)=>(v+max[k])/2);
 for(const [w,h] of [[.1,.06],[.6,.4],[2,1]]){
  const changed=points.map(p=>[stretchBentCoordinate(p[0]-center[0],.3,w),stretchBentCoordinate(p[1]-center[1],.21,h),p[2]-center[2]]);
  const size=[0,1,2].map(k=>Math.max(...changed.map(p=>p[k]))-Math.min(...changed.map(p=>p[k])));expect(size[0]).toBeCloseTo(w,6);expect(size[1]).toBeCloseTo(h,6);expect(size[2]).toBeCloseTo(.025,6);
 }
});
test('Only folded aluminium and the complete parking sign use the model',()=>{for(const n of ['1230','1231','1232','1233','1234','1501'])expect(supportsBentMetal3D({articleNumber:n})).toBe(true);for(const n of ['1235','1236','0706','1502'])expect(supportsBentMetal3D({articleNumber:n})).toBe(false);});
