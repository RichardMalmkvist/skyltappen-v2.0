// Keep the original separator fields intact for saved signs and orders.
const MAX_SEPARATORS=30;
function dibondSeparators(sign={}){
 const extra=Array.isArray(sign.additionalSeparators)?sign.additionalSeparators:[];
 return [...(sign.separatorEnabled?[{index:0,offsetYMm:sign.separatorOffsetYMm??0}]:[]),...extra.map((line,index)=>({index:index+1,offsetYMm:line?.offsetYMm}))];
}
function dibondSeparatorError(sign={}){
 if(sign.additionalSeparators!==undefined&&(!Array.isArray(sign.additionalSeparators)||sign.additionalSeparators.length>MAX_SEPARATORS-1))return 'Använd högst 30 svarta streck.';
 for(const line of dibondSeparators(sign)){
  const v=line.offsetYMm,y=Number(sign.heightMm)/2+Number(v);
  if(v==null||v===''||!Number.isFinite(y)||y-.5<12||y+.5>Number(sign.heightMm)-12)return 'Strecken måste ligga innanför ramen. Flytta dem närmare mitten.';
 }
 return null;
}
function setDibondSeparatorOffset(sign,index,offsetYMm){return index===0?{...sign,separatorOffsetYMm:offsetYMm}:{...sign,additionalSeparators:(sign.additionalSeparators||[]).map((line,i)=>i===index-1?{...line,offsetYMm}:line)};}
module.exports={MAX_SEPARATORS,dibondSeparators,dibondSeparatorError,setDibondSeparatorOffset};
