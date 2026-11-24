import React from 'react';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminDrawingLibraryPage from './pages/admin/AdminDrawingLibraryPage';
jest.mock('./pages/admin/ProjectDrawingPlanner',()=>()=>null);
const board={widthMm:770,heightMm:1385,title:'Avdelningar',targetTitle:'M\u00e5lpunkt',showFloor:true,columns:1,targetBackground:true,lineStyle:'solid',rows:[{text:'Apotek',target:'A',floor:'3'}]};
beforeEach(()=>{jest.spyOn(window,'scrollTo').mockImplementation(()=>{});jest.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({measureText:()=>({width:100})});});
afterEach(()=>{cleanup();jest.restoreAllMocks();});
test('drawing library OT editor opens PDF quantity dialog from its real toolbar',async()=>{
 global.fetch=jest.fn(async url=>({ok:true,json:async()=>String(url).includes('/api/catalog')?{articles:[],categories:[]}:{folders:[],items:[{id:'ot',type:'ot',name:'OT-test',folderId:null,board}]}}));
 render(<AdminDrawingLibraryPage adminPassword="test" role="admin"/>);
 const card=await screen.findByTitle('OT-test');fireEvent.click(card);
 fireEvent.click(await screen.findByRole('button',{name:'H\u00e4mta PDF'}));
 expect(await screen.findByRole('dialog',{name:'H\u00e4mta PDF'})).toBeInTheDocument();expect(screen.getByLabelText('Antal exemplar')).toHaveValue(1);
 fireEvent.click(screen.getByRole('button',{name:'Avbryt'}));await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});
