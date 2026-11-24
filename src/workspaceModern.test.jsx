import React from 'react';
import {render,screen,fireEvent,within,waitFor,act} from '@testing-library/react';
import '@testing-library/jest-dom';
import {WorkspaceStatus,WorkspaceMenu,WorkspaceFeedback,WorkspaceSkeleton} from './components/workspace/WorkspaceUI';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminProjectsPage from './pages/admin/AdminProjectsPage';
jest.mock('./data/browserPdf',()=>({}));const order={id:'o',orderNumber:'0026001-00',createdAt:'2026-11-08',status:'godkänd',orderTotal:260,orderer:{customer:'Testkund',ordererName:'Anna'},cart:[{id:'i',articleNumber:'0730',badgeName:'Dekal',quantity:1,unitPrice:260,lineTotal:260}]};
const reply=(body,ok=true)=>({ok,json:async()=>body});
beforeEach(()=>{global.fetch=jest.fn(async()=>reply({articles:[]}));});
test('Status labels remain readable and distinct without relying only on color',()=>{
 const {rerender}=render(<WorkspaceStatus status="pending" label="Väntar på godkännande"/>);expect(screen.getByText('Väntar på godkännande')).toHaveAttribute('data-tone','waiting');
 rerender(<WorkspaceStatus status="changes_requested" label="Ändringar begärda"/>);expect(screen.getByText('Ändringar begärda')).toHaveAttribute('data-tone','attention');
 rerender(<WorkspaceStatus status="godkänd"/>);expect(screen.getByText('godkänd')).toHaveAttribute('data-tone','success');
});
test('The compact menu closes on Escape and outside clicks, restoring keyboard focus',()=>{
 const action=jest.fn();render(<><WorkspaceMenu label="Hantera projekt"><button onClick={action}>Redigera</button></WorkspaceMenu><button>Utanför</button></>);
 const trigger=screen.getByLabelText('Hantera projekt'),menu=trigger.closest('details');fireEvent.click(trigger);expect(menu.open).toBe(true);
 fireEvent.keyDown(trigger,{key:'Escape'});expect(menu.open).toBe(false);expect(trigger).toHaveFocus();
 fireEvent.click(trigger);fireEvent.pointerDown(screen.getByRole('button',{name:'Utanför'}));expect(menu.open).toBe(false);
 fireEvent.click(trigger);fireEvent.click(screen.getByRole('button',{name:'Redigera'}));expect(action).toHaveBeenCalledTimes(1);expect(menu.open).toBe(false);
});
test('Success, errors and real loading have appropriate accessible feedback',()=>{
 const dismiss=jest.fn();const {rerender}=render(<WorkspaceFeedback onDismiss={dismiss}>Sparat</WorkspaceFeedback>);expect(screen.getByRole('status')).toHaveTextContent('Sparat');fireEvent.click(screen.getByRole('button',{name:'Stäng bekräftelsen'}));expect(dismiss).toHaveBeenCalledTimes(1);
 rerender(<WorkspaceFeedback error>Kunde inte spara</WorkspaceFeedback>);expect(screen.getByRole('alert')).toHaveTextContent('Kunde inte spara');
 rerender(<WorkspaceSkeleton label="Hämtar projekt"/>);expect(screen.getByRole('status',{name:'Hämtar projekt'})).toHaveAttribute('aria-busy','true');
});
test('Orders show loading rather than an empty list and personal users cannot modify orders',async()=>{
 const {rerender}=render(<AdminOrdersPage role="personal" loading orders={[]}/>);expect(screen.getByRole('status',{name:'Hämtar ordrar'})).toBeVisible();
 rerender(<AdminOrdersPage role="personal" orders={[order]}/>);expect(screen.queryByRole('status',{name:'Hämtar ordrar'})).toBeNull();expect(screen.queryByRole('button',{name:'Redigera'})).toBeNull();expect(screen.queryByRole('button',{name:'+ Ny order'})).toBeNull();await waitFor(()=>expect(fetch).toHaveBeenCalled());
});
test('Saving an order exposes busy feedback and confirms completion only after the request succeeds',async()=>{
 let complete;fetch.mockImplementation((url,options)=>options?.method==='PUT'?new Promise(resolve=>{complete=resolve;}):Promise.resolve(reply({articles:[]})));
 const refresh=jest.fn(async()=>{});render(<AdminOrdersPage role="admin" orders={[order]} onOrdersChanged={refresh}/>);
 fireEvent.click(screen.getByRole('button',{name:'Redigera'}));const dialog=screen.getByRole('dialog');fireEvent.click(within(dialog).getByRole('button',{name:'Spara ändringar'}));
 expect(within(dialog).getByRole('button',{name:'Sparar…'})).toBeDisabled();expect(screen.queryByRole('status')).toBeNull();
 await act(async()=>complete(reply({order})));expect(screen.queryByRole('dialog')).toBeNull();expect(screen.getByRole('status')).toHaveTextContent('uppdaterades');expect(refresh).toHaveBeenCalledTimes(1);
});
test('Failed saves remain editable in the dialog and can be retried without losing data',async()=>{
 let attempts=0;fetch.mockImplementation(async(url,options)=>options?.method==='PUT'?reply({message:'Försök igen'},++attempts>1):reply({articles:[]}));
 render(<AdminOrdersPage role="admin" orders={[order]}/>);fireEvent.click(screen.getByRole('button',{name:'Redigera'}));let dialog=screen.getByRole('dialog');fireEvent.click(within(dialog).getByRole('button',{name:'Spara ändringar'}));
 expect(await within(dialog).findByRole('alert')).toHaveTextContent('Försök igen');expect(within(dialog).getByDisplayValue('Testkund')).toBeVisible();fireEvent.click(within(dialog).getByRole('button',{name:'Spara ändringar'}));await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());expect(attempts).toBe(2);
});
test('Projects retain a loading placeholder until data arrives rather than showing an empty workspace',async()=>{
 let complete;fetch.mockImplementation(url=>url==='/api/projects'?new Promise(resolve=>{complete=resolve;}):Promise.resolve(reply({articles:[]})));
 render(<AdminProjectsPage role="admin"/>);expect(screen.getByRole('status',{name:'Hämtar projekt'})).toBeVisible();
 await act(async()=>complete(reply({projects:[{id:'p',number:'PRJ-1',name:'Entré',status:'Planering',drawings:[]}],folders:[]})));expect(await screen.findByRole('button',{name:/Entré/})).toBeVisible();expect(screen.queryByRole('status',{name:'Hämtar projekt'})).toBeNull();
});
