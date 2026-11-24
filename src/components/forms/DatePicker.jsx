import {forwardRef,useCallback,useEffect,useId,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {clearFieldError} from './InlineValidation';
import {calendarDate,parseCalendarDate,calendarISO,addCalendarDays,calendarWeek,calendarWeeks,calendarDateError} from '../../data/calendarDates';
import './DatePicker.css';

const MONTHS=['Januari','Februari','Mars','April','Maj','Juni','Juli','Augusti','September','Oktober','November','December'];
const longDate=date=>new Intl.DateTimeFormat('sv-SE',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(date);
const todayDate=()=>{const now=new Date();return calendarDate(now.getFullYear(),now.getMonth(),now.getDate());};

// Keep ISO strings and input-style change callbacks at all existing integration points.
const DatePicker=forwardRef(function DatePicker({value='',onChange,onValueChange,onBlur,min,max,required,disabled,readOnly,id,name,className,style,placeholder='åååå-mm-dd',...inputProps},forwardedRef){
 const generated=useId(),inputId=id||`jsf-date-${generated}`,dialogId=`${inputId}-calendar`;
 const ariaLabel=inputProps['aria-label'];
 const input=useRef(null),anchor=useRef(null),dialog=useRef(null),focusDay=useRef(false),emitted=useRef(value);
 const [text,setText]=useState(value),[open,setOpen]=useState(false),[fieldLabel,setFieldLabel]=useState(inputProps['aria-label']||'datum');
 const initial=parseCalendarDate(value)||todayDate();
 const [month,setMonth]=useState(()=>calendarDate(initial.getUTCFullYear(),initial.getUTCMonth()));
 const [focused,setFocused]=useState(()=>calendarISO(initial));
 const [position,setPosition]=useState({left:12,top:12});
 const allowed=useCallback(date=>date&&date.getUTCFullYear()>=1&&date.getUTCFullYear()<=9999&&!calendarDateError(calendarISO(date),min,max),[min,max]);
 useEffect(()=>{if(value!==emitted.current){setText(value);emitted.current=value;}},[value]);
 useLayoutEffect(()=>{input.current?.setCustomValidity(calendarDateError(text,min,max));},[text,min,max]);
 useLayoutEffect(()=>{
  const node=input.current;
  const labelledBy=(node?.getAttribute('aria-labelledby')||'').split(/\s+/).map(id=>document.getElementById(id)?.textContent||'').join(' ').trim();
  const label=ariaLabel||labelledBy||node?.labels?.[0]?.textContent?.trim();
  if(label)setFieldLabel(label.replace(/[\s:*]+$/g,''));
 },[inputId,ariaLabel]);
 function emit(next){
  emitted.current=next;
  onChange?.({type:'change',target:{value:next,name,id:inputId},currentTarget:input.current});
  onValueChange?.(next);
 }
 const close=useCallback(()=>{
  if(dialog.current?.open)dialog.current.close();
  setOpen(false);input.current?.focus({preventScroll:true});
 },[]);
 function show(){
  if(disabled||readOnly||input.current?.matches(':disabled'))return;
  let next=parseCalendarDate(value)||todayDate();
  if(parseCalendarDate(min)&&calendarISO(next)<min)next=parseCalendarDate(min);
  if(parseCalendarDate(max)&&calendarISO(next)>max)next=parseCalendarDate(max);
  setMonth(calendarDate(next.getUTCFullYear(),next.getUTCMonth()));setFocused(calendarISO(next));focusDay.current=true;setOpen(true);
 }
 function select(next){
  if(next&&!allowed(parseCalendarDate(next)))return;
  setText(next);input.current?.setCustomValidity('');clearFieldError(input.current);emit(next);close();
 }
 const reposition=useCallback(()=>{
  const rect=anchor.current?.getBoundingClientRect();if(!rect)return;
  const viewportWidth=document.documentElement.clientWidth||window.innerWidth;
  const width=Math.min(360,viewportWidth-24),height=dialog.current?.getBoundingClientRect().height||380;
  const viewportHeight=window.visualViewport?.height||window.innerHeight;
  const below=rect.bottom+7;
  const top=below+height<=viewportHeight-12?below:Math.max(12,rect.top-height-7);
  setPosition({width,maxHeight:Math.max(160,viewportHeight-24),left:Math.max(12,Math.min(rect.left,viewportWidth-width-12)),top:Math.min(top,Math.max(12,viewportHeight-height-12))});
 },[]);
 useLayoutEffect(()=>{
  if(!open)return;
  const node=dialog.current;node.showModal();reposition();
  window.addEventListener('resize',reposition);window.addEventListener('scroll',reposition,true);
  window.visualViewport?.addEventListener('resize',reposition);
  return()=>{window.removeEventListener('resize',reposition);window.removeEventListener('scroll',reposition,true);window.visualViewport?.removeEventListener('resize',reposition);if(node.open)node.close();};
 },[open,reposition]);
 useLayoutEffect(()=>{
  if(open&&focusDay.current){dialog.current?.querySelector(`[data-date="${focused}"]`)?.focus({preventScroll:true});focusDay.current=false;}
 },[open,focused,month]);
 function changeMonth(next,keyboard=false){
  if(next.getUTCFullYear()<1||next.getUTCFullYear()>9999)return;
  let day=calendarDate(next.getUTCFullYear(),next.getUTCMonth());
  if(parseCalendarDate(min)&&calendarISO(day)<min)day=parseCalendarDate(min);
  if(parseCalendarDate(max)&&calendarISO(day)>max)day=parseCalendarDate(max);
  focusDay.current=keyboard;setFocused(calendarISO(day));setMonth(calendarDate(day.getUTCFullYear(),day.getUTCMonth()));
 }
 function keyboard(event,date){
  let next;
  if(event.key==='ArrowLeft')next=addCalendarDays(date,-1);
  if(event.key==='ArrowRight')next=addCalendarDays(date,1);
  if(event.key==='ArrowUp')next=addCalendarDays(date,-7);
  if(event.key==='ArrowDown')next=addCalendarDays(date,7);
  if(event.key==='Home')next=addCalendarDays(date,-((date.getUTCDay()+6)%7));
  if(event.key==='End')next=addCalendarDays(date,6-((date.getUTCDay()+6)%7));
  if(event.key==='PageUp'||event.key==='PageDown'){
   event.preventDefault();const step=(event.key==='PageUp'?-1:1)*(event.shiftKey?12:1);
   changeMonth(calendarDate(month.getUTCFullYear(),month.getUTCMonth()+step),true);return;
  }
  if(next){event.preventDefault();if(!allowed(next))return;focusDay.current=true;setFocused(calendarISO(next));setMonth(calendarDate(next.getUTCFullYear(),next.getUTCMonth()));}
 }
 const monthAllowed=(year,index)=>{
  const first=calendarDate(year,index),last=calendarDate(year,index+1,0);
  return year>=1&&year<=9999&&(!parseCalendarDate(min)||calendarISO(last)>=min)&&(!parseCalendarDate(max)||calendarISO(first)<=max);
 };
 const year=month.getUTCFullYear(),monthIndex=month.getUTCMonth();
 const startYear=parseCalendarDate(min)?.getUTCFullYear()||Math.min(1900,year);
 const endYear=parseCalendarDate(max)?.getUTCFullYear()||Math.max(2100,year);
 const today=calendarISO(todayDate());
 const calendar=open?createPortal(<dialog ref={dialog} id={dialogId} className="jsf-date-dialog" aria-label={`Välj datum – ${fieldLabel}`} style={position}
  onCancel={event=>{event.preventDefault();close();}}
  onClick={event=>{event.stopPropagation();if(event.target===event.currentTarget){const rect=dialog.current.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)close();}}}
  onKeyDown={event=>{event.stopPropagation();if(event.key==='Escape'){event.preventDefault();close();}}}>
  <div className="jsf-date-caption"><span>{fieldLabel}</span><button type="button" aria-label="Stäng kalender" onClick={close}>×</button></div>
  <header className="jsf-date-navigation">
   <button type="button" aria-label="Föregående månad" disabled={!monthAllowed(year,monthIndex-1)} onClick={()=>changeMonth(calendarDate(year,monthIndex-1))}>‹</button>
   <div><select aria-label="Månad" value={monthIndex} onChange={event=>changeMonth(calendarDate(year,Number(event.target.value)))}>{MONTHS.map((name,index)=><option key={name} value={index} disabled={!monthAllowed(year,index)}>{name}</option>)}</select><select aria-label="År" value={year} onChange={event=>changeMonth(calendarDate(Number(event.target.value),monthIndex))}>{Array.from({length:Math.max(0,endYear-startYear+1)},(_,i)=>startYear+i).map(year=><option key={year} value={year}>{year}</option>)}</select></div>
   <button type="button" aria-label="Nästa månad" disabled={!monthAllowed(year,monthIndex+1)} onClick={()=>changeMonth(calendarDate(year,monthIndex+1))}>›</button>
  </header>
  <table className="jsf-date-grid" aria-label={`${MONTHS[monthIndex]} ${year}`}><thead><tr><th scope="col" aria-label="Vecka">v.</th>{['Mån','Tis','Ons','Tor','Fre','Lör','Sön'].map(day=><th scope="col" key={day}>{day}</th>)}</tr></thead>
   <tbody>{calendarWeeks(month).map(week=><tr key={calendarISO(week[0])}><th scope="row" aria-label={`Vecka ${calendarWeek(week[0]).week}`}>{calendarWeek(week[0]).week}</th>{week.map(date=>{const iso=calendarISO(date);return <td key={iso}><button type="button" data-date={iso} tabIndex={focused===iso?0:-1} aria-label={longDate(date)} aria-pressed={value===iso} aria-current={today===iso?'date':undefined} disabled={!allowed(date)} className={`${date.getUTCMonth()!==monthIndex?'is-outside ':''}${today===iso?'is-today':''}`} onKeyDown={event=>keyboard(event,date)} onClick={()=>select(iso)}>{date.getUTCDate()}</button></td>;})}</tr>)}</tbody>
  </table>
  <footer><button type="button" onClick={()=>select('')} disabled={required||!text}>Rensa datum</button><button type="button" className="jsf-date-today" disabled={!allowed(todayDate())} onClick={()=>select(today)}>Idag</button></footer>
 </dialog>,document.body):null;
 return <span ref={anchor} className="jsf-date-field">
  <input {...inputProps} ref={node=>{input.current=node;if(typeof forwardedRef==='function')forwardedRef(node);else if(forwardedRef)forwardedRef.current=node;}} id={inputId} name={name} className={className} style={style} type="text" inputMode="numeric" autoComplete="off" placeholder={placeholder} maxLength={10} size={12} value={text} required={required} disabled={disabled} readOnly={readOnly} aria-label={ariaLabel||fieldLabel} aria-haspopup="dialog"
   onChange={event=>{const next=event.target.value;setText(next);const valid=!calendarDateError(next,min,max);if(valid)clearFieldError(input.current);emit(valid?next:'');}}
   onBlur={onBlur} onKeyDown={event=>{inputProps.onKeyDown?.(event);if(event.key==='F4'||(event.altKey&&event.key==='ArrowDown')){event.preventDefault();show();}}}/>
  <button type="button" className="jsf-date-trigger" aria-label={`Öppna kalender för ${fieldLabel}`} aria-haspopup="dialog" aria-expanded={open} aria-controls={open?dialogId:undefined} disabled={disabled||readOnly} onClick={show}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h16v16H4zM8 3v4M16 3v4M4 10h16M8 14h2M14 14h2M8 18h2"/></svg></button>
  {calendar}
 </span>;
});
export default DatePicker;
