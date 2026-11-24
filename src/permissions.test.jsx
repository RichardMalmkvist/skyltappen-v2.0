import React from 'react';
import {render, screen, fireEvent, waitFor, cleanup} from '@testing-library/react';
import '@testing-library/jest-dom';
import {AdminSidebar} from './components/admin/AdminNavigation';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminProjectsPage from './pages/admin/AdminProjectsPage';
import AdminDrawingLibraryPage from './pages/admin/AdminDrawingLibraryPage';
import ProjectDrawingPlanner from './pages/admin/ProjectDrawingPlanner';
import AccountOrdersBrowser from './components/orders/AccountOrdersBrowser';
import ReadOnlyArticlesPage from './pages/ReadOnlyArticlesPage';
import OrderAcknowledgementModal from './components/orders/OrderAcknowledgementModal';

jest.mock('./data/browserPdf',()=>({}));
const mine={id:'mine',orderNumber:'TEST-1',status:'godkänd',accountUserId:'buyer',orderer:{},cart:[],productionPlan:{departments:{Layout:{enabled:true,status:'ej_paborjad'}}}};
const other={...mine,id:'other',orderNumber:'TEST-2',accountUserId:'other'};
const catalog={categories:[],articles:[{id:'sign',name:'Testskylt',articleNumber:'100',unitPrice:100}]};
const project={id:'project',name:'Testprojekt',number:'PRJ-1',status:'Planering',drawings:[{id:'drawing',name:'Plan 1',markers:[{id:'marker',page:1,x:.5,y:.5,articleId:'sign',text:'Befintlig skylt'}]}]};
beforeEach(()=>{
 global.fetch=jest.fn(async url=>({ok:true,json:async()=>String(url).includes('/api/account/orders')?{orders:[mine,other]}:url==='/api/projects'?{projects:[project]}:url==='/api/drawing-library'?{folders:[],items:[]}:catalog}));
 window.scrollTo=jest.fn();
});
afterEach(cleanup);

test('Hanging order downloads a GoSign file for the selected article row',async()=>{
 const hanging={...mine,cart:[{productType:'pendlad_skylt',articleNumber:'0303',badgeName:'Pendlad skylt',customText:'Trappa',quantity:1}]};
 URL.createObjectURL=jest.fn(()=> 'blob:plotter');URL.revokeObjectURL=jest.fn();
 const click=jest.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
 fetch.mockImplementation(async(url)=>String(url).includes('plotter-export')?{ok:true,blob:async()=>new Blob(['%PDF-']),headers:{get:key=>key==='Content-Type'?'application/pdf':'attachment; filename="test.pdf"'}}:{ok:true,json:async()=>catalog});
 render(<AdminOrdersPage role="personal" orders={[hanging]} adminPassword="account:test"/>);
 fireEvent.click(screen.getByRole('button',{name:'Plotterfil – GoSign'}));
 await waitFor(()=>expect(click).toHaveBeenCalled());
 const [url,options]=fetch.mock.calls.find(([url])=>String(url).includes('plotter-export'));
 expect(url).toBe('/api/orders/mine/plotter-export');
 expect(JSON.parse(options.body)).toEqual({itemIndex:0,productionKind:'all',symbolAssets:[]});
 expect(options.headers['x-admin-password']).toBe('account:test');
 click.mockRestore();
});

test('Dibond order offers production PDF and downloads the selected row',async()=>{
 const canvas=jest.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);
 const dibond={...mine,cart:[{previewType:'dibond_sign',productType:'dibondskylt',badgeName:'Dibond',quantity:1,dibondSign:{widthMm:300,heightMm:200,lines:[{text:'Test',sizeMm:15}]}}]};
 URL.createObjectURL=jest.fn(()=> 'blob:dibond');URL.revokeObjectURL=jest.fn();
 const click=jest.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
 fetch.mockImplementation(async url=>String(url).includes('plotter-export')?{ok:true,blob:async()=>new Blob(['%PDF-']),headers:{get:key=>key==='Content-Type'?'application/pdf':'attachment; filename="TEST-1-01.pdf"'}}:{ok:true,json:async()=>catalog});
 render(<AdminOrdersPage role="personal" orders={[dibond]} adminPassword="account:test"/>);
 expect(screen.getByRole('button',{name:'Produktionsfiler – PDF'})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Produktionsfil – PDF'}));
 await waitFor(()=>expect(click).toHaveBeenCalled());
 expect(JSON.parse(fetch.mock.calls.find(([url])=>String(url).includes('plotter-export'))[1].body).itemIndex).toBe(0);
 expect(screen.getByText(/Produktionsfilen är skapad med tryckmotiv/)).toBeInTheDocument();
 click.mockRestore();
 canvas.mockRestore();
});

