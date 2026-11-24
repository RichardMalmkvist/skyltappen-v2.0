import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import '@testing-library/jest-dom';
import ArticleProductionFileField from './components/products/ArticleProductionFileField';
const value={id:'original-id',name:'0609kompl.svg',widthMm:186,heightMm:95,cutColor:'#808080'};
beforeEach(()=>{URL.createObjectURL=jest.fn(()=>'blob:download');URL.revokeObjectURL=jest.fn();jest.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});});
afterEach(()=>{cleanup();jest.restoreAllMocks();});
test('PDF button downloads the stored original through the authenticated production endpoint',async()=>{
 global.fetch=jest.fn(async()=>({ok:true,headers:new Headers({'Content-Type':'application/pdf'}),blob:async()=>new Blob(['%PDF'],{type:'application/pdf'})}));const busy=jest.fn();const append=jest.spyOn(document.body,'appendChild');
 render(<ArticleProductionFileField value={value} credential="account:token" onChange={jest.fn()} onBusyChange={busy}/>);
 fireEvent.click(screen.getByRole('button',{name:'Hämta PDF'}));
 await waitFor(()=>expect(URL.createObjectURL).toHaveBeenCalled());expect(fetch).toHaveBeenCalledWith('/api/article-production-files/original-id/pdf',{headers:{'x-admin-password':'account:token'}});
 const link=append.mock.calls.map(([element])=>element).find(element=>element.tagName==='A');expect(link.download).toBe('0609kompl.pdf');expect(busy).toHaveBeenLastCalledWith(false);
});
test('stale server HTML is not downloaded as a PDF and existing SVG remains a separate action',async()=>{
 global.fetch=jest.fn(async()=>({ok:true,headers:new Headers({'Content-Type':'text/html'}),blob:async()=>new Blob(['HTML'])}));
 render(<ArticleProductionFileField value={value} credential="token" onChange={jest.fn()}/>);fireEvent.click(screen.getByRole('button',{name:'Hämta PDF'}));
 expect(await screen.findByRole('status')).toHaveTextContent('Starta om servern');expect(URL.createObjectURL).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Hämta original'}));await waitFor(()=>expect(fetch).toHaveBeenLastCalledWith('/api/article-production-files/original-id',{headers:{'x-admin-password':'token'}}));
});
test('PDF failure keeps the article unchanged and shows the server error',async()=>{
 global.fetch=jest.fn(async()=>({ok:false,json:async()=>({message:'Produktionsoriginalet hittades inte.'})}));const onChange=jest.fn();
 render(<ArticleProductionFileField value={value} onChange={onChange}/>);fireEvent.click(screen.getByRole('button',{name:'Hämta PDF'}));
 expect(await screen.findByRole('status')).toHaveTextContent('Produktionsoriginalet hittades inte.');expect(onChange).not.toHaveBeenCalled();expect(screen.getByRole('button',{name:'Hämta PDF'})).toBeEnabled();
});
