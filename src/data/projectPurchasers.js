const email=value=>String(value||'').trim().toLowerCase();
export function projectBelongsToUser(project,user={}) {
 const purchaser=email(project.purchaserEmail);
 if(purchaser)return Boolean(email(user?.email)&&purchaser===email(user?.email));
 return Boolean(project.purchaserAccountId&&user?.id&&String(project.purchaserAccountId)===String(user?.id));
}
export function projectPurchaserKey(project) {
 return email(project.purchaserEmail)?`email:${email(project.purchaserEmail)}`:project.purchaserAccountId?`account:${project.purchaserAccountId}`:project.purchaserName?`name:${project.purchaserName.trim().toLowerCase()}`:'unassigned';
}
export function projectMatchesPurchaser(project,filter,user) {
 return filter==='all'||(filter==='mine'?projectBelongsToUser(project,user):projectPurchaserKey(project)===filter);
}
export function projectPurchaserOptions(projects) {
 const options=new Map();
 for(const project of projects){const key=projectPurchaserKey(project);if(key!=='unassigned'&&!options.has(key))options.set(key,{key,label:project.purchaserName?`${project.purchaserName}${project.purchaserEmail?` (${project.purchaserEmail})`:''}`:project.purchaserEmail||'Beställare'});}
 return [...options.values()].sort((a,b)=>a.label.localeCompare(b.label,'sv'));
}

