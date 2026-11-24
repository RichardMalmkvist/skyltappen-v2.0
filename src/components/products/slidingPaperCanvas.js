import {rasterizePaperSvg} from './doorPaperCanvas';

// Reuse the continuous photographic color fields and lettering from the 2D view.
// The physical hatch and frame are provided by the customer's GLB model.
export function slidingPaperCanvas(source,articleNumber,{signal}={}){
 const original=source?.querySelector('.jsf-sliding-room-sign>svg');
 const fields=original?.querySelector('[data-seamless-room-fields]');
 if(!fields)throw new Error('Pappersytan är inte redo.');
 const infection=articleNumber==='0614';
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.setAttribute('xmlns','http://www.w3.org/2000/svg');svg.setAttribute('width','2048');svg.setAttribute('height','987');
 svg.setAttribute('viewBox',infection?'88 70 1143 545':'84 66 1144 546');
 const defs=original.querySelector('defs');if(defs)svg.append(defs.cloneNode(true));svg.append(fields.cloneNode(true));
 return rasterizePaperSvg(svg,{signal});
}
