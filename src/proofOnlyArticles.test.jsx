import React from 'react';
import {render,screen,cleanup,fireEvent,waitFor} from '@testing-library/react';
import '@testing-library/jest-dom';
import {setCatalogSnapshot,setCatalogAccessToken,getCatalogArticles} from './data/catalogStore';
import {getProductsByCategory} from './data/products';
import {searchPublicProducts} from './components/layout/PublicProductSearch';
import LandingPage from './pages/LandingPage';
import AdminArticlesPage from './pages/admin/AdminArticlesPage';
import {duplicateAdminArticle} from './data/articleAdmin';
const catalog={categories:[{id:'doors',title:'Dörrskyltar',status:'open'}],articles:[
 {id:'normal',categoryId:'doors',articleNumber:'0602',name:'Offentlig skylt',isImplemented:true},
 {id:'proof',categoryId:'doors',articleNumber:'0603',name:'Intern korrekturskylt',isImplemented:true,storefrontOrderable:false,homepageFeaturedOrder:1},
]};
afterEach(()=>{cleanup();setCatalogAccessToken('');jest.restoreAllMocks();});
test('an admin catalog retains proof articles while storefront categories, search and homepage exclude them',()=>{
 setCatalogAccessToken('admin-session');setCatalogSnapshot(catalog);
 expect(getCatalogArticles()).toHaveLength(2);
 expect(getProductsByCategory('doors').map(a=>a.id)).toEqual(['normal']);
 expect(searchPublicProducts('korrekturskylt')).toHaveLength(0);
 render(<LandingPage getHeaderProps={()=>({})} openCategory={()=>{}} openFeaturedProduct={()=>{}}/>);
 expect(screen.queryByText('Intern korrekturskylt')).not.toBeInTheDocument();
 expect(screen.getByText('Offentlig skylt')).toBeInTheDocument();
});
test('admin can save an article for proof use only, and duplication retains the setting',async()=>{
 setCatalogAccessToken('admin-session');setCatalogSnapshot(catalog);
 global.fetch=jest.fn(async(_url,options)=>({ok:true,json:async()=>({catalog:JSON.parse(options.body)})}));
 render(<AdminArticlesPage role="admin" adminPassword="account:admin-session"/>);
 fireEvent.click(screen.getByText('Offentlig skylt'));
 const toggle=screen.getByRole('checkbox',{name:'Kan beställas på beställningssidan'});
 expect(toggle).toBeChecked();fireEvent.click(toggle);
 fireEvent.click(screen.getByRole('button',{name:'Spara artikel'}));
 await waitFor(()=>expect(getCatalogArticles().find(a=>a.id==='normal').storefrontOrderable).toBe(false));
 expect(getCatalogArticles().find(a=>a.id==='normal').isImplemented).toBe(true);
 expect(duplicateAdminArticle(getCatalogArticles().find(a=>a.id==='normal')).storefrontOrderable).toBe(false);
 expect(screen.getAllByText('Endast korrektur')).toHaveLength(2);
});
