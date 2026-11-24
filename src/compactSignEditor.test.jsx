import React,{useState} from 'react';
import {render,screen,fireEvent,within,cleanup} from '@testing-library/react';
import '@testing-library/jest-dom';
import DibondFields from './components/products/DibondFields';
import DibondPreview from './components/products/DibondPreview';
import {FIELD_RENDERERS} from './data/formFieldHelpers';
import {newDibondSign} from './data/dibondHelpers';
import {directionArticles} from './data/directionSigns';
import {createCartItem} from './data/cartHelpers';
jest.mock('./data/dibondSymbols',()=>({fetchDibondSymbols:()=>new Promise(()=>{}),getDibondSymbols:()=>[{id:'region',name:'Regionlogga',image:'/region.svg',aspectRatio:3}],dibondSymbolPreviewUrl:url=>url}));
const product={id:'test',articleNumber:'0731',name:'Dekal',previewType:'dibond_sign',productType:'dekal',dibondConfig:{maxWidthMm:1000,maxHeightMm:1000}};
const original={widthMm:600,heightMm:400,cornerRadiusMm:25,frameEnabled:true,separatorEnabled:true,separatorOffsetYMm:0,lines:[{text:'Entré',sizeMm:30,bold:true,firstLineBottomMm:80},{text:'Välkommen',sizeMm:20,firstLineBottomMm:220}],symbols:[]};let latest;
function Editor({storefront=false,p=product,initial=original}){const [form,setForm]=useState({dibondSign:initial,quantity:2});latest=form;return <><DibondPreview sign={form.dibondSign} product={p} onChange={sign=>setForm(old=>({...old,dibondSign:sign}))}/>{storefront?FIELD_RENDERERS.dibond({selectedBadge:p,productForm:form,setProductForm:setForm}):<DibondFields product={p} form={form} onChange={change=>setForm(old=>({...old,...change}))}/>}</>;}
beforeEach(()=>jest.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({font:'',measureText(text){const size=Number(this.font.match(/([\d.]+)px/)?.[1]||1000);return {width:text.length*size*.55,actualBoundingBoxAscent:size*.716,actualBoundingBoxDescent:0};}}));
afterEach(cleanup);afterAll(()=>jest.restoreAllMocks());
test.each([false,true])('One selected object and closed fine controls in project/storefront: %s',storefront=>{
 const {container}=render(<Editor storefront={storefront}/>);expect(screen.getAllByRole('textbox')).toHaveLength(1);expect(screen.getByRole('textbox')).toHaveValue('Entré');
 expect(screen.getByRole('tab',{name:'Innehåll'})).toHaveAttribute('aria-selected','true');expect(container.querySelector('.jsf-editor-settings')).toHaveAttribute('hidden');expect(container.querySelector('.jsf-sign-fine')).not.toHaveAttribute('open');
 fireEvent.change(screen.getByRole('combobox',{name:'Välj objekt att redigera'}),{target:{value:'text:1'}});expect(screen.getByRole('textbox')).toHaveValue('Välkommen');
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'Ny text'}});expect(latest.dibondSign.lines[1].text).toBe('Ny text');expect(latest.dibondSign.lines[0].text).toBe('Entré');
 fireEvent.click(screen.getByText('Finjustera',{selector:'summary'}));
 fireEvent.change(screen.getByLabelText('Textblock 2 utgångspunkt i sidled'),{target:{value:'center'}});
 fireEvent.change(screen.getByLabelText('Textblock 2 avstånd i sidled (mm)'),{target:{value:'12.5'}});expect(latest.dibondSign.lines[1].offsetXMm).toBeCloseTo(12.5);
 expect(createCartItem(product,'skylt',latest).dibondSign.lines[1]).toMatchObject({text:'Ny text',offsetXMm:12.5});
});
test('Choosing objects on the artwork changes the inspector without editing content',()=>{
 const {container}=render(<Editor/>);const before=JSON.stringify(latest);fireEvent.focus(screen.getByRole('button',{name:'Flytta textblock 2'}));expect(screen.getByRole('textbox')).toHaveValue('Välkommen');expect(JSON.stringify(latest)).toBe(before);
 fireEvent.change(screen.getByRole('combobox',{name:'Välj objekt att redigera'}),{target:{value:'text:0'}});expect(screen.getByRole('button',{name:'Ändra storlek på textblock 1'})).toBeVisible();
 fireEvent.focus(screen.getByRole('button',{name:'Flytta strecket'}));expect(screen.getByRole('region',{name:'Redigera Streck 1'})).toBeVisible();expect(container.querySelector('[data-dibond-selection]')).toBeInTheDocument();
});
test('Adding text and separators selects the new item and removing it leaves its neighbours untouched',()=>{
 render(<Editor/>);fireEvent.click(screen.getByText('+ Lägg till',{selector:'summary'}));fireEvent.click(screen.getByRole('button',{name:'+ Text'}));expect(screen.getByRole('textbox')).toHaveValue('');fireEvent.change(screen.getByRole('textbox'),{target:{value:'Text tre'}});expect(latest.dibondSign.lines).toHaveLength(3);
 fireEvent.click(screen.getByLabelText('Objektalternativ'));fireEvent.click(screen.getByRole('button',{name:'Ta bort textblock 3'}));expect(latest.dibondSign.lines.map(x=>x.text)).toEqual(['Entré','Välkommen']);
 fireEvent.click(screen.getByText('+ Lägg till',{selector:'summary'}));fireEvent.click(screen.getByRole('button',{name:'+ Streck'}));expect(screen.getByRole('region',{name:'Redigera Streck 2'})).toBeVisible();fireEvent.click(screen.getByText('Finjustera',{selector:'summary'}));fireEvent.change(screen.getByLabelText('Höjdplacering streck 2 (mm från mitten)'),{target:{value:'75'}});expect(latest.dibondSign.additionalSeparators[0].offsetYMm).toBe('75');
 fireEvent.click(screen.getByLabelText('Objektalternativ'));fireEvent.click(screen.getByRole('button',{name:'Ta bort streck 2'}));expect(latest.dibondSign.additionalSeparators).toEqual([]);expect(latest.dibondSign.separatorEnabled).toBe(true);
});
test('Symbols are selected, resized, duplicated and removed with independent positions',async()=>{
 render(<Editor/>);fireEvent.click(screen.getByText('+ Lägg till',{selector:'summary'}));fireEvent.click(screen.getByRole('button',{name:'+ Symbol'}));fireEvent.click(await screen.findByRole('button',{name:'Regionlogga'}));expect(latest.dibondSign.symbols).toHaveLength(1);expect(screen.queryByRole('group',{name:'Välj symboler till Dibondskylten'})).not.toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('Symbol 1 höjd (mm)'),{target:{value:'40'}});expect(Number(latest.dibondSign.symbols[0].sizeMm)).toBe(40);
 fireEvent.click(screen.getByText('Finjustera symbolen',{selector:'summary'}));fireEvent.change(screen.getByLabelText('Symbol 1 avstånd i sidled (mm)'),{target:{value:'120'}});expect(latest.dibondSign.symbols[0].xMm).toBe(120);
 fireEvent.click(screen.getByRole('button',{name:'Duplicera symbol 1'}));expect(latest.dibondSign.symbols).toHaveLength(2);fireEvent.change(screen.getByRole('combobox',{name:'Välj objekt att redigera'}),{target:{value:'symbol:1'}});fireEvent.click(screen.getByLabelText('Objektalternativ'));fireEvent.click(screen.getByRole('button',{name:'Ta bort symbol 2'}));expect(latest.dibondSign.symbols).toHaveLength(1);
});
test('A4 pocket can be removed and restored with its saved placement',()=>{
 const p={...product,articleNumber:'0701'},sign={...original,acrylicPocket:{enabled:true,xMm:100,yMm:80}};render(<Editor p={p} initial={sign}/>);
 fireEvent.change(screen.getByRole('combobox',{name:'Välj objekt att redigera'}),{target:{value:'pocket:0'}});fireEvent.click(screen.getByLabelText('Objektalternativ'));fireEvent.click(screen.getByRole('button',{name:'Ta bort akrylfickan'}));expect(latest.dibondSign.acrylicPocket.enabled).toBe(false);
 fireEvent.click(screen.getByText('+ Lägg till',{selector:'summary'}));fireEvent.click(screen.getByRole('button',{name:'+ Akrylficka A4'}));expect(latest.dibondSign.acrylicPocket).toMatchObject({enabled:true,xMm:100,yMm:80});
});
test('Direction panel artwork selects the matching field and edits only that field',()=>{
 const p=directionArticles()[0],sign=newDibondSign(p);sign.lines[0].text='Första';sign.directionPanels[0].lines[0].text='Andra';render(<Editor p={p} initial={sign}/>);
 const second=screen.getByRole('group',{name:'Skyltfält 2'});fireEvent.focus(within(second).getByRole('button',{name:'Flytta textblock 1'}));expect(screen.getByRole('textbox')).toHaveValue('Andra');fireEvent.change(screen.getByRole('textbox'),{target:{value:'Andra ändrad'}});expect(latest.dibondSign.directionPanels[0].lines[0].text).toBe('Andra ändrad');expect(latest.dibondSign.lines[0].text).toBe('Första');
});
test('Selections are isolated between separate signs on the same screen',()=>{
 render(<><div data-testid="one"><Editor initial={{...original}}/></div><div data-testid="two"><Editor initial={{...original}}/></div></>);const first=within(screen.getByTestId('one')),second=within(screen.getByTestId('two'));fireEvent.focus(first.getByRole('button',{name:'Flytta textblock 2'}));expect(first.getByRole('textbox')).toHaveValue('Välkommen');expect(second.getByRole('textbox')).toHaveValue('Entré');
});