test('Missing production endpoint explains that the server must be restarted',async()=>{
 const dibond={...mine,cart:[{previewType:'dibond_sign',badgeName:'Dibond',quantity:1}]};
 fetch.mockImplementation(async url=>String(url).includes('plotter-export')?{ok:false,status:404,json:async()=>{throw Error('HTML error')}}:{ok:true,json:async()=>catalog});
 render(<AdminOrdersPage role="admin" orders={[dibond]} adminPassword="account:test"/>);
 fireEvent.click(screen.getByRole('button',{name:'Produktionsfil – PDF'}));
 await waitFor(()=>expect(screen.getByText(/Starta om servern efter att uppdateringen/)).toBeInTheDocument());
});

test('Door signs with custom text offer production PDF downloads',async()=>{
 const door={...mine,cart:[{previewType:'door_sign',productType:'dorrskylt',doorSignTextEnabled:true,articleNumber:'0602',badgeName:'Dörrskylt',quantity:1,doorHeading:'Expedition'}]};
 URL.createObjectURL=jest.fn(()=> 'blob:door');URL.revokeObjectURL=jest.fn();
 const click=jest.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
 fetch.mockImplementation(async url=>String(url).includes('plotter-export')?{ok:true,blob:async()=>new Blob(['%PDF-']),headers:{get:key=>key==='Content-Type'?'application/pdf':'attachment; filename="TEST-1-01.pdf"'}}:{ok:true,json:async()=>catalog});
 render(<AdminOrdersPage role="personal" orders={[door]} adminPassword="account:test"/>);
 expect(screen.getByRole('button',{name:'Produktionsfiler – PDF'})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Produktionsfil – PDF'}));
 await waitFor(()=>expect(click).toHaveBeenCalled());
 expect(await screen.findByText(/ordermärkning/)).toBeInTheDocument();click.mockRestore();
});
test.each([['Pappersutskrift – PDF','layout'],['Produktionsoriginal – PDF','original'],['Ladda ner båda – ZIP','all']])('Door sign with uploaded original can download %s',async(label,kind)=>{
 const door={...mine,cart:[{previewType:'door_sign',productType:'dorrskylt',doorSignTextEnabled:true,badgeName:'Dörrskylt',quantity:1,doorHeading:'Expedition',productionFile:{id:'original'}}]};
 URL.createObjectURL=jest.fn(()=> 'blob:dual');URL.revokeObjectURL=jest.fn();
 const click=jest.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
 fetch.mockImplementation(async url=>String(url).includes('plotter-export')?{ok:true,blob:async()=>new Blob(['data']),headers:{get:key=>key==='Content-Type'?(kind==='all'?'application/zip':'application/pdf'):'attachment; filename="TEST-1.pdf"'}}:{ok:true,json:async()=>catalog});
 render(<AdminOrdersPage role="personal" orders={[door]} adminPassword="account:test"/>);
 for(const name of ['Pappersutskrift – PDF','Produktionsoriginal – PDF','Ladda ner båda – ZIP'])expect(screen.getByRole('button',{name})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:label}));
 await waitFor(()=>expect(click).toHaveBeenCalled());
 expect(JSON.parse(fetch.mock.calls.find(([url])=>String(url).includes('plotter-export'))[1].body)).toMatchObject({itemIndex:0,productionKind:kind});
 click.mockRestore();
});

test.each(['personal','bestallare'])('%s sees permitted navigation only',role=>{
 render(<AdminSidebar role={role}/>);
 for(const label of ['Ordrar','Projekt & Korrektur','Ritningar'])expect(screen.getByRole('button',{name:label})).toBeInTheDocument();
 expect(Boolean(screen.queryByRole('button',{name:'Artiklar'}))).toBe(role==='personal');
 for(const label of ['Statistik','Namnbrickor & yrkestitlar','Symboler','Artikelgrupper','Användare','Inställningar'])expect(screen.queryByRole('button',{name:label})).not.toBeInTheDocument();
 expect(Boolean(screen.queryByRole('button',{name:'Planering'}))).toBe(role==='personal');
});

