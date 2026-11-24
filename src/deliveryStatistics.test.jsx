import React from 'react';
import {render,screen,fireEvent,within} from '@testing-library/react';
import '@testing-library/jest-dom';
import {deliveryStatistics,deliveryDay,sortStatistics} from './data/deliveryStatistics';
import AdminStatisticsPage from './pages/admin/AdminStatisticsPage';
import {canOpenPage} from './data/permissions';
const line=(articleNumber,quantity,unitPrice,extra={})=>({articleNumber,badgeName:'Skylt '+articleNumber,quantity,unitPrice,...extra});
const order=(id,deliveredAt,cart,extra={})=>({id,orderNumber:id,status:'levererad',deliveredAt,cart,...extra});
const orders=[order('1','2026-11-01T12:00:00Z',[line('0704',2,340),line('0704',1,340)],{orderTotal:1020}),order('2','2026-11-10T12:00:00Z',[line('0201',4,100)],{workflow:'badge-production',orderTotal:400}),order('3','2026-10-01T12:00:00Z',[line('1502',2,225,{salesUnit:'par',lineTotal:450})]),order('4',null,[line('0704',1,340)]),order('pending','2026-11-10',[line('0704',10,340)],{status:'klar'})];
test('delivered totals include both workflows, quantities and one article/order count per order',()=>{const stats=deliveryStatistics(orders);expect(stats).toMatchObject({orderCount:4,articleCount:3,quantity:10,valueCents:221000,missingDates:1});expect(stats.articles.find(row=>row.articleNumber==='0704')).toMatchObject({quantity:4,orderCount:2,valueCents:136000});expect(stats.months).toEqual([{month:'2026-11',orderCount:2,quantity:7,valueCents:142000},{month:'2026-10',orderCount:1,quantity:2,valueCents:45000}]);});
test('period uses actual delivery date, includes the whole last day in Swedish time and excludes undated orders',()=>{expect(deliveryDay('2026-11-10T23:30:00Z')).toBe('2026-11-11');expect(deliveryStatistics(orders,{from:'2026-11-01',to:'2026-11-10'})).toMatchObject({orderCount:2,quantity:7,valueCents:142000});expect(deliveryStatistics(orders,{type:'badges'}).orderCount).toBe(1);expect(deliveryStatistics(orders,{type:'signs'}).orderCount).toBe(3);});
test('recorded totals, free items, duplicate order IDs, different units and currency are handled explicitly',()=>{const a=order('a','2026-11-01',[line('A',2,30,{lineTotal:0}),line('A',1,30,{salesUnit:'par'})],{orderTotal:25});const stats=deliveryStatistics([a,a,order('usd','2026-11-01',[],{currency:'USD',orderTotal:999})]);expect(stats.valueCents).toBe(2500);expect(stats.orderCount).toBe(1);expect(stats.otherCurrencies).toBe(1);expect(stats.articles).toHaveLength(2);expect(stats.articles[0].valueCents).toBe(0);expect(sortStatistics([{articleNumber:'10'},{articleNumber:'2'}],'articleNumber','asc')[0].articleNumber).toBe('2');});
test('admin page supports article search, sorting and order/month views',()=>{render(<AdminStatisticsPage role="admin" orders={orders} onRefresh={()=>{}}/>);expect(screen.getByRole('heading',{name:'Statistik'})).toBeInTheDocument();const panel=screen.getByRole('tabpanel');fireEvent.change(screen.getByRole('searchbox'),{target:{value:'1502'}});expect(within(panel).getByText('2 par')).toBeInTheDocument();expect(within(panel).queryByText('0704')).not.toBeInTheDocument();fireEvent.click(screen.getByRole('tab',{name:'Ordrar'}));expect(within(panel).getByText('Datum saknas')).toBeInTheDocument();fireEvent.click(screen.getByRole('tab',{name:'Per månad'}));expect(within(panel).getByText('2026-11')).toBeInTheDocument();expect(canOpenPage('admin','statistics')).toBe(true);expect(canOpenPage('personal','statistics')).toBe(false);expect(canOpenPage('bestallare','statistics')).toBe(false);});
const openOrders=[
  order('approved',null,[line('0704',2,340)],{status:'godkänd',createdAt:'2026-11-04T10:00:00Z'}),
  order('new',null,[line('0201',3,100)],{status:'ny',createdAt:'2026-10-10T10:00:00Z',workflow:'badge-production'}),
  order('shipped',null,[line('0704',1,340)],{status:'skickad',createdAt:'2026-11-07T10:00:00Z'}),
  order('cancelled',null,[line('0704',100,340)],{status:'avbruten',createdAt:'2026-11-07T10:00:00Z'}),
  order('draft',null,[line('0704',100,340)],{status:'draft',createdAt:'2026-11-07T10:00:00Z'}),
];
test('open order statistics excludes deliveries, cancellations and drafts and uses creation date',()=>{
  expect(deliveryStatistics([...orders,...openOrders],{scope:'open',from:'2026-11-01',to:'2026-11-30'})).toMatchObject({orderCount:2,quantity:3,valueCents:102000});
  expect(deliveryStatistics(openOrders,{scope:'open',status:'godkänd'})).toMatchObject({orderCount:1,quantity:2,valueCents:68000});
  expect(deliveryStatistics(openOrders,{scope:'open',type:'badges'})).toMatchObject({orderCount:1,quantity:3,valueCents:30000});
  expect(deliveryStatistics(openOrders,{scope:'open'}).months.map(row=>row.month)).toEqual(['2026-11','2026-10']);
});
test('open order tab changes summaries, date labels and status filtering without mixing delivered totals',()=>{
  render(<AdminStatisticsPage role="admin" orders={[...orders,...openOrders]} onRefresh={()=>{}}/>);
  fireEvent.click(screen.getByRole('button',{name:'Inneliggande ordrar'}));
  expect(screen.getByRole('button',{name:'Inneliggande ordrar'})).toHaveAttribute('aria-pressed','true');
  expect(screen.getByText('Antal i beställning')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Status'),{target:{value:'godkänd'}});
  fireEvent.click(screen.getByRole('tab',{name:'Ordrar'}));
  const panel=screen.getByRole('tabpanel');
  expect(within(panel).getByRole('columnheader',{name:'Beställningsdatum'})).toBeInTheDocument();
  expect(within(panel).getByText('approved')).toBeInTheDocument();
  expect(within(panel).queryByText('shipped')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Levererat'}));
  expect(screen.queryByLabelText('Status')).not.toBeInTheDocument();
  expect(within(panel).queryByText('approved')).not.toBeInTheDocument();
  expect(screen.getByText('Levererat ordervärde')).toBeInTheDocument();
});
