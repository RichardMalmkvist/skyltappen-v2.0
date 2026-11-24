import {useId} from 'react';
import SlidingRoomSignPreview from './SlidingRoomSignPreview';
import {cleanDoorPhoto0608Url} from '../../data/cleanDoorPhoto0608';

const photoSource=articleNumber=>String(articleNumber).padStart(4,'0')==='0608'?cleanDoorPhoto0608Url:`${process.env.PUBLIC_URL||''}/door-photo-${String(articleNumber).padStart(4,'0')}.webp`;

export function DoorPhotoBlankWhiteboard({profile,articleNumber}) {
 const [x,y,w,h]=profile.whiteboard,[iw,ih]=profile.size;
 const source=photoSource(articleNumber);
 return <svg width="100%" height="100%" viewBox={`0 ${y} 4 ${h}`} preserveAspectRatio="none" style={{position:'absolute',inset:0,pointerEvents:'none'}} aria-hidden="true"><image href={source} x={-(x+w-24)} width={iw} height={ih}/></svg>;
}

// Replace only the printed insert, using a blank vertical sample of the same
// photograph. The original frame, reflections and pen tray stay untouched.
export default function DoorPhotoSurface({profile,articleNumber,width,height,interactive=false}) {
 const id=`door-photo-${useId().replace(/:/g,'')}`;
 const [fx,fy,fw,fh]=profile.frame,[px,py,pw,ph]=profile.paper;
 const [iw,ih]=profile.size;
 const bottom=profile.bottom||fy+fh;
 const source=photoSource(articleNumber);
 return <svg width={width} height={height*(bottom-fy)/fh} viewBox={`${fx} ${fy} ${fw} ${bottom-fy}`} preserveAspectRatio="none" style={{display:'block',overflow:'hidden'}} aria-label="Produktfoto med anpassningsbar textyta">
  <defs>
   <linearGradient id={`${id}-edges`}><stop stopColor="white"/><stop offset=".035" stopColor="black"/><stop offset=".965" stopColor="black"/><stop offset="1" stopColor="white"/></linearGradient>
   <mask id={`${id}-mask`} maskUnits="userSpaceOnUse" x={px} y={py} width={pw} height={ph}><rect x={px} y={py} width={pw} height={ph} fill={`url(#${id}-edges)`}/></mask>
  </defs>
  <image href={source} width={iw} height={ih}/>
  <svg x={px} y={py} width={pw} height={ph} viewBox={`${profile.sample} ${py} 4 ${ph}`} preserveAspectRatio="none"><image href={source} width={iw} height={ih}/></svg>
  <image href={source} width={iw} height={ih} mask={`url(#${id}-mask)`}/>
  {profile.status&&(()=>{const [x,y,w,h]=profile.status;return <foreignObject x={x} y={y} width={w} height={h}><div style={{width:'100%',height:'100%'}}><SlidingRoomSignPreview windowOnly interactive={interactive} photo={{src:source,size:profile.size,window:profile.status}}/></div></foreignObject>;})()}
 </svg>;
}
