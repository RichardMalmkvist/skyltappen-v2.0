// Shared by Express and React. Accessories stay with the badge production order.
const BADGE_STATUSES = { ny:'Ny', påbörjad:'Under arbete', klar:'Klar', levererad:'Levererad' };
function badgeKind(item = {}) {
  const type=String(item.productType || '').toLowerCase();
  if(item.nameBadgePreset || ['namnbricka','namnbrickor','namebadge'].includes(type)) return 'name';
  if(['yrkestitelsskylt','yrkestitelsskyltar'].includes(type) || /^YRK-/i.test(item.articleNumber || '')) return 'profession';
  return null;
}
function isBadgeItem(item = {}) { return Boolean(badgeKind(item)) || ['namnbrickor','yrkestitelsskyltar'].includes(item.categoryId) || item.articleNumber==='02030'; }
function isBadgeOrder(order = {}) { return order.workflow==='badge-production' || Boolean(order.cart?.length && order.cart.every(isBadgeItem)); }
function splitBadgeOrder(order) {
  const badge=(order.cart || []).filter(isBadgeItem),regular=(order.cart || []).filter(item=>!isBadgeItem(item));
  const total=cart=>Math.round(cart.reduce((s,i)=>s+Number(i.unitPrice || 0)*Number(i.quantity || 1),0)*100)/100;
  if(!badge.length) return [order];
  const badgeOrder={...order,workflow:'badge-production',status:'ny',cart:badge,orderTotal:total(badge),productionPlan:null,approvedAt:null};
  if(!regular.length) return [badgeOrder];
  return [{...order,cart:regular,orderTotal:total(regular)}, {...badgeOrder,id:order.badgeChildId,linkedOrderId:order.id,orderNumber:null}];
}
const BADGE_ORGANIZATION='Region Jönköpings län';
function normalizeBadgeDelivery(delivery={}) {
 const result={organization:BADGE_ORGANIZATION,country:'Sverige',...delivery};
 for(const key of ['company','recipient','organization','address','house','postalCode','city','country'])if(result[key]!=null)result[key]=String(result[key]).trim();
 return {...result,unit:result.company || '',badgeAddressVersion:2};
}
function badgeCheckoutErrors(orderer={},delivery={}) {
 const errors={},d=normalizeBadgeDelivery(delivery);
 const required={ordererName:[orderer.purchaserName||orderer.ordererName,'namn'],ordererEmail:[orderer.purchaserEmail||orderer.ordererEmail,'e-post'],ordererPhone:[orderer.purchaserPhone||orderer.ordererPhone,'telefon'],accountNumber:[orderer.accountNumber,'ansvarsnummer']};
 for(const [key,[value,label]] of Object.entries(required))if(!String(value||'').trim())errors[key]='Fyll i '+label+'.';
 for(const [key,label] of Object.entries({company:'verksamhet',recipient:'mottagare',organization:'organisation',address:'sjukhus / adress',postalCode:'postnummer',city:'postort',country:'land'}))if(!String(d[key]||'').trim())errors['badge-delivery-'+key]='Fyll i '+label+'.';
 const email=String(orderer.purchaserEmail||orderer.ordererEmail||'').trim();
 if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))errors.ordererEmail='Kontrollera e-postadressen.';
 return errors;
}
function addressForOrder(order={}) {
 const d=order.delivery || {},o=order.orderer || {};
 return {recipient:d.recipient || o.recipient || o.purchaserName || o.ordererName || '',unit:d.unit || '',organization:d.organization || d.company || o.customer || o.company || '',department:d.department || '',address:d.address || o.address || '',house:d.house || '',postalCode:d.postalCode || o.postalCode || '',city:d.city || o.city || '',country:d.country || o.country || 'Sverige'};
}
function badgeAddressLines(order={}) {
 const a=addressForOrder(order),house=String(a.house||'').trim();
 const top=[a.recipient,a.unit,a.department,a.organization].filter(Boolean).filter((line,index,lines)=>lines.indexOf(line)===index);
 return [...top,'',[a.address,house?(/^hus\b/i.test(house)?house:'hus '+house):''].filter(Boolean).join(', '),[a.postalCode,a.city].filter(Boolean).join(' '),a.country.trim().toLowerCase()==='sverige'?'':a.country].filter((line,index)=>line||index===top.length);
}
const DEFAULT_BADGE_SETTINGS={sheetWidthMm:1100,marginMm:5,gapMm:5,labelWidthMm:100,labelHeightMm:46.31,maxSheetHeightMm:1000};
module.exports={BADGE_ORGANIZATION,normalizeBadgeDelivery,badgeCheckoutErrors,badgeAddressLines,BADGE_STATUSES,badgeKind,isBadgeItem,isBadgeOrder,splitBadgeOrder,addressForOrder,DEFAULT_BADGE_SETTINGS};
