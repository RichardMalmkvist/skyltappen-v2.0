import React,{useState} from 'react';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import '@testing-library/jest-dom';
import {hangingTargetLayout,hangingTargetError} from './data/hangingTargetLayout';
import {saveHangingSignSymbols,resetHangingSignSymbols} from './data/hangingSignSymbols';
import {createFormCartItem,validateCurrentItem} from './data/cartHelpers';
import {getHangingBackForm,getHangingBackTextFields,hangingBackTextError} from './data/hangingSignBackText';
import {renderConfiguredField} from './data/formFieldHelpers';
import BadgePreview from './components/products/BadgePreview';
const image='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M0 0H100V100H0Z"/></svg>');
const assets=['A','B','C','D'].map(letter=>({id:'target-'+letter,name:'Målpunkt '+letter,kind:'target',image,active:true}));
const product={id:'0305',articleNumber:'0305',name:'Pendlad skylt',categoryId:'pendlade-vit',productType:'pendlad_skylt',previewType:'hanging_sign',hangingSignTextMode:'double',hangingSignSizeMm:1500,hangingSignHeightMm:260,hangingSignRules:{widthMm:1500,heightMm:260,textStartMm:190},fields:{customTextLine1:true,customTextLine2:true,hangingSignSymbols:true,quantity:true}};
beforeEach(()=>saveHangingSignSymbols(assets));afterEach(()=>{cleanup();resetHangingSignSymbols();});

test('Left-aligned targets start at the text origin, with two independent rows and fixed physical size',()=>{
 const layout=hangingTargetLayout(product,{hangingTargetPosition:'left',hangingTargetRows:2,hangingTargetRowAssignments:{'target-B':2}},assets.slice(0,2));
 expect(layout.items[0]).toMatchObject({x:190,y:11.5,width:117,height:117,row:1});expect(layout.items[1]).toMatchObject({x:190,y:133.5,width:117,height:117,row:2});
 const singleTarget=hangingTargetLayout(product,{},assets.slice(0,1));expect(singleTarget.items[0]).toMatchObject({x:1193,y:11.5});
});

test('Customer selects placement, hides text and assigns individual targets to rows; saved order keeps all choices',()=>{
 let latest;
 const Field=({label,htmlFor,children})=><label htmlFor={htmlFor}>{label}{children}</label>;
 function Editor(){const [form,setForm]=useState({quantity:1,customTextLine1:'Gammal text',customTextLine2:'Gammal rad två',hangingUseTargets:true,hangingSignSymbols:[]});latest=form;const context={Field,selectedBadge:product,productForm:form,updateFormValue:(key,value)=>setForm(old=>({...old,[key]:value})),inputStyle:{}};return <>{['customTextLine1','customTextLine2','hangingSignSymbols'].map(key=>renderConfiguredField(key,context))}<BadgePreview product={product} productType="pendlad_skylt" productForm={form}/></>;}
 render(<Editor/>);
 fireEvent.change(screen.getByRole('combobox',{name:'Målpunkternas placering'}),{target:{value:'left'}});fireEvent.click(screen.getByRole('switch',{name:'Utan text på skylten'}));
 expect(screen.queryByRole('textbox')).toBeNull();expect(screen.queryByText('Gammal text')).toBeNull();expect(screen.queryByText('Rad 1',{selector:'div'})).toBeNull();
 fireEvent.change(screen.getByRole('combobox',{name:'Antal rader för målpunkter'}),{target:{value:'2'}});
 fireEvent.click(screen.getByRole('button',{name:'Målpunkt A'}));fireEvent.click(screen.getByRole('button',{name:'Rad 2'}));fireEvent.click(screen.getByRole('button',{name:'Målpunkt B'}));
 expect(screen.getByRole('img',{name:'Målpunkt A'})).toHaveAttribute('data-target-row','1');expect(screen.getByRole('img',{name:'Målpunkt B'})).toHaveAttribute('data-target-row','2');
 expect(validateCurrentItem(product,'skylt',latest)).toBeNull();
 const item=createFormCartItem(product,'skylt',latest);expect(item).toMatchObject({hangingSignWithoutText:true,hangingTargetPosition:'left',hangingTargetRows:2,hangingTargetRowAssignments:{'target-A':1,'target-B':2},customText:'',customTextLine1:'',customTextLine2:''});expect(item.hangingSignSymbolAssets).toHaveLength(2);
 fireEvent.click(screen.getByRole('button',{name:'Målpunkt A'}));expect(screen.getByRole('img',{name:'Målpunkt A'})).toHaveAttribute('data-target-row','2');
});

