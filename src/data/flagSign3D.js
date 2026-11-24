export const FLAG_SIGN_ARTICLES=['0707','0708','0709','0710','0738','0739'];
export const supportsFlagSign3D=product=>FLAG_SIGN_ARTICLES.includes(String(product?.articleNumber||''));
// Front face of the existing product photograph; mounting flange is excluded.
export const FLAG_PHOTO_QUAD=[[426/1343,151/1171],[999/1343,195/1171],[988/1343,951/1171],[433/1343,1004/1171]];
// Project a unit square onto a photographed planar quadrilateral.
export function flagPhotoPoint(u,v,quad=FLAG_PHOTO_QUAD){
 const [a,b,c,d]=quad,dx=b[0]-c[0],ex=d[0]-c[0],sx=a[0]-b[0]+c[0]-d[0],dy=b[1]-c[1],ey=d[1]-c[1],sy=a[1]-b[1]+c[1]-d[1],det=dx*ey-ex*dy,g=(sx*ey-ex*sy)/det,h=(dx*sy-sx*dy)/det,q=1+g*u+h*v;
 return [(a[0]+(b[0]-a[0]+g*b[0])*u+(d[0]-a[0]+h*d[0])*v)/q,(a[1]+(b[1]-a[1]+g*b[1])*u+(d[1]-a[1]+h*d[1])*v)/q];
}
