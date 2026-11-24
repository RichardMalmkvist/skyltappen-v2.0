import React from 'react';
import {render,screen,fireEvent,cleanup,within} from '@testing-library/react';
import '@testing-library/jest-dom';
import CatalogPage from './pages/CatalogPage';
import {setCatalogSnapshot,setCatalogAccessToken} from './data/catalogStore';
import {createDirectCartItem} from './data/cartHelpers';
jest.mock('./components/layout/AppHeader',()=>()=>null);
const article={id:'new-door-0621',articleNumber:'0621',categoryId:'dorrskyltar',name:'Magnetskylt dubbelsidig för diskmaskin',unitPrice:435,productType:'skylt',previewType:'image',flowType:'direct',isImplemented:true,fields:{quantity:true}};
afterEach(cleanup);
test.each(['0720','0721','0722','0723','0724','0737'])('3D decal %s opens its product instead of adding directly',articleNumber=>{
 const product={...article,id:'decal-'+articleNumber,articleNumber,name:'Dekal '+articleNumber,previewType:'image',productType:'skylt',flowType:'direct',directAddToCart:true};
 setCatalogAccessToken('test');setCatalogSnapshot({articles:[product],categories:[]});
 const open=jest.fn(),add=jest.fn();render(<CatalogPage getHeaderProps={()=>({})} selectedCategory={{id:'dorrskyltar',title:'Dörrskyltar',isImplemented:true}} addDirectProductToCart={add} openProduct={open}/>);
 fireEvent.click(screen.getByRole('button',{name:/Välj produkt/}));expect(open).toHaveBeenCalledTimes(1);expect(open.mock.calls[0][0]).toMatchObject({articleNumber,flowType:'form',directAddToCart:false});expect(add).not.toHaveBeenCalled();
});