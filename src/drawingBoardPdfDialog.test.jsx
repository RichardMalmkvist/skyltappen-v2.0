import React from 'react';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import '@testing-library/jest-dom';
import DrawingBoardPdfDialog from './pages/admin/DrawingBoardPdfDialog';
const ot={type:'ot',name:'OT test',articleNumber:'0810',board:{widthMm:770,heightMm:1385}};
beforeEach(()=>{URL.createObjectURL=jest.fn(()=>'/test-pdf');URL.revokeObjectURL=jest.fn();jest.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});});
afterEach(()=>{cleanup();jest.restoreAllMocks();});
test('OT PDF uses the selected copies and current unsaved board without saving it',async()=>{
 global.fetch=jest.fn(async()=>({ok:true,headers:{get:()=> 'application/pdf'},blob:async()=>new Blob(['%PDF-test'],{type:'application/pdf'})}));
 const close=jest.fn();render(<DrawingBoardPdfDialog draft={ot} location="Varnamo sjukhus" adminPassword="credential" onClose={close}/>);
 fireEvent.change(screen.getByLabelText('Antal exemplar'),{target:{value:'3'}});fireEvent.submit(screen.getByRole('button',{name:'H\u00e4mta PDF'}).closest('form'));
 await waitFor(()=>expect(close).toHaveBeenCalled());
 expect(fetch).toHaveBeenCalledTimes(1);const [url,options]=fetch.mock.calls[0];expect(url).toBe('/api/drawing-library/export-pdf');expect(JSON.parse(options.body)).toEqual({...ot,location:"Varnamo sjukhus",quantity:3});expect(options.headers['x-admin-password']).toBe('credential');
});
test('elevator PDF lets copy counts differ from the saved order defaults',async()=>{
 const draft={type:'elevator',name:'Hiss G',floorCopies:4,cabinCopies:1,board:{widthMm:420,heightMm:485}};
 global.fetch=jest.fn(async()=>({ok:true,headers:{get:()=> 'application/pdf'},blob:async()=>new Blob(['pdf'])}));
 render(<DrawingBoardPdfDialog draft={draft} adminPassword="credential" onClose={()=>{}}/>);
 fireEvent.change(screen.getByLabelText('V\u00e5ningsplansexemplar'),{target:{value:'8'}});fireEvent.change(screen.getByLabelText('Hisskorgsexemplar'),{target:{value:'2'}});
 fireEvent.click(screen.getByRole('button',{name:'H\u00e4mta PDF'}));await waitFor(()=>expect(fetch).toHaveBeenCalled());
 expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({floorCopies:8,cabinCopies:2});expect(draft.floorCopies).toBe(4);
});
test('invalid quantities are blocked and server errors leave the dialog open',async()=>{
 global.fetch=jest.fn(async()=>({ok:false,json:async()=>({message:'Starta om servern.'})}));const close=jest.fn();
 render(<DrawingBoardPdfDialog draft={ot} adminPassword="credential" onClose={close}/>);
 const input=screen.getByLabelText('Antal exemplar');fireEvent.change(input,{target:{value:'0'}});expect(screen.getByRole('button',{name:'H\u00e4mta PDF'})).toBeDisabled();
 fireEvent.change(input,{target:{value:'1'}});fireEvent.click(screen.getByRole('button',{name:'H\u00e4mta PDF'}));expect(await screen.findByRole('alert')).toHaveTextContent('Starta om servern.');expect(close).not.toHaveBeenCalled();
});
