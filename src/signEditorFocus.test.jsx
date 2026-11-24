import React,{useState} from 'react';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import useSignEditorSelection from './components/products/useSignEditorSelection';
import DibondFields from './components/products/DibondFields';
import {newDibondSign} from './data/dibondHelpers';
import {profileArticles} from './data/profileSigns';
afterEach(cleanup);

test('Preview focus is explicit, scoped to one sign, and is not requested by canvas selections',()=>{
 const scope={id:'one'},events=[],listener=event=>events.push(event.detail);
 function Actions(){const [,select]=useSignEditorSelection(scope);return <><button onClick={()=>select({kind:'text',index:0,panel:2})}>Canvas</button><button onClick={()=>select({kind:'text',index:0,panel:2},{focusPreview:true})}>Inspector</button></>;}
 window.addEventListener('jsf-sign-editor-selection',listener);
 try{render(<Actions/>);fireEvent.click(screen.getByText('Canvas'));fireEvent.click(screen.getByText('Inspector'));expect(events[0]).toMatchObject({scope,focusPreview:false});expect(events[1]).toMatchObject({scope,focusPreview:true,selection:{panel:2}});expect(scope).toEqual({id:'one'});}
 finally{window.removeEventListener('jsf-sign-editor-selection',listener);}
});

test('Choosing a field and returning to its text input request zoom without changing order configuration',()=>{
 global.fetch=jest.fn(async()=>({ok:true,json:async()=>({symbols:[]})}));
 const product=profileArticles()[0],original=newDibondSign(product),events=[],listener=event=>events.push(event.detail);let latest;
 function Editor(){const [sign,setSign]=useState(original);latest=sign;return <DibondFields product={product} form={{dibondSign:sign}} onChange={change=>setSign(change.dibondSign)}/>;}
 window.addEventListener('jsf-sign-editor-selection',listener);
 try{
  render(<Editor/>);fireEvent.change(screen.getByRole('combobox',{name:'Välj skyltfält'}),{target:{value:'2'}});
  expect(events.at(-1)).toMatchObject({scope:original,focusPreview:true,selection:{panel:2}});
  const input=screen.getByRole('textbox',{name:'Text – rad 1'});fireEvent.focus(input);fireEvent.blur(input);fireEvent.focus(input);
  expect(events.slice(-2).every(event=>event.focusPreview&&event.selection.panel===2)).toBe(true);
  expect(latest).toEqual(original);
 }finally{window.removeEventListener('jsf-sign-editor-selection',listener);}
});
