import React,{useState} from 'react';import {render,screen,fireEvent,cleanup} from '@testing-library/react';import '@testing-library/jest-dom';
import HangingStackFields from './components/products/HangingStackFields';import HangingStackPreview from './components/products/HangingStackPreview';import BadgePreview from './components/products/BadgePreview';
import {hangingStackEntries,repackHangingStack,hangingProductSnapshot} from './data/hangingStack';import {getHangingSignInitialForm} from './data/formDefaults';import {projectProofGroups,proofFormat} from './data/projectProof';
const article={id:'h1',articleNumber:'0301',name:'Pendlad skylt',previewType:'hanging_sign',productType:'pendlad_skylt',categoryId:'pendlade-vit',unitPrice:100,hangingSignSizeMm:1500,hangingSignHeightMm:140,hangingSignPreset:'hanging_1500',hangingSignRules:{widthMm:1500,heightMm:140,sideStripeMm:4},hangingSignSides:1,fields:{customText:true,arrowPlacement:true,arrowDirection:true,hangingSignSymbols:true}};
const second={...article,id:'h2',articleNumber:'0302',unitPrice:200,hangingSignSides:2};const articles=[article,second];let latest;
afterEach(cleanup);
function Editor(){const [state,setState]=useState({product:article,form:{...getHangingSignInitialForm(article),customText:'Reception'}});latest=state;return <><HangingStackPreview {...state} articles={articles} maxWidth={500}/><HangingStackFields {...state} articles={articles} setForm={fn=>setState(old=>({...old,form:typeof fn==='function'?fn(old.form):fn}))} onRootChange={(product,form)=>setState({product,form})}/></>;}
test('One position holds independently editable signs, reorders them and preserves the remaining sign after removal',()=>{
 render(<Editor/>);fireEvent.click(screen.getByRole('button',{name:'+ Lägg till skylt under'}));fireEvent.change(screen.getByRole('textbox',{name:'Text:'}),{target:{value:'Hälsorum'}});
 expect(latest.form.customText).toBe('Reception');expect(latest.form.hangingStack.items[0].configuration.customText).toBe('Hälsorum');
 expect(document.querySelectorAll('[data-hanging-stack-face="front"] [data-hanging-stack-part]')).toHaveLength(2);
 fireEvent.click(screen.getByRole('button',{name:'Flytta vald skylt upp'}));expect(latest.form.customText).toBe('Hälsorum');expect(latest.form.hangingStack.items[0].configuration.customText).toBe('Reception');
 fireEvent.change(screen.getByRole('spinbutton',{name:'Mellanrum mellan skyltarna (mm)'}),{target:{value:'25'}});expect(latest.form.hangingStack.gapMm).toBe('25');
 fireEvent.click(screen.getByRole('button',{name:'Ta bort vald skylt'}));expect(latest.form.customText).toBe('Reception');expect(latest.form.hangingStack).toBeUndefined();
});
test('Double-sided signs are shown as a front assembly and a clearly separate back assembly',()=>{
 const form={customText:'Reception',hangingStack:{gapMm:10,items:[{id:'part2',articleId:'h2',product:hangingProductSnapshot(second),configuration:{customText:'Toalett',arrowPlacement:'left',arrowDirection:'left'}}]}};
 const {container}=render(<BadgePreview product={article} productType="pendlad_skylt" productForm={form}/>);
 expect(container.querySelectorAll('[data-hanging-stack-face]')).toHaveLength(2);expect(screen.getByText('Framsida')).toBeInTheDocument();expect(screen.getByText('Baksida')).toBeInTheDocument();
 const faces=container.querySelectorAll('[data-hanging-stack-face="front"] .jsf-hanging-end-strip');expect(faces).toHaveLength(4);for(const strip of faces)expect(parseFloat(strip.style.width)).toBeGreaterThanOrEqual(2.5);
});
test('Proof keeps one grouped position, combined price and a separate article reference for every panel',()=>{
 const form={customText:'Reception',hangingStack:{gapMm:10,items:[{id:'child',articleId:'h2',product:hangingProductSnapshot(second),configuration:{customText:'Toalett'}}]}};
 const groups=projectProofGroups({drawings:[{id:'d',name:'Plan',markers:[{id:'m',articleId:'h1',position:'S040',quantity:2,page:1,x:.5,y:.5,configuration:form}]}]},articles);
 expect(groups).toHaveLength(1);expect(groups[0].locations).toHaveLength(1);expect(groups[0].articleNumber).toBe('0301 / 0302');expect(groups[0].quantity).toBe(2);expect(groups[0].product.unitPrice).toBe(300);expect(proofFormat(groups[0].product,groups[0].form)).toBe('1500 × 290 mm · 2 skyltar');
});
