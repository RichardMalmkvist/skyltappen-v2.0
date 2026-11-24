import {useId} from 'react';
import './OptionSwitch.css';
export default function OptionSwitch({label,checked,onChange,disabled=false,controls}){
 const id=useId();
 return <div className="jsf-option-row"><span id={id}>{label}</span><button className="jsf-option-switch" type="button" role="switch" aria-checked={Boolean(checked)} aria-labelledby={id} aria-controls={controls} disabled={disabled} onClick={()=>onChange(!checked)}><span aria-hidden="true"/></button></div>;
}
