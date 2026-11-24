import React from 'react';
import {render,screen,fireEvent,waitFor,cleanup,within} from '@testing-library/react';
import '@testing-library/jest-dom';
import ProjectApprovalPanel from './components/projects/ProjectApprovalPanel';
import AdminProjectsPage from './pages/admin/AdminProjectsPage';
import OrderNotifications from './components/orders/OrderNotifications';
jest.mock('./data/browserPdf',()=>({}));
jest.mock('./components/projects/ProjectProofModal',()=>({publication,onReady,onClose,onPublish,onSignFeedback})=><div role="dialog" aria-label="Sparat korrektur"><span>Version {publication.version}</span><button onClick={()=>{onReady?.();onClose();}}>Granskat korrektur</button>{onSignFeedback&&<button onClick={()=>onSignFeedback({sign:{drawingId:'d',markerId:'m'},changeType:'adjust',comment:'Byt skylttext till PROVTAGNING.',requestId:'test-sign'})}>Kommentera skylt S001</button>}{onPublish&&<button onClick={()=>onPublish({showPrices:false})}>Skicka för godkännande</button>}</div>);
jest.mock('./components/orders/OrderAcknowledgementModal',()=>({order,onClose})=><div role="dialog" aria-label="Sparad offert">{order.orderTotal}<button onClick={onClose}>Stäng offert</button></div>);
const project={id:'p',number:'PRJ-1003',name:'Projekt',updatedAt:'revision1',purchaserName:'Anna',purchaserEmail:'anna@example.test',purchaserPhone:'0701234567',drawings:[{id:'d',markers:[{id:'m'}]}]};
const pending={id:'proof1',projectId:'p',projectNumber:'PRJ-1003',projectName:'Projekt',version:'1.1',current:true,status:'pending',recipientEmail:'anna@example.test',recipientName:'Anna',sourceUpdatedAt:'revision1',sentAt:'2026-10-29T10:00:00Z'};
const snapshot={project,catalog:{articles:[]},quote:{orderTotal:100},createdAt:'2026-10-29T10:00:00Z'};
beforeEach(()=>{global.fetch=jest.fn();window.scrollTo=jest.fn();});
afterEach(()=>{cleanup();jest.restoreAllMocks();});
const reply=data=>({ok:true,json:async()=>data});
test('Buyer requests changes by clicking a frozen sign in the proof',async()=>{
 let current={...pending};const sign={drawingId:'d',markerId:'m',position:'S001',drawingName:'Plan 2',text:'LAB'};
 fetch.mockImplementation(async(url,options)=>{
  if(url.split('?')[0]==='/api/project-proofs')return reply({proofs:[current]});
  if(url.endsWith('/comments')){const body=JSON.parse(options.body);current={...current,status:'changes_requested',comments:[{id:'comment1',kind:'changes_requested',changeType:body.changeType,message:body.comment,author:{name:'Anna'},createdAt:'2026-10-30T10:00:00Z',sign}]};return reply({proof:current});}
  return reply({proof:pending,snapshot});
 });
 render(<ProjectApprovalPanel project={project} role="bestallare" adminPassword="account:buyer"/>);
 fireEvent.click(await screen.findByRole('button',{name:'Visa korrektur 1.1'}));
 fireEvent.click(await screen.findByRole('button',{name:'Kommentera skylt S001'}));
 await screen.findByText('Byt skylttext till PROVTAGNING.');
 expect(screen.queryByRole('button',{name:'Godkänn korrektur 1.1'})).not.toBeInTheDocument();
 expect(screen.getByText('Skylttext: LAB')).toBeInTheDocument();
 const [,options]=fetch.mock.calls.find(([url])=>url.endsWith('/comments'));expect(JSON.parse(options.body)).toMatchObject({version:'1.1',comment:'Byt skylttext till PROVTAGNING.',changeType:'adjust',sign:{drawingId:'d',markerId:'m'}});
});
test('A standalone comment keeps proof pending and is visible to the sender',async()=>{
 let current={...pending};fetch.mockImplementation(async(url,options)=>{
  if(url.split('?')[0]==='/api/project-proofs')return reply({proofs:[current]});if(url.endsWith('/signs'))return reply({signs:[]});
  if(url.endsWith('/comments')){const body=JSON.parse(options.body);current={...current,comments:[{id:'c',message:body.comment,kind:'comment',author:{name:'Anna'}}]};return reply({proof:current});}return reply({proof:pending,snapshot});
 });
 const {rerender}=render(<ProjectApprovalPanel project={project} role="bestallare" adminPassword="account:buyer"/>);
 await screen.findByRole('button',{name:'Visa korrektur 1.1'});
 const feedback=screen.getByText('Begär ändringar eller lämna en kommentar',{selector:'summary'});
 expect(feedback.parentElement).not.toHaveAttribute('open');
 fireEvent.click(feedback);
 fireEvent.change(await screen.findByRole('textbox',{name:'Kommentar till korrekturet'}),{target:{value:'Kan ni kontrollera placeringen?'}});fireEvent.click(screen.getByRole('button',{name:'Skicka kommentar'}));
 await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('Kommentaren har skickats'));
 expect(screen.getByRole('button',{name:'Godkänn korrektur 1.1'})).toBeInTheDocument();
 rerender(<ProjectApprovalPanel project={project} role="admin" adminPassword="account:admin"/>);
 expect(await screen.findByText('Kan ni kontrollera placeringen?')).toBeInTheDocument();expect(screen.queryByRole('textbox',{name:'Kommentar till korrekturet'})).not.toBeInTheDocument();
});
test('A purchaser can read the frozen quote, view the proof, and explicitly approve only after the preview is ready',async()=>{
 let approved=false;
 fetch.mockImplementation(async(url,options)=>{
  if(url.split('?')[0]==='/api/project-proofs')return reply({proofs:[{...pending,status:approved?'approved':'pending'}]});
  if(url.endsWith('/approve')){approved=true;return reply({proof:{...pending,status:'approved'}});}
  return reply({proof:pending,snapshot});
 });
 render(<ProjectApprovalPanel project={project} role="bestallare" adminPassword="account:buyer"/>);
 const approve=await screen.findByRole('button',{name:'Godkänn korrektur 1.1'});expect(approve).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Visa offert'}));expect(await screen.findByRole('dialog',{name:'Sparad offert'})).toHaveTextContent('100');fireEvent.click(screen.getByRole('button',{name:'Stäng offert'}));
 fireEvent.click(screen.getByRole('button',{name:'Visa korrektur 1.1'}));await screen.findByRole('dialog',{name:'Sparat korrektur'});
 expect(screen.getByRole('checkbox')).toBeDisabled();fireEvent.click(screen.getByRole('button',{name:'Granskat korrektur'}));
 fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(approve);
 await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('En notis har skickats till avsändaren'));
 const call=fetch.mock.calls.find(([url])=>url.endsWith('/approve'));expect(JSON.parse(call[1].body)).toEqual({version:'1.1',confirmed:true});expect(call[1].headers['x-admin-password']).toBe('account:buyer');
 expect(screen.queryByRole('button',{name:'Godkänn korrektur 1.1'})).not.toBeInTheDocument();
});
test('Admin prepares a saved version and sends it to a purchaser whose account may not exist yet',async()=>{
 let sent=false;
 fetch.mockImplementation(async(url)=>{
  if(url.split('?')[0]==='/api/project-proofs')return reply({proofs:sent?[pending]:[]});
  if(url.endsWith('/prepare'))return reply({proof:{...pending,status:'draft'}});
  if(url.endsWith('/send')){sent=true;return reply({proof:pending});}
  return reply({proof:{...pending,status:'draft'},snapshot});
 });
 render(<ProjectApprovalPanel project={project} role="admin" adminPassword="account:admin"/>);
 expect(await screen.findByRole('region',{name:'Förbered och skicka korrektur'})).toBeVisible();
 expect(screen.queryByRole('checkbox',{name:/Jag har granskat/})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Förhandsgranska och skicka korrektur'}));
 const dialog=await screen.findByRole('dialog',{name:'Sparat korrektur'});fireEvent.click(within(dialog).getByRole('button',{name:'Skicka för godkännande'}));
 await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('anna@example.test'));
 const prepare=fetch.mock.calls.find(([url])=>url.endsWith('/prepare'));expect(JSON.parse(prepare[1].body)).toMatchObject({newProof:true,version:'1.1',selectedSignKeys:['drawing:d:m'],expectedUpdatedAt:'revision1'});
 const send=fetch.mock.calls.find(([url])=>url.endsWith('/send'));expect(JSON.parse(send[1].body)).toEqual({showPrices:false});
});
test('Purchaser name, email and phone can be entered when creating a project without choosing an existing account',async()=>{
 fetch.mockImplementation(async(url,options)=>options?.method==='POST'?reply({project:{...project,...JSON.parse(options.body)}}):reply(url==='/api/projects'?{projects:[]}:url.split('?')[0]==='/api/project-proofs'?{proofs:[]}:{articles:[]}));
 render(<AdminProjectsPage role="admin" adminPassword="account:admin"/>);
 fireEvent.click(screen.getByRole('button',{name:/Nytt projekt/}));fireEvent.change(screen.getByLabelText('Projekt *'),{target:{value:'Nytt projekt'}});
 const group=screen.getByRole('group',{name:'Beställare'});fireEvent.change(within(group).getByLabelText('Namn'),{target:{value:'Anna'}});fireEvent.change(within(group).getByLabelText('Mejl'),{target:{value:'anna@example.test'}});fireEvent.change(within(group).getByLabelText('Telefon'),{target:{value:'0701234567'}});
 fireEvent.click(screen.getByRole('button',{name:'Spara projekt'}));await waitFor(()=>expect(fetch.mock.calls.some(([,options])=>options?.method==='POST')).toBe(true));
 const saved=JSON.parse(fetch.mock.calls.find(([,options])=>options?.method==='POST')[1].body);expect(saved).toMatchObject({purchaserName:'Anna',purchaserEmail:'anna@example.test',purchaserPhone:'0701234567'});
});
test('Project proof notifications share the existing notification panel and open the project',async()=>{
 const event={id:'proof-event-1',kind:'project-proof',projectId:'p',projectNumber:'PRJ-1003',projectName:'Projekt',version:'1.1',status:'proof_requested',createdAt:'2026-10-29T10:00:00Z'};
 fetch.mockImplementation(async(_url,options)=>reply(options?.method==='PATCH'?{notification:event}:{notifications:[event],orders:[]}));
 const open=jest.fn();render(<OrderNotifications session={{token:'buyer'}} onOrdersUpdated={()=>{}} onOpenProject={open}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Notiser, 1 olästa'}));fireEvent.click(screen.getByRole('button',{name:/Projekt PRJ-1003/}));
 expect(open).toHaveBeenCalledWith('p');await waitFor(()=>expect(fetch.mock.calls.some(([url])=>url==='/api/account/notifications/proof-event-1/read')).toBe(true));
});
