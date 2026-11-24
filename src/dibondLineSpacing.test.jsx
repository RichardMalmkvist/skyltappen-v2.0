import React,{useState} from 'react';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import DibondFields from './components/products/DibondFields';
import {dibondLayout,newDibondSign} from './data/dibondHelpers';
import {createCartItem} from './data/cartHelpers';
const product={id:'test',articleNumber:'0706',previewType:'dibond_sign',dibondConfig:{maxWidthMm:900,maxHeightMm:900}},original={widthMm:900,heightMm:700,frameEnabled:false,lines:[{text:'Barnhälsovård\nKvinnohälsovård\nSocialtjänsten\nÖppna förskolan',sizeMm:30,lineGapMm:10}],symbols:[]};
let latest;
beforeEach(()=>{global.fetch=jest.fn(async()=>({ok:true,json:async()=>({symbols:[]})}));jest.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({font:'',measureText(text){const size=Number(this.font.match(/([\d.]+)px/)?.[1]||1000),accent=/[ÖÅÄåäö]/.test(text),low=/[gjyp]/.test(text);return {width:text.length*size*.5,actualBoundingBoxAscent:size*(accent?.85:.716),actualBoundingBoxDescent:low?size*.2:0};}});});
afterEach(()=>{cleanup();jest.restoreAllMocks();});
test('Editing line spacing switches a saved block to uniform pitch and retains it in the order',()=>{
 function Editor(){const [sign,setSign]=useState(original);latest=sign;return <DibondFields product={product} form={{dibondSign:sign}} onChange={change=>setSign(change.dibondSign)}/>;}
 render(<Editor/>);fireEvent.change(screen.getByLabelText('Radavstånd (mm) – textblock 1'),{target:{value:'16'}});
 expect(latest.lines[0].lineSpacingMode).toBe('uniform');const layout=dibondLayout(latest);
 for(let i=1;i<layout.lines.length;i++)expect(layout.lines[i].y-layout.lines[i-1].y).toBeCloseTo(46,7);
 const item=createCartItem(product,'skylt',{quantity:1,dibondSign:latest});expect(item.dibondSign.lines[0].lineSpacingMode).toBe('uniform');
 expect(newDibondSign(product).lines[0].lineSpacingMode).toBe('uniform');
});
