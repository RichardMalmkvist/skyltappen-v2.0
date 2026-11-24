import React from 'react';
import {render,screen,fireEvent,within,cleanup} from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminProjectsPage from './pages/admin/AdminProjectsPage';
jest.mock('./data/browserPdf',()=>({}));
jest.mock('./pages/admin/ProjectDrawingPlanner',()=>({onClose})=><section aria-label="Ritningsplanering"><button onClick={onClose}>Till projektet</button></section>);
const project={id:'p',number:'PRJ-1',name:'Entrén',customer:'Testkund',status:'Planering',purchaserName:'Anna',purchaserEmail:'anna@example.test',drawings:[{id:'d',name:'Plan 1',markers:[{id:'m',articleId:'a',position:'S001',text:'Entré',quantity:1}]}]};
beforeEach(()=>{HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};global.fetch=jest.fn(async url=>({ok:true,json:async()=>url==='/api/projects'?{projects:[project]}:url==='/api/catalog'?{articles:[{id:'a',name:'Dörrskylt'}]}:{proofs:[]}}));});
afterEach(cleanup);

test('project card deletion uses the shared confirmation, supports cancel and retries a server error',async()=>{
 let removed=false,attempts=0;
 global.fetch=jest.fn(async(url,options)=>{
  if(options?.method==='DELETE'){attempts++;if(attempts===1)return {ok:false,json:async()=>({message:'Kunde inte ta bort nu.'})};removed=true;return {ok:true,json:async()=>({success:true})};}
  return {ok:true,json:async()=>url==='/api/projects'?{projects:removed?[]:[project]}:url==='/api/catalog'?{articles:[]}:{proofs:[]}};
 });
 render(<AdminProjectsPage role="admin"/>);await screen.findByRole('button',{name:/Entrén/});
 const openDelete=()=>{fireEvent.click(screen.getByLabelText('Hantera projekt Entrén'));fireEvent.click(screen.getByRole('button',{name:'Ta bort projekt'}));};
 openDelete();fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Avbryt'}));expect(attempts).toBe(0);
 openDelete();fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Ta bort projekt'}));expect(await screen.findByRole('alert')).toHaveTextContent('Kunde inte ta bort nu.');
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Ta bort projekt'}));await screen.findByText('Projekt PRJ-1 har tagits bort.');expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:/Entrén/})).not.toBeInTheDocument();
});

