const clean=value=>String(value||'').trim();
const normalizeEmail=value=>clean(value).toLowerCase();
function purchaserEmail(order={}) {
 const o=order.orderer||{};
 return normalizeEmail(o.purchaserEmail||(!clean(o.purchaserName)?o.ordererEmail:''));
}
function orderBelongsToUser(order={},user={}) {
 const email=purchaserEmail(order);
 if(email)return Boolean(normalizeEmail(user.email))&&email===normalizeEmail(user.email);
 // Internal/project authors are not automatically the purchaser.
 return !clean(order.orderer?.purchaserName)&&!['manual','project'].includes(order.source)&&Boolean(user.id)&&order.accountUserId===user.id;
}
function purchaserAccountId(order,users=[]) {
 const email=purchaserEmail(order);
 if(email)return users.find(user=>normalizeEmail(user.email)===email&&user.status==='approved')?.id||null;
 return clean(order.orderer?.purchaserName)||['manual','project'].includes(order.source)?null:order.accountUserId||null;
}
function getOrderOwner(order={}) {
 const o=order.orderer||{},email=purchaserEmail(order);
 const name=clean(o.purchaserName)||(!clean(o.purchaserEmail)?clean(o.ordererName):'')||email;
 if(email)return {id:'email:'+email,name:name||email,email};
 if(!clean(o.purchaserName)&&!['manual','project'].includes(order.source)&&order.accountUserId)return {id:'account:'+order.accountUserId,name:name||'Kontobeställare'};
 return {id:'name:'+(name.toLocaleLowerCase('sv')||'unknown'),name:name||'Okänd beställare'};
}
module.exports={purchaserEmail,orderBelongsToUser,purchaserAccountId,getOrderOwner};
