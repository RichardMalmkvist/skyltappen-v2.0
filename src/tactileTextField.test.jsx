import React,{useState} from 'react';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import '@testing-library/jest-dom';
import {renderConfiguredField} from './data/formFieldHelpers';
import {createFormCartItem} from './data/cartHelpers';
import {getDoorTextConfig,getDoorSignPreviewValues} from './data/doorProductionLayout';
import {doorBrailleText} from './data/tactileBraille';
const article={id:'tactile',articleNumber:'0601',productType:'dorrskylt',previewType:'door_sign',doorSignTextEnabled:true,doorSignTextConfig:{layoutMode:'tactile'},fields:{customText:true,quantity:true}};
const Field=({label,htmlFor,children})=><label htmlFor={htmlFor}>{label}{children}</label>;
let latest;
function Editor({initial={},selected=article}){
 const [form,setForm]=useState({quantity:1,...initial});latest=form;
 return <form onSubmit={e=>{e.preventDefault();throw new Error('Enter must not submit');}}>{renderConfiguredField('customText',{Field,selectedBadge:selected,productForm:form,updateFormValue:(key,value)=>setForm(current=>({...current,[key]:value})),inputStyle:{}})}</form>;
}
afterEach(cleanup);
test('Enter activates row two without a toggle, including an empty second row while typing',()=>{
 render(<Editor/>);const text=screen.getByRole('textbox');expect(text.tagName).toBe('TEXTAREA');
 expect(screen.queryByText(/Tryck Enter/)).toBeNull();expect(text).not.toHaveAttribute('aria-describedby');
 expect(screen.queryByRole('button',{name:/Andra textraden/})).not.toBeInTheDocument();
 fireEvent.change(text,{target:{value:'BLOD-\n'}});expect(text).toHaveValue('BLOD-\n');expect(latest.doorUseLine2).toBe(true);
 fireEvent.change(text,{target:{value:'BLOD-\nCENTRALEN'}});
 const item=createFormCartItem(article,'badge',latest);
 expect(item).toMatchObject({customText:'BLOD-',customTextLine2:'CENTRALEN',doorUseLine2:true});
 const preview=getDoorSignPreviewValues(item,getDoorTextConfig(item));
 expect(preview.textLine1).toBe('BLOD-');expect(preview.textLine2).toBe('CENTRALEN');
 expect(doorBrailleText(item,preview,{personal:false})).toBe('BLOD- CENTRALEN');
});
test('Removing newline clears old row two and disables it in the saved production settings',()=>{
 render(<Editor initial={{customText:'BLOD-',customTextLine2:'CENTRALEN',doorUseLine2:true}}/>);
 const text=screen.getByRole('textbox');expect(text).toHaveValue('BLOD-\nCENTRALEN');
 fireEvent.change(text,{target:{value:'BLODCENTRALEN'}});
 expect(latest).toMatchObject({customText:'BLODCENTRALEN',customTextLine2:'',doorUseLine2:false});
});
test('Paste is limited to two rows and respects the configured limit on each row',()=>{
 render(<Editor selected={{...article,fields:{customText:{enabled:true,maxLength:5}}}}/>);
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'123456\r\nabcdef\r\nthird'}});
 expect(latest).toMatchObject({customText:'12345',customTextLine2:'abcde',doorUseLine2:true});
});