test('folder card deletion explains that contents move up and keeps the moved project visible',async()=>{
 const folder={id:'f',name:'Akut',parentId:null};
 global.fetch=jest.fn(async(url,options)=>({ok:true,json:async()=>options?.method==='DELETE'?{success:true,parentId:null,folders:[]}:url==='/api/projects'?{projects:[{...project,folderId:'f'}],folders:[folder]}:url==='/api/catalog'?{articles:[]}:{proofs:[]}}));
 render(<AdminProjectsPage role="admin"/>);fireEvent.click(await screen.findByLabelText('Hantera mapp Akut'));fireEvent.click(screen.getByRole('button',{name:'Ta bort mapp'}));
 const dialog=screen.getByRole('dialog',{name:'Ta bort mapp?'});expect(dialog).toHaveTextContent('Projekt och undermappar flyttas upp en nivå.');fireEvent.click(within(dialog).getByRole('button',{name:'Ta bort mapp'}));
 await screen.findByText('Mappen Akut har tagits bort.');expect(screen.getByRole('button',{name:/Entrén/})).toBeInTheDocument();expect(global.fetch).toHaveBeenCalledWith('/api/project-folders/f',expect.objectContaining({method:'DELETE'}));
});
test('Order confirmation keeps a server error in the dialog and allows retry',async()=>{
 let attempts=0;
 global.fetch=jest.fn(async url=>url.endsWith('/create-order')?{ok:++attempts>1,json:async()=>attempts===1?{message:'Försök igen.'}:{order:{orderNumber:'0026201-00'}}}:{ok:true,json:async()=>url==='/api/projects'?{projects:[project]}:url==='/api/catalog'?{articles:[{id:'a',name:'Dörrskylt'}]}:{proofs:[]}});
 render(<AdminProjectsPage role="admin"/>);
 fireEvent.click(await screen.findByRole('button',{name:/Entrén/}));
 fireEvent.click(screen.getByRole('button',{name:'Order & dokument'}));
 fireEvent.click(screen.getByRole('button',{name:'Skapa order från projekt'}));
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Skapa order'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Försök igen.');
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Skapa order'}));
 await screen.findByText(/Order 0026201-00/);
 expect(attempts).toBe(2);
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
test('Project opens with a compact overview; sign list, documents and upload are reached intentionally',async()=>{
 render(<AdminProjectsPage role="admin"/>);
 fireEvent.click(await screen.findByRole('button',{name:/Entrén/}));
 expect(screen.getByRole('heading',{name:'Entrén'})).toBeVisible();
 expect(screen.getByRole('button',{name:/Plan 1 Planera skyltar/})).toBeVisible();
 expect(screen.queryByRole('button',{name:'Skapa order från projekt'})).not.toBeInTheDocument();
 expect(screen.getByText('Lägg till ritning',{selector:'summary'}).parentElement).not.toHaveAttribute('open');
 const nav=within(screen.getByRole('navigation',{name:'Projektvyer'}));
 fireEvent.click(nav.getByRole('button',{name:'Skyltlista (1)'}));
 const signs=within(screen.getByRole('region',{name:'Gemensam skyltlista'}));
 expect(signs.getByRole('article')).toHaveTextContent('S001');
 expect(signs.getByRole('article')).toHaveTextContent('Dörrskylt');
 expect(signs.getByRole('article')).toHaveTextContent('Entré');
 expect(signs.getByRole('button',{name:'Visa ritning'})).toBeVisible();
 expect(screen.queryByRole('button',{name:/Plan 1 Planera skyltar/})).not.toBeInTheDocument();
 fireEvent.click(nav.getByRole('button',{name:'Order & dokument'}));
 expect(screen.getByRole('button',{name:'Skapa order från projekt'})).toBeVisible();
 fireEvent.click(nav.getByRole('button',{name:'Översikt'}));
 fireEvent.click(screen.getByText('Lägg till ritning',{selector:'summary'}));
 expect(screen.getByRole('textbox',{name:'Ritningens namn'})).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:/Plan 1 Planera skyltar/}));
 expect(screen.getByRole('region',{name:'Ritningsplanering'})).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Till projektet'}));
 expect(screen.getByRole('navigation',{name:'Projektvyer'})).toBeVisible();
});
test('A notification opens the proof view directly and purchasers have no management or production tools',async()=>{
 const {rerender}=render(<AdminProjectsPage role="admin" initialProjectId="p" openRequest={1}/>);
 const nav=within(await screen.findByRole('navigation',{name:'Projektvyer'}));
 expect(nav.getByRole('button',{name:'Korrektur'})).toHaveAttribute('aria-current','page');
 expect(screen.getByRole('heading',{name:'Korrektur och godkännande'})).toBeVisible();
 rerender(<AdminProjectsPage key="buyer" role="bestallare" initialProjectId="p" openRequest={2}/>);
 await screen.findByRole('navigation',{name:'Projektvyer'});
 expect(screen.queryByRole('button',{name:'Redigera projekt'})).not.toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'Ta bort projekt'})).not.toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'Order & dokument'})).not.toBeInTheDocument();
});

test('Standalone and imported signs enable the complete project order flow',async()=>{
 const mixed={...project,drawings:[],signs:[{id:'s',kind:'catalog',articleId:'a',position:'S001',quantity:1,configuration:{text:'Entré'}},{id:'i',kind:'svg',name:'Corel-original',position:'S002',quantity:2,widthMm:100,heightMm:60,price:150,productionFile:{id:'original',mime:'application/pdf'}}]};
 global.fetch=jest.fn(async(url,options)=>({ok:true,json:async()=>url==='/api/projects'?{projects:[mixed]}:url==='/api/catalog'?{articles:[{id:'a',name:'Dörrskylt'}]}:url.endsWith('/create-order')?{order:{id:'o',orderNumber:'0026200-00'}}:{proofs:[]}}));
 const confirm=jest.spyOn(window,'confirm');
 render(<AdminProjectsPage role="admin"/>);fireEvent.click(await screen.findByRole('button',{name:/Entrén/}));
 fireEvent.click(screen.getByRole('button',{name:'Order & dokument'}));
 expect(screen.getByRole('button',{name:'Visa offert'})).toBeEnabled();
 const create=screen.getByRole('button',{name:'Skapa order från projekt'});expect(create).toBeEnabled();fireEvent.click(create);
 const dialog=screen.getByRole('dialog',{name:'Skapa order?'});expect(dialog).toHaveTextContent('2 skyltpositioner');expect(confirm).not.toHaveBeenCalled();expect(global.fetch.mock.calls.some(([url])=>url.endsWith('/create-order'))).toBe(false);fireEvent.click(within(dialog).getByRole('button',{name:'Avbryt'}));expect(screen.queryByRole('dialog',{name:'Skapa order?'})).not.toBeInTheDocument();fireEvent.click(create);fireEvent.click(within(screen.getByRole('dialog',{name:'Skapa order?'})).getByRole('button',{name:'Skapa order'}));
 await screen.findByText(/Order 0026200-00/);expect(global.fetch).toHaveBeenCalledWith('/api/projects/p/create-order',expect.objectContaining({method:'POST'}));confirm.mockRestore();
});
