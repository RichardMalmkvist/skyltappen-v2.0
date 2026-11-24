export function calendarDate(year,month,day=1){
 const date=new Date(0);date.setUTCHours(12,0,0,0);date.setUTCFullYear(year,month,day);return date;
}
export function parseCalendarDate(value){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return null;
 const [year,month,day]=value.split('-').map(Number);
 if(year<1||year>9999)return null;
 const date=calendarDate(year,month-1,day);
 return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day?date:null;
}
export const calendarISO=date=>`${String(date.getUTCFullYear()).padStart(4,'0')}-${String(date.getUTCMonth()+1).padStart(2,'0')}-${String(date.getUTCDate()).padStart(2,'0')}`;
export function addCalendarDays(date,days){const next=new Date(date);next.setUTCDate(next.getUTCDate()+days);return next;}
export function calendarWeek(date){
 const thursday=addCalendarDays(date,4-(date.getUTCDay()||7));
 const year=thursday.getUTCFullYear();
 return {year,week:Math.ceil(((thursday-calendarDate(year,0,1))/86400000+1)/7)};
}
export function calendarWeeks(month){
 const first=calendarDate(month.getUTCFullYear(),month.getUTCMonth());
 const start=addCalendarDays(first,-((first.getUTCDay()+6)%7));
 return Array.from({length:6},(_,week)=>Array.from({length:7},(_,day)=>addCalendarDays(start,week*7+day)));
}
export function calendarDateError(value,min,max){
 if(!value)return '';
 if(!parseCalendarDate(value))return 'Ange ett giltigt datum som åååå-mm-dd.';
 if(parseCalendarDate(min)&&value<min)return `Välj ${min} eller ett senare datum.`;
 if(parseCalendarDate(max)&&value>max)return `Välj ${max} eller ett tidigare datum.`;
 return '';
}
