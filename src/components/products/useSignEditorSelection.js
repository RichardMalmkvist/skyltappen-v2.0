import {useCallback,useEffect,useState} from 'react';
// Selection is UI-only and scoped to the same sign instance, never saved in an order.
const EVENT='jsf-sign-editor-selection';
export default function useSignEditorSelection(scope,initial=null){
 const [selection,setSelection]=useState(initial);
 useEffect(()=>{const receive=event=>{if(event.detail?.scope===scope)setSelection(event.detail.selection);};window.addEventListener(EVENT,receive);return()=>window.removeEventListener(EVENT,receive);},[scope]);
 const select=useCallback((value,{focusPreview=false}={})=>{setSelection(value);window.dispatchEvent(new CustomEvent(EVENT,{detail:{scope,selection:value,focusPreview}}));},[scope]);
 return [selection,select];
}
