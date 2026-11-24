import React,{useState} from 'react';
import {render,screen,fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import DibondFields from './components/products/DibondFields';
import DibondPreview from './components/products/DibondPreview';
import {newDibondSign,dibondCornerRadius,dibondCornerRadiusError} from './data/dibondHelpers';
const product={previewType:'dibond_sign',dibondConfig:{maxWidthMm:600,maxHeightMm:400,defaultWidthMm:600,defaultHeightMm:400}};
beforeAll(()=>jest.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null));
afterAll(()=>jest.restoreAllMocks());
function Editor(){const [form,setForm]=useState({dibondSign:newDibondSign(product)});return <><DibondFields product={product} form={form} onChange={change=>setForm(old=>({...old,...change}))}/><DibondPreview product={product} sign={form.dibondSign}/></>;}
test('25 mm scales with the smaller dimension ratio and increases proportionally for larger dimensions',()=>{
 const sign=newDibondSign(product);expect(dibondCornerRadius(product,sign)).toBe(25);
 expect(dibondCornerRadius(product,{...sign,widthMm:300,heightMm:200})).toBe(12.5);
 expect(dibondCornerRadius(product,{...sign,widthMm:600,heightMm:200})).toBe(12.5);
 expect(dibondCornerRadius(product,{...sign,widthMm:1200,heightMm:800})).toBe(50);
});
test('Dimensions update the displayed radius; a manually entered radius also scales with dimensions',()=>{
 const {container}=render(<Editor/>);const radius=screen.getByLabelText('H\u00f6rnradie (mm)');
 expect(radius).toHaveValue(25);expect(container.querySelector('[data-dibond-frame]')).toHaveAttribute('rx','25');
 fireEvent.change(screen.getByLabelText('Bredd (mm)'),{target:{value:'300'}});expect(radius).toHaveValue(12.5);
 fireEvent.change(radius,{target:{value:'8'}});fireEvent.change(screen.getByLabelText('Bredd (mm)'),{target:{value:'600'}});
 expect(radius).toHaveValue(8);
 fireEvent.change(screen.getByLabelText('H\u00f6jd (mm)'),{target:{value:'200'}});expect(radius).toHaveValue(4);
 expect(screen.queryByRole('button',{name:'Automatisk radie'})).toBeNull();
});
test('Square corners work, invalid radii are rejected, and legacy outlines stay unchanged',()=>{
 const sign={widthMm:600,heightMm:400,cornerRadiusMm:0};expect(dibondCornerRadius(product,sign)).toBe(0);expect(dibondCornerRadiusError(sign)).toBeNull();
 for(const radius of ['',-1,201,'invalid'])expect(dibondCornerRadiusError({...sign,cornerRadiusMm:radius})).toBeTruthy();
 expect(dibondCornerRadius(product,{widthMm:300,heightMm:200})).toBe(12);
});
test('Folded aluminium retains square corners and has no corner radius input',()=>{
 const aluminium={...product,articleNumber:'1230'};render(<DibondFields product={aluminium} form={{dibondSign:newDibondSign(aluminium)}} onChange={()=>{}}/>);
 expect(screen.queryByLabelText('H\u00f6rnradie (mm)')).toBeNull();
});
