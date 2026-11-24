import React,{useState} from 'react';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import '@testing-library/jest-dom';
import {outdoorArticles,installOutdoorArticles,outdoorSignError} from './data/outdoorBusinessSigns';
import {newDibondSign,resizeDibondDimensions} from './data/dibondHelpers';
import {createCartItem} from './data/cartHelpers';
import {projectProofGroups,proofFormat} from './data/projectProof';
import DibondPreview from './components/products/DibondPreview';
import DibondFields from './components/products/DibondFields';
const articles=outdoorArticles(),product=articles[0];let latest;
beforeAll(()=>jest.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({font:'',measureText(text){const size=Number(this.font.match(/([\d.]+)px/)?.[1]||1000);return {width:text.length*size*.6,actualBoundingBoxAscent:size*.716,actualBoundingBoxDescent:0};}}));afterAll(()=>jest.restoreAllMocks());afterEach(cleanup);
function Editor(){const [sign,setSign]=useState(newDibondSign(product));latest=sign;return <><DibondPreview product={product} sign={sign} onChange={setSign}/><DibondFields product={product} form={{dibondSign:sign}} onChange={change=>setSign(change.dibondSign)}/></>;}
test('Six articles install once without changing existing articles or prices',()=>{
 const existing={id:'old',articleNumber:'1001',unitPrice:9999};const cat=installOutdoorArticles({articles:[existing],categories:[{id:'verksamhetsskylt-utomhus',status:'closed'}]});
 expect(cat.articles).toHaveLength(6);expect(cat.articles[0]).toEqual(existing);expect(cat.categories[0].status).toBe('open');expect(installOutdoorArticles(cat)).toBe(cat);
 expect(articles.map(a=>[a.articleNumber,a.unitPrice])).toEqual([['1001',7700],['1002',8000],['1003',2000],['1004',2200],['1005',0],['1006',0]]);
});
test('Post height and total width can change; panel grows down while artwork stays anchored to its top',()=>{
 global.fetch=jest.fn(async()=>({ok:true,json:async()=>({symbols:[]})}));const {container}=render(<Editor/>);fireEvent.click(screen.getByRole('tab',{name:'Mått & utförande'}));
 expect(screen.getByRole('spinbutton',{name:'Total bredd inkl. stolpar (mm)'})).toHaveValue(1500);expect(screen.getByRole('spinbutton',{name:'Stolparnas totalhöjd (mm)'})).toHaveValue(1250);
 const panel=()=>container.querySelector('svg svg');expect(panel()).toHaveAttribute('y','50');const before=Number(latest.heightMm)/2+Number(latest.separatorOffsetYMm);
 fireEvent.change(screen.getByRole('spinbutton',{name:'Skyltfältets höjd (mm)'}),{target:{value:'600'}});
 expect(panel()).toHaveAttribute('y','50');expect(panel()).toHaveAttribute('height','600');expect(Number(latest.heightMm)/2+Number(latest.separatorOffsetYMm)).toBe(before);expect(latest.symbols[0].yMm).toBe(315);expect(latest.lines[0].firstLineBottomMm).toBe(150);
 fireEvent.change(screen.getByRole('spinbutton',{name:'Total bredd inkl. stolpar (mm)'}),{target:{value:'1800'}});expect(latest.widthMm).toBe(1600);
 fireEvent.change(screen.getByRole('spinbutton',{name:'Stolparnas totalhöjd (mm)'}),{target:{value:'1500'}});expect(latest.outdoorSign.totalHeightMm).toBe('1500');
 fireEvent.click(screen.getByRole('switch',{name:'Dubbelsidig'}));expect(latest.outdoorSign.doubleSided).toBe(true);expect(screen.getByText(/Art. 1002/)).toBeInTheDocument();
});
test('Replacement articles have no posts; side selection controls cart and proof article, price and dimensions',()=>{
 for(const p of [articles[0],articles[2]]){
 const sign=newDibondSign(p);sign.lines[0].text='Regionfastigheter';sign.outdoorSign.doubleSided=true;
 const item=createCartItem(p,'skylt',{dibondSign:sign,quantity:2});expect(item.articleNumber).toBe(p.articleNumber==='1001'?'1002':'1004');expect(item.unitPrice).toBe(p.articleNumber==='1001'?8000:2200);expect(item.dibondSign.outdoorSign.doubleSided).toBe(true);
 const [group]=projectProofGroups({signs:[{id:'s',articleId:p.id,quantity:1,configuration:{dibondSign:sign}}]},articles);expect(group.articleNumber).toBe(item.articleNumber);expect(group.product.unitPrice).toBe(item.unitPrice);expect(proofFormat(group.product,group.form)).toContain('1300 × 470');
 }
 const {container}=render(<DibondPreview product={articles[2]} sign={newDibondSign(articles[2])}/>);expect(container.querySelector('[data-outdoor-post]')).toBeNull();
 expect(outdoorSignError({...newDibondSign(product),heightMm:1400})).toBeTruthy();
});

test('1005 and 1006 are editable decals without posts, inactive until prices are entered',()=>{
 for(const [number,double] of [['1005',false],['1006',true]]){
  const p=articles.find(a=>a.articleNumber===number),sign=newDibondSign(p);
  expect(p).toMatchObject({productType:'dekal',categoryId:'verksamhetsskylt-utomhus',isImplemented:false,flowType:'form',directAddToCart:false});
  expect(sign).toMatchObject({frameEnabled:false,cornerRadiusMm:0,outdoorSign:{withPosts:false,doubleSided:double}});
  const resized=resizeDibondDimensions(p,sign,{widthMm:1000,heightMm:400});
  resized.lines[0].text='Egen text';
  const item=createCartItem(p,'skylt',{dibondSign:resized,quantity:2});
  expect(item.articleNumber).toBe(number);expect(item.productType).toBe('dekal');
  expect(item.dibondSign).toMatchObject({widthMm:1000,heightMm:400,lines:[{text:'Egen text'}],outdoorSign:{doubleSided:double}});
 }
 const legacy={articles:articles.slice(0,4),categories:[],productUpdates:['outdoor-business-1001-1004-v1']};
 const installed=installOutdoorArticles(legacy);
 expect(installed.articles).toHaveLength(6);
 installed.articles.find(a=>a.articleNumber==='1005').unitPrice=1234;
 expect(installOutdoorArticles(installed).articles.find(a=>a.articleNumber==='1005').unitPrice).toBe(1234);
});