test('Admin keeps every navigation section',()=>{
 render(<AdminSidebar role="admin"/>);
 for(const label of ['Statistik','Ordrar att godkänna','Namnbrickor & yrkestitlar','Planering','Artiklar','Symboler','Artikelgrupper','Projekt & Korrektur','Användare','Ritningar','Inställningar'])expect(screen.getByRole('button',{name:label})).toBeInTheDocument();
});

test('Personal has status controls and all four printable documents, without order editing',async()=>{
 render(<AdminOrdersPage role="personal" orders={[mine]} adminPassword="account:test"/>);
 await waitFor(()=>expect(fetch).toHaveBeenCalled());
 for(const label of ['Redigera','Planera order','Ta bort order',/Ny order/])expect(screen.queryByRole('button',{name:label})).not.toBeInTheDocument();
 expect(screen.getByRole('combobox',{name:'Orderstatus'})).toBeEnabled();
 expect(screen.getByRole('combobox',{name:'Status Layout'})).toBeEnabled();
 fireEvent.click(screen.getByText('Dokument'));
 for(const label of ['Ordererkännande','Arbetsorder','Följesedel','Offert'])expect(screen.getByRole('button',{name:label})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Offert'}));
 expect(screen.getByRole('button',{name:/Skriv ut/})).toBeInTheDocument();
});

test('Admin retains edit and planning actions',async()=>{
 render(<AdminOrdersPage role="admin" orders={[mine]} adminPassword="account:test"/>);
 await waitFor(()=>expect(fetch).toHaveBeenCalled());
 expect(screen.getByRole('button',{name:'Redigera'})).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Planera order'})).toBeInTheDocument();
 expect(screen.getByRole('button',{name:/Ny order/})).toBeInTheDocument();
});

test('Personal can also read orders waiting for approval',async()=>{
 render(<AdminOrdersPage role="personal" orders={[{...mine,status:'väntar_godkännande'}]} adminPassword="account:test"/>);
 await waitFor(()=>expect(fetch).toHaveBeenCalled());
 expect(screen.getAllByText(/TEST-1/).length).toBeGreaterThan(0);
 expect(screen.queryByRole('button',{name:/Godkänn/})).not.toBeInTheDocument();
});

test('Beställare sees all orders and can filter their own',async()=>{
 render(<AccountOrdersBrowser token="buyer" user={{id:'buyer'}}/>);
 await screen.findByRole('region',{name:'Vald order'});
 expect(screen.getByText('TEST-2')).toBeInTheDocument();
 fireEvent.change(screen.getByRole('combobox',{name:'Filtrera på beställare'}),{target:{value:'mine'}});
 expect(screen.getAllByText('TEST-1').length).toBeGreaterThan(0);
 expect(screen.queryByText('TEST-2')).not.toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'Redigera'})).not.toBeInTheDocument();
});

test.each(['personal','bestallare'])('%s can open projects without edit actions',async role=>{
 render(<AdminProjectsPage role={role} adminPassword="account:test"/>);
 if(role==='bestallare')fireEvent.change(screen.getByRole('combobox',{name:'Filtrera projekt på beställare'}),{target:{value:'all'}});
 fireEvent.click(await screen.findByRole('button',{name:/Testprojekt/}));
 expect(screen.getByRole('heading',{name:'Testprojekt'})).toBeInTheDocument();
 for(const label of [/Nytt projekt/,'Redigera projekt','Lägg till ritning','Skapa order från projekt'])expect(screen.queryByRole('button',{name:label})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('navigation',{name:'Projektvyer'}).querySelector('button'));
 expect(screen.getByRole('button',{name:/Plan 1 Visa ritning/})).toBeInTheDocument();
});

test.each(['personal','bestallare'])('%s has no drawing library creation tools',async role=>{
 render(<AdminDrawingLibraryPage role={role} adminPassword="account:test"/>);
 await screen.findByText('Mappen är tom.');
 for(const label of [/Ny mapp/,/Ny hisstavla/,/Ny OT-tavla/,'Ladda upp ritning'])expect(screen.queryByRole('button',{name:label})).not.toBeInTheDocument();
 expect(screen.queryByText('+ Skapa')).not.toBeInTheDocument();
});

