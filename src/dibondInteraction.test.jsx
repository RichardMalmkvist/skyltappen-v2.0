import React,{useState} from 'react';
import {render,screen,fireEvent,act,cleanup,waitFor} from '@testing-library/react';
import '@testing-library/jest-dom';
import DibondPreview from './components/products/DibondPreview';
import DibondFields from './components/products/DibondFields';
import {dibondItemBounds,moveDibondItem,resizeDibondItem} from './data/dibondManipulation';
import {getDibondBlockBottoms,dibondLayout} from './data/dibondHelpers';
import {createCartItem} from './data/cartHelpers';
const original={widthMm:600,heightMm:400,lines:[{text:'Entré',sizeMm:20,bold:true,firstLineBottomMm:100,lineGapMm:4},{text:'15',sizeMm:40,bold:true,firstLineBottomMm:300}],symbols:[{id:'s',symbolId:'s',name:'Pil',image:'/api/dibond-symbols/images/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',xMm:30,yMm:200,sizeMm:30,aspectRatio:2}]};
let latest;
beforeAll(()=>jest.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({font:'',measureText(text){const size=Number(this.font.match(/([\d.]+)px/)?.[1]||1000);return {width:text.length*size*.6,actualBoundingBoxAscent:size*.716,actualBoundingBoxDescent:0};}}));
afterAll(()=>jest.restoreAllMocks());afterEach(cleanup);
function Editor(){const [sign,setSign]=useState(original);latest=sign;return <DibondPreview sign={sign} onChange={setSign}/>;}

test('Dragging text respects preview scale, moves both axes and leaves other blocks in place',()=>{
 jest.useFakeTimers();const previous=window.PointerEvent;window.PointerEvent=MouseEvent;
 const {container}=render(<Editor/>);const svg=container.querySelector('svg');svg.getBoundingClientRect=()=>({left:10,top:20,width:300,height:200});
 const block=screen.getByRole('button',{name:'Flytta textblock 1'});fireEvent.pointerDown(block,{button:0,clientX:100,clientY:100});fireEvent.pointerMove(block,{clientX:125,clientY:120});act(()=>jest.advanceTimersByTime(20));fireEvent.pointerUp(block,{clientX:125,clientY:120});
 expect(latest.lines[0].offsetXMm).toBe(50);expect(getDibondBlockBottoms(latest)[0]).toBeCloseTo(140);expect(getDibondBlockBottoms(latest)[1]).toBeCloseTo(300);expect(container.querySelector('[data-dibond-line="0"]')).toHaveAttribute('x','350');
 expect(screen.getByRole('button',{name:'Ändra storlek på textblock 1'})).toBeInTheDocument();window.PointerEvent=previous;jest.useRealTimers();
});

test('Corner resizing keeps the opposite text corner anchored and does not move neighbouring blocks',()=>{
 const before=dibondItemBounds(original,'text',0),next=resizeDibondItem(original,'text',0,1.7),after=dibondItemBounds(next,'text',0);
 expect(next.lines[0].sizeMm).toBe(34);expect(after.x).toBeCloseTo(before.x,1);expect(after.y).toBeCloseTo(before.y,1);expect(after.width).toBeGreaterThan(before.width);expect(getDibondBlockBottoms(next)[1]).toBeCloseTo(300);
 expect(dibondLayout(resizeDibondItem(original,'text',0,100)).fits).toBe(true);
});

test('Symbols keep their aspect ratio while being moved/resized and cannot be dragged beyond the frame',()=>{
 const moved=moveDibondItem(original,'symbol',0,40,-30);expect(moved.symbols[0]).toMatchObject({xMm:70,yMm:170});
 const sized=resizeDibondItem(moved,'symbol',0,2);expect(sized.symbols[0]).toMatchObject({xMm:70,yMm:170,sizeMm:60,aspectRatio:2});
 const edge=moveDibondItem(original,'symbol',0,10000,10000).symbols[0];expect(edge.xMm+edge.sizeMm*2).toBeLessThanOrEqual(596);expect(edge.yMm+edge.sizeMm).toBeLessThanOrEqual(396);
});

