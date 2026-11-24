import {isBadgeOrder} from './badgeProduction';
import {getOrderCustomer} from './orderCustomer';

const number=value=>value!==null&&value!==''&&Number.isFinite(Number(value))?Number(value):null;
const cents=value=>Math.round(value*100);
export function deliveryDay(value){
  if(!value)return '';
  const date=new Date(value);
  return Number.isFinite(date.getTime())?new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit'}).format(date):'';
}
export const OPEN_ORDER_STATUSES=['ny','väntar_godkännande','behöver_kompletteras','godkänd','påbörjad','klar','skickad'];
export const STATISTICS_STATUS_LABELS={ny:'Ny',väntar_godkännande:'Väntar på godkännande',behöver_kompletteras:'Behöver kompletteras',godkänd:'Godkänd',påbörjad:'Under arbete',klar:'Klar',skickad:'Skickad',levererad:'Levererad'};
export function deliveryStatistics(orders=[],{from='',to='',type='all',scope='delivered',status='all'}={}){
  const articles=new Map(),months=new Map(),rows=[],seen=new Set();
  let totalCents=0,quantity=0,missingDates=0,otherCurrencies=0;
  for(const order of orders){
    if((scope==='open'?!OPEN_ORDER_STATUSES.includes(order.status):order.status!=='levererad')||(scope==='open'&&status!=='all'&&order.status!==status)||(type==='badges'&&!isBadgeOrder(order))||(type==='signs'&&isBadgeOrder(order)))continue;
    if(order.id&&seen.has(order.id))continue;
    if(order.id)seen.add(order.id);
    const day=deliveryDay(scope==='open'?order.createdAt:order.deliveredAt);
    if(!day)missingDates++;
    if((from||to)&&(!day||(from&&day<from)||(to&&day>to)))continue;
    if(order.currency&&order.currency!=='SEK'){otherCurrencies++;continue;}
    let lineCents=0,orderQuantity=0;
    const touched=new Set();
    for(const item of order.cart||[]){
      const count=Math.max(0,number(item.quantity)??0),unit=item.salesUnit||'st';
      const amount=cents(number(item.lineTotal)??((number(item.unitPrice)??0)*count));
      lineCents+=amount;orderQuantity+=count;
      const articleNumber=String(item.articleNumber||'').trim();
      const name=item.badgeName||item.productName||item.name||item.desc||'Eget original';
      const key=JSON.stringify([articleNumber||item.articleId||item.badgeId||name,unit]);
      const row=articles.get(key)||{key,articleNumber,name,unit,quantity:0,orderCount:0,valueCents:0,lastDelivered:''};
      row.quantity+=count;row.valueCents+=amount;
      if(!touched.has(key)){row.orderCount++;touched.add(key);}
      if(day>row.lastDelivered)row.lastDelivered=day;
      articles.set(key,row);
    }
    const valueCents=number(order.orderTotal)!==null?cents(Number(order.orderTotal)):lineCents;
    totalCents+=valueCents;quantity+=orderQuantity;
    rows.push({id:order.id,orderNumber:order.orderNumber||order.id||'–',day,status:order.status,customer:getOrderCustomer(order)||'–',quantity:orderQuantity,valueCents});
    if(day){const month=day.slice(0,7),row=months.get(month)||{month,orderCount:0,quantity:0,valueCents:0};row.orderCount++;row.quantity+=orderQuantity;row.valueCents+=valueCents;months.set(month,row);}
  }
  return {orderCount:rows.length,articleCount:articles.size,quantity,valueCents:totalCents,missingDates,otherCurrencies,articles:[...articles.values()],orders:rows,months:[...months.values()].sort((a,b)=>b.month.localeCompare(a.month))};
}
export function sortStatistics(rows,key,direction='desc'){
  const factor=direction==='asc'?1:-1;
  return [...rows].sort((a,b)=>{
    const left=a[key],right=b[key];
    const result=typeof left==='number'&&typeof right==='number'?left-right:String(left||'').localeCompare(String(right||''),'sv',{numeric:true});
    return factor*result||String(a.articleNumber||a.orderNumber||'').localeCompare(String(b.articleNumber||b.orderNumber||''),'sv',{numeric:true});
  });
}
