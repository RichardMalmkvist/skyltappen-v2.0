import React from 'react';
import {render,screen,fireEvent,within,cleanup} from '@testing-library/react';
import '@testing-library/jest-dom';
import ProjectDrawingPlanner from './pages/admin/ProjectDrawingPlanner';
jest.mock('./data/browserPdf',()=>({openPdf:()=>({promise:Promise.resolve({numPages:1,getPage:async()=>({getViewport:({scale})=>({width:600*scale,height:400*scale}),render:()=>({promise:Promise.resolve(),cancel:()=>{}})}),destroy:()=>{}}),destroy:()=>{}})}));
jest.mock('./pages/admin/DrawingDetailLayer',()=>()=>null);
const article={id:'sign',articleNumber:'0601',name:'Taktil rumsfunktionsskylt',previewType:'door_sign',productType:'dorrskylt',doorSignTextEnabled:true,doorSignTextConfig:{layoutMode:'tactile'},fields:{customText:true,quantity:true},format:'192 × 93,75 mm'};
const marker={id:'marker',articleId:'sign',position:'S001',page:1,x:.5,y:.5,text:'LABORATORIET',notes:'Rum 102012',configuration:{customText:'LABORATORIET'}};
const drawing={id:'drawing',name:'Plan 2',markers:[marker]},project={id:'project',number:'PRJ-1003',drawings:[drawing]};
beforeEach(()=>{global.fetch=jest.fn(async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)}));jest.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({measureText:()=>({width:100})});});
afterEach(()=>{cleanup();jest.restoreAllMocks();});
test.each([false,true])('Read-only marker clicks show the real preview, notes and disabled fields (library=%s)',async registerMode=>{
 render(<ProjectDrawingPlanner readOnly registerMode={registerMode} registerUrl="/library-test" project={project} drawing={drawing} headers={{}} catalog={{articles:[article],categories:[]}} onClose={()=>{}}/>);
 const position=await screen.findByTitle(/S001 – 0601/);position.focus();fireEvent.click(position);
 const dialog=screen.getByRole('dialog',{name:'Visa skylt'});
 expect(within(dialog).getByLabelText('Produktfoto med anpassningsbar textyta')).toBeInTheDocument();
 expect(within(dialog).getByDisplayValue('LABORATORIET')).toBeDisabled();expect(within(dialog).getByDisplayValue('Rum 102012')).toBeDisabled();
 expect(within(dialog).getByText('Taktil rumsfunktionsskylt')).toBeInTheDocument();expect(within(dialog).getByText('LABORATORIET',{selector:'text'})).toBeInTheDocument();
 for(const name of [/Byt artikel/,/Spara skylt/,/Spara befintlig/,/Ta bort skylt/])expect(within(dialog).queryByRole('button',{name})).not.toBeInTheDocument();
 fireEvent.submit(dialog.querySelector('form'));
 expect(fetch.mock.calls.every(([,options])=>!options?.method||options.method==='GET')).toBe(true);
 fireEvent.keyDown(document,{key:'Escape'});expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(position).toHaveFocus();
});
test('Missing articles show the saved information without exposing the article picker',async()=>{
 render(<ProjectDrawingPlanner readOnly project={project} drawing={drawing} headers={{}} catalog={{articles:[],categories:[]}} onClose={()=>{}}/>);
 fireEvent.click(await screen.findByTitle(/S001/));const dialog=screen.getByRole('dialog',{name:'Visa skylt'});
 expect(dialog).toHaveTextContent('Artikeln saknas');expect(dialog).toHaveTextContent('LABORATORIET');expect(dialog).toHaveTextContent('Rum 102012');expect(within(dialog).queryByText('Alla artiklar')).not.toBeInTheDocument();
});
test('Admin retains editable fields and save/delete actions',async()=>{
 render(<ProjectDrawingPlanner project={project} drawing={drawing} headers={{}} catalog={{articles:[article],categories:[]}} onClose={()=>{}}/>);
 fireEvent.click(await screen.findByTitle(/S001 – 0601/));const dialog=screen.getByRole('dialog',{name:'Välj och anpassa skylt'});
 expect(within(dialog).getByDisplayValue('LABORATORIET')).toBeEnabled();expect(within(dialog).getByRole('button',{name:'Spara skylt i projektet'})).toBeEnabled();expect(within(dialog).getByRole('button',{name:'Ta bort skylt'})).toBeEnabled();
});
