import React from 'react';
import {render,screen,fireEvent,within,cleanup,waitFor} from '@testing-library/react';
import '@testing-library/jest-dom';
import ProjectDrawingPlanner,{configuredMarkerText,markerTextSummary} from './pages/admin/ProjectDrawingPlanner';
jest.mock('./data/browserPdf',()=>({openPdf:()=>({promise:Promise.resolve({numPages:1,getPage:async()=>({getViewport:({scale})=>({width:600*scale,height:400*scale}),render:()=>({promise:Promise.resolve(),cancel:()=>{}})}),destroy:()=>{}}),destroy:()=>{}})}));
jest.mock('./pages/admin/DrawingDetailLayer',()=>()=>null);
const product={id:'alu',articleNumber:'1230',name:'4-kantsbockad plåt',previewType:'dibond_sign',productType:'dibondskylt',fields:{dibond:true,quantity:true},dibondConfig:{maxWidthMm:600,maxHeightMm:400}};
const config={customText:'Försörjningsvägen 2 / Entré 14',dibondSign:{widthMm:600,heightMm:400,frameEnabled:false,lines:[{text:'Försörjningsvägen 2',sizeMm:20,firstLineBottomMm:90},{text:'Entré 13',sizeMm:40,firstLineBottomMm:250}]}};
const marker={id:'m',position:'S002',page:1,x:.5,y:.5,articleId:'alu',text:'Försörjningsvägen 2 / Entré 13 / Försörjningsvägen 2 / Entré 14',configuration:config};
beforeEach(()=>{global.fetch=jest.fn(async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1),json:async()=>({symbols:[]})}));jest.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({font:'',measureText(text){const size=Number(this.font.match(/([\d.]+)px/)?.[1]||1000);return {width:text.length*size*.55,actualBoundingBoxAscent:size*.716,actualBoundingBoxDescent:0};}});});
afterEach(()=>{cleanup();jest.restoreAllMocks();});
test('Structured sign text overrides duplicated and outdated legacy summaries',()=>{
 expect(markerTextSummary(marker)).toBe('Försörjningsvägen 2 / Entré 13');expect(configuredMarkerText({dibondSign:{lines:[]},customText:'gammal text'})).toBe('');
 expect(markerTextSummary({text:'Sparad text',configuration:{}})).toBe('Sparad text');
 expect(markerTextSummary({text:'Reception / Reception',configuration:{customText:'Reception'}})).toBe('Reception');
 expect(markerTextSummary({text:'Ska inte visas',configuration:{hangingSignWithoutText:true}})).toBe('');
});
test.each([false,true])('Sidebar and subsequent saves use the current text only (library=%s)',async registerMode=>{
 const saved=jest.fn();let posted;
 fetch.mockImplementation(async(url,options)=>{
 if(options?.method==='PATCH'){posted=JSON.parse(options.body);return {ok:true,json:async()=>({drawing:{markers:[{...marker,...posted}]},marker:{...marker,...posted}})};}
 return {ok:true,arrayBuffer:async()=>new ArrayBuffer(1),json:async()=>({symbols:[]})};});
 const view=render(<ProjectDrawingPlanner registerMode={registerMode} registerUrl="/library" onRegisterSave={saved} onSaved={()=>{}} project={{id:'p'}} drawing={{id:'d',name:'Plan 2',markers:[marker]}} headers={{}} catalog={{articles:[product],categories:[]}} onClose={()=>{}}/>);
 expect(view.container.querySelector('.jsf-marker-list-text')).toHaveTextContent('Försörjningsvägen 2 / Entré 13');expect(view.container.querySelector('.jsf-marker-list-text')).not.toHaveTextContent('Entré 14');
 for(const value of ['Entré 12','Entré 11']){
 fireEvent.click(view.container.querySelector('.jsf-marker-list'));
 const dialog=screen.getByRole('dialog');fireEvent.change(within(dialog).getByRole('combobox',{name:'Välj objekt att redigera'}),{target:{value:'text:1'}});fireEvent.change(within(dialog).getByRole('textbox',{name:'Text – rad 2'}),{target:{value}});fireEvent.submit(dialog.querySelector('form'));
 await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
 const result=registerMode?saved.mock.calls.at(-1)[0].markers[0]:posted;
 expect(result.text).toBe('Försörjningsvägen 2 / '+value);expect(view.container.querySelector('.jsf-marker-list-text').textContent).toBe('Försörjningsvägen 2 / '+value);
 }
});
