import React,{useState} from 'react';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import SignArtworkField from './components/products/SignArtworkField';
import DibondFields from './components/products/DibondFields';
import DibondPreview from './components/products/DibondPreview';
import OTBoardPreview from './components/orders/OTBoardPreview';
import {createCartItem,validateCurrentItem} from './data/cartHelpers';
import {newDibondSign} from './data/dibondHelpers';
import {outdoorOtArticle} from './data/outdoorOtArticle';
const id='11111111-2222-3333-4444-555555555555',art={id,name:'Corel.svg',mime:'image/svg+xml',widthMm:600,heightMm:400,preview:'/api/sign-artworks/'+id+'/preview'};
afterEach(cleanup);
test('Dropping a Corel SVG uploads it and removing it restores ordinary editing',async()=>{
 global.fetch=jest.fn(async()=>({ok:true,json:async()=>({artwork:art})}));
 let current;
 function Editor(){const [value,setValue]=useState(null);current=value;return <SignArtworkField value={value} onChange={setValue}/>;}
 render(<Editor/>);fireEvent.drop(screen.getByRole('region',{name:'Eget original'}),{dataTransfer:{files:[new File(['<svg/>'],'Corel.svg',{type:'image/svg+xml'})]}});
 await waitFor(()=>expect(current).toEqual(art));expect(screen.getByText('Corel.svg')).not.toBeNull();fireEvent.click(screen.getByRole('button',{name:'Ta bort'}));expect(current).toBeNull();
});
test('Uploaded artwork is the complete preview and survives both public and project-compatible configurations',()=>{
 const product=outdoorOtArticle(),sign={...newDibondSign(product),widthMm:600,heightMm:400,uploadedArtwork:art},form={quantity:2,dibondSign:sign};
 expect(validateCurrentItem(product,'skylt',form)).toBeFalsy();const item=createCartItem(product,'skylt',form);expect(item.dibondSign.uploadedArtwork).toEqual(art);
 const {container}=render(<DibondPreview sign={sign} product={product}/>);expect(container.querySelector('image[data-sign-artwork]').getAttribute('href')).toBe(art.preview);expect(container.querySelector('[data-dibond-line]')).toBeNull();
});
test('0810 accepts an original without a pre-existing library variant',()=>{
 const product={id:'ot',articleNumber:'0810',previewType:'ot_board',unitPrice:200},form={quantity:2,otBoard:{widthMm:600,heightMm:400,uploadedArtwork:art}};
 expect(validateCurrentItem(product,'skylt',form)).toBeFalsy();const item=createCartItem(product,'skylt',form);expect(item.quantity).toBe(2);expect(item.otBoard.uploadedArtwork).toEqual(art);expect(item.unitPrice).toBe(200);
 const {container}=render(<OTBoardPreview board={item.otBoard}/>);expect(container.querySelector('image').getAttribute('href')).toBe(art.preview);
});
test('The shared project inspector exposes the upload control and retains the file on save',()=>{
 const product=outdoorOtArticle(),sign={...newDibondSign(product),widthMm:600,heightMm:400,uploadedArtwork:art},change=jest.fn();
 render(<DibondFields product={product} form={{dibondSign:sign}} onChange={change}/>);expect(screen.getByLabelText('Ladda upp eget original')).not.toBeNull();fireEvent.click(screen.getByRole('button',{name:'Ta bort'}));expect(change.mock.calls[0][0].dibondSign.uploadedArtwork).toBeNull();
});
