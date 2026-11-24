import {setCatalogAccessToken,setCatalogSnapshot} from "./data/catalogStore";
import AdminArticlesPage from "./pages/admin/AdminArticlesPage";
import React,{useState} from 'react';
import {renderConfiguredField} from './data/formFieldHelpers';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import '@testing-library/jest-dom';
import {parkingArticles,parkingLayout,parkingConfig,parkingError,parkingConfigError,installParkingProducts,parkingSvg,parkingPreviewSvg} from './data/parkingSign';
import {createFormCartItem} from './data/cartHelpers';
import ParkingSignPreview from './components/products/ParkingSignPreview';
import ParkingArticleFields from './components/products/ParkingArticleFields';
import {getCartItemDisplayRows} from './data/orderDisplayHelpers';
import {getFormPreviewConfig,getCartPreviewConfig} from './data/previewHelpers';
import {canExportProduction} from './data/plotterExport';
const [sign,decal]=parkingArticles();
afterEach(cleanup);
const two={customTextLine1:'Palliativa',customTextLine2:'vårdenheten',quantity:2};
test.each([sign,decal])('One line is centered by its real ink bounds for $name',article=>{
 const {config:c,lines:[line]}=parkingLayout(article,{customTextLine1:'Personal'});
 expect((line.x+line.minX+line.x+line.maxX)/2).toBeCloseTo(c.textAreaLeftMm+c.textAreaWidthMm/2,6);
 expect((line.baseline-line.maxY+line.baseline-line.minY)/2).toBeCloseTo(c.textAreaTopMm+c.textAreaHeightMm/2,6);
});
test('Two rows are centered as a group and preserve the 26.5 mm cap height',()=>{
 const {config:c,lines}=parkingLayout(decal,two);
 const top=lines[0].baseline-lines[0].maxY,bottom=lines[1].baseline-lines[1].minY;
 expect((top+bottom)/2).toBeCloseTo(34.5,6);expect(c.textHeightMm).toBe(26.5);
 expect(top).toBeGreaterThanOrEqual(0);expect(bottom).toBeLessThanOrEqual(69);
});
test('Invalid or overflowing customer text is blocked without silently shrinking it',()=>{
 expect(parkingError(decal,{customTextLine1:'Personal'})).toBeNull();
 expect(parkingError(decal,{customTextLine1:'Personal '.repeat(10)})).toMatch(/ryms inte|80 tecken/);
 expect(parkingError(decal,{customTextLine2:'Personal'})).toBe('Du måste fylla i textrad 1.');
 expect(parkingConfigError({...decal,parkingSignConfig:{...parkingConfig(decal),textAreaTopMm:50}})).toMatch(/rymma/);
});
test('Cart snapshots the article settings and keeps both rows in review and production',()=>{
 const item=createFormCartItem(sign,'parkeringsskylt',two);
 expect(item.parkingSignConfig.textHeightMm).toBe(26.5);expect(item.quantity).toBe(2);
 expect(item.customTextLine1).toBe('Palliativa');expect(item.customTextLine2).toBe('vårdenheten');
 sign.parkingSignConfig.textHeightMm=20;expect(item.parkingSignConfig.textHeightMm).toBe(26.5);sign.parkingSignConfig.textHeightMm=26.5;
 expect(getCartItemDisplayRows(item).map(r=>r.value)).toEqual(expect.arrayContaining(['Palliativa','vårdenheten','26.5 mm']));
 expect(getFormPreviewConfig(sign).previewType).toBe('parking_sign');expect(getCartPreviewConfig(item).previewType).toBe('parking_sign');expect(canExportProduction(item)).toBe(true);
});
test('Article editor exposes the text height and changes the saved config value',()=>{
 const change=jest.fn();render(<ParkingArticleFields article={decal} onChange={change}/>);
 fireEvent.change(screen.getByLabelText('Texthöjd (mm)'),{target:{value:'24.5'}});
 expect(change.mock.calls[0][0].parkingSignConfig.textHeightMm).toBe(24.5);
});
test('Preview includes the actual selected text and the original header contains only vector curves',()=>{
 render(<ParkingSignPreview product={sign} form={two}/>);expect(screen.getByText('Palliativa')).toBeInTheDocument();expect(screen.getByText('vårdenheten')).toBeInTheDocument();
 const svg=parkingSvg(decal,two,{cut:true});expect(svg).toContain('width="280mm"');expect(svg).toContain('#EC2A90');expect(svg).not.toContain('Reserverad</text>');
});
test('Installer adds two articles once, opens parking and preserves later edits',()=>{
 const installed=installParkingProducts({categories:[{id:'parkeringsskylt',status:'closed'}],articles:[]});
 expect(installed.articles).toHaveLength(2);expect(installed.categories[0].status).toBe('open');expect(installed.articles[1].isImplemented).toBe(false);
 installed.articles[1].articleNumber='EGET';installed.articles[1].unitPrice=125;
 expect(installParkingProducts(installed)).toBe(installed);expect(installed.articles[1].articleNumber).toBe('EGET');
});


