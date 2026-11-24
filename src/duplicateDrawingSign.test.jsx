import React from 'react';
import {render,screen,fireEvent,within,cleanup,waitFor} from '@testing-library/react';
import '@testing-library/jest-dom';
import ProjectDrawingPlanner from './pages/admin/ProjectDrawingPlanner';
jest.mock('./data/browserPdf',()=>({openPdf:()=>({promise:Promise.resolve({numPages:1,getPage:async()=>({getViewport:({scale})=>({width:600*scale,height:400*scale}),render:()=>({promise:Promise.resolve(),cancel:()=>{}})}),destroy:()=>{}}),destroy:()=>{}})}));
jest.mock('./pages/admin/DrawingDetailLayer',()=>()=>null);
const article={id:'sign',articleNumber:'0601',name:'Taktil rumsfunktionsskylt',previewType:'door_sign',productType:'dorrskylt',doorSignTextEnabled:true,doorSignTextConfig:{layoutMode:'tactile'},fields:{customText:true,quantity:true},format:'192 × 93,75 mm'};
const marker={id:'marker',articleId:'sign',position:'S001',page:1,x:.5,y:.5,text:'LABORATORIET',notes:'Rum 102012',configuration:{customText:'LABORATORIET'}};
const drawing={id:'drawing',name:'Plan 2',markers:[marker]},project={id:'project',number:'PRJ-1003',drawings:[drawing]};
beforeEach(()=>{global.fetch=jest.fn(async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)}));jest.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({measureText:()=>({width:100})});});
afterEach(()=>{cleanup();jest.restoreAllMocks();});

