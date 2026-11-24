import {useEffect,useState} from 'react';
import {elevatorBoardVariants} from '../data/elevatorBoardVariants';
import {getCatalogSnapshot,getCatalogAccessHeaders} from '../data/catalogStore';

// The drawing library is the source of truth; catalog entries may be published snapshots.
export default function useDrawingBoardVariants(variants,type,selectedId,{articles,credential}={}){
 const [library,setLibrary]=useState(null),[error,setError]=useState('');
 useEffect(()=>{
  let active=true;let pending=false;
  const refresh=async()=>{
   if(pending||document.visibilityState==='hidden')return;
   pending=true;
   try{
    const headers=credential?{'x-admin-password':credential}:getCatalogAccessHeaders();
    const response=await fetch('/api/drawing-library',{headers,cache:'no-store'});
    if(!response.ok)throw new Error('Kunde inte hämta den senast sparade tavlan. Försök välja tavlan igen.');
    const data=await response.json();
    if(!Array.isArray(data.items))throw new Error('Kunde inte läsa de sparade tavlorna.');
    if(active){setLibrary(data);setError('');}
   }catch(failure){if(active)setError(failure.message);}
   finally{pending=false;}
  };
  refresh();window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
  return()=>{active=false;window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
 },[type,selectedId,credential]);
 if(type==='elevator'&&library)return {error,variants:elevatorBoardVariants(library,articles??getCatalogSnapshot().articles,variants)};
 return {error,variants:variants.map(variant=>{
  const saved=library?.items?.find(item=>item.id===variant.id&&item.type===type);
  return saved?{...variant,name:saved.name,board:saved.board,...(type==='elevator'?{floorCopies:saved.floorCopies??1,cabinCopies:saved.cabinCopies??0}:{unitPrice:saved.unitPrice??variant.unitPrice})}:variant;
 })};
}
