import {WorkspaceStatus,WorkspaceMenu} from '../../components/workspace/WorkspaceUI';
import WorkspaceIcon from '../../components/admin/WorkspaceIcon';
import {projectFolderDescendants,projectFolderPath} from '../../data/projectFolders';

export function ProjectFolderTrail({folders,folderId,onNavigate}){
 return <nav className="project-folder-trail" aria-label="Projektets mappsökväg">
  <button type="button" onClick={()=>onNavigate(null)}>Projekt &amp; Korrektur</button>
  {projectFolderPath(folders,folderId).map(folder=><span key={folder.id}><span aria-hidden="true">/</span><button type="button" onClick={()=>onNavigate(folder.id)}>{folder.name}</button></span>)}
 </nav>;
}
function OrganizeMenu({entry,kind,onOrganize}){
 return <WorkspaceMenu className="project-card-menu" label={`Hantera ${kind==='folder'?'mapp':'projekt'} ${entry.name}`}><button type="button" onClick={()=>onOrganize({kind,action:'rename',entry})}>Byt namn</button><button type="button" onClick={()=>onOrganize({kind,action:'move',entry})}>Flytta</button><button type="button" data-danger="true" onClick={()=>onOrganize({kind,action:'delete',entry})}>Ta bort {kind==='folder'?'mapp':'projekt'}</button></WorkspaceMenu>;
}
export default function ProjectFolderBrowser({folders,projects,folderId,search,allProjects,readOnly,onNavigate,onOpenProject,onOrganize,onShowAll}){
 const query=search.trim().toLocaleLowerCase('sv');
 const current=folders.find(folder=>folder.id===folderId);
 const visibleFolderIds=new Set(projects.flatMap(project=>projectFolderPath(folders,project.folderId).map(folder=>folder.id)));
 const visibleFolders=allProjects?[]:folders.filter(folder=>(!readOnly||visibleFolderIds.has(folder.id))&&(query?projectFolderPath(folders,folder.id).map(f=>f.name).join(' / ').toLocaleLowerCase('sv').includes(query):(folder.parentId||null)===(folderId||null))).sort((a,b)=>a.name.localeCompare(b.name,'sv'));
 const visibleProjects=query||allProjects?projects:projects.filter(project=>(project.folderId||null)===(folderId||null)||(!folderId&&project.folderId&&!folders.some(folder=>folder.id===project.folderId)));
 return <>
  <div className="project-folder-location"><strong>{query?'Sökresultat':allProjects?'Alla projekt':current?.name||'Mappar och projekt'}</strong><button type="button" className="project-folder-all" aria-pressed={allProjects} onClick={onShowAll}>{allProjects?'Visa mappar':'Alla projekt'}</button></div>
  {!!visibleFolders.length&&<div className="project-folder-grid" aria-label="Projektmappar">{visibleFolders.map(folder=>{
   const ids=projectFolderDescendants(folders,folder.id),count=projects.filter(project=>ids.has(project.folderId)).length;
   return <article key={folder.id} className="project-folder-card"><button type="button" className="project-folder-open" title={folder.name} onClick={()=>onNavigate(folder.id)}><WorkspaceIcon name="projects"/><span><strong>{folder.name}</strong><small>{query?projectFolderPath(folders,folder.parentId).map(f=>f.name).join(' / ')||'Rotmappen':`${count} projekt${folders.some(f=>f.parentId===folder.id)?' · Undermappar':''}`}</small></span><span aria-hidden="true">›</span></button>{!readOnly&&<OrganizeMenu entry={folder} kind="folder" onOrganize={onOrganize}/>}</article>;
  })}</div>}
  {!!visibleProjects.length&&<div className="project-grid">{visibleProjects.map(project=><article key={project.id} className="project-organized-card">
   <button className="project-card" title={project.name} onClick={()=>onOpenProject(project)}><div className="project-card-top"><span>{project.reservedOrderNumber||project.number}</span><WorkspaceStatus status={project.status}/></div><h2>{project.name}</h2><p>{project.customer||'Ingen kund angiven'}</p>{(query||allProjects)&&<small className="project-card-path">{projectFolderPath(folders,project.folderId).map(f=>f.name).join(' / ')||'Utan mapp'}</small>}<div className="project-card-foot"><span>▤ {project.drawings?.length||0} ritningar</span><span>Öppna projekt →</span></div></button>
   {!readOnly&&<OrganizeMenu entry={project} kind="project" onOrganize={onOrganize}/>}
  </article>)}</div>}
  {!visibleFolders.length&&!visibleProjects.length&&<div className="project-empty">{query?'Inga mappar eller projekt matchar sökningen.':'Här finns inga projekt eller undermappar ännu.'}</div>}
 </>;
}
