import React,{useState} from 'react';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import '@testing-library/jest-dom';
import {installAcrylicArticle,acrylicPocketError} from './data/acrylicPocket';
import {newDibondSign} from './data/dibondHelpers';
import {moveDibondItem,dibondItemBounds} from './data/dibondManipulation';
import {createCartItem} from './data/cartHelpers';
import DibondPreview from './components/products/DibondPreview';
import DibondFields from './components/products/DibondFields';
const product=installAcrylicArticle({articles:[]}).articles[0];
let latest;
beforeAll(()=>jest.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({font:'',measureText(text){const size=Number(this.font.match(/([\d.]+)px/)?.[1]||1000);return {width:text.length*size*.6,actualBoundingBoxAscent:size*.716,actualBoundingBoxDescent:0};}}));
afterAll(()=>jest.restoreAllMocks());afterEach(cleanup);
function Editor(){const [sign,setSign]=useState({...newDibondSign(product),lines:[{text:'Besök',sizeMm:20,firstLineBottomMm:80}]});latest=sign;return <><DibondPreview sign={sign} product={product} onChange={setSign}/><DibondFields product={product} form={{dibondSign:sign}} onChange={change=>setSign(change.dibondSign)}/></>;}
test('0701 installation is additive, preserves later edits and starts with A4 at 420 x 650',()=>{
 expect(product).toMatchObject({articleNumber:'0701',unitPrice:2470,categoryId:'verksamhetsskylt-inomhus'});
 const sign=newDibondSign(product);expect(sign).toMatchObject({widthMm:420,heightMm:650,frameEnabled:false,cornerRadiusMm:25,acrylicPocket:{enabled:true,xMm:105,yMm:280}});
 expect(dibondItemBounds(sign,'pocket',0)).toMatchObject({width:210,height:297});
 expect(acrylicPocketError(sign)).toBeNull();expect(acrylicPocketError({...sign,widthMm:100})).toBeTruthy();
 const edited={...product,unitPrice:3000};expect(installAcrylicArticle({articles:[edited]}).articles).toEqual([edited]);
});
test('Pocket moves with pointer and keyboard, is fixed A4 and can be removed/restored',()=>{
 global.fetch=jest.fn(async()=>({ok:true,json:async()=>({symbols:[]})}));const previous=window.PointerEvent;window.PointerEvent=MouseEvent;
 const {container}=render(<Editor/>);container.querySelector('svg').getBoundingClientRect=()=>({left:0,top:0,width:420,height:650});
 const pocket=screen.getByRole('button',{name:'Flytta akrylficka A4'});
 fireEvent.pointerDown(pocket,{button:0,clientX:120,clientY:300});fireEvent.pointerMove(pocket,{clientX:140,clientY:310});fireEvent.pointerUp(pocket,{clientX:140,clientY:310});
 expect(latest.acrylicPocket).toMatchObject({xMm:125,yMm:290});
 fireEvent.keyDown(pocket,{key:'ArrowLeft'});expect(latest.acrylicPocket.xMm).toBe(124);
 expect(screen.queryByRole('button',{name:'Ändra storlek på akrylficka A4'})).toBeNull();
 fireEvent.click(screen.getByLabelText('Objektalternativ'));fireEvent.click(screen.getByRole('button',{name:'Ta bort akrylfickan'}));expect(container.querySelector('[data-acrylic-pocket]')).toBeNull();
 fireEvent.click(screen.getByText('+ Lägg till',{selector:'summary'}));fireEvent.click(screen.getByRole('button',{name:'+ Akrylficka A4'}));expect(latest.acrylicPocket.xMm).toBe(124);expect(container.querySelector('[data-acrylic-pocket]')).toBeInTheDocument();
 window.PointerEvent=previous;
});
test('Order snapshot preserves pocket position independently of later edits',()=>{
 const sign=moveDibondItem({...newDibondSign(product),lines:[{text:'Test',sizeMm:20,firstLineBottomMm:80}]},'pocket',0,20,10);
 const item=createCartItem(product,'skylt',{quantity:2,dibondSign:sign});
 expect(item.dibondSign.acrylicPocket).toMatchObject({xMm:125,yMm:290,enabled:true});expect(item.extraFields[0].value).toContain('125 mm');
 sign.acrylicPocket.xMm=0;expect(item.dibondSign.acrylicPocket.xMm).toBe(125);
});