test('Pointer corner control grows text; Escape cancels a drag and read-only previews expose no controls',()=>{
 const previous=window.PointerEvent;window.PointerEvent=MouseEvent;
 const {container,rerender}=render(<Editor/>);container.querySelector('svg').getBoundingClientRect=()=>({left:0,top:0,width:600,height:400});
 fireEvent.focus(screen.getByRole('button',{name:'Flytta textblock 1'}));let handle=screen.getByRole('button',{name:'Ändra storlek på textblock 1'});fireEvent.pointerDown(handle,{button:0,clientX:300,clientY:100});fireEvent.pointerMove(handle,{clientX:330,clientY:115});fireEvent.pointerUp(handle,{clientX:330,clientY:115});expect(latest.lines[0].sizeMm).toBeGreaterThan(20);
 const prior=JSON.stringify(latest),block=screen.getByRole('button',{name:'Flytta textblock 1'});fireEvent.pointerDown(block,{button:0,clientX:100,clientY:100});fireEvent.pointerMove(block,{clientX:120,clientY:120});fireEvent.keyDown(block,{key:'Escape'});expect(JSON.stringify(latest)).toBe(prior);
 rerender(<DibondPreview sign={latest}/>);expect(screen.queryByRole('button')).toBeNull();expect(container.querySelector('[data-dibond-selection]')).toBeNull();window.PointerEvent=previous;
});

test('Order snapshots retain horizontal offsets, resized text and symbol positions',()=>{
 const changed=resizeDibondItem(moveDibondItem(original,'text',0,35,10),'symbol',0,1.5);
 const item=createCartItem({id:'dibond',previewType:'dibond_sign',productType:'dibondskylt'},'skylt',{quantity:1,dibondSign:changed});
 expect(item.dibondSign.lines[0].offsetXMm).toBe(35);expect(item.dibondSign.lines[0].firstLineBottomMm).toBe(110);expect(item.dibondSign.symbols[0].sizeMm).toBe(45);
});

test('Fractional drag results remain valid in every numeric field, so ordering is not blocked by step mismatch',async()=>{
 global.fetch=jest.fn(async()=>({ok:true,json:async()=>({symbols:[]})}));
 const sign={...original,lines:[{...original.lines[0],sizeMm:31.39,offsetXMm:20.85,firstLineBottomMm:72.2},original.lines[1]],symbols:[{...original.symbols[0],sizeMm:101.35}]};
 const {container}=render(<DibondFields product={{dibondConfig:{maxWidthMm:600,maxHeightMm:600}}} form={{dibondSign:sign}} onChange={()=>{}}/>);
 await waitFor(()=>expect(screen.getByRole('button',{name:'+ Symbol'})).toBeEnabled());
 expect([...container.querySelectorAll('input[type="number"]')].every(input=>input.validity.valid)).toBe(true);
});

test('The visible resize handle stays ten screen pixels when the fitted preview changes scale',async()=>{
 const {container}=render(<div className="jsf-fitted-preview-content"><Editor/></div>);
 const wrapper=container.firstChild,svg=container.querySelector('svg');let screenWidth=300;
 svg.getBoundingClientRect=()=>({left:0,top:0,width:screenWidth,height:screenWidth*2/3});
 fireEvent.focus(screen.getByRole('button',{name:'Flytta textblock 1'}));
 const visible=()=>Number(container.querySelector('[data-dibond-resize-handle]').getAttribute('width'))*screenWidth/original.widthMm;
 expect(visible()).toBeCloseTo(10);
 await act(async()=>{screenWidth=150;wrapper.style.transform='scale(.5)';await Promise.resolve();});
 expect(visible()).toBeCloseTo(10);
 await act(async()=>{screenWidth=600;wrapper.style.transform='scale(1)';await Promise.resolve();});
 expect(visible()).toBeCloseTo(10);
 fireEvent.focus(screen.getByRole('button',{name:'Flytta symbol 1'}));expect(visible()).toBeCloseTo(10);
});
