import {aluminiumArticles,installAluminiumArticles} from './data/aluminiumArticles';
import {newDibondSign,validateDibondSign,dibondConfigError} from './data/dibondHelpers';
import {createCartItem} from './data/cartHelpers';
import {moveDibondItem,resizeDibondItem} from './data/dibondManipulation';
const products=aluminiumArticles();
test('installation is additive and never replaces saved articles or later admin edits',()=>{
 const existing={id:'existing',articleNumber:'1230',unitPrice:999,name:'Egen artikel'};
 const initial={categories:[{id:'aluminiumskyltar',title:'Aluminiumskyltar',status:'closed'}],articles:[existing,{id:'other'}]};
 const installed=installAluminiumArticles(initial);
 expect(installed.articles).toHaveLength(8);expect(installed.articles[0]).toBe(existing);
 expect(initial.categories[0].status).toBe('closed');expect(installed.categories[0].status).toBe('open');
 installed.articles[2].unitPrice=123;expect(installAluminiumArticles(installed)).toBe(installed);
});
test('all seven articles use agreed dimensions, prices and aluminium category',()=>{
 expect(products.map(p=>[p.articleNumber,p.dibondConfig.defaultWidthMm,p.dibondConfig.defaultHeightMm,p.dibondConfig.maxWidthMm,p.dibondConfig.maxHeightMm,p.unitPrice])).toEqual([
 ['1230',100,60,600,400,1600],['1231',600,400,1000,500,2500],['1232',1000,1000,1000,1000,2875],['1233',1000,1000,1500,1000,3100],['1234',1500,1000,2000,1000,4000],['1235',297,210,297,210,0],['1236',210,148,210,148,0]]);
 for(const p of products){expect(p.categoryId).toBe('aluminiumskyltar');expect(dibondConfigError(p)).toBeNull();expect(p.isImplemented).toBe(Number(p.articleNumber)<1235);}
});
test('each article supports positioned text and preserves its limits in the cart',()=>{
 for(const p of products){let sign=newDibondSign(p);sign.lines[0].text='Entré';
 expect(validateDibondSign(p,sign)).toBeNull();
 sign=moveDibondItem(sign,'text',0,2,2);sign=resizeDibondItem(sign,'text',0,1.1);
 expect(validateDibondSign(p,sign)).toBeNull();
 const item=createCartItem(p,'dibondskylt',{dibondSign:sign,quantity:2});
 expect(item.dibondSign.lines[0].offsetXMm).toBeDefined();expect(item.dibondConfig).toEqual(p.dibondConfig);
 expect(validateDibondSign(p,{...sign,widthMm:p.dibondConfig.maxWidthMm+1})).toBeTruthy();
 }
});
test('A4 and A5 remain fixed while variable articles accept smaller dimensions',()=>{
 for(const p of products.slice(5)){const sign=newDibondSign(p);sign.lines[0].text='Text';expect(validateDibondSign(p,{...sign,widthMm:sign.widthMm-1})).toMatch(/fasta mått/);}
 const p=products[1],sign=newDibondSign(p);sign.lines[0].text='Text';expect(validateDibondSign(p,{...sign,widthMm:300,heightMm:200})).toBeNull();
});

test('saved 1231 is corrected once without losing price, image or other articles',()=>{
 const old={...products[1],unitPrice:2510,image:'customer-image',dibondConfig:{...products[1].dibondConfig,maxHeightMm:1000}};
 const other=products[2];
 const c=installAluminiumArticles({productUpdates:['aluminium-custom-text-1230-1236-v1'],categories:[],articles:[old,other]});
 expect(c.articles[0].dibondConfig.maxHeightMm).toBe(500);expect(c.articles[0].format).toContain('500');expect(c.articles[0].unitPrice).toBe(2510);expect(c.articles[0].image).toBe('customer-image');expect(c.articles[1]).toBe(other);
 expect(old.dibondConfig.maxHeightMm).toBe(1000);expect(installAluminiumArticles(c)).toBe(c);
 const sign=newDibondSign(c.articles[0]);sign.lines[0].text='Text';expect(validateDibondSign(c.articles[0],{...sign,heightMm:501})).toBeTruthy();
});
