import './QuantityInput.css';

export default function QuantityInput({id,value,onChange,min=1,max,disabled=false,style,...inputProps}){
 return <div className="jsf-quantity-control">
  <input {...inputProps} id={id} type="number" inputMode="numeric" step="1" min={min} max={max} disabled={disabled} value={value??min} style={style} onChange={event=>onChange(event.target.value)}/>
 </div>;
}
