import React from 'react';
import {render,screen,fireEvent,act} from '@testing-library/react';
import '@testing-library/jest-dom';
import ProductArcCarousel from './components/products/ProductArcCarousel';
import {springStep,createCarouselMotion} from './components/products/carouselMotion';
const products=Array.from({length:6},(_,i)=>({id:`p${i}`,name:`Produkt ${i}`,image:'/test.png'}));
test('Keyboard and side products navigate without visible arrow controls',()=>{
 const open=jest.fn();render(<ProductArcCarousel products={products} onOpen={open}/>);
 expect(screen.getByRole('status')).toHaveTextContent('3 / 6');expect(screen.queryByRole('button',{name:'Nästa produkt'})).toBeNull();
 const selected=screen.getByRole('button',{name:'Produkt 2 – visa produkt'});
 fireEvent.click(selected);expect(open).toHaveBeenCalledWith(products[2]);
 fireEvent.keyDown(selected,{key:'ArrowRight'});expect(screen.getByRole('status')).toHaveTextContent('4 / 6');
 fireEvent.click(screen.getByRole('button',{name:'Produkt 4'}));expect(screen.getByRole('status')).toHaveTextContent('5 / 6');
 for(let i=0;i<5;i++)fireEvent.keyDown(screen.getByRole('button',{name:/visa produkt/}),{key:'ArrowRight'});
 expect(screen.getByRole('status')).toHaveTextContent('6 / 6');expect(open).toHaveBeenCalledTimes(1);
});
test('Empty and single-product catalogs work',()=>{
 const {rerender}=render(<ProductArcCarousel/>);expect(screen.queryByRole('region')).toBeNull();
 rerender(<ProductArcCarousel products={[products[0]]}/>);expect(screen.getByRole('status')).toHaveTextContent('1 / 1');
});
test('Dragging on a product moves the shared track and does not open a product',()=>{
 jest.useFakeTimers();const previous=window.PointerEvent;window.PointerEvent=MouseEvent;
 const open=jest.fn();const {container,unmount}=render(<ProductArcCarousel products={products} onOpen={open}/>);
 const stage=container.querySelector('.jsf-product-arc-stage'),track=container.querySelector('.jsf-product-arc-track');
 const product=screen.getByRole('button',{name:'Produkt 2 – visa produkt'});
 expect(product.style.getPropertyValue('--arc-focus')).toBe('1.0000');
 fireEvent.pointerDown(product,{button:0,clientX:600,clientY:100});fireEvent.pointerMove(product,{clientX:414,clientY:100});
 act(()=>jest.advanceTimersByTime(20));expect(stage).toHaveAttribute('data-dragging','true');expect(track.style.transform).toBe('translate3d(-806px,0,0)');
 expect(Number(product.style.getPropertyValue('--arc-focus'))).toBeCloseTo(.352,3);
 fireEvent.pointerUp(stage,{clientX:414,clientY:100});expect(screen.getByRole('status')).toHaveTextContent('4 / 6');
 fireEvent.click(screen.getByRole('button',{name:'Produkt 3 – visa produkt'}),{detail:1});expect(open).not.toHaveBeenCalled();
 act(()=>jest.advanceTimersByTime(1800));expect(track.style.transform).toBe('translate3d(-930px,0,0)');
 expect(screen.getByRole('button',{name:'Produkt 3 – visa produkt'}).style.getPropertyValue('--arc-focus')).toBe('1.0000');
 expect(product.style.getPropertyValue('--arc-focus')).toBe('0.0000');
 unmount();window.PointerEvent=previous;jest.useRealTimers();
});
test('Re-grabbing during the glide starts at the visible position without a jump',()=>{
 jest.useFakeTimers();const previous=window.PointerEvent;window.PointerEvent=MouseEvent;
 const {container,unmount}=render(<ProductArcCarousel products={products}/>);const stage=container.querySelector('.jsf-product-arc-stage'),track=container.querySelector('.jsf-product-arc-track');
 fireEvent.keyDown(screen.getByRole('button',{name:/visa produkt/}),{key:'ArrowRight'});act(()=>jest.advanceTimersByTime(80));
 const before=track.style.transform;fireEvent.pointerDown(stage,{button:0,clientX:500,clientY:100});expect(track.style.transform).toBe(before);
 fireEvent.pointerMove(stage,{clientX:480,clientY:100});act(()=>jest.advanceTimersByTime(20));
 const x=s=>Number(s.match(/translate3d\(([-.0-9]+)px/)[1]);expect(x(track.style.transform)).toBeCloseTo(x(before)-20);
 fireEvent.pointerCancel(stage);expect(stage).toHaveAttribute('data-dragging','false');
 unmount();window.PointerEvent=previous;jest.useRealTimers();
});
test('Spring motion is consistent across display frame rates',()=>{
 const ends=[30,60,120].map(hz=>{let state={position:0,velocity:0};for(let i=0;i<hz;i++)state=springStep(state.position,state.velocity,1,1/hz);return state.position;});
 expect(ends[0]).toBeCloseTo(ends[1],10);expect(ends[1]).toBeCloseTo(ends[2],10);expect(ends[2]).toBeCloseTo(1,4);
});
test('Pointer updates are coalesced into one frame, interrupted motion stays continuous, and reduced motion settles directly',()=>{
 let id=0;const callbacks=new Map(),paint=jest.fn();
 const motion=createCarouselMotion(2,{requestFrame:cb=>{callbacks.set(++id,cb);return id;},cancelFrame:key=>callbacks.delete(key)});
 motion.setPainter(paint);motion.dragTo(2.1);motion.dragTo(2.3);motion.dragTo(2.6);expect(callbacks.size).toBe(1);
 const callback=[...callbacks.values()][0];callbacks.clear();callback(16);expect(paint).toHaveBeenLastCalledWith(2.6);
 motion.settle(3,0);expect(motion.grab()).toBe(2.6);expect(callbacks.size).toBe(0);
 motion.settle(4,0,true);expect(paint).toHaveBeenLastCalledWith(4);expect(callbacks.size).toBe(0);
});

test('Losing implicit capture on a child does not cancel the shared drag',()=>{
 const previous=window.PointerEvent;window.PointerEvent=MouseEvent;
 const {container,unmount}=render(<ProductArcCarousel products={products}/>);
 const stage=container.querySelector('.jsf-product-arc-stage');
 const product=container.querySelector('[data-active="true"]');
 fireEvent.pointerDown(product,{button:0,clientX:500,clientY:100});
 fireEvent.pointerMove(product,{clientX:450,clientY:100});
 fireEvent.lostPointerCapture(product);
 expect(stage).toHaveAttribute('data-dragging','true');
 fireEvent.pointerUp(stage,{clientX:450,clientY:100});
 expect(stage).toHaveAttribute('data-dragging','false');
 unmount();window.PointerEvent=previous;
});

test('Mobile scroll position controls selection without a second track animation',()=>{
 jest.useFakeTimers();const previousWidth=window.innerWidth;window.innerWidth=390;
 const {container,unmount}=render(<ProductArcCarousel products={products}/>);
 const stage=container.querySelector('.jsf-product-arc-stage');
 const track=container.querySelector('.jsf-product-arc-track');
 const scrollTo=jest.fn();stage.scrollTo=scrollTo;
 stage.scrollLeft=310*3;fireEvent.scroll(stage);act(()=>jest.advanceTimersByTime(20));
 expect(screen.getByRole('status')).toHaveTextContent('4 / 6');
 expect(track.style.transform).toBe('none');
 fireEvent.keyDown(stage,{key:'ArrowRight'});
 expect(scrollTo).toHaveBeenCalledWith({left:1240,behavior:'smooth'});
 // A height-only viewport resize must not interrupt native momentum.
 stage.scrollLeft=310*3.3;fireEvent(window,new Event('resize'));
 expect(stage.scrollLeft).toBe(310*3.3);
 unmount();window.innerWidth=previousWidth;jest.useRealTimers();
});