test('Blank signs need an actual target, and overflowing rows are rejected',()=>{
 expect(hangingTargetError(product,{hangingSignWithoutText:true,hangingSignSymbols:[]},assets)).toMatch(/Välj minst/);
 const tooMany=Array.from({length:12},(_,i)=>({...assets[0],id:'target-'+i}));expect(()=>hangingTargetLayout(product,{},tooMany)).toThrow(/högst 9|bredd/);
 expect(()=>hangingTargetLayout(product,{hangingTargetRows:2,hangingTargetRowAssignments:Object.fromEntries(tooMany.map((a,i)=>[a.id,i<6?1:2]))},tooMany)).not.toThrow();
});

test('Independent back faces retain target position, rows and no-text selection',()=>{
 const form={hangingSignDifferentBackText:true,backHangingSignWithoutText:true,backTextLine1:'Dold text',backHangingTargetPosition:'left',backHangingTargetRows:2,backHangingTargetRowAssignments:{'target-A':2},backHangingSignSymbols:['target-A'],hangingSignSymbolAssets:assets};
 expect(getHangingBackForm(form)).toMatchObject({hangingTargetPosition:'left',hangingTargetRows:2,hangingSignWithoutText:true,hangingTargetRowAssignments:{'target-A':2}});
 expect(hangingBackTextError({...product,hangingSignSides:2},form)).toBeNull();expect(getHangingBackTextFields({...product,hangingSignSides:2},form).backTextLine1).toBe('');
});

test.each([1,2])('More than six targets fit on a 1000 mm sign with %i faces and survive cart/preview',sides=>{const many=Array.from({length:9},(_,i)=>({...assets[0],id:'target-'+i,name:'Målpunkt '+i}));saveHangingSignSymbols(many);const p={...product,id:'030'+(sides===1?'3':'4'),articleNumber:sides===1?'0303':'0304',hangingSignSides:sides,hangingSignTextMode:'single',hangingSignSizeMm:1000,hangingSignHeightMm:93,hangingSignRules:{widthMm:1000,heightMm:93,textStartMm:130}};const form={quantity:1,hangingSignWithoutText:true,hangingTargetPosition:'left',hangingSignSymbols:many.map(s=>s.id),hangingSignSymbolAssets:many,hangingUseTargets:true,hangingSignDifferentBackText:sides===2,backHangingSignWithoutText:true,backHangingTargetPosition:'left',backHangingSignSymbols:many.map(s=>s.id)};expect(validateCurrentItem(p,'skylt',form)).toBeNull();const item=createFormCartItem(p,'skylt',form);expect(item.hangingSignSymbols).toHaveLength(9);expect(hangingTargetLayout(p,form,many).items).toHaveLength(9);if(sides===2){expect(hangingBackTextError(p,form)).toBeNull();expect(item.backHangingSignSymbols).toHaveLength(9);}const {container}=render(<BadgePreview product={p} productType="pendlad_skylt" productForm={form}/>);expect(container.textContent).not.toMatch(/För många|får inte plats/);expect(container.querySelectorAll('img[data-target-row]')).toHaveLength(9*sides);});

test.each([1000,1500])('Target capacity follows each row on a %i mm sign',width=>{const limit=width===1000?10:9,p={...product,hangingSignSizeMm:width,hangingSignHeightMm:260,hangingSignRules:{widthMm:width,heightMm:260},hangingSignTextMode:'double'};const targets=Array.from({length:2*limit},(_,i)=>({...assets[0],id:'target-'+i}));for(const position of ['left','right']){const form={hangingTargetPosition:position,hangingTargetRows:2,hangingTargetRowAssignments:Object.fromEntries(targets.map((s,i)=>[s.id,i<limit?1:2]))};expect(hangingTargetLayout(p,form,targets).items).toHaveLength(limit*2);expect(()=>hangingTargetLayout(p,{...form,hangingTargetRowAssignments:{...form.hangingTargetRowAssignments,[targets[limit].id]:1}},targets)).toThrow('högst '+limit+' målpunkter');expect(hangingTargetLayout(p,{...form,hangingTargetRows:1},targets.slice(0,limit)).items).toHaveLength(limit);expect(()=>hangingTargetLayout(p,{...form,hangingTargetRows:1},targets.slice(0,limit+1))).toThrow('högst '+limit+' målpunkter');}});
