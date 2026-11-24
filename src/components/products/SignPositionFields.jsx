import {useState} from 'react';
import {dibondItemBounds,moveDibondItem} from '../../data/dibondManipulation';

function DistanceInput({value,onChange,...props}){
 const [draft,setDraft]=useState(null);
 // Keep unfinished typing intact while the live preview enforces its margins.
 // Otherwise deleting or entering the first digit snaps the field to the margin.
 return <input {...props} type="number" step="any" value={draft??value}
  onFocus={()=>setDraft(String(value))}
  onChange={event=>{setDraft(event.target.value);onChange(event.target.value);}}
  onBlur={()=>setDraft(null)}/>;
}

export default function SignPositionFields({sign,kind,index,onChange}){
 const [horizontal,setHorizontal]=useState('left'),[vertical,setVertical]=useState('top');
 const bounds=dibondItemBounds(sign,kind,index);
 if(!bounds)return null;
 const width=Number(sign.widthMm),height=Number(sign.heightMm),name=kind==='artwork'?'Original':kind==='text'?'Textblock '+(index+1):'Symbol '+(index+1);
 const x=horizontal==='right'?width-bounds.x-bounds.width:horizontal==='center'?bounds.x+bounds.width/2-width/2:bounds.x;
 const y=vertical==='bottom'?height-bounds.y-bounds.height:vertical==='center'?bounds.y+bounds.height/2-height/2:bounds.y;
 const move=(axis,value)=>{
  if(value===''||!Number.isFinite(Number(value)))return;
  const distance=Number(value),dx=axis==='x'?(horizontal==='right'?-1:1)*(distance-x):0,dy=axis==='y'?(vertical==='bottom'?-1:1)*(distance-y):0;
  onChange(moveDibondItem(sign,kind,index,dx,dy));
 };
 return <div className="jsf-dibond-dimensions">
  <label>Utgångspunkt i sidled<select aria-label={name+' utgångspunkt i sidled'} value={horizontal} onChange={e=>setHorizontal(e.target.value)}><option value="left">Vänsterkant</option><option value="right">Högerkant</option><option value="center">Mitten</option></select></label>
  <label>{horizontal==='center'?'Avstånd från mitten':'Avstånd från '+(horizontal==='right'?'högerkant':'vänsterkant')} (mm)<DistanceInput key={horizontal} aria-label={name+' avstånd i sidled (mm)'} value={Number(x.toFixed(2))} onChange={value=>move('x',value)}/></label>
  <label>Utgångspunkt i höjdled<select aria-label={name+' utgångspunkt i höjdled'} value={vertical} onChange={e=>setVertical(e.target.value)}><option value="top">Ovankant</option><option value="bottom">Underkant</option><option value="center">Mitten</option></select></label>
  <label>{vertical==='center'?'Avstånd från mitten':'Avstånd från '+(vertical==='bottom'?'underkant':'ovankant')} (mm)<DistanceInput key={vertical} aria-label={name+' avstånd i höjdled (mm)'} value={Number(y.toFixed(2))} onChange={value=>move('y',value)}/></label>
 </div>;
}
