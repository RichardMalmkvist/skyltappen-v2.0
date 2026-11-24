import React from 'react';import {render,screen,fireEvent,act} from '@testing-library/react';import '@testing-library/jest-dom';
import WhiteboardDrawing from './components/products/WhiteboardDrawing';import BadgePreview from './components/products/BadgePreview';import {getWhiteboardDemoArea} from './data/whiteboardDemo';
const area={x:.03,y:.45,width:.94,height:.39};let ctx,spy;
beforeEach(()=>{ctx=Object.fromEntries(['clearRect','beginPath','arc','fill','moveTo','quadraticCurveTo','lineTo','stroke'].map(name=>[name,jest.fn()]));spy=jest.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(ctx);});
afterEach(()=>spy.mockRestore());
test('Freehand drawing follows the pointer, uses black ink, survives resizing and can be erased',()=>{
 jest.useFakeTimers();const previous=window.PointerEvent;window.PointerEvent=MouseEvent;
 const {unmount}=render(<WhiteboardDrawing area={area}/>);const canvas=screen.getByRole('img',{name:'Whiteboardyta att rita på'});
 expect(canvas.parentElement).toHaveAttribute('data-has-ink','false');
 canvas.getBoundingClientRect=()=>({left:100,top:100,width:400,height:200});fireEvent(window,new Event('resize'));
 fireEvent.pointerDown(canvas,{button:0,clientX:150,clientY:125});fireEvent.pointerMove(canvas,{clientX:200,clientY:150});fireEvent.pointerUp(canvas,{clientX:250,clientY:175});act(()=>jest.advanceTimersByTime(20));
 expect(ctx.strokeStyle).toBe('#161616');expect(ctx.lineWidth).toBeCloseTo(2.4);expect(canvas.parentElement).toHaveAttribute('data-has-ink','true');expect(ctx.lineCap).toBe('round');expect(ctx.moveTo).toHaveBeenCalledWith(50,25);expect(ctx.stroke).toHaveBeenCalled();expect(screen.getByRole('button',{name:'Sudda'})).toBeInTheDocument();
 canvas.getBoundingClientRect=()=>({left:100,top:100,width:800,height:400});fireEvent(window,new Event('resize'));expect(ctx.moveTo).toHaveBeenLastCalledWith(100,50);
 ctx.stroke.mockClear();fireEvent.click(screen.getByRole('button',{name:'Sudda'}));act(()=>jest.advanceTimersByTime(20));expect(ctx.stroke).not.toHaveBeenCalled();expect(screen.queryByRole('button',{name:'Sudda'})).toBeNull();expect(canvas.parentElement).toHaveAttribute('data-has-ink','false');
 unmount();window.PointerEvent=previous;jest.useRealTimers();
});
test('Whiteboard drawing is opt-in for the product page and absent from standard and mini previews',()=>{
 const product={id:'demo-wb',articleNumber:'0603',previewType:'door_sign',productType:'dorrskylt',doorSignTextEnabled:true,doorSignTextConfig:{layoutMode:'whiteboard'}};
 const {rerender}=render(<BadgePreview product={product} productType="dorrskylt" productForm={{}}/>);expect(screen.queryByRole('img',{name:'Whiteboardyta att rita på'})).toBeNull();
 rerender(<BadgePreview product={product} productType="dorrskylt" productForm={{}} interactiveWhiteboard/>);expect(screen.getByRole('img',{name:'Whiteboardyta att rita på'})).toBeInTheDocument();
 rerender(<BadgePreview product={product} productType="dorrskylt" productForm={{}} interactiveWhiteboard mini/>);expect(screen.queryByRole('img',{name:'Whiteboardyta att rita på'})).toBeNull();
});
test('Drawing areas follow actual whiteboard photos and exclude the paper/status article 0608',()=>{
 for(const articleNumber of ['0603','0604','0607']){const a=getWhiteboardDemoArea({articleNumber,doorSignPreviewImage:'/photo.png'});expect(a.y).toBeGreaterThan(.4);expect(a.y+a.height).toBeLessThan(1);expect(a.x+a.width).toBeLessThan(1);}
 const fitted=getWhiteboardDemoArea({articleNumber:'0604',doorSignPreviewImage:'/photo.png'},187.5);expect(fitted.x).toBeCloseTo(.1005,3);expect(fitted.width).toBeCloseTo(.799,2);
 expect(getWhiteboardDemoArea({articleNumber:'0608',doorSignTextConfig:{layoutMode:'whiteboard_personal'}})).toBeNull();expect(getWhiteboardDemoArea({articleNumber:'0609'})).toBeNull();
 expect(getWhiteboardDemoArea({doorSignTextConfig:{layoutMode:'occupancy_whiteboard_personal'}},281.25).y).toBeCloseTo(186.5/281.25);
});
