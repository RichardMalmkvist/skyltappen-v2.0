import {useEffect,useId,useRef,useState} from 'react';
import './WorkspaceUI.css';

export function workspaceStatusTone(status=''){
 const key=String(status).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_');
 if(['godkand','godkant','approved','klar'].includes(key))return 'success';
 if(['paborjad','pagaende','i_produktion'].includes(key))return 'active';
 if(['pending','vantar_godkannande','vantar_pa_godkannande','pausat'].includes(key))return 'waiting';
 if(['changes_requested','behover_kompletteras'].includes(key))return 'attention';
 return 'neutral';
}
export function WorkspaceStatus({status,label}){
 return <span className="ws-status" data-tone={workspaceStatusTone(status)}><span className="ws-status-dot" aria-hidden="true"/>{label||status}</span>;
}
export function WorkspacePageHeader({kicker,title,description,children,titleRef,className=''}){
 return <header className={`ws-page-header ${className}`}><div className="ws-page-heading">{kicker&&<small className="ws-page-kicker">{kicker}</small>}<h1 ref={titleRef} tabIndex={titleRef?-1:undefined}>{title}</h1>{description&&<p>{description}</p>}</div><div className="ws-page-actions">{children}</div></header>;
}
export function WorkspaceFeedback({children,error=false,onDismiss}){
 return <div className="ws-feedback" data-kind={error?'error':'success'} role={error?'alert':'status'}><span className="ws-feedback-icon" aria-hidden="true">{error?'!':'\u2713'}</span><span>{children}</span>{onDismiss&&<button type="button" aria-label={error?'St\u00e4ng felmeddelandet':'St\u00e4ng bekr\u00e4ftelsen'} onClick={onDismiss}>{"\u00d7"}</button>}</div>;
}
export function BusyLabel({busy,children}){
 return <span className="ws-action-label">{busy&&<span className="ws-spinner" aria-hidden="true"/>}<span>{children}</span></span>;
}
export function WorkspaceSkeleton({kind='projects',label='Laddar inneh\u00e5ll'}){
 return <section className={`ws-skeleton ws-skeleton-${kind}`} aria-label={label} aria-busy="true" role="status"><span className="ws-visually-hidden">{label}</span>{Array.from({length:kind==='orders'?2:3},(_,index)=><div key={index} className="ws-skeleton-card" aria-hidden="true"><i/><i/><i/>{kind==='orders'&&<><i/><i/></>}</div>)}</section>;
}
export function WorkspaceMenu({label,children,className='',triggerRef}){
 const menu=useRef(null),id=useId(),[open,setOpen]=useState(false);
 useEffect(()=>{
  const close=event=>{
   const node=menu.current;if(!node?.open)return;
   if(event.type==='keydown'){if(event.key!=='Escape')return;event.preventDefault();node.open=false;node.querySelector('summary')?.focus();}
   else if(!node.contains(event.target))node.open=false;
  };
  document.addEventListener('pointerdown',close);document.addEventListener('keydown',close);
  return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',close);};
 },[]);
 return <details ref={menu} className={`ws-more-menu ${className}`} onToggle={event=>setOpen(event.currentTarget.open)}><summary ref={triggerRef} aria-label={label} title={label} aria-controls={id} aria-expanded={open}><span aria-hidden="true">{"\u22ef"}</span></summary><div id={id} className="ws-more-panel" role="group" aria-label={`${label} \u2013 \u00e5tg\u00e4rder`} onClick={event=>{if(event.target.closest('button')&&!event.defaultPrevented)menu.current.open=false;}}>{children}</div></details>;
}
