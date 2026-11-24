import React from 'react';
import {render,screen,fireEvent,within,cleanup} from '@testing-library/react';
import '@testing-library/jest-dom';
import {AdminLayout} from './components/admin/AdminNavigation';
afterEach(cleanup);
test('Navigation uses the existing route handlers and mark the current page',()=>{
 const orders=jest.fn(),profile=jest.fn(),logout=jest.fn();render(<AdminLayout active="orders" onOpenOrders={orders} onOpenProfile={profile} onLogout={logout} user={{firstName:'Richard',lastName:'Malmqvist',email:'richard@example.com'}}><div>Existing page</div></AdminLayout>);
 fireEvent.click(within(screen.getByRole('navigation',{name:'Administration'})).getByRole('button',{name:'Ordrar'}));expect(screen.queryByRole('navigation',{name:'Snabbnavigation'})).toBeNull();expect(orders).toHaveBeenCalledTimes(1);
 expect(screen.getByRole('button',{name:'Ordrar'})).toHaveAttribute('aria-current','page');expect(screen.getByText('Existing page')).toBeVisible();
 fireEvent.click(screen.getByTitle('Öppna Min sida'));fireEvent.click(screen.getByRole('button',{name:'Logga ut'}));expect(profile).toHaveBeenCalledTimes(1);expect(logout).toHaveBeenCalledTimes(1);
});
test.each(['personal','bestallare'])('Role %s retains its navigation permissions',role=>{
 render(<AdminLayout role={role} active="dashboard" onOpenDashboard={()=>{}}/>);
 expect(screen.getByRole('button',{name:'Översikt'})).toHaveAttribute('aria-current','page');
 expect(screen.queryByRole('button',{name:'Användare'})).toBeNull();expect(screen.queryByRole('button',{name:'Inställningar'})).toBeNull();expect(screen.queryByRole('button',{name:'Gå till inställningar'})).toBeNull();
});
test('Mobile disclosure closes on Escape, route selection and outside clicks',()=>{
 render(<AdminLayout active="dashboard" onOpenOrders={()=>{}}/>);const toggle=screen.getByRole('button',{name:'Öppna meny'});
 fireEvent.click(toggle);expect(toggle).toHaveAttribute('aria-expanded','true');fireEvent.keyDown(toggle,{key:'Escape'});expect(toggle).toHaveAttribute('aria-expanded','false');expect(toggle).toHaveFocus();
 fireEvent.click(toggle);fireEvent.click(screen.getByRole('button',{name:'Ordrar'}));expect(toggle).toHaveAttribute('aria-expanded','false');
 fireEvent.click(toggle);fireEvent.pointerDown(document.body);expect(toggle).toHaveAttribute('aria-expanded','false');
});