const TextField=({label,htmlFor,children})=><label htmlFor={htmlFor}>{label}{children}</label>;
let latestTextForm;
function ParkingTextEditor({initial={}}){
 const [form,setForm]=useState({quantity:1,...initial});latestTextForm=form;
 const context={Field:TextField,selectedBadge:sign,productForm:form,updateFormValue:(key,value)=>setForm(previous=>({...previous,[key]:value})),inputStyle:{}};
 return <form onSubmit={event=>{event.preventDefault();throw new Error('Enter must not submit');}}>{renderConfiguredField('customTextLine1',context)}{renderConfiguredField('customTextLine2',context)}</form>;
}
test('Parking uses one textarea and keeps an empty second line while Enter is being typed',()=>{
 render(<ParkingTextEditor/>);const text=screen.getByRole('textbox',{name:/Text/});expect(text.tagName).toBe('TEXTAREA');expect(screen.getAllByRole('textbox')).toHaveLength(1);expect(screen.queryByText(/Tryck Enter/)).not.toBeInTheDocument();
 fireEvent.change(text,{target:{value:'Palliativa\n'}});expect(text).toHaveValue('Palliativa\n');
 fireEvent.change(text,{target:{value:'Palliativa\nvårdenheten'}});
 expect(createFormCartItem(sign,'parkeringsskylt',latestTextForm)).toMatchObject({customTextLine1:'Palliativa',customTextLine2:'vårdenheten'});
 expect(fireEvent.keyDown(text,{key:'Enter'})).toBe(false);
});
test('Removing the newline clears row two, and paste cannot create a third row',()=>{
 render(<ParkingTextEditor initial={{customTextLine1:'Palliativa',customTextLine2:'vårdenheten'}}/>);const text=screen.getByRole('textbox');
 fireEvent.change(text,{target:{value:'Personal'}});expect(latestTextForm).toMatchObject({customTextLine1:'Personal',customTextLine2:'',parkingUseLine2:false});
 fireEvent.change(text,{target:{value:'Första\r\nAndra\r\nTredje'}});expect(text).toHaveValue('Första\nAndra');
});
test('Complete sign preview is flat with a subtle outline and no presentation effects in production',()=>{
 const preview=parkingPreviewSvg(sign,two);expect(preview).toContain('300 × 210 mm');expect(preview).toContain('data-parking-presentation="flat"');expect(preview).toContain('data-parking-preview-outline');expect(preview).toContain('stroke="#555"');expect(preview).not.toContain('linearGradient');expect(preview).not.toContain('<filter');
 expect(parkingPreviewSvg(decal,two)).not.toContain('data-parking-presentation');expect(parkingSvg(sign,two,{production:true,cut:true})).not.toContain('linearGradient');
 expect(parkingSvg(sign,two,{production:true,cut:true})).toContain('width="295.076mm"');expect(parkingSvg(sign,two,{production:true,cut:true})).not.toContain('data-parking-preview-outline');
});
test('Presentation update preserves edited prices, article numbers, activation and text height',()=>{
 const previous={articles:[{...sign,unitPrice:700,parkingSignConfig:{...sign.parkingSignConfig,textHeightMm:24}},{...decal,articleNumber:'1502',unitPrice:99,isImplemented:true}],categories:[],productUpdates:['parking-sign-and-decal-v1','parking-folded-presentation-v2']};
 const updated=installParkingProducts(previous);expect(updated.articles[0]).toMatchObject({unitPrice:700,format:'300 × 210 mm',parkingSignConfig:{textHeightMm:24}});
 expect(updated.articles[1]).toMatchObject({articleNumber:'1502',unitPrice:99,isImplemented:true});expect(installParkingProducts(updated)).toBe(updated);
});


test('Saving a parking article preserves the user product image',async()=>{
 const article={...sign,image:'/egen-produktbild.png',images:['/egen-produktbild.png']};
 setCatalogAccessToken('test');setCatalogSnapshot({categories:[{id:'parkeringsskylt',title:'Parkeringsskylt',status:'open',isImplemented:true}],articles:[article]});
 global.fetch=jest.fn(async(_url,options)=>({ok:true,json:async()=>({catalog:JSON.parse(options.body)})}));
 render(<AdminArticlesPage role="admin" adminPassword="test"/>);fireEvent.click(screen.getByRole('button',{name:'Redigera',exact:true}));fireEvent.click(screen.getByRole('button',{name:'Spara artikel'}));
 await waitFor(()=>expect(fetch).toHaveBeenCalled());expect(JSON.parse(fetch.mock.calls[0][1].body).articles[0]).toMatchObject({image:'/egen-produktbild.png',images:['/egen-produktbild.png']});
});
