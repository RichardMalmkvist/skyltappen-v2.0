import React from 'react';
import {render} from '@testing-library/react';
import {doorPanelProduct,doorPanelForm} from './data/threePanelDoor';
import {createCartItem,validateCurrentItem} from './data/cartHelpers';
import BadgePreview from './components/products/BadgePreview';
const base={id:'door-0610',articleNumber:'0610',name:'Vårdrum',productType:'dorrskylt',previewType:'door_sign',flowType:'form',unitPrice:2270,fields:{quantity:true,doorNumber:true},doorSignTextEnabled:true,doorSignTextConfig:{layoutMode:'room_number_status',previewHeightMm:281.25,referenceVersion:1}};
const form={quantity:2,doorHeading:'VÅRDRUM 24',doorNumber:'24',doorUseNumber:true};
test('Top text stays separate from the large middle number and is saved in the cart',()=>{
 const top=doorPanelForm(form,'top',base);expect(top.doorNumber).toBe('');expect(top.doorUseNumber).toBe(false);expect(doorPanelProduct(base,'top').doorSignTextConfig.layoutMode).toBe('tactile');
 const item=createCartItem(base,'skylt',form);expect(item).toMatchObject({articleNumber:'0610',quantity:2,doorHeading:'VÅRDRUM 24',doorNumber:'24',doorUseNumber:true});expect(validateCurrentItem(base,'skylt',{...form,doorNumber:''})).toMatch(/mittdelen/);
});
test('0616 renders and saves separate upper and middle text',()=>{
 const product={...base,id:'door-0616',articleNumber:'0616',fields:{quantity:true},doorSignTextConfig:{layoutMode:'dual_whiteboard',previewHeightMm:281.25,referenceVersion:1}};
 const values={quantity:1,doorHeading:'EXPEDITION',doorExtra:'SAMTALSRUM',doorUseLine2:true,doorUseName:true,doorName:'Anna Berg',doorUseTitle:true,doorTitle:'Läkare',doorMiddleName:'Erik Lind',doorMiddleTitle:'Sjuksköterska'};
 expect(doorPanelForm(values,'top',product).doorExtra).toBe('');expect(doorPanelForm(values,'middle',product).doorHeading).toBe('SAMTALSRUM');
 const {container}=render(<BadgePreview badgeId={product.id} productType="dorrskylt" product={product} productForm={values} maxWidth={400}/>);expect(container.querySelector('[data-door-panel="top"]').textContent).toContain('EXPEDITION');expect(container.querySelector('[data-door-panel="top"]').textContent).not.toContain('SAMTALSRUM');expect(container.querySelector('[data-door-panel="middle"]').textContent).toContain('SAMTALSRUM');
 expect(container.querySelector('[data-door-panel="top"]').textContent).toContain('Anna Berg');expect(container.querySelector('[data-door-panel="top"]').textContent).not.toContain('Erik Lind');expect(container.querySelector('[data-door-panel="middle"]').textContent).toContain('Erik Lind');expect(container.querySelector('[data-door-panel="middle"]').textContent).toContain('Sjuksköterska');
 expect(createCartItem(product,'skylt',values)).toMatchObject({doorHeading:'EXPEDITION',doorExtra:'SAMTALSRUM',doorMiddleName:'Erik Lind',doorMiddleTitle:'Sjuksköterska'});
});
