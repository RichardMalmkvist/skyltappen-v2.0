import {profileArticles,installProfileArticles} from './data/profileSigns';
import {newDibondSign,validateDibondSign} from './data/dibondHelpers';
import {outdoorStandLayout,supportsOutdoorStand3D} from './data/outdoorStand3D';
import {outdoorArticleNumber} from './data/outdoorBusinessSigns';
import {createCartItem} from './data/cartHelpers';
import React,{useState} from 'react';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import DibondFields from './components/products/DibondFields';
import {directionPanelHeight} from './data/directionSigns';
afterEach(cleanup);

test('Profile articles have reference prices, dimensions and categories',()=>{
 const articles=profileArticles(false);
 expect(articles.map(a=>a.articleNumber)).toEqual(['1301','1302','1401','1402']);
 expect(articles.map(a=>a.unitPrice)).toEqual([17500,690,20000,800]);
 expect(articles.map(a=>a.categoryId)).toEqual(['profilskylt','profilskylt','profilskylt-storre','profilskylt-storre']);
 for(const [index,dimensions] of [[0,{widthMm:1150,heightMm:2500}],[2,{widthMm:1600,heightMm:3230}]]){
  const product=articles[index],sign=newDibondSign(product),layout=outdoorStandLayout(sign);
  expect(layout).toMatchObject({...dimensions,profileStyle:true,doubleSided:true});expect(layout.panels).toHaveLength(5);
  expect(supportsOutdoorStand3D(product)).toBe(true);sign.lines[0].text='Vårdcentrum';sign.directionPanels.forEach(panel=>{panel.lines[0].text='Avdelning';});expect(validateDibondSign(product,sign)).toBeNull();
  expect(createCartItem(product,'skylt',{quantity:1,dibondSign:sign}).articleNumber).toBe(product.articleNumber);
 }
 expect(newDibondSign(articles[1])).toMatchObject({widthMm:950,heightMm:260});expect(newDibondSign(articles[3])).toMatchObject({widthMm:1400,heightMm:420});
});

test('Replacement sides are explicit, retain the same article number and allow artwork edits',()=>{
 for(const doubleSided of [false,true])for(const product of profileArticles(doubleSided).filter(a=>['1302','1402'].includes(a.articleNumber))){
  const sign=newDibondSign(product);sign.lines[0].text='Reception';sign.lines[0].sizeMm=35;sign.widthMm=1000;sign.heightMm=300;
  expect(sign.outdoorSign.doubleSided).toBe(doubleSided);expect(validateDibondSign(product,sign)).toBeNull();expect(outdoorArticleNumber(product,sign)).toBe(product.articleNumber);
 }
});

test('Installation opens the requested categories and preserves existing article edits',()=>{
 const old={...profileArticles(false)[0],unitPrice:18000,name:'Admin title'};
 const catalog=installProfileArticles({categories:[{id:'profilskylt',title:'Profilskylt',status:'closed'}],articles:[old]},false);
 expect(catalog.articles).toHaveLength(4);expect(catalog.articles[0]).toEqual(old);expect(catalog.categories.every(c=>c.status==='open')).toBe(true);expect(installProfileArticles(catalog,false)).toBe(catalog);
});

test('Adding a profile field uses its matching row size and grows the posts if necessary',()=>{
 global.fetch=jest.fn(async()=>({ok:true,json:async()=>({symbols:[]})}));
 const product=profileArticles()[0];let latest;
 function Editor(){const [sign,setSign]=useState({...newDibondSign(product),outdoorSign:{...newDibondSign(product).outdoorSign,totalHeightMm:1700}});latest=sign;return <DibondFields product={product} form={{dibondSign:sign}} onChange={change=>setSign(change.dibondSign)}/>;}
 render(<Editor/>);fireEvent.click(screen.getByRole('button',{name:'Lägg till skyltfält nedanför'}));
 expect(latest.directionPanels).toHaveLength(5);expect(latest.directionPanels.at(-1).heightMm).toBe(260);expect(latest.directionPanels.at(-1).lines).toHaveLength(1);
 expect(latest.outdoorSign.totalHeightMm).toBeGreaterThanOrEqual(directionPanelHeight(latest)+190);
});
