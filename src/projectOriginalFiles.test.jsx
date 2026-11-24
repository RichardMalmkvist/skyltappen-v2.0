import React from 'react';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import '@testing-library/jest-dom';
import ProjectOriginalFiles from './components/orders/ProjectOriginalFiles';
const item={badgeName:'Corel-skylt',productionFile:{id:'prod',mime:'application/pdf',name:'original.pdf'},proofFile:{id:'proof',name:'korrektur.png'}};
beforeEach(()=>{URL.createObjectURL=jest.fn(()=>'blob:test');URL.revokeObjectURL=jest.fn();global.fetch=jest.fn(async()=>({ok:true,blob:async()=>new Blob(['original'])}));});
afterEach(()=>{cleanup();jest.restoreAllMocks();});
test('Saved proof is authenticated, original retains its filename, and preview is released',async()=>{
 const click=jest.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(function(){expect(this.download).toBe('original.pdf');});
 const {unmount}=render(<ProjectOriginalFiles orderId="o" item={item} index={2} credential="secret"/>);
 expect(await screen.findByRole('img',{name:'Korrekturbild – Corel-skylt'})).toHaveAttribute('src','blob:test');
 expect(fetch).toHaveBeenCalledWith('/api/orders/o/project-original/2/proof',expect.objectContaining({headers:{'x-admin-password':'secret'}}));
 fireEvent.click(screen.getByRole('button',{name:'Hämta original'}));await waitFor(()=>expect(click).toHaveBeenCalledTimes(1));
 expect(fetch).toHaveBeenCalledWith('/api/orders/o/project-original/2/production',{headers:{'x-admin-password':'secret'}});
 unmount();expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
});
test('Missing proof does not request or display a PDF as an image',()=>{render(<ProjectOriginalFiles orderId="o" item={{...item,proofFile:null}} index={0}/>);expect(fetch).not.toHaveBeenCalled();expect(screen.getByText('Ingen separat korrekturbild')).toBeVisible();});
test('Original download errors are visible and allow retry',async()=>{global.fetch=jest.fn(async()=>({ok:false}));render(<ProjectOriginalFiles orderId="o" item={{...item,proofFile:null}} index={0}/>);fireEvent.click(screen.getByRole('button',{name:'Hämta original'}));expect(await screen.findByRole('alert')).toHaveTextContent('Produktionsoriginalet kunde inte hämtas');expect(screen.getByRole('button',{name:'Hämta original'})).toBeEnabled();});
