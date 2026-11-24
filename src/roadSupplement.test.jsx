import React,{useState} from 'react';
import {render,screen,fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import {withRoadSignModel} from './data/roadSignModels';
import {withRoadSupplement,installRoadSupplementSizes,installYellowRoadSupplement,installRoadSupplement} from './data/roadSupplement';
import {newDibondSign,validateDibondSign} from './data/dibondHelpers';
import {createCartItem} from './data/cartHelpers';
import {roadAssemblyLayout} from './data/roadSignAssembly';
import {hangingProductSnapshot} from './data/hangingStack';
import DibondFields from './components/products/DibondFields';
import DibondPreview from './components/products/DibondPreview';
import RoadSignArticleFields from './components/products/RoadSignArticleFields';
import {roadSignModel} from './data/roadSignModels';
const product=withRoadSupplement(withRoadSignModel({id:'dynamic',name:'Dynamisk tilläggstavla',unitPrice:0},'400x200'));
test('a separate 300 mm article opens at its fixed size without a height picker',()=>{
 const catalog=installRoadSupplementSizes(installYellowRoadSupplement(installRoadSupplement({articles:[{...product,id:'article-1794949481677'}]}))),article=catalog.articles.find(a=>a.roadSupplementVariant==='yellow'&&a.roadSignHeightMm===300),sign=newDibondSign(article);
 render(<DibondFields product={article} form={{dibondSign:sign}} onChange={jest.fn()}/>);
 fireEvent.click(screen.getByRole('tab',{name:'Mått & utförande'}));
 expect(sign.heightMm).toBe(300);expect(screen.getByText('400 × 300 mm')).toBeInTheDocument();expect(screen.queryByLabelText('Höjd (mm)')).not.toBeInTheDocument();
});
test('custom article dimensions, two-support CAD and Corel original survive view edits and checkout',()=>{
 let saved;function Admin(){const [article,setArticle]=useState({...product,roadSupplementVariant:'yellow'});saved=article;return <RoadSignArticleFields article={article} onChange={setArticle}/>;}
 const view=render(<Admin/>);fireEvent.click(screen.getByLabelText('Egna artikelmått'));
 fireEvent.change(screen.getByLabelText('Bredd (mm)'),{target:{value:'500'}});fireEvent.change(screen.getByLabelText('Höjd (mm)'),{target:{value:'800'}});
 expect(saved.format).toBe('500 × 800 mm');expect(roadSignModel(saved).file).toBe('road-sign-400x400.glb');
 expect(hangingProductSnapshot(saved).roadSignHeightMm).toBe('800');
 const artwork={id:'11111111-1111-4111-8111-111111111111',mime:'application/pdf',name:'Eget original.pdf',preview:'/api/sign-artworks/11111111-1111-4111-8111-111111111111/preview',widthMm:500,heightMm:800};
 saved=withRoadSupplement({...saved,defaultSignArtwork:artwork});const sign=newDibondSign(saved);
 expect(sign.uploadedArtwork).toEqual(artwork);expect(validateDibondSign(saved,sign)).toBeNull();
 const item=createCartItem(saved,'dibondskylt',{dibondSign:sign,quantity:1});expect(item.dibondSign.uploadedArtwork.id).toBe(artwork.id);expect(item.dibondSign.heightMm).toBe(800);
 view.unmount();render(<DibondFields product={saved} form={{dibondSign:sign}} onChange={jest.fn()}/>);
 expect(screen.getByText('Eget original.pdf')).toBeInTheDocument();expect(screen.getByRole('button',{name:'Byt fil'})).toBeInTheDocument();
});
test.each(['blue','yellow'])('dynamic supplement retains its Tratex variant and keyline at all heights in checkout and assemblies (%s)',variant=>{
 const selectedProduct={...product,roadSupplementVariant:variant},textColor=variant==='yellow'?'#000000':'#ffffff',borderColor=variant==='yellow'?'#CE252B':'#ffffff';
 let latest;function Editor(){const [form,setForm]=useState({dibondSign:newDibondSign(selectedProduct)});latest=form;return <><DibondPreview product={selectedProduct} sign={form.dibondSign}/><DibondFields product={selectedProduct} form={form} onChange={changes=>setForm(old=>({...old,...changes}))}/></>;}
 const view=render(<Editor/>);fireEvent.change(screen.getByRole('textbox'),{target:{value:'Besökande\n4 tim'}});
 fireEvent.click(screen.getByRole('tab',{name:'Mått & utförande'}));
 for(const height of [300,350,200]){
  fireEvent.change(screen.getByLabelText('Höjd (mm)'),{target:{value:String(height)}});
  // SVG geometry must be checked directly; it has no interactive accessible role.
  // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
  const surface=view.container.querySelector('[data-road-supplement-surface]');expect(surface.firstChild).toHaveAttribute('height',String(height));expect(surface.lastChild).toHaveAttribute('height',String(height-15));expect(surface.lastChild).toHaveAttribute('x','7.5');expect(surface.lastChild).toHaveAttribute('y','7.5');expect(surface.lastChild).toHaveAttribute('stroke-width','15');expect(surface.lastChild).toHaveAttribute('stroke',borderColor);expect(view.container.querySelector('[data-dibond-line]')).toHaveAttribute('fill',textColor);
  expect(validateDibondSign(product,latest.dibondSign)).toBeNull();const item=createCartItem(product,'dibondskylt',{...latest,quantity:2});expect(item.dibondSign.heightMm).toBe(height);expect(item.dibondSign.roadSupplement).toBe(true);
  expect(item.dibondSign.roadSupplementVariant).toBe(variant);
  expect(roadAssemblyLayout([{product,form:latest}]).height).toBe(height);
 }
 expect(hangingProductSnapshot(product).roadSignEditableText).toBe(true);expect(screen.getByLabelText('Ladda upp eget original')).toBeInTheDocument();expect(screen.queryByLabelText('Svart ram (4 mm)')).not.toBeInTheDocument();
 expect(validateDibondSign(product,{...latest.dibondSign,heightMm:250})).toContain('200, 300 eller 350');
});
