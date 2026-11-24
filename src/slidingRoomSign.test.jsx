import React from 'react';import {render,screen,fireEvent,act} from '@testing-library/react';import '@testing-library/jest-dom';import SlidingRoomSignPreview from './components/products/SlidingRoomSignPreview';
test('The hatch moves between both states with keyboard and stays within its rails',()=>{
 render(<SlidingRoomSignPreview/>);const slider=screen.getByRole('slider',{name:'Skjutbar vit lucka'});expect(slider).toHaveAttribute('aria-valuetext','Upptaget');expect(slider).toHaveAttribute('aria-valuenow','100');
 fireEvent.keyDown(slider,{key:'Home'});expect(slider).toHaveAttribute('aria-valuenow','0');expect(slider).toHaveAttribute('aria-valuetext','Ledigt');
 fireEvent.keyDown(slider,{key:'ArrowLeft'});expect(slider).toHaveAttribute('aria-valuenow','0');
 fireEvent.keyDown(slider,{key:'ArrowRight'});expect(slider).toHaveAttribute('aria-valuenow','5');
 fireEvent.keyDown(slider,{key:'End'});expect(slider).toHaveAttribute('aria-valuenow','100');
 fireEvent.keyDown(slider,{key:'ArrowRight'});expect(slider).toHaveAttribute('aria-valuenow','100');
});
test('Dragging the white hatch respects display scaling and clamps both endpoints',()=>{
 jest.useFakeTimers();const previous=window.PointerEvent;window.PointerEvent=MouseEvent;
 const {container,unmount}=render(<SlidingRoomSignPreview/>);container.querySelector('svg').getBoundingClientRect=()=>({width:653});
 const slider=screen.getByRole('slider');fireEvent.keyDown(slider,{key:'End'});
 fireEvent.pointerDown(slider,{button:0,clientX:500});fireEvent.pointerMove(slider,{clientX:357});act(()=>jest.advanceTimersByTime(20));
 expect(slider).toHaveAttribute('aria-valuenow','50');expect(slider).toHaveAttribute('aria-valuetext','Luckan är delvis öppen');
 fireEvent.pointerMove(slider,{clientX:-1000});fireEvent.pointerUp(slider,{clientX:-1000});expect(slider).toHaveAttribute('aria-valuenow','0');
 fireEvent.pointerDown(slider,{button:0,clientX:0});fireEvent.pointerMove(slider,{clientX:1000});fireEvent.pointerUp(slider,{clientX:1000});expect(slider).toHaveAttribute('aria-valuenow','100');
 unmount();window.PointerEvent=previous;jest.useRealTimers();
});
test('Each preview has unique masks and keeps frame pointer-transparent',()=>{
 const {container}=render(<><SlidingRoomSignPreview/><SlidingRoomSignPreview/></>);const ids=[...container.querySelectorAll('[id]')].map(n=>n.id);expect(new Set(ids).size).toBe(ids.length);expect(container.querySelectorAll('.jsf-sliding-room-frame')).toHaveLength(2);expect(container.querySelectorAll('[data-original-room-photo]')).toHaveLength(2);expect(container.querySelectorAll('[data-seamless-room-fields]')).toHaveLength(2);
});

test.each(['0609','0614'])('The wider hatch covers exactly one full field in both endpoints for %s',articleNumber=>{
 const {container}=render(<SlidingRoomSignPreview articleNumber={articleNumber}/>);const slider=screen.getByRole('slider');
 const windowRect=container.querySelector('clipPath[id$="window"] rect'),hatch=container.querySelector('clipPath[id$="hatch"] rect');
 const left=Number(windowRect.getAttribute('x')),fieldWidth=Number(windowRect.getAttribute('width'))/2;
 const geometry=()=>{const values=slider.getAttribute('transform').match(/[-+]?[0-9]*\.?[0-9]+/g).map(Number);return {x:values[0],width:Number(hatch.getAttribute('width'))*values[2]};};
 expect(geometry().x).toBe(left+fieldWidth);expect(geometry().width).toBeCloseTo(fieldWidth,6);
 fireEvent.keyDown(slider,{key:'Home'});expect(geometry().x).toBe(left);expect(geometry().x+geometry().width).toBeCloseTo(left+fieldWidth,6);
 if(articleNumber==='0614'){expect(slider).toHaveAttribute('aria-valuetext','Smittvarning dold');expect(container.querySelector('image').getAttribute('href')).toContain('0614.webp');expect(screen.queryByText('LEDIGT')).toBeNull();}
});
