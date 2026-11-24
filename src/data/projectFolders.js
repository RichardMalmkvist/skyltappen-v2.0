export function projectFolderPath(folders,id){
 const path=[],seen=new Set();let current=folders.find(folder=>folder.id===id);
 while(current&&!seen.has(current.id)){seen.add(current.id);path.unshift(current);const parentId=current.parentId;current=folders.find(folder=>folder.id===parentId);}
 return path;
}
export function projectFolderOptions(folders){
 return folders.map(folder=>({id:folder.id,label:projectFolderPath(folders,folder.id).map(item=>item.name).join(' / ')})).sort((a,b)=>a.label.localeCompare(b.label,'sv'));
}
export function projectFolderDescendants(folders,id){
 const ids=new Set([id]);let changed=true;
 while(changed){changed=false;for(const folder of folders)if(ids.has(folder.parentId)&&!ids.has(folder.id)){ids.add(folder.id);changed=true;}}
 return ids;
}
