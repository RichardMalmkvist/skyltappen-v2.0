import {useId} from 'react';
import DoorSignAutoFitText from './DoorSignAutoFitText';

export default function DoorMagnetPreview({form={},maxWidth=520}) {
 const clipId='magnet-text-'+useId().replace(/[^a-zA-Z0-9_-]/g,'');
 const names=String(form.name||'Anna Andersson').split(/\r?\n/).slice(0,2);
 const title=String(form.title||'Titel');
 return <div style={{width:'100%',maxWidth,margin:'auto'}}><svg viewBox="0 0 184 83" aria-label="Förhandsvisning magnetskylt 0613" style={{display:'block',width:'100%',height:'auto'}}>
  <defs><clipPath id={clipId}><rect x="9" y="6" width="151" height="70"/></clipPath></defs>
  <path d="M172 14l11-4v14l-11 4z" fill="#999" stroke="#333" strokeWidth=".18"/>
  <rect x=".5" y=".5" width="171" height="81" rx="6" fill="#fff" stroke="#333" strokeWidth=".18"/>
  <DoorSignAutoFitText clipId={clipId} color="#111" lines={names.map((text,index)=>({text,x:12,y:58+(index-names.length+1)*14,fontSize:12,maxWidth:145}))}/>
  <g fontStyle="italic"><DoorSignAutoFitText clipId={clipId} color="#111" lines={[{text:title,x:12,y:71,fontSize:8,maxWidth:145}]}/></g>
 </svg></div>;
}
