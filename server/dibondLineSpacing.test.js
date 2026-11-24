const {test}=require('node:test'),assert=require('node:assert/strict');
const {layoutDibond}=require('../src/data/dibondGeometry');
const {measureText}=require('./productionText');
const {prepareDibond}=require('./dibondProduction');
const line={text:'Barnhälsovård\nKvinnohälsovård\nSocialtjänsten\nÖppna förskolan',sizeMm:30,lineGapMm:16,lineSpacingMode:'uniform',firstLineBottomMm:120};
const sign={widthMm:900,heightMm:700,lines:[line],symbols:[]};
test('Rows with accents and descenders use exactly the same reference-centre pitch in production',()=>{
 const {layout}=prepareDibond({previewType:'dibond_sign',dibondSign:sign});
 for(let i=1;i<layout.lines.length;i++)assert.ok(Math.abs(layout.lines[i].y-layout.lines[i-1].y-46)<1e-8);
 assert.ok(Math.abs(layout.lines[0].y+layout.lines[0].descent-120)<1e-8);
 const varied=layoutDibond({...sign,lines:[{...line,text:'g j\nÖÅÄ\nabc\nygj\n'}]},measureText);
 assert.equal(varied.lines.length,5);for(let i=1;i<varied.lines.length;i++)assert.ok(Math.abs(varied.lines[i].y-varied.lines[i-1].y-46)<1e-8);
});
test('Saved outline-spaced blocks preserve their previous glyph-dependent positions',()=>{
 const legacy={...sign,lines:[{...line,lineSpacingMode:undefined}]},layout=layoutDibond(legacy,measureText);
 for(let i=1;i<layout.lines.length;i++){const previous=layout.lines[i-1],current=layout.lines[i];assert.ok(Math.abs(current.y-previous.y-previous.descent-16-current.ascent)<1e-8);}
});
