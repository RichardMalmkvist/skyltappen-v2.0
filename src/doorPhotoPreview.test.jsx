import React from 'react';
import {render,screen,fireEvent,act} from '@testing-library/react';
import '@testing-library/jest-dom';
import BadgePreview from './components/products/BadgePreview';
import SlidingRoomSignPreview from './components/products/SlidingRoomSignPreview';
import {getDoorPhotoProfile,photoWhiteboardArea} from './data/doorPhotoPreview';

test('The original photo keeps its frame while editable text changes; order previews retain their measured template',()=>{
 const product={articleNumber:'0608',previewType:'door_sign',productType:'dorrskylt',doorSignTextConfig:{layoutMode:'whiteboard_personal'}};
 const {container,rerender}=render(<BadgePreview product={product} productType="dorrskylt" productForm={{doorHeading:'MOTTAGNING'}} interactiveWhiteboard/>);
 expect(screen.getByLabelText('Produktfoto med anpassningsbar textyta')).toBeInTheDocument();
 expect(screen.getByText('MOTTAGNING')).toBeInTheDocument();
 expect(container.querySelector('image').getAttribute('href')).toContain('door-photo-0608-clean.svg');
 const slider=screen.getByRole('slider');fireEvent.keyDown(slider,{key:'Home'});expect(slider).toHaveAttribute('aria-valuetext','Ledigt');
 rerender(<BadgePreview product={product} productType="dorrskylt" productForm={{doorHeading:'LABORATORIET'}} interactiveWhiteboard/>);
 expect(screen.queryByText('MOTTAGNING')).toBeNull();expect(screen.getByText('LABORATORIET')).toBeInTheDocument();expect(slider).toHaveAttribute('aria-valuenow','0');
 rerender(<BadgePreview product={product} productType="dorrskylt" productForm={{doorHeading:'LABORATORIET'}}/>);
 expect(screen.queryByLabelText('Produktfoto med anpassningsbar textyta')).toBeNull();expect(screen.queryByRole('slider')).toBeNull();
});

test('Photographic whiteboard and status regions stay inside the sign, clear of the paper insert and pen tray',()=>{
 for(const articleNumber of ['0601','0602','0603','0604','0607','0608']){
  const p=getDoorPhotoProfile({articleNumber});expect(p).toBeTruthy();
  if(p.status)expect(p.status[1]).toBeGreaterThan(p.paper[1]+p.paper[3]);
  const area=photoWhiteboardArea(p);
  if(area){expect(area.x).toBeGreaterThan(0);expect(area.x+area.width).toBeLessThan(1);expect(area.y+area.height).toBeLessThan(1);expect(p.whiteboard[1]).toBeGreaterThan(p.paper[1]+p.paper[3]);}
 }
 expect(getDoorPhotoProfile({articleNumber:'9999'})).toBeNull();expect(getDoorPhotoProfile({articleNumber:'0604',doorPhotoPreviewEnabled:false})).toBeNull();
});

test('Project photo previews retain saved text without adding drawing tools or movable proof controls',()=>{
 const product={articleNumber:'0608',previewType:'door_sign',productType:'dorrskylt',doorSignTextConfig:{layoutMode:'whiteboard_personal'}};
 const {rerender}=render(<BadgePreview photographic product={product} productType="dorrskylt" productForm={{doorHeading:'LABORATORIET'}}/>);
 expect(screen.getByLabelText('Produktfoto med anpassningsbar textyta')).toBeInTheDocument();expect(screen.getByText('LABORATORIET')).toBeInTheDocument();expect(screen.queryByRole('slider')).toBeNull();expect(screen.queryByRole('img',{name:'Whiteboardyta att rita på'})).toBeNull();
 rerender(<BadgePreview photographic product={{articleNumber:'0614',previewType:'image'}} productForm={{}}/>);
 expect(screen.getByRole('group',{name:'Rumsskylt med skjutbar lucka, SMITTA'})).toBeInTheDocument();expect(screen.queryByRole('slider')).toBeNull();
});

test('Embedded hatch uses the combination sign photograph and its own visible width for dragging',()=>{
 jest.useFakeTimers();const previous=window.PointerEvent;window.PointerEvent=MouseEvent;
 const {container,unmount}=render(<SlidingRoomSignPreview windowOnly photo={{src:'/my-0607.webp',size:[708,745],window:[169,263,375,179]}}/>);
 container.querySelector('svg').getBoundingClientRect=()=>({width:400});
 expect(container.querySelector('image').getAttribute('href')).toBe('/my-0607.webp');expect(container.querySelector('.jsf-sliding-room-frame')).toBeNull();
 const slider=screen.getByRole('slider');fireEvent.pointerDown(slider,{button:0,clientX:300});fireEvent.pointerMove(slider,{clientX:200});act(()=>jest.advanceTimersByTime(20));fireEvent.pointerUp(slider,{clientX:200});
 expect(slider).toHaveAttribute('aria-valuenow','50');unmount();window.PointerEvent=previous;jest.useRealTimers();
});
