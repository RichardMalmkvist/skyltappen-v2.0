import {useState} from 'react';
import {braLivOptions,braLivClinicText,hasBraLivOrganization} from '../../data/braLivNameBadges';

export default function BraLivBadgeField({fieldKey,Field,selectedBadge,productForm,updateFormValue,inputStyle,label}) {
  const clinic=fieldKey==='orgLine2';
  const options=braLivOptions(selectedBadge,clinic?'clinics':'titles');
  const current=productForm[fieldKey] || '';
  const optionValue=value=>clinic?braLivClinicText(value):value;
  const listed=options.some(value=>optionValue(value)===current);
  const [custom,setCustom]=useState(false);
  if(fieldKey==='orgLine1' && hasBraLivOrganization(selectedBadge))return <Field label={label} htmlFor={fieldKey}><input id={fieldKey} style={inputStyle} value="Bra Liv" readOnly aria-readonly="true"/></Field>;
  const own=custom || Boolean(current&&!listed);
  const selectId=fieldKey+'-choice';
  return <Field label={label} htmlFor={own?fieldKey:selectId}>
    <select id={selectId} aria-label={label+' – välj från lista'} style={inputStyle} value={own?'__custom__':current} onChange={event=>{
      const value=event.target.value;setCustom(value==='__custom__');updateFormValue(fieldKey,value==='__custom__'?'':value);
    }}>
      <option value="">{clinic?'Välj vårdcentral':'Välj titel'}</option>
      {options.map(value=><option key={value} value={optionValue(value)}>{value}</option>)}
      <option value="__custom__">{clinic?'Annan vårdcentral – skriv själv':'Annan titel – skriv själv'}</option>
    </select>
    {own&&<input id={fieldKey} aria-label={label+' – egen text'} type="text" style={{...inputStyle,marginTop:8}} value={current} onChange={event=>updateFormValue(fieldKey,event.target.value)}/>}
  </Field>;
}
