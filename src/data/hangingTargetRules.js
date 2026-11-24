function isGreenHanging(product={}){
 return /gron|grön|green/i.test(String(product.categoryId||product.category||product.group||''));
}
function greenTargetsEnabled(product={}){return Boolean(product.hangingSignTargetsEnabled??product.fields?.hangingSignTargets);}
function hangingSymbolKind(symbol={}){
 if(symbol.kind==='target'||symbol.kind==='symbol')return symbol.kind;
 const name=`${symbol.name||''} ${symbol.id||''}`.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 return /(?:^|[\s_-])(?:malpunkt|target(?:point)?)(?:[\s_-]|$)/.test(name)?'target':'symbol';
}
module.exports={isGreenHanging,greenTargetsEnabled,hangingSymbolKind};
