// The source quadrilaterals describe the paper in the existing product photos.
export const DECAL_3D_PROFILES={
 '0720':{width:.21,height:.30,quad:[[279/1254,80/1254],[971/1254,143/1254],[976/1254,1142/1254],[284/1254,1186/1254]]},
 '0721':{width:.21,height:.30,quad:[[138/991,118/1400],[880/991,180/1400],[888/991,1255/1400],[143/991,1297/1400]]},
 '0722':{width:.21,height:.30,quad:[[136/980,110/1400],[873/980,151/1400],[880/980,1260/1400],[137/980,1310/1400]]},
 '0723':{width:.21,height:.30,quad:[[113/980,109/1400],[877/980,175/1400],[884/980,1275/1400],[118/980,1317/1400]]},
 '0724':{width:.30,height:.21,quad:[[162/1400,98/980],[1229/1400,151/980],[1246/1400,862/980],[175/1400,884/980]]}
};
// Bend only the upper-right corner along a diagonal fold, preserving UVs.
export function curlDecalPoint(x,y,width,height){
 const length=Math.min(width,height)*.16,fromCorner=(width/2-x+height/2-y)/Math.SQRT2;
 if(fromCorner>=length)return [x,y,0];
 const along=length-fromCorner,radius=length/2.4,angle=along/radius,offset=(Math.sin(angle)*radius-along)/Math.SQRT2;
 return [x+offset,y+offset,(1-Math.cos(angle))*radius];
}

export function isThinDecal3D(product){return ['0720','0721','0722','0723','0724','0737'].includes(String(product?.articleNumber||''));}
export function curlDiamondPoint(x,y){const nx=.94,ny=-.342,length=.028,along=x*nx+y*ny-(.075*nx-length);if(along<=0)return [x,y,0];const radius=length/2.6,angle=along/radius,offset=Math.sin(angle)*radius-along;return [x+nx*offset,y+ny*offset,(1-Math.cos(angle))*radius];}
