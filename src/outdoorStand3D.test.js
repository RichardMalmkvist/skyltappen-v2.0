import {outdoorStandLayout,supportsOutdoorStand3D} from './data/outdoorStand3D';
import {outdoorArticles,outdoorArticleNumber} from './data/outdoorBusinessSigns';
import {directionArticles} from './data/directionSigns';
import {newDibondSign,validateDibondSign} from './data/dibondHelpers';
import {outdoorOtArticle,installOutdoorOtArticle} from './data/outdoorOtArticle';

test('Stand layout follows total width, post height and independent panel heights',()=>{
 const product=outdoorArticles()[0],sign=newDibondSign(product);
 expect(supportsOutdoorStand3D(product)).toBe(true);
 expect(outdoorStandLayout(sign)).toMatchObject({widthMm:1500,heightMm:1250,panels:[{topMm:78.48,widthMm:1300,heightMm:470}]});
 const resized={...sign,widthMm:1900,heightMm:600,outdoorSign:{...sign.outdoorSign,totalHeightMm:2200}};
 expect(outdoorStandLayout(resized)).toMatchObject({widthMm:2100,heightMm:2200,panels:[{topMm:78.48,widthMm:1900,heightMm:600}]});
 expect(supportsOutdoorStand3D(outdoorArticles()[2])).toBe(false);
});

test('Direction sign panels keep their order, heights, gaps and reverse artwork',()=>{
 const product=directionArticles()[1],sign=newDibondSign(product);sign.heightMm=240;sign.directionPanels[0].heightMm=320;sign.outdoorSign.panelGapMm=40;
 expect(outdoorStandLayout(sign)).toMatchObject({widthMm:1700,heightMm:1500,doubleSided:true,panels:[{topMm:78.48,heightMm:240},{topMm:358.48,heightMm:320}]});
 expect(supportsOutdoorStand3D(product)).toBe(true);
});

test('0901 installs once and uses its own number, price and editable stand dimensions',()=>{
 const product=outdoorOtArticle(),sign=newDibondSign(product);
 expect(product.unitPrice).toBe(8800);expect(product.categoryId).toBe('orienteringstavla');
 expect(outdoorStandLayout(sign)).toMatchObject({widthMm:1740,heightMm:2100,panels:[{widthMm:1540,heightMm:1300}]});
 sign.lines[0].text='Sjukhuset';
 expect(validateDibondSign(product,sign)).toBeNull();expect(outdoorArticleNumber(product,sign)).toBe('0901');
 const existing={...product,unitPrice:9000,name:'Admin title'};
 const catalog=installOutdoorOtArticle({categories:[{id:'orienteringstavla',title:'Orienteringstavla'}],articles:[existing]});
 expect(catalog.articles).toEqual([existing]);expect(installOutdoorOtArticle(catalog)).toBe(catalog);
});