test('Settings are separate, keyboard accessible, and switching tabs preserves artwork',()=>{
 render(<Editor/>);const before=JSON.stringify(latest);fireEvent.keyDown(screen.getByRole('tab',{name:'Innehåll'}),{key:'ArrowRight'});expect(screen.getByRole('tab',{name:'Mått & utförande'})).toHaveFocus();expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
 fireEvent.change(screen.getByRole('spinbutton',{name:'Bredd (mm)'}),{target:{value:'650'}});expect(Number(latest.dibondSign.widthMm)).toBe(650);fireEvent.click(screen.getByRole('tab',{name:'Innehåll'}));expect(screen.getByRole('textbox')).toHaveValue('Entré');expect(latest.dibondSign.lines[1].text).toBe('Välkommen');expect(before).not.toBe(JSON.stringify(latest));
});
test('Add menu closes after choosing an action, on outside pointer, and with Escape',()=>{
 render(<Editor/>);const summary=screen.getByText('+ Lägg till',{selector:'summary'}),menu=summary.parentElement;fireEvent.click(summary);expect(menu).toHaveAttribute('open');fireEvent.keyDown(document,{key:'Escape'});expect(menu).not.toHaveAttribute('open');
 fireEvent.click(summary);fireEvent.pointerDown(screen.getByRole('textbox'));expect(menu).not.toHaveAttribute('open');fireEvent.click(summary);fireEvent.click(screen.getByRole('button',{name:'+ Text'}));expect(menu).not.toHaveAttribute('open');expect(screen.getByRole('textbox')).toHaveValue('');
});
test('Many objects remain a single selector rather than a growing list of cards',()=>{
 const sign={...original,lines:Array.from({length:20},(_,i)=>({...original.lines[0],text:'Text '+i}))};render(<Editor initial={sign}/>);expect(screen.getAllByRole('textbox')).toHaveLength(1);const selector=screen.getByRole('combobox',{name:'Välj objekt att redigera'});expect(within(selector).getAllByRole('option')).toHaveLength(21);expect(screen.queryByRole('button',{name:/Textblock 20/})).not.toBeInTheDocument();fireEvent.change(selector,{target:{value:'text:19'}});expect(screen.getByRole('textbox')).toHaveValue('Text 19');
});
test('Direction fields use one selector and settings without altering neighbouring panels',()=>{
 const p=directionArticles()[0],sign=newDibondSign(p);render(<Editor p={p} initial={sign}/>);fireEvent.click(screen.getByRole('button',{name:'Lägg till skyltfält nedanför'}));expect(latest.dibondSign.directionPanels).toHaveLength(2);expect(screen.getByRole('combobox',{name:'Välj skyltfält'})).toHaveValue('2');
 fireEvent.click(screen.getByRole('tab',{name:'Mått & utförande'}));fireEvent.change(screen.getByLabelText('Mellanrum mellan skyltfälten (mm)'),{target:{value:'40'}});expect(latest.dibondSign.outdoorSign.panelGapMm).toBe('40');
 fireEvent.click(screen.getByRole('tab',{name:'Innehåll'}));fireEvent.click(screen.getByLabelText('Skyltfältets alternativ'));fireEvent.click(screen.getByRole('button',{name:'Ta bort skyltfält'}));expect(latest.dibondSign.directionPanels).toHaveLength(1);expect(latest.dibondSign.outdoorSign.panelGapMm).toBe('40');
});
