import React,{useState} from 'react';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import '@testing-library/jest-dom';
import DibondFields from './components/products/DibondFields';
import DibondPreview from './components/products/DibondPreview';
import {dibondSeparators,dibondSeparatorError} from './data/dibondSeparators';
import {moveDibondItem} from './data/dibondManipulation';
import {createCartItem} from './data/cartHelpers';
const original={widthMm:420,heightMm:650,separatorEnabled:true,separatorOffsetYMm:-210,lines:[{text:'Laboratoriet',sizeMm:20,firstLineBottomMm:80}],symbols:[]};
let latest;
beforeAll(()=>jest.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({font:'',measureText(text){const size=Number(this.font.match(/([\d.]+)px/)?.[1]||1000);return {width:text.length*size*.6,actualBoundingBoxAscent:size*.716,actualBoundingBoxDescent:0};}}));
afterAll(()=>jest.restoreAllMocks());afterEach(cleanup);
function Editor(){const [sign,setSign]=useState(original);latest=sign;return <><DibondPreview sign={sign} onChange={setSign}/><DibondFields product={{dibondConfig:{maxWidthMm:1000,maxHeightMm:1000}}} form={{dibondSign:sign}} onChange={change=>setSign(change.dibondSign)}/></>;}
test('Additional separators can be added, dragged, precisely positioned and removed independently',()=>{
 global.fetch=jest.fn(async()=>({ok:true,json:async()=>({symbols:[]})}));const prev=window.PointerEvent;window.PointerEvent=MouseEvent;
 const {container}=render(<Editor/>);fireEvent.click(screen.getByText('+ Lägg till',{selector:'summary'}));fireEvent.click(screen.getByRole('button',{name:'+ Streck'}));fireEvent.click(screen.getByText('+ Lägg till',{selector:'summary'}));fireEvent.click(screen.getByRole('button',{name:'+ Streck'}));
 expect(container.querySelectorAll('[data-dibond-separator]')).toHaveLength(3);expect(latest.separatorOffsetYMm).toBe(-210);
 container.querySelector('svg').getBoundingClientRect=()=>({left:0,top:0,width:420,height:650});const stroke=screen.getByRole('button',{name:'Flytta streck 2'});
 fireEvent.pointerDown(stroke,{button:0,clientX:100,clientY:145});fireEvent.pointerMove(stroke,{clientX:100,clientY:160});fireEvent.pointerUp(stroke,{clientX:100,clientY:160});
 expect(latest.additionalSeparators[0].offsetYMm).toBe(-165);expect(latest.additionalSeparators[1].offsetYMm).toBe(-150);expect(latest.separatorOffsetYMm).toBe(-210);
 fireEvent.change(screen.getByRole('combobox',{name:'Välj objekt att redigera'}),{target:{value:'separator:2'}});fireEvent.click(screen.getByText('Finjustera',{selector:'summary'}));
 fireEvent.change(screen.getByRole('spinbutton',{name:'Höjdplacering streck 3 (mm från mitten)'}),{target:{value:'100.25'}});expect(Number(latest.additionalSeparators[1].offsetYMm)).toBe(100.25);
 fireEvent.change(screen.getByRole('combobox',{name:'Välj objekt att redigera'}),{target:{value:'separator:1'}});fireEvent.click(screen.getByLabelText('Objektalternativ'));fireEvent.click(screen.getByRole('button',{name:'Ta bort streck 2'}));expect(container.querySelectorAll('[data-dibond-separator]')).toHaveLength(2);expect(Number(latest.additionalSeparators[0].offsetYMm)).toBe(100.25);
 window.PointerEvent=prev;
});
test('Legacy separator and complete multi-stroke snapshots are preserved in orders',()=>{
 expect(dibondSeparators(original)).toEqual([{index:0,offsetYMm:-210}]);const sign={...original,additionalSeparators:[{offsetYMm:20},{offsetYMm:100}]};
 const changed=moveDibondItem(sign,'separator',2,0,12.5);expect(changed.separatorOffsetYMm).toBe(-210);expect(changed.additionalSeparators.map(x=>x.offsetYMm)).toEqual([20,112.5]);
 const item=createCartItem({id:'0701',previewType:'dibond_sign',productType:'dibondskylt'},'skylt',{quantity:1,dibondSign:changed});expect(item.dibondSign.additionalSeparators).toEqual(changed.additionalSeparators);
 changed.additionalSeparators[0].offsetYMm=99;expect(item.dibondSign.additionalSeparators[0].offsetYMm).toBe(20);
 expect(dibondSeparatorError({...sign,additionalSeparators:[{offsetYMm:9999}]})).toBeTruthy();expect(dibondSeparatorError({...sign,additionalSeparators:[{offsetYMm:''}]})).toBeTruthy();
});
