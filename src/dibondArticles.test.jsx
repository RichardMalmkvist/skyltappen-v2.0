import {installDibondArticles} from './data/dibondArticles';
import {newDibondSign,validateDibondSign} from './data/dibondHelpers';
const source={id:'old-705',articleNumber:'0705',categoryId:'indoor',image:'/customer.png',name:'Dibond',unitPrice:560,isImplemented:true,dibondConfig:{defaultTextSizeMm:19}};
const large={...source,id:'old-706',articleNumber:'0706',unitPrice:860};
test('Installs three tiers once without replacing prices, artwork or IDs',()=>{
 const original={categories:[{id:'indoor'}],articles:[source,large,{id:'other'}]};const result=installDibondArticles(original);
 expect(result.articles).toHaveLength(4);expect(result.articles[0]).toMatchObject({id:source.id,image:source.image,unitPrice:560});expect(result.articles[1].unitPrice).toBe(860);expect(result.articles[2]).toBe(original.articles[2]);expect(source.dibondConfig.maxWidthMm).toBeUndefined();
 expect(result.categories).toBe(original.categories);expect(installDibondArticles(result)).toBe(result);
 for(const [number,start,max] of [['0704',50,300],['0705',300,600],['0706',600,900]]){
  const p=result.articles.find(a=>a.articleNumber===number),sign=newDibondSign(p);
  expect([sign.widthMm,sign.heightMm]).toEqual([start,start]);expect([p.dibondConfig.maxWidthMm,p.dibondConfig.maxHeightMm]).toEqual([max,max]);expect(sign.cornerRadiusAuto).toBe(true);
 }
 const added=result.articles.find(a=>a.articleNumber==='0704');expect(added).toMatchObject({unitPrice:340,isImplemented:true,categoryId:'indoor'});
});
test('An existing 0704 is updated without duplication or changing its price',()=>{
 const c=installDibondArticles({articles:[source,large,{...source,id:'custom-704',articleNumber:'0704',unitPrice:250}]});
 expect(c.articles).toHaveLength(3);expect(c.articles[2]).toMatchObject({id:'custom-704',unitPrice:250});
});

test('Both dimensions respect their own range, including intermediate rectangular sizes',()=>{
 const c=installDibondArticles({articles:[source,large]});
 for(const number of ['0704','0705','0706']){
  const product=c.articles.find(a=>a.articleNumber===number),config=product.dibondConfig,sign=newDibondSign(product);sign.lines[0]={...sign.lines[0],text:'X',sizeMm:2};
  expect(validateDibondSign(product,sign)).toBeNull();
  expect(validateDibondSign(product,{...sign,widthMm:config.maxWidthMm,heightMm:config.maxHeightMm})).toBeNull();
  expect(validateDibondSign(product,{...sign,widthMm:config.maxWidthMm})).toBeNull();
  for(const change of [{widthMm:config.minWidthMm-1},{heightMm:config.minHeightMm-1},{widthMm:config.maxWidthMm+1},{heightMm:config.maxHeightMm+1}])expect(validateDibondSign(product,{...sign,...change})).toBeTruthy();
 }
});
