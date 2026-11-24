import {projectProofPages} from './data/projectProof';
const group=(articleNumber,id,categoryId='inomhusskyltar')=>({key:id,articleNumber,product:{categoryId},quantity:1,form:{},locations:[{signKey:id,markerId:id,drawingId:'__standalone__',unplaced:true,position:id,quantity:1}],notes:[]});
const signs=(number,count)=>Array.from({length:count},(_,i)=>group(number,number+'-'+i));
const articles=pages=>pages.map(page=>page.groups.map(group=>group.articleNumber));
test('two 0731 spec designs stay together after 27 designs of 0730 spec',()=>{
 const source=[...signs('0730 spec',27),...signs('0731 spec',2)];const before=JSON.stringify(source),pages=projectProofPages(source);
 expect(pages).toHaveLength(8);expect(articles(pages).slice(-2)).toEqual([Array(3).fill('0730 spec'),Array(2).fill('0731 spec')]);
 expect(pages.flatMap(page=>page.groups).map(group=>group.key)).toEqual(source.map(group=>group.key));expect(JSON.stringify(source)).toBe(before);
});
test.each([2,3,4])('a complete article of %i designs moves to the next page if needed',count=>{
 const first=signs('0730',5-count),second=signs('0731 spec',count);const pages=projectProofPages([...first,...second]);
 expect(articles(pages)).toEqual([first.map(x=>x.articleNumber),second.map(x=>x.articleNumber)]);
});
test('articles share a page when both fit',()=>{
 expect(articles(projectProofPages([...signs('0730',2),...signs('0731 spec',2)]))).toEqual([['0730','0730','0731 spec','0731 spec']]);
});
test('large articles still paginate without losing or duplicating designs',()=>{
 const source=[...signs('0730',3),...signs('0731 spec',7)];const pages=projectProofPages(source);
 expect(pages.every(page=>page.groups.length<=4)).toBe(true);expect(pages.flatMap(page=>page.groups).map(group=>group.key)).toEqual(source.map(group=>group.key));
});
test('long metadata keeps a spacious page and categories stay separate',()=>{
 const long=group('0731 spec','long');long.notes=['x'.repeat(551)];
 const pages=projectProofPages([group('0730','first'),long,group('0731 spec','normal'),group('0731 spec','door','dorrskyltar')]);
 expect(pages[0].categoryId).toBe('doors');expect(pages.find(page=>page.groups[0].key==='long')).toMatchObject({spacious:true});
 expect(pages.flatMap(page=>page.groups)).toHaveLength(4);expect(pages.every(page=>page.groups.every(group=>group.product.categoryId===page.groups[0].product.categoryId))).toBe(true);
});
