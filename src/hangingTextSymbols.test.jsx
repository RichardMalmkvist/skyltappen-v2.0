import {useState} from 'react';
import {render,screen,fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import {hangingTextAccessoryDefinitions} from './data/hangingTextAccessories';
import {saveHangingSignSymbols,resetHangingSignSymbols} from './data/hangingSignSymbols';
import {renderConfiguredField} from './data/formFieldHelpers';
import BadgePreview from './components/products/BadgePreview';
import {createFormCartItem} from './data/cartHelpers';
const image='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M1 1H9V9H1Z"/></svg>');
const assets=[{id:'test-stairs',name:'Trappa',kind:'symbol',image,active:true},{id:'target-a',name:'Målpunkt A',kind:'target',image,active:true}];
beforeEach(()=>saveHangingSignSymbols(assets));afterEach(resetHangingSignSymbols);
test.each(hangingTextAccessoryDefinitions())('$articleNumber supports symbols and targets in preview and order snapshot',product=>{
 const save=jest.fn();
 function Form(){const [form,setForm]=useState({customText:'Entré',quantity:2,hangingSignSymbols:[]});return <>{renderConfiguredField('hangingSignSymbols',{selectedBadge:product,productForm:form,updateFormValue:(key,value)=>setForm(current=>({...current,[key]:value}))})}<BadgePreview product={product} productType="pendlad_skylt" productForm={form}/><button onClick={()=>save(createFormCartItem(product,'skylt',form))}>Beställ</button></>;}
 const {container}=render(<Form/>);fireEvent.click(screen.getByRole('switch',{name:'Symboler'}));fireEvent.click(screen.getByRole('button',{name:'Trappa'}));fireEvent.click(screen.getByRole('switch',{name:'Målpunkter'}));fireEvent.click(screen.getByRole('button',{name:'Målpunkt A'}));
 expect(screen.getByRole('img',{name:'Trappa'})).toBeInTheDocument();expect(screen.getByRole('img',{name:'Målpunkt A'})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Beställ'}));const item=save.mock.calls[0][0];expect(item.hangingSignSymbols).toEqual(['test-stairs','target-a']);expect(item.hangingSignSymbolAssets).toEqual(assets.map(({active,...asset})=>asset));expect(item.quantity).toBe(2);expect(item.extraFields.some(field=>field.value.includes('Trappa')&&field.value.includes('Målpunkt A'))).toBe(true);
 expect(container.querySelector('[style*="border-left"]')).not.toBeInTheDocument();
});
