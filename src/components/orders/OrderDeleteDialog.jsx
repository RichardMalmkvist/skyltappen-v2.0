import {useEffect,useRef} from 'react';

export default function OrderDeleteDialog({order,busy,error,onClose,onConfirm,returnFocusRef,entityLabel="order",contextLabel="ORDER",reference,description,title,confirmLabel,busyLabel}){
 const dialog=useRef(null),cancel=useRef(null);
 const number=reference ?? (order.orderNumber||order.submissionNumber||order.id);
 useEffect(()=>{
  const element=dialog.current,previous=returnFocusRef?.current||document.activeElement;
  element.showModal();cancel.current?.focus();
  return ()=>{element.close();if(previous?.isConnected)previous.focus();};
 },[returnFocusRef]);
 return <>
  <dialog ref={dialog} className="order-delete-dialog" aria-labelledby="order-delete-title" aria-describedby="order-delete-description" aria-busy={busy} onKeyDown={event=>event.stopPropagation()} onCancel={event=>{event.preventDefault();if(!busy)onClose();}} onClick={event=>{if(event.target===event.currentTarget&&!busy)onClose();}}>
   <header><span>{contextLabel} {number}</span><h2 id="order-delete-title">{title||`Ta bort ${entityLabel}?`}</h2></header>
   <div className="order-delete-body"><p id="order-delete-description">{description || <>Vill du ta bort order <strong>{number}</strong>? Ordern tas bort och går inte att återställa.</>}</p>{error&&<p className="order-delete-error" role="alert">{error}</p>}</div>
   <footer><button ref={cancel} type="button" disabled={busy} onClick={onClose}>Avbryt</button><button className="order-delete-confirm" type="button" disabled={busy} onClick={onConfirm}>{busy?(busyLabel||'Tar bort…'):(confirmLabel||`Ta bort ${entityLabel}`)}</button></footer>
  </dialog>
  <style>{`
   .order-delete-dialog{box-sizing:border-box;width:min(440px,calc(100vw - 32px));max-height:calc(100vh - 40px);padding:0;border:1px solid #dedbd6;border-radius:6px;background:#fff;color:#353535;font:400 13px/1.6 Arial,sans-serif;box-shadow:0 18px 60px rgba(0,0,0,.18);overflow:auto}
   .order-delete-dialog::backdrop{background:rgba(30,30,30,.35)}
   .order-delete-dialog header{padding:22px 24px 18px;border-bottom:1px solid #e7e3de}
   .order-delete-dialog header span{font-size:10px;letter-spacing:.04em;color:#807b75}
   .order-delete-dialog h2{margin:7px 0 0;font:400 21px/1.3 Arial,sans-serif;color:#292929}
   .order-delete-dialog .order-delete-body{padding:18px 24px 22px}
   .order-delete-dialog p{margin:0;color:#69645e;font:400 13px/1.65 Arial,sans-serif}
   .order-delete-dialog strong{font-weight:600;color:#353535}
   .order-delete-dialog .order-delete-error{margin-top:14px;color:#a23b34}
   .order-delete-dialog footer{display:flex;justify-content:flex-end;gap:8px;padding:15px 24px;border-top:1px solid #e7e3de;background:#faf9f7}
   .order-delete-dialog button{border:1px solid #dcd8d2;border-radius:3px;background:#fff;color:#595550;padding:9px 14px;font:400 12px/1.4 Arial,sans-serif;cursor:pointer}
   .order-delete-dialog .order-delete-confirm{background:#353535;border-color:#353535;color:#fff}
   .order-delete-dialog button:focus-visible{outline:2px solid #827b70;outline-offset:3px}
   .order-delete-dialog button:disabled{opacity:.55;cursor:wait}
  `}</style>
 </>;
}
