import React,{useState} from 'react';
import {render,screen,fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import DibondArticleFields from './components/products/DibondArticleFields';
import DibondFields from './components/products/DibondFields';
import DibondPreview from './components/products/DibondPreview';
import {getDibondConfig,newDibondSign,dibondCornerRadius,dibondConfigError} from './data/dibondHelpers';
import {createCartItem} from './data/cartHelpers';
const product={id:'0705',previewType:'dibond_sign',productType:'dibondskylt',dibondConfig:{maxWidthMm:600,maxHeightMm:600,defaultWidthMm:300,defaultHeightMm:300,defaultTextSizeMm:15}};
beforeAll(()=>jest.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null));
afterAll(()=>jest.restoreAllMocks());
test('Admin can change and retain the default radius while changing another setting',()=>{
 let saved;
 function Editor(){const [article,setArticle]=useState(product);saved=article;return <DibondArticleFields article={article} onChange={setArticle}/>;}
 render(<Editor/>);const field=screen.getByLabelText('F\u00f6rvald h\u00f6rnradie (mm)');expect(field).toHaveValue(25);
 fireEvent.change(field,{target:{value:'10'}});fireEvent.change(screen.getByLabelText('Maxbredd (mm)'),{target:{value:'900'}});
 expect(saved.dibondConfig.defaultCornerRadiusMm).toBe(10);expect(newDibondSign(saved).cornerRadiusMm).toBe(10);
});
test('New signs, preview, proportional editing and cart use the selected article default',()=>{
 const article={...product,dibondConfig:{...product.dibondConfig,defaultCornerRadiusMm:10}};
 function Editor(){const [form,setForm]=useState({dibondSign:newDibondSign(article)});return <><DibondFields product={article} form={form} onChange={next=>setForm(old=>({...old,...next}))}/><DibondPreview product={article} sign={form.dibondSign}/></>;}
 const {container}=render(<Editor/>);const field=screen.getByLabelText('H\u00f6rnradie (mm)');expect(field).toHaveValue(10);expect(container.querySelector('[data-dibond-frame]')).toHaveAttribute('rx','10');
 fireEvent.change(field,{target:{value:'7'}});fireEvent.change(screen.getByLabelText('Bredd (mm)'),{target:{value:'600'}});fireEvent.change(screen.getByLabelText('H\u00f6jd (mm)'),{target:{value:'600'}});expect(field).toHaveValue(14);expect(screen.queryByRole('button',{name:'Automatisk radie'})).toBeNull();
 const sign=newDibondSign(article);expect(dibondCornerRadius(article,{...sign,widthMm:150,heightMm:150})).toBe(5);
 const cart=createCartItem(article,'dibondskylt',{dibondSign:sign,quantity:1});expect(cart.dibondSign.cornerRadiusMm).toBe(10);expect(cart.dibondConfig.defaultCornerRadiusMm).toBe(10);
});
test('Zero radius is supported, missing defaults use 25, and invalid article values are rejected',()=>{
 expect(getDibondConfig(product).defaultCornerRadiusMm).toBe(25);
 const withRadius=value=>({...product,dibondConfig:{...product.dibondConfig,defaultCornerRadiusMm:value}});
 expect(newDibondSign(withRadius(0)).cornerRadiusMm).toBe(0);expect(dibondConfigError(withRadius(0))).toBeNull();
 for(const value of ['',-1,'invalid',151])expect(dibondConfigError(withRadius(value))).toBeTruthy();
});
