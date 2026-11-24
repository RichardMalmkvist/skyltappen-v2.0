import React,{useState} from 'react';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import '@testing-library/jest-dom';
import {hasBadgeField} from './data/productHelpers';
import {renderConfiguredField} from './data/formFieldHelpers';
import {createFormCartItem} from './data/cartHelpers';
import {saveHangingSignSymbols} from './data/hangingSignSymbols';
import {setCatalogAccessToken,setCatalogSnapshot} from './data/catalogStore';
import AdminArticlesPage from './pages/admin/AdminArticlesPage';
import BadgePreview from './components/products/BadgePreview';
const green={id:'green',articleNumber:'0401',categoryId:'pendlade-gron',name:'Grön pendlad skylt',productType:'pendlad_skylt',previewType:'hanging_sign',isImplemented:true,hangingSignSizeMm:1500,hangingSignHeightMm:200,hangingSignSides:1,hangingSignRules:{widthMm:1500,heightMm:200},fields:{customText:true,quantity:true,hangingSignTargets:true}};
const target={id:'asset-a',name:'Målpunkt A',kind:'target',image:'data:image/svg+xml;base64,PHN2Zy8+',active:true},ordinary={id:'symbol-b',name:'Väntrum',kind:'symbol',image:'/symbol-vantrum.svg',active:true};
beforeEach(()=>{saveHangingSignSymbols([target,ordinary]);});afterEach(()=>{cleanup();localStorage.removeItem('jsf_hanging_sign_symbols_v1');});
test('Green signs opt into target selection while remaining off by default',()=>{
 expect(hasBadgeField(green,'hangingSignSymbols')).toBe(true);
 expect(hasBadgeField({...green,fields:{customText:true,quantity:true}},'hangingSignSymbols')).toBe(false);
 expect(hasBadgeField(green,'hangingSignSymbol')).toBe(false);
});
test('Green customer form offers only destination markers and saves their actual artwork',()=>{
 function Form(){const [form,setForm]=useState({customText:'Entré',quantity:1,hangingSignSymbols:[]});return <>{renderConfiguredField('hangingSignSymbols',{selectedBadge:green,productForm:form,updateFormValue:(key,value)=>setForm(previous=>({...previous,[key]:value}))})}<button onClick={()=>{const cart=createFormCartItem(green,green.productType,form);expect(cart.hangingSignTargetsEnabled).toBe(true);expect(cart.hangingSignSymbolAssets[0]).toMatchObject({id:target.id,kind:'target',image:target.image});}}>Beställ</button></>;}
 render(<Form/>);expect(screen.queryByRole('switch',{name:'Symboler'})).not.toBeInTheDocument();fireEvent.click(screen.getByRole('switch',{name:'Målpunkter'}));
 expect(screen.queryByRole('button',{name:'Väntrum'})).not.toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Målpunkt A'}));fireEvent.click(screen.getByRole('button',{name:'Beställ'}));
});
test('Green preview displays the saved target and ignores ordinary symbols',()=>{
 render(<BadgePreview product={green} productType="pendlad_skylt" productForm={{customText:'Entré',hangingSignSymbols:[target.id,ordinary.id],hangingSignSymbolAssets:[target,ordinary]}}/>);
 expect(screen.getByRole('img',{name:'Målpunkt A'})).toBeInTheDocument();expect(screen.queryByRole('img',{name:'Väntrum'})).not.toBeInTheDocument();
});
test('Saved green project signs keep white lettering even with an old dark foreground setting',()=>{
 render(<BadgePreview product={{...green,hangingSignForegroundColor:'#353535',hangingSignSides:2}} productType="pendlad_skylt" productForm={{customText:'Utgång',leftArrowDirection:'left'}}/>);
 const lettering=screen.getAllByText('Utgång');
 expect(lettering).toHaveLength(2);
 lettering.forEach(line=>expect(line).toHaveStyle({color:'#ffffff'}));
});
test('Admin can enable target selection and save the green article',async()=>{
 setCatalogAccessToken('test');setCatalogSnapshot({articles:[{...green,fields:{customText:true,quantity:true}}],categories:[{id:'pendlade-gron',title:'Gröna skyltar',status:'open'}]});
 global.fetch=jest.fn(async(_url,options)=>({ok:true,json:async()=>({catalog:JSON.parse(options.body)})}));
 render(<AdminArticlesPage role="admin" adminPassword="account:admin"/>);fireEvent.click(screen.getByRole('button',{name:'Redigera'}));
 fireEvent.click(screen.getByRole('checkbox',{name:'Målpunkter'}));fireEvent.click(screen.getByRole('button',{name:'Spara artikel'}));
 await waitFor(()=>expect(fetch).toHaveBeenCalled());const saved=JSON.parse(fetch.mock.calls[0][1].body).articles.find(article=>article.id==='green');
 expect(saved.fields.hangingSignTargets).toBe(true);expect(saved.fields.hangingSignSymbols).toBeUndefined();
});
