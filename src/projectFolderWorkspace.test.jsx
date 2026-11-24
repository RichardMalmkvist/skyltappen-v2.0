import React from 'react';
import {render,screen,fireEvent,waitFor,within,cleanup} from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminProjectsPage from './pages/admin/AdminProjectsPage';
jest.mock('./pages/admin/ProjectDrawingPlanner',()=>()=>null);
jest.mock('./components/projects/ProjectProofModal',()=>()=>null);
jest.mock('./components/projects/ProjectApprovalPanel',()=>()=>null);
let projects,folders;
const original={id:'p1',number:'PRJ-1001',name:'Gamla projektet',customer:'Regionen',status:'Planering',drawings:[{id:'drawing',name:'Plan 3',markers:[{id:'m1',text:'Apotek',quantity:2}]}],orderId:'order-old'};
beforeEach(()=>{
 projects=[JSON.parse(JSON.stringify(original)),{id:'p2',number:'PRJ-1002',name:'Nya skyltar',customer:'Regionen',status:'P\u00e5g\u00e5ende',folderId:'b',drawings:[]}];
 folders=[{id:'a',name:'Ryhov',parentId:null},{id:'b',name:'Ogon',parentId:'a'},{id:'c',name:'Varnamo',parentId:null}];
 global.fetch=jest.fn(async(url,options={})=>{
  const body=options.body?JSON.parse(options.body):{};let data={};
  if(url==='/api/catalog')data={articles:[],categories:[]};
  else if(url==='/api/projects'&&!options.method)data={projects,folders};
  else if(url==='/api/project-folders'&&options.method==='POST'){const folder={id:'new',name:body.name,parentId:body.parentId};folders=[...folders,folder];data={folder};}
  else if(url==='/api/projects'&&options.method==='POST'){const project={...body,id:'created',number:'PRJ-1003',drawings:[]};projects=[...projects,project];data={project};}
  else if(String(url).startsWith('/api/projects/')&&options.method==='PATCH'){const id=url.split('/').at(-1);projects=projects.map(p=>p.id===id?{...p,...body}:p);data={project:projects.find(p=>p.id===id)};}
  else if(String(url).startsWith('/api/project-folders/')&&options.method==='PATCH'){const id=url.split('/').at(-1);folders=folders.map(p=>p.id===id?{...p,...body}:p);data={folder:folders.find(p=>p.id===id)};}
  return {ok:true,json:async()=>JSON.parse(JSON.stringify(data))};
 });
});
afterEach(()=>{cleanup();jest.restoreAllMocks();});
function openMenu(name){const summary=screen.getByLabelText(name);summary.closest('details').open=true;return within(summary.closest('details'));}
test('legacy projects remain in root and nested navigation preserves their existing workspace',async()=>{
 render(<AdminProjectsPage adminPassword="token" role="admin"/>);
 expect(await screen.findByTitle('Gamla projektet')).toBeInTheDocument();expect(screen.queryByTitle('Nya skyltar')).not.toBeInTheDocument();
 fireEvent.click(screen.getByTitle('Ryhov'));fireEvent.click(await screen.findByTitle('Ogon'));fireEvent.click(await screen.findByTitle('Nya skyltar'));
 expect(screen.getByRole('navigation',{name:'Projektvyer'})).toBeInTheDocument();expect(screen.getByRole('button',{name:'Korrektur'})).toBeInTheDocument();
 expect(projects[0]).toEqual(original);
});
test('folder creation inside a folder persists the correct parent and reuses the organize dialog',async()=>{
 render(<AdminProjectsPage adminPassword="token" role="admin"/>);fireEvent.click(await screen.findByTitle('Ryhov'));fireEvent.click(screen.getByRole('button',{name:'+ Ny mapp'}));
 const dialog=screen.getByRole('dialog',{name:'Ny mapp'});fireEvent.change(within(dialog).getByLabelText('Mappnamn'),{target:{value:'Ortopedi'}});fireEvent.click(within(dialog).getByRole('button',{name:'Skapa mapp'}));
 expect(await screen.findByTitle('Ortopedi')).toBeInTheDocument();expect(folders.find(f=>f.name==='Ortopedi').parentId).toBe('a');
});
test('projects can be moved and renamed without losing drawings or order linkage',async()=>{
 render(<AdminProjectsPage adminPassword="token" role="admin"/>);await screen.findByTitle('Gamla projektet');
 fireEvent.click(openMenu('Hantera projekt Gamla projektet').getByRole('button',{name:'Byt namn'}));let dialog=screen.getByRole('dialog',{name:'Byt namn p\u00e5 projekt'});
 fireEvent.change(within(dialog).getByLabelText('Projektnamn'),{target:{value:'Nytt projektnamn'}});fireEvent.click(within(dialog).getByRole('button',{name:'Spara namn'}));await screen.findByTitle('Nytt projektnamn');
 fireEvent.click(openMenu('Hantera projekt Nytt projektnamn').getByRole('button',{name:'Flytta'}));dialog=screen.getByRole('dialog',{name:'Flytta projekt'});
 fireEvent.change(within(dialog).getByLabelText('Flytta till'),{target:{value:'b'}});fireEvent.click(within(dialog).getByRole('button',{name:'Flytta'}));
 await waitFor(()=>expect(projects[0].folderId).toBe('b'));expect(projects[0].drawings).toEqual(original.drawings);expect(projects[0].orderId).toBe('order-old');
});
test('folder moves exclude itself and all descendant destinations',async()=>{
 render(<AdminProjectsPage adminPassword="token" role="admin"/>);await screen.findByTitle('Ryhov');fireEvent.click(openMenu('Hantera mapp Ryhov').getByRole('button',{name:'Flytta'}));
 const select=within(screen.getByRole('dialog',{name:'Flytta mapp'})).getByLabelText('Flytta till');const options=within(select).getAllByRole('option');expect(options.map(o=>o.value)).toEqual(['','c']);
});
test('search finds a project by ancestor folder and projects can be created in the current folder',async()=>{
 render(<AdminProjectsPage adminPassword="token" role="admin"/>);await screen.findByTitle('Ryhov');fireEvent.change(screen.getByLabelText('S\u00f6k projekt'),{target:{value:'Ryhov'}});expect(await screen.findByTitle('Nya skyltar')).toBeInTheDocument();
 fireEvent.click(screen.getByTitle('Ryhov'));fireEvent.click(screen.getByRole('button',{name:/Nytt projekt/}));expect(screen.getByLabelText('Mapp')).toHaveValue('a');
 fireEvent.change(screen.getByLabelText('Projekt *'),{target:{value:'Nytt jobb'}});fireEvent.click(screen.getByRole('button',{name:'Spara projekt'}));await waitFor(()=>expect(projects.find(p=>p.id==='created')?.folderId).toBe('a'));
});
test.each(['personal','bestallare'])('read-only role %s has no folder or project editing actions',async role=>{
 render(<AdminProjectsPage adminPassword="token" role={role} user={{email:'buyer@example.test'}}/>);await waitFor(()=>expect(fetch).toHaveBeenCalled());
 expect(screen.queryByRole('button',{name:'+ Ny mapp'})).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:/Nytt projekt/})).not.toBeInTheDocument();expect(screen.queryByLabelText('Hantera mapp Ryhov')).not.toBeInTheDocument();
});


test('reserved order number appears on project card and workspace and can be searched',async()=>{
 projects[0].reservedOrderNumber='0026120-00';
 render(<AdminProjectsPage adminPassword="token" role="admin"/>);
 const card=await screen.findByTitle('Gamla projektet');expect(within(card).getByText('0026120-00')).toBeVisible();
 fireEvent.change(screen.getByRole('textbox',{name:/S?k projekt/}),{target:{value:'0026120-00'}});
 expect(screen.getByTitle('Gamla projektet')).toBeVisible();
 fireEvent.click(screen.getByTitle('Gamla projektet'));expect(screen.getByText('0026120-00')).toBeVisible();
});
