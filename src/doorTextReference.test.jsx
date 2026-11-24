import {normalizeDoorTextReference,getDoorTextPlacement} from './data/doorTextReference';

test.each([
 ['0601',23,21,647,94,129],['0603',23,30,561,82,124],['0604',31,28,646,99,135],['0607',29,18,531,84,105],
])('Header placement matches the supplied front view for %s', (articleNumber,left,top,width,inkLeft,baseline)=>{
 const product=normalizeDoorTextReference({articleNumber,doorSignTextConfig:{line1LeftMm:24,line1BaselineMm:40}});
 const line=getDoorTextPlacement(product.doorSignTextConfig,{heading:'EXPEDITION'}).heading[0];
 expect(Math.abs(left+width*line.x/192-inkLeft)).toBeLessThan(6);
 expect(Math.abs(top+width*line.y/192-baseline)).toBeLessThan(4);
});

test('Two header lines, two name lines and a title remain separate and inside the insert',()=>{
 const c=normalizeDoorTextReference({articleNumber:'0604'}).doorSignTextConfig;
 const p=getDoorTextPlacement(c,{heading:'KONFERENS-',extra:'RUM',name:'Anna\nAndersson',title:'Sjuksköterska'});
 const lines=[...p.heading,...p.names,...p.titles];
 for(let i=1;i<lines.length;i++)expect(lines[i].y-lines[i].fontSize*.715).toBeGreaterThan(lines[i-1].y);
 expect(lines[lines.length-1].y).toBeLessThanOrEqual(3.525+82.7+1e-8);
});

test('Text flows past a number or symbol without moving the heading above it',()=>{
 const c=normalizeDoorTextReference({articleNumber:'0608'}).doorSignTextConfig;
 const p=getDoorTextPlacement(c,{heading:'RUM',name:'Anna',title:'Titel'},{obstacles:[{x:20,y:45,width:30,height:32}]});
 expect(p.heading[0].x).toBe(20.5);expect(p.names[0].x).toBeGreaterThan(50);expect(p.titles[0].x).toBeGreaterThan(50);
});

test('Braille remains below the text and later article adjustments remain editable',()=>{
 const p=normalizeDoorTextReference({articleNumber:'0603',image:'/my-photo.jpg'});
 const lines=getDoorTextPlacement(p.doorSignTextConfig,{heading:'KONFERENS-',extra:'RUM'},{braille:true}).heading;
 expect(Math.max(...lines.map(l=>l.y))).toBeLessThan(3.525+p.doorSignTextConfig.brailleBaselineMm-6);
 const edited={...p,doorSignTextConfig:{...p.doorSignTextConfig,line1LeftMm:18}};
 expect(normalizeDoorTextReference(edited)).toBe(edited);expect(edited.image).toBe('/my-photo.jpg');
});