test.each([false,true])('Duplicate is placed and saved independently (library=%s)',async registerMode=>{
 const saved=jest.fn(),onSaved=jest.fn();let posted;
 global.fetch=jest.fn(async(url,options)=>{
  if(options?.method==='POST'){posted=JSON.parse(options.body);return {ok:true,json:async()=>({drawing:{...drawing,markers:[marker,{...posted,id:'copy',position:'S002'}]},marker:{...posted,id:'copy',position:'S002'}})};}
  return {ok:true,arrayBuffer:async()=>new ArrayBuffer(1)};
 });
 const view=render(<ProjectDrawingPlanner registerMode={registerMode} registerUrl="/library-test" onRegisterSave={saved} onSaved={onSaved} project={project} drawing={drawing} headers={{}} catalog={{articles:[article],categories:[]}} onClose={()=>{}}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Duplicera S001'}));
 expect(screen.getByText(/Kopia av S001/)).toHaveTextContent('Kopia av S001');expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(saved).not.toHaveBeenCalled();
 const stage=view.container.querySelector('.jsf-planner-stage');stage.getBoundingClientRect=()=>({left:0,top:0,width:1000,height:1000});
 fireEvent.click(stage,{clientX:700,clientY:300});
 const dialog=screen.getByRole('dialog');const text=within(dialog).getByDisplayValue('LABORATORIET');expect(text).toBeEnabled();
 fireEvent.change(text,{target:{value:'KOPIANS TEXT'}});fireEvent.submit(dialog.querySelector('form'));
 await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
 const result=registerMode?saved.mock.calls[0][0].markers[1]:posted;
 expect(result.configuration.customText).toBe('KOPIANS TEXT');expect(result.x).toBe(.7);expect(result.y).toBe(.3);expect(result.page).toBe(1);expect(result.unplaced).toBe(false);
 expect(marker.configuration.customText).toBe('LABORATORIET');expect(marker.x).toBe(.5);expect(marker.notes).toBe('Rum 102012');
 if(registerMode){expect(result.id).not.toBe(marker.id);expect(result.position).toBe('S002');expect(saved.mock.calls[0][0].markers[0].configuration.customText).toBe('LABORATORIET');}
 else{expect(result.id).toBeUndefined();expect(result.position).toBeUndefined();expect(fetch.mock.calls.find(([,o])=>o?.method==='POST')[0]).toBe('/api/projects/project/drawings/drawing/markers');}
});
test('Cancelling duplicate placement does not create a marker',async()=>{
 const saved=jest.fn();const view=render(<ProjectDrawingPlanner registerMode registerUrl="/library-test" onRegisterSave={saved} project={project} drawing={drawing} headers={{}} catalog={{articles:[article],categories:[]}} onClose={()=>{}}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Duplicera S001'}));fireEvent.click(screen.getByRole('button',{name:'Avbryt placering'}));fireEvent.click(view.container.querySelector('.jsf-planner-stage'),{clientX:100,clientY:100});
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(saved).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Duplicera S001'}));fireEvent.keyDown(document,{key:'Escape'});expect(screen.queryByRole('button',{name:'Avbryt placering'})).not.toBeInTheDocument();
});
test('Duplicate preserves nested hanging packages without sharing editable configuration',async()=>{
 const hanging={id:'hanging',articleNumber:'0301',name:'Pendlad skylt',productType:'pendlad_skylt',previewType:'hanging_sign',fields:{customText:true,quantity:true}};
 const original={...marker,articleId:'hanging',configuration:{customText:'Reception',hangingStack:{gapMm:10,items:[{id:'lower',articleId:'hanging',product:hanging,configuration:{customText:'Toalett'}}]}}};
 const saved=jest.fn();const view=render(<ProjectDrawingPlanner registerMode registerUrl="/library-test" onRegisterSave={saved} project={project} drawing={{...drawing,markers:[original]}} headers={{}} catalog={{articles:[hanging],categories:[]}} onClose={()=>{}}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Duplicera S001'}));const stage=view.container.querySelector('.jsf-planner-stage');stage.getBoundingClientRect=()=>({left:0,top:0,width:1000,height:1000});fireEvent.click(stage,{clientX:200,clientY:600});
 const dialog=screen.getByRole('dialog');expect(within(dialog).getByRole('button',{name:'Skylt 2'})).toBeInTheDocument();fireEvent.click(within(dialog).getByRole('button',{name:'Skylt 2'}));fireEvent.change(within(dialog).getByDisplayValue('Toalett'),{target:{value:'Hälsorum'}});fireEvent.submit(dialog.querySelector('form'));
 await waitFor(()=>expect(saved).toHaveBeenCalled());expect(saved.mock.calls[0][0].markers[1].configuration.hangingStack.items[0].configuration.customText).toBe('Hälsorum');expect(original.configuration.hangingStack.items[0].configuration.customText).toBe('Toalett');
});

test.each([false,true])('Deleting a drawing sign uses the shared confirmation, allows cancel and closes only after success (library=%s)',async registerMode=>{
 HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
 HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
 const confirm=jest.spyOn(window,'confirm').mockReturnValue(false),saved=jest.fn(),onSaved=jest.fn();
 global.fetch=jest.fn(async(url,options)=>options?.method==='DELETE'?{ok:true,json:async()=>({drawing:{...drawing,markers:[]}})}:{ok:true,arrayBuffer:async()=>new ArrayBuffer(1)});
 render(<ProjectDrawingPlanner registerMode={registerMode} registerUrl="/library-test" onRegisterSave={saved} onSaved={onSaved} project={project} drawing={drawing} headers={{}} catalog={{articles:[article],categories:[]}} onClose={()=>{}}/>);
 fireEvent.click(await screen.findByTitle(/^S001 –/));
 const editor=screen.getByRole('dialog');
 fireEvent.click(within(editor).getByRole('button',{name:'Ta bort skylt'}));
 let dialog=screen.getByRole('dialog',{name:'Ta bort skylt?'});expect(within(dialog).getByText('S001',{selector:'strong'})).toBeInTheDocument();expect(confirm).not.toHaveBeenCalled();expect(saved).not.toHaveBeenCalled();
 fireEvent.keyDown(dialog,{key:'Escape'});expect(editor).toBeInTheDocument();
 fireEvent.click(within(dialog).getByRole('button',{name:'Avbryt'}));expect(screen.queryByRole('dialog',{name:'Ta bort skylt?'})).not.toBeInTheDocument();expect(editor).toBeInTheDocument();
 fireEvent.click(within(editor).getByRole('button',{name:'Ta bort skylt'}));dialog=screen.getByRole('dialog',{name:'Ta bort skylt?'});fireEvent.click(within(dialog).getByRole('button',{name:'Ta bort skylt'}));
 await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
 if(registerMode)expect(saved).toHaveBeenCalledWith({name:drawing.name,markers:[]});else{expect(global.fetch).toHaveBeenCalledWith('/api/projects/project/drawings/drawing/markers/marker',expect.objectContaining({method:'DELETE'}));expect(onSaved).toHaveBeenCalled();}
});
