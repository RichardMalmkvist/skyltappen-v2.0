import {useEffect} from 'react';
import './inlineValidation.css';

// Progressive enhancement of native constraints: the browser still blocks an
// invalid submission, while messages and focus are presented consistently.
const errors=new Map();
let sequence=0;
function labelFor(field,clean=true){
 const label=field.labels?.[0];
 if(!label)return '';
 const copy=label.cloneNode(true);
 copy.querySelectorAll('input,select,textarea,button,.jsf-inline-field-error').forEach(node=>node.remove());
 return clean?copy.textContent.replace(/[\s:*]+$/g,'').trim():copy.textContent.trim();
}
export function fieldValidationMessage(field){
 const validity=field.validity,label=labelFor(field);
 if(validity.valueMissing){
  if(field.type==='checkbox')return 'Markera rutan för att fortsätta.';
  if(field.type==='file')return 'Välj en fil.';
  if(field.tagName==='SELECT'||field.type==='radio')return 'Välj ett alternativ.';
  return label?`Fyll i ${label.toLocaleLowerCase('sv')}.`:'Fyll i detta fält.';
 }
 if(validity.typeMismatch)return field.type==='email'?'Ange en giltig e-postadress.':'Ange en giltig webbadress.';
 if(validity.tooShort)return `Använd minst ${field.minLength} tecken.`;
 if(validity.tooLong)return `Använd högst ${field.maxLength} tecken.`;
 if(validity.rangeUnderflow)return `Ange ett värde som är minst ${field.min}.`;
 if(validity.rangeOverflow)return `Ange ett värde som är högst ${field.max}.`;
 if(validity.badInput)return 'Ange ett giltigt tal.';
 if(validity.stepMismatch)return 'Ange ett värde med rätt intervall.';
 if(validity.patternMismatch)return field.title||'Kontrollera formatet i detta fält.';
 if(validity.customError)return field.validationMessage;
 return 'Kontrollera värdet i detta fält.';
}
export function clearFieldError(field){
 const error=errors.get(field);if(!error)return;
 error.node.remove();
 const described=(field.getAttribute('aria-describedby')||'').split(/\s+/).filter(id=>id&&id!==error.node.id);
 if(described.length)field.setAttribute('aria-describedby',described.join(' '));else field.removeAttribute('aria-describedby');
 if(error.previousInvalid===null)field.removeAttribute('aria-invalid');else field.setAttribute('aria-invalid',error.previousInvalid);
 if(error.addedLabel)field.removeAttribute('aria-label');
 field.classList.remove('jsf-inline-invalid');errors.delete(field);
}
export function showFieldError(field,message,{custom=true}={}){
 if(!field?.isConnected)return;
 let error=errors.get(field);
 if(!error){
  const node=document.createElement('span');node.id=`jsf-inline-error-${++sequence}`;node.className='jsf-inline-field-error';node.setAttribute('role','alert');
  const addedLabel=!field.hasAttribute('aria-label')&&!field.hasAttribute('aria-labelledby')&&field.labels?.[0]?.contains(field)&&Boolean(labelFor(field,false));
  error={node,previousInvalid:field.getAttribute('aria-invalid'),custom,addedLabel};errors.set(field,error);
  if(addedLabel)field.setAttribute('aria-label',labelFor(field,false));
  field.insertAdjacentElement('afterend',node);
  field.setAttribute('aria-describedby',[field.getAttribute('aria-describedby'),node.id].filter(Boolean).join(' '));
 }
 error.custom=custom;error.node.textContent=message;
 field.setAttribute('aria-invalid','true');field.classList.add('jsf-inline-invalid');
}
export default function InlineValidation(){
 useEffect(()=>{
  let firstInvalid=null,disposed=false;
  function invalid(event){
   const field=event.target;
   if(!field.matches?.('input,select,textarea'))return;
   event.preventDefault();
   showFieldError(field,fieldValidationMessage(field),{custom:false});
   if(!firstInvalid){firstInvalid=field;queueMicrotask(()=>{const first=firstInvalid;firstInvalid=null;if(!disposed&&first?.isConnected){first.focus({preventScroll:true});first.scrollIntoView({block:'nearest',behavior:'auto'});}});}
  }
  function changed(event){
   const field=event.target,error=errors.get(field);if(!error)return;
   if(error.custom||field.validity.valid||!field.willValidate)clearFieldError(field);
   else showFieldError(field,fieldValidationMessage(field),{custom:false});
  }
  function reset(event){for(const field of errors.keys())if(field.form===event.target)clearFieldError(field);}
  const observer=new MutationObserver(()=>{for(const field of errors.keys())if(!field.isConnected)clearFieldError(field);});
  observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('invalid',invalid,true);
  document.addEventListener('input',changed,true);document.addEventListener('change',changed,true);document.addEventListener('reset',reset,true);
  return()=>{disposed=true;observer.disconnect();document.removeEventListener('invalid',invalid,true);document.removeEventListener('input',changed,true);document.removeEventListener('change',changed,true);document.removeEventListener('reset',reset,true);for(const field of errors.keys())clearFieldError(field);};
 },[]);
 return null;
}
