import {useEffect,useState} from 'react';

export default function ProjectOriginalFiles({orderId,item,index,credential}){
 const [preview,setPreview]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const base='/api/orders/'+encodeURIComponent(orderId)+'/project-original/'+index;
 const proof=item.proofFile||(item.productionFile?.mime!=='application/pdf'?item.productionFile:null);
 useEffect(()=>{
  setPreview('');setError('');if(!proof)return;
  const controller=new AbortController();let objectUrl;
  fetch(base+'/proof',{headers:{'x-admin-password':credential},signal:controller.signal}).then(async response=>{
   if(!response.ok)throw new Error('Korrekturbilden kunde inte hämtas.');const blob=await response.blob();if(controller.signal.aborted)return;objectUrl=URL.createObjectURL(blob);setPreview(objectUrl);
  }).catch(error=>{if(error.name!=='AbortError')setError(error.message);});
  return()=>{controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
 },[base,proof?.id,credential]); // eslint-disable-line react-hooks/exhaustive-deps
 async function download(){
  if(busy)return;setBusy(true);setError('');try{
   const response=await fetch(base+'/production',{headers:{'x-admin-password':credential}});if(!response.ok)throw new Error('Produktionsoriginalet kunde inte hämtas.');
   const url=URL.createObjectURL(await response.blob()),link=document.createElement('a');link.href=url;link.download=item.productionFile?.name||'produktionsoriginal';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  }catch(error){setError(error.message);}finally{setBusy(false);}
 }
 return <div style={{marginTop:10,display:'grid',gap:7,maxWidth:220}}>
  {preview&&<a href={preview} download={proof?.name||'korrekturbild'} title="Hämta korrekturbild"><img src={preview} alt={'Korrekturbild – '+(item.badgeName||'Specialskylt')} style={{display:'block',maxWidth:180,width:'100%',height:90,objectFit:'contain',background:'#fafafa'}}/></a>}
  {!proof&&<small>Ingen separat korrekturbild</small>}
  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{preview&&<a href={preview} download={proof?.name||'korrekturbild'}>Korrekturbild</a>}<button type="button" disabled={busy} onClick={download}>{busy?'Hämtar…':'Hämta original'}</button></div>
  {error&&<small role="alert">{error}</small>}
 </div>;
}
