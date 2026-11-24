import {projectProofGroups} from './data/projectProof';
import {indoorGroup} from './data/indoorGroups';
import React,{useState} from 'react';
import {render,screen,fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import {customDecalArticles,installCustomDecalArticles,decalArticleNumber} from './data/customDecalArticles';
import {newDibondSign,validateDibondSign,dibondConfigError} from './data/dibondHelpers';
import DibondFields from './components/products/DibondFields';
import DibondPreview from './components/products/DibondPreview';
import {createCartItem} from './data/cartHelpers';
beforeAll(()=>jest.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null));afterAll(()=>jest.restoreAllMocks());
test('All five decals have the agreed standard sizes and prices and use the shared editor',()=>{
 const products=customDecalArticles();expect(products.map(p=>[p.articleNumber,p.dibondConfig.defaultWidthMm,p.dibondConfig.defaultHeightMm,p.unitPrice])).toEqual([['0730',210,148.5,260],['0731',297,210,345],['0732',420,297,430],['0733',594,420,605],['0734',840,594,1005]]);
 for(const p of products){const sign=newDibondSign(p);sign.lines[0].text='Text';expect(p.productType).toBe('dekal');expect(p.isImplemented).toBe(true);expect(dibondConfigError(p)).toBeNull();expect(validateDibondSign(p,sign)).toBeNull();expect(validateDibondSign(p,{...sign,widthMm:sign.widthMm-1})).toBeNull();expect(validateDibondSign(p,{...sign,widthMm:sign.widthMm+1})).toBeNull();}
});
test('Installation opens the decal category once without replacing articles or subsequent edits',()=>{
 const saved={id:'saved',articleNumber:'0731',unitPrice:350};const c=installCustomDecalArticles({categories:[{id:'old-decals',title:'Dekaler',status:'closed'}],articles:[saved,{id:'other'}]});
 expect(c.categories.find(category=>category.id==='inomhusskyltar')).toMatchObject({status:'open'});expect(c.articles).toHaveLength(6);expect(c.articles[0]).toMatchObject({...saved,categoryId:'inomhusskyltar'});expect(c.articles.at(-1).categoryId).toBe('inomhusskyltar');expect(installCustomDecalArticles(c)).toBe(c);
});
test.each(['dekal','dibondskylt'])('Frame can be switched off and back on for %s; cart and preview agree',type=>{
 const product={...customDecalArticles()[0],productType:type};let form;
 function Editor(){const [state,setState]=useState({dibondSign:newDibondSign(product)});form=state;return <><DibondFields product={product} form={state} onChange={next=>setState(old=>({...old,...next}))}/><DibondPreview product={product} sign={state.dibondSign}/></>;}
 const {container}=render(<Editor/>);fireEvent.click(screen.getByRole('tab',{name:'Mått & utförande'}));const toggle=screen.getByRole('switch',{name:'Svart ram (4 mm)'});expect(toggle).toBeChecked();expect(container.querySelector('[data-dibond-frame]')).not.toBeNull();
 const before=form.dibondSign.lines;fireEvent.click(toggle);expect(container.querySelector('[data-dibond-frame]')).toBeNull();expect(container.querySelector('[data-dibond-surface]')).not.toBeNull();expect(form.dibondSign.lines).toMatchObject(before);
 const cart=createCartItem(product,type,{...form,quantity:2});expect(cart.dibondSign.frameEnabled).toBe(false);expect(cart.frameMm).toBe(0);expect(cart.productType).toBe(type);
 fireEvent.click(toggle);expect(container.querySelector('[data-dibond-frame]')).not.toBeNull();expect(form.dibondSign.frameEnabled).toBe(true);
});

test('Previously installed decals move under indoor decals without losing edits; the empty root category is removed',()=>{
 const article={...customDecalArticles('dekaler')[0],name:'Own name',unitPrice:270};
 const c=installCustomDecalArticles({productUpdates:['custom-decals-0730-0734-v1'],categories:[{id:'dekaler',title:'Dekaler'},{id:'inomhusskyltar',title:'Inomhusskyltar'}],articles:[article,{id:'other',categoryId:'inomhusskyltar'}]});
 expect(c.articles[0]).toMatchObject({name:'Own name',unitPrice:270,categoryId:'inomhusskyltar',indoorGroup:'decals'});expect(c.categories.some(category=>category.id==='dekaler')).toBe(false);
 expect(indoorGroup(c.articles[0])).toBe('decals');expect(indoorGroup({previewType:'dibond_sign',name:'Dibond'})).toBe('dibond');expect(installCustomDecalArticles(c)).toBe(c);
});

test('All five configurable decals use spec only for nonstandard dimensions, without changing the catalog identity',()=>{
 for(const product of customDecalArticles()){
  const sign=newDibondSign(product);sign.lines[0].text='Text';const changed={...sign,widthMm:sign.widthMm+1};
  expect(decalArticleNumber(product,{dibondSign:sign})).toBe(product.articleNumber);
  expect(decalArticleNumber(product,{dibondSign:changed})).toBe(product.articleNumber+' spec');
  const item=createCartItem(product,'dekal',{dibondSign:changed,quantity:1});expect(item.articleNumber).toBe(product.articleNumber+' spec');expect(item.badgeId).toBe(product.id);expect(item.unitPrice).toBe(product.unitPrice);
  expect(decalArticleNumber(item,{dibondSign:sign})).toBe(product.articleNumber);
  const groups=projectProofGroups({signs:[{id:'s',articleId:product.id,quantity:1,configuration:{dibondSign:changed}}]},[product]);expect(groups[0].articleNumber).toBe(product.articleNumber+' spec');
 }
});
test('Decal dimension inputs are editable and existing catalog settings migrate only once',()=>{
 const product=customDecalArticles()[0];const {unmount}=render(<DibondFields product={product} form={{dibondSign:newDibondSign(product)}} onChange={()=>{}}/>);
 expect(screen.getByLabelText('Bredd (mm)')).not.toBeDisabled();expect(screen.getByLabelText('H\u00f6jd (mm)')).not.toBeDisabled();unmount();
 const previous={...product,dibondConfig:{...product.dibondConfig,fixedDimensions:true,minWidthMm:210,maxWidthMm:210}};
 const result=installCustomDecalArticles({productUpdates:['custom-decals-under-indoor-v1'],categories:[],articles:[previous]});expect(result.articles[0].dibondConfig).toMatchObject({fixedDimensions:false,minWidthMm:30,maxWidthMm:3000});expect(installCustomDecalArticles(result)).toBe(result);
});

test('Frameless decals and signs keep a thin gray preview outline like the name badges',()=>{
 const product=customDecalArticles()[0];const {container}=render(<DibondPreview product={product} sign={{...newDibondSign(product),frameEnabled:false}}/>);
 const edge=container.querySelector('[data-dibond-surface]');expect(edge).toHaveAttribute('stroke','#555');expect(edge).toHaveAttribute('stroke-width','0.65');expect(edge).toHaveAttribute('vector-effect','non-scaling-stroke');expect(container.querySelector('[data-dibond-frame]')).toBeNull();
});
