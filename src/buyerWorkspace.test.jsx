import {render,screen,fireEvent,within} from '@testing-library/react';
import '@testing-library/jest-dom';
import BuyerDashboard from './pages/BuyerDashboard';
import AccountOrdersBrowser from './components/orders/AccountOrdersBrowser';
import {buyerOrderVisible} from './data/buyerOrders';
const user={id:'buyer',email:'buyer@example.test',firstName:'Anna'};
const regular={id:'one',orderNumber:'ORDER-1',status:'godkänd',accountUserId:'buyer',createdAt:'2026-10-29',orderer:{customer:'Laboratoriet',accountNumber:'123456'},orderTotal:340,cart:[{name:'Dörrskylt',articleNumber:'0602',quantity:2,unitPrice:170,lineTotal:340}]};
const other={...regular,id:'two',orderNumber:'ORDER-2',accountUserId:'other',createdAt:'2026-10-28',status:'levererad'};
const badge={...regular,id:'badge',orderNumber:'HIDDEN-BADGE',cart:[{productType:'namnbricka'}]};
const profession={...badge,id:'profession',orderNumber:'HIDDEN-TITLE',cart:[{productType:'yrkestitelsskylt'}]};
beforeEach(()=>{global.fetch=jest.fn(async url=>({ok:true,json:async()=>String(url).includes('account/orders')?{orders:[regular,other,badge,profession]}:String(url).includes('project-proofs')?{proofs:[{id:'proof',current:true,status:'pending',projectId:'project',projectName:'Laboratoriet korrektur',version:'1.1'}]}:{projects:[{id:'project'}]}}));});
test('buyer order visibility excludes badge, profession and legacy mixed orders',()=>{
 expect(buyerOrderVisible(regular)).toBe(true);
 expect(buyerOrderVisible(badge)).toBe(false);
 expect(buyerOrderVisible(profession)).toBe(false);
 expect(buyerOrderVisible({...regular,cart:[...regular.cart,...badge.cart]})).toBe(false);
});
test('dashboard shows permitted orders, own filter, proofs and exact project navigation',async()=>{
 const onOpenProject=jest.fn(),onOpenOrder=jest.fn();
 render(<BuyerDashboard token="test" user={user} onOpenProject={onOpenProject} onOpenOrder={onOpenOrder}/>);
 fireEvent.click(await screen.findByRole('button',{name:'ORDER-1'}));expect(onOpenOrder).toHaveBeenCalledWith('one');
 expect(screen.getByRole('button',{name:'ORDER-2'})).toBeInTheDocument();
 expect(screen.queryByText('HIDDEN-BADGE')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Mina beställningar'}));expect(screen.queryByRole('button',{name:'ORDER-2'})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:/Version 1.1 Laboratoriet korrektur/}));expect(onOpenProject).toHaveBeenCalledWith('project','proof');
 expect(screen.queryByRole('button',{name:'Artiklar'})).not.toBeInTheDocument();
});
test('order browser selects details, respects archived target, totals and status filter',async()=>{
 render(<AccountOrdersBrowser token="test" user={user} initialOrderId="two"/>);
 const detail=await screen.findByRole('region',{name:'Vald order'});
 expect(await within(detail).findByText('ORDER-2')).toBeInTheDocument();
 expect(within(detail).getByText('123456')).toBeInTheDocument();
 expect(within(detail).getAllByText(/340,00/)).toHaveLength(2);
 expect(screen.queryByText('HIDDEN-BADGE')).not.toBeInTheDocument();
 expect(screen.queryByText('HIDDEN-TITLE')).not.toBeInTheDocument();
 fireEvent.change(screen.getByRole('combobox',{name:'Filtrera på orderstatus'}),{target:{value:'active'}});
 expect(within(screen.getByRole('region',{name:'Vald order'})).getByText('ORDER-1')).toBeInTheDocument();
 expect(screen.queryByText('ORDER-2')).not.toBeInTheDocument();
 for(const name of ['Redigera','Ta bort order','Planera order','Orderstatus'])expect(screen.queryByRole('button',{name})).not.toBeInTheDocument();
});
test('dashboard reports unavailable data rather than zero counts',async()=>{
 fetch.mockResolvedValue({ok:false});render(<BuyerDashboard token="test" user={user}/>);
 expect(await screen.findByRole('alert')).toHaveTextContent('Kunde inte hämta ordrar');
 expect(screen.getAllByText('–')).toHaveLength(3);
});
test('buyer opens, prints and closes acknowledgement for selected order',async()=>{
 window.print=jest.fn();
 render(<AccountOrdersBrowser token="test" user={user}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Ordererkännande'}));
 let dialog=screen.getByRole('dialog',{name:'Ordererkännande ORDER-1'});
 expect(within(dialog).getByText('Laboratoriet')).toBeInTheDocument();
 fireEvent.click(within(dialog).getByRole('button',{name:'Skriv ut / spara PDF'}));expect(window.print).toHaveBeenCalledTimes(1);
 fireEvent.click(within(dialog).getByRole('button',{name:'Stäng'}));expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
 fireEvent.change(screen.getByRole('combobox',{name:'Filtrera på orderstatus'}),{target:{value:'all'}});
 fireEvent.click(screen.getByRole('button',{name:/ORDER-2 Levererad/}));
 fireEvent.click(screen.getByRole('button',{name:'Ordererkännande'}));
 expect(screen.getByRole('dialog',{name:'Ordererkännande ORDER-2'})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:/ORDER-1 Godkänd/}));expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
