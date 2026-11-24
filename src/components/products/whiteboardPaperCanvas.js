import {getDoorPhotoProfile} from '../../data/doorPhotoPreview';
import {rasterizePaperSvg} from './doorPaperCanvas';
export async function whiteboardPaperCanvas(articleNumber,{signal}={}){
 if(articleNumber==='0616')articleNumber='0607';
 const p=getDoorPhotoProfile({articleNumber}),[x,y,w,h]=p.whiteboard;
 const make=async blank=>{const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('xmlns',svg.namespaceURI);svg.setAttribute('width','2048');svg.setAttribute('height','987');svg.setAttribute('viewBox',blank?`${x+w-24} ${y} 4 ${h}`:`${x} ${y} ${w} ${h}`);svg.setAttribute('preserveAspectRatio','none');const image=document.createElementNS(svg.namespaceURI,'image');image.setAttribute('href',`${process.env.PUBLIC_URL||''}/door-photo-${articleNumber}.webp`);image.setAttribute('width',p.size[0]);image.setAttribute('height',p.size[1]);svg.append(image);return rasterizePaperSvg(svg,{signal});};
 const [original,blank]=await Promise.all([make(false),make(true)]);const canvas=document.createElement('canvas');canvas.width=original.width;canvas.height=original.height;canvas.getContext('2d').drawImage(original,0,0);return {canvas,original,blank};
}
