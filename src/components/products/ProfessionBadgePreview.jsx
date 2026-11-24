import {useId,useLayoutEffect,useRef,useState} from "react";
const COLORS={"röd":"#d62828","blå":"#2563eb","grön":"#2e7d32","orange":"#ef6c00","lila":"#7b1fa2","ljusblå":"#4fc3f7","vinröd":"#8e244d","svart":"#212121","vit":"#ffffff","gul":"#ffeb3b"};
function colorValue(value,fallback){const text=String(value||"").toLowerCase();return COLORS[text]||(/^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(text)||/^(?:rgb|hsl)a?\(/.test(text)?text:fallback);}
function ProfessionLine({text,y,startSize,color,clipId}){
 const ref=useRef(null);const [size,setSize]=useState(startSize);
 useLayoutEffect(()=>{let cancelled=false;const measure=()=>{if(cancelled)return;const node=ref.current;const current=Number(node?.getAttribute("font-size"))||startSize;const length=node?.getComputedTextLength?.()||0;const next=length?Math.min(startSize,390*current/length*.995):startSize;setSize(previous=>Math.abs(previous-next)<.001?previous:next);};measure();document.fonts?.ready.then(measure);document.fonts?.addEventListener?.("loadingdone",measure);return()=>{cancelled=true;document.fonts?.removeEventListener?.("loadingdone",measure);};},[text,startSize]);
 return <text ref={ref} x="210" y={y} dominantBaseline="middle" textAnchor="middle" fill={color} fontFamily="Arial, sans-serif" fontWeight="400" fontSize={size} clipPath={`url(#${clipId})`}>{text}</text>;
}
export default function ProfessionBadgePreview({item={},maxWidth=420}){
 const id=`profession-${useId().replace(/:/g,"")}`;
 const raw=String(item.title||item.fixedProfessionTitle||item.badgeName||item.name||"Yrkestitel").split(/\r?\n/);
 const second=item.titleLine2||item.fixedProfessionTitleLine2||raw.slice(1).join(" ");
 const background=colorValue(item.color||item.fixedColor,"#d62828");
 const foreground=colorValue(item.textColor||item.fixedTextColor,background==="#ffffff"?"#111111":"#ffffff");
 return <svg role="img" aria-label={[raw[0],second].filter(Boolean).join(" ")} viewBox="0 0 420 100" style={{display:"block",width:"100%",maxWidth,height:"auto"}}><defs><clipPath id={id}><rect x="12" y="8" width="396" height="84"/></clipPath></defs><rect data-profession-outline="true" x="1" y="1" width="418" height="98" rx="8" fill={background} stroke={background==="#ffffff"?"#999":background} strokeWidth="1"/><ProfessionLine text={raw[0]} y={second?38:52} startSize={36} color={foreground} clipId={id}/>{second&&<ProfessionLine text={second} y={73} startSize={23} color={foreground} clipId={id}/>}</svg>;
}