test('Read-only drawing opens sign details without editing controls',async()=>{
 fetch.mockResolvedValue({ok:false});
 render(<ProjectDrawingPlanner readOnly project={project} drawing={project.drawings[0]} headers={{}} catalog={catalog} onClose={()=>{}}/>);
 await screen.findByText('Kunde inte hämta PDF-ritningen.');
 for(const label of ['+ Placera skylt','+ Skylt utan placering','Spara i Ritningar'])expect(screen.queryByRole('button',{name:label})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:/Befintlig skylt/}));
 expect(screen.getByRole('dialog',{name:'Visa skylt'})).toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'Ta bort skylt'})).not.toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'Spara skylt i projektet'})).not.toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Zooma in'})).toBeInTheDocument();
 expect(fetch.mock.calls.every(([,options])=>!options?.method||options.method==='GET')).toBe(true);
});

test.each(['personal','bestallare'])('%s can browse drawing rows without mutation menus',async role=>{
 fetch.mockImplementation(async url=>({ok:true,json:async()=>url==='/api/drawing-library'?{folders:[{id:'folder',parentId:null,name:'Testmapp'}],items:[{id:'file',folderId:null,name:'Planritning',type:'file',mime:'application/pdf'}]}:catalog}));
 render(<AdminDrawingLibraryPage role={role} adminPassword="account:test"/>);
 expect(await screen.findByRole('button',{name:/Testmapp/})).toBeInTheDocument();
 expect(screen.getByRole('button',{name:/Planritning/})).toBeInTheDocument();
 expect(screen.queryByRole('button',{name:/Åtgärder för/})).not.toBeInTheDocument();
});

test('Read-only article list opens information without editing',async()=>{
 render(<ReadOnlyArticlesPage role="personal" adminPassword="account:test"/>);
 fireEvent.click(await screen.findByRole('button',{name:/Testskylt/}));
 expect(screen.getByRole('region',{name:'Artikelinformation'})).toBeInTheDocument();
 expect(screen.queryByRole('button',{name:/Spara|Redigera|Ta bort/})).not.toBeInTheDocument();
});

test.each(['acknowledgement','deliveryNote'])('Badge %s has the delivery note columns',variant=>{
 const order={...mine,workflow:'badge-production',cart:[{articleNumber:'0201',productType:'namnbricka',name:'Anna Andersson',badgeName:'Namnbricka',quantity:2,unitPrice:167}]};
 render(<OrderAcknowledgementModal order={order} variant={variant} onClose={()=>{}}/>);
 expect(screen.getByRole('columnheader',{name:'Lev. antal'})).toBeInTheDocument();
 expect(screen.queryByRole('columnheader',{name:'Á-pris'})).not.toBeInTheDocument();
 expect(screen.queryByText('Ordersumma')).not.toBeInTheDocument();
 expect(screen.getByText(variant==='acknowledgement'?'ORDERERKÄNNANDE':'FÖLJESEDEL')).toBeInTheDocument();
});

test('the elevator quote shows the selected board and prices without per-floor production details',()=>{
 const order={...mine,cart:[{
  articleNumber:'0808',badgeName:'Byte av pappersutskrift',quantity:5,unitPrice:340,
  elevatorBoardName:'Hiss G',elevatorBoardLocation:'Ryhov',floorCopies:4,cabinCopies:1,
  elevatorBoard:{widthMm:420,heightMm:485,floors:[{heading:'Plan 4',text:'Huvudentré',marker:true,highlightLine:0}]}
 }]};
 const {rerender}=render(<OrderAcknowledgementModal order={order} variant="quote" onClose={()=>{}}/>);
 expect(screen.getByText('Hiss G')).toBeVisible();
 expect(screen.getByText('Ryhov')).toBeVisible();
 expect(screen.getByText('420 × 485 mm')).toBeVisible();
 expect(screen.getByText('5',{selector:'td'})).toBeVisible();
 expect(screen.getByText(/340,00 kr/)).toBeVisible();
 expect(screen.queryByText(/Plan 4|Huvudentré|Våningsplansexemplar|Hisskorgsexemplar/)).toBeNull();
 rerender(<OrderAcknowledgementModal order={order} variant="acknowledgement" onClose={()=>{}}/>);
 expect(screen.getByText(/Huvudentré · Blå planmarkering/)).toBeVisible();
});
