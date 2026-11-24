const SALES_UNITS=[{value:'st',label:'Styck (st)'},{value:'par',label:'Par'},{value:'fp',label:'Förpackning (fp)'},{value:'set',label:'Set'}];
function getSalesUnit(item={}){const unit=String(item.salesUnit??item.configuration?.salesUnit??'st').trim().toLowerCase();return SALES_UNITS.some(option=>option.value===unit)?unit:'st';}
function quantityText(item={},quantity=item.quantity??0){return `${quantity} ${getSalesUnit(item)}`;}
function quantitySummary(items=[]){const totals=new Map();for(const item of items){const unit=getSalesUnit(item),n=Number(item.quantity);if(Number.isFinite(n)&&n>0)totals.set(unit,(totals.get(unit)||0)+n);}return [...totals].map(([unit,n])=>`${n} ${unit}`).join(' + ')||'0 st';}
function installSalesUnits(catalog={}){const update='article-sales-units-v1';if((catalog.productUpdates||[]).includes(update))return catalog;return {...catalog,articles:(catalog.articles||[]).map(article=>!article.salesUnit&&/montageklammer/i.test(article.name||'')?{...article,salesUnit:'par'}:article),productUpdates:[...(catalog.productUpdates||[]),update]};}
module.exports={SALES_UNITS,getSalesUnit,quantityText,quantitySummary,installSalesUnits};
