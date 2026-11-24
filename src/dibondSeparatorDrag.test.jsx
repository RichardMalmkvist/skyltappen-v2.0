import React,{useState} from 'react';
import {render,screen,fireEvent,cleanup,act} from '@testing-library/react';
import '@testing-library/jest-dom';
import DibondPreview from './components/products/DibondPreview';
import {moveDibondItem} from './data/dibondManipulation';
const initial={widthMm:600,heightMm:400,separatorEnabled:true,separatorOffsetYMm:0,lines:[{text:'Text',sizeMm:20,firstLineBottomMm:100}],symbols:[]};
let latest;
function Editor(){const [sign,setSign]=useState(initial);latest=sign;return <DibondPreview sign={sign} onChange={setSign}/>;}
afterEach(cleanup);
test('separator drags at preview scale, updates its value and leaves text untouched',()=>{
 const previous=window.PointerEvent;window.PointerEvent=MouseEvent;jest.useFakeTimers();
 const {container}=render(<Editor/>);container.querySelector('svg').getBoundingClientRect=()=>({left:0,top:0,width:300,height:256});
 const target=screen.getByRole('button',{name:'Flytta strecket'});
 fireEvent.pointerDown(target,{button:0,clientX:100,clientY:100});fireEvent.pointerMove(target,{clientX:120,clientY:120});act(()=>jest.advanceTimersByTime(20));fireEvent.pointerUp(target,{clientX:120,clientY:120});
 expect(latest.separatorOffsetYMm).toBe(31.25);expect(latest.lines).toEqual(initial.lines);expect(container.querySelector('[data-dibond-separator]')).toHaveAttribute('y1','231.25');
 expect(screen.queryByRole('button',{name:/storlek.*strecket/})).not.toBeInTheDocument();
 fireEvent.keyDown(target,{key:'ArrowUp'});expect(latest.separatorOffsetYMm).toBe(30.25);
 window.PointerEvent=previous;jest.useRealTimers();
});
test('separator stays within the sign and readonly previews have no draggable separator',()=>{
 expect(moveDibondItem(initial,'separator',0,0,-10000).separatorOffsetYMm).toBe(-187.5);
 expect(moveDibondItem(initial,'separator',0,0,10000).separatorOffsetYMm).toBe(187.5);
 render(<DibondPreview sign={initial}/>);expect(screen.queryByRole('button',{name:'Flytta strecket'})).toBeNull();
});
test('folded aluminium edge stays visible at any scale and has a subtle shadow',()=>{
 const {container}=render(<DibondPreview sign={initial} product={{articleNumber:'1230'}}/>);
 const surface=container.querySelector('[data-aluminium-surface]');expect(surface).toHaveAttribute('stroke','#262626');expect(surface).toHaveAttribute('vector-effect','non-scaling-stroke');expect(surface.style.filter).toContain('drop-shadow');expect(surface).toHaveAttribute('rx','0');
});
