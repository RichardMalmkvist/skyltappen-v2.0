import {vinylTextSettings} from '../../data/vinylText';
export default function VinylTextPreview({product,form,maxWidth=600}){
 const {text,heightMm,fontWeight}=vinylTextSettings(form,product);
 return <figure aria-label="Förhandsvisning av svart folietext" style={{margin:'0 auto',width:'100%',maxWidth,minWidth:0}}>
  <div style={{overflowX:'auto',padding:'32px 18px',background:'#fff',textAlign:'center'}}><span style={{display:'inline-block',whiteSpace:'pre',fontFamily:'Arial,sans-serif',fontWeight,fontSize:Math.max(18,Math.min(140,(Number.isFinite(heightMm)?heightMm:40)*1.7)),lineHeight:1.3,color:'#111'}}>{text||'Din text'}</span></div>
  <figcaption style={{textAlign:'center',font:'400 12px/1.5 Arial,sans-serif',color:'#737373',marginTop:12}}>{Number.isFinite(heightMm)?heightMm:'–'} mm texthöjd · Arial {fontWeight===700?'Bold':'Regular'} · Svart folie</figcaption>
 </figure>;
}
