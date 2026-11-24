import React from 'react';
import {render} from '@testing-library/react';
import '@testing-library/jest-dom';
import DibondPreview from './components/products/DibondPreview';
import {dibondLayout,DIBOND_TEXT_MARGIN_MM} from './data/dibondHelpers';
import {moveDibondItem,dibondItemBounds} from './data/dibondManipulation';
const sign={widthMm:100,heightMm:50,lines:[{text:'Ring',sizeMm:8,bold:true,firstLineBottomMm:25}],symbols:[]};
beforeAll(()=>jest.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null));afterAll(()=>jest.restoreAllMocks());
test('Text can move closer to the frame while remaining inside the same validated preview margin',()=>{
 expect(DIBOND_TEXT_MARGIN_MM).toBe(6);
 const moved=moveDibondItem(sign,'text',0,-1000,-1000),box=dibondItemBounds(moved,'text',0);
 expect(box.x).toBeCloseTo(6.5,1);expect(box.y).toBeCloseTo(6.5,1);expect(dibondLayout(moved).fits).toBe(true);
 const {container}=render(<DibondPreview sign={moved}/>);const clip=container.querySelector('clipPath rect');expect(clip).toHaveAttribute('x','6');expect(clip).toHaveAttribute('y','6');
 const invalid={...moved,lines:[{...moved.lines[0],offsetXMm:moved.lines[0].offsetXMm-2}]};expect(dibondLayout(invalid).fits).toBe(false);
});
