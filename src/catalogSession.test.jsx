import React from 'react';
import {render,screen,cleanup} from '@testing-library/react';
import '@testing-library/jest-dom';
import {fetchCatalog,getCatalogSnapshot,setCatalogAccessToken} from './data/catalogStore';
import {getAllAdminCategories} from './data/categoryAdmin';
import {getRuntimeProducts} from './data/products';
import LandingPage from './pages/LandingPage';
const catalog={categories:[{id:'doors',title:'Dörrskyltar',status:'open',isImplemented:true},{id:'private',title:'Internt',status:'internal'}],articles:[{id:'0608',articleNumber:'0608',name:'Rumsfunktionsskylt',categoryId:'doors',isImplemented:true,image:'/door-photo-0608-clean.svg',homepageFeaturedOrder:1},{id:'internal',categoryId:'private',isImplemented:true}]};
afterEach(()=>{cleanup();setCatalogAccessToken('');jest.restoreAllMocks();});

test('Current account restores the full catalog after the catalog module loses its session, including homepage and admin groups',async()=>{
 setCatalogAccessToken('');
 global.fetch=jest.fn(async(_url,options)=>({ok:true,json:async()=>options.headers.Authorization==='Bearer active-account'?catalog:{categories:[],articles:[]}}));
 await fetchCatalog('active-account');
 expect(fetch).toHaveBeenCalledWith('/api/catalog',expect.objectContaining({headers:{Authorization:'Bearer active-account'},cache:'no-store'}));
 expect(getAllAdminCategories()).toHaveLength(2);expect(getRuntimeProducts().map(p=>p.id)).toContain('0608');
 render(<LandingPage getHeaderProps={()=>({})} openCategory={()=>{}} openFeaturedProduct={()=>{}}/>);
 expect(screen.getAllByRole('region',{name:'Utvalda produkter'}).some(region=>
  region.textContent.includes('Rumsfunktionsskylt')
 )).toBe(true);
});

test('A catalog response started before logout cannot restore the authenticated catalog',async()=>{
 let complete;global.fetch=jest.fn(()=>new Promise(resolve=>{complete=resolve;}));
 const pending=fetchCatalog('active-account');setCatalogAccessToken('');
 complete({ok:true,json:async()=>catalog});await pending;
 expect(getCatalogSnapshot().articles.some(p=>p.id==='internal')).toBe(false);
});

test('Explicit logout clears old authorization instead of sending the previous account',async()=>{
 setCatalogAccessToken('active-account');global.fetch=jest.fn(async()=>({ok:true,json:async()=>({categories:[],articles:[]})}));
 await fetchCatalog('');expect(fetch).toHaveBeenCalledWith('/api/catalog',expect.objectContaining({headers:{}}));expect(getCatalogSnapshot().articles).toHaveLength(0);
});
