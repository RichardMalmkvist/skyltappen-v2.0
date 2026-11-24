const font=require('./tratex-vit.json');
function tratexTextError(value){const char=[...String(value||'').normalize('NFC')].find(char=>!/[\r\n\t]/.test(char)&&!font.glyphs[char]);return char?'Tecknet ”'+char+'” saknas i Tratex vit.':null;}
// Unsupported input stays editable, but cannot silently enter a production file.
function tratexGlyph(char){return font.glyphs[char]||{advance:650,bbox:[50,0,600,800],d:'M50 0L600 0L600 800L50 800Z M100 50L100 750L550 750L550 50Z'};}
function measureTratex(value,sizeMm){
 const text=String(value||'').normalize('NFC'),scale=sizeMm/font.capHeight;let advance=0,previous='',ascent=0,descent=0;
 for(const char of text||'H'){const g=tratexGlyph(char);advance+=(font.kerning[previous+char]||0)+g.advance;previous=char;if(g.d){ascent=Math.max(ascent,g.bbox[3]*scale);descent=Math.max(descent,-g.bbox[1]*scale);}}
 return {fontSize:font.unitsPerEm*scale,width:text?advance*scale:0,ascent:ascent||sizeMm,descent};
}
function tratexCurves(value,sizeMm,x,baseline){
 const scale=sizeMm/font.capHeight;let cursor=0,previous='',body='';
 for(const char of String(value||'').normalize('NFC')){const g=tratexGlyph(char);cursor+=font.kerning[previous+char]||0;if(g.d)body+=`<path transform="translate(${cursor} 0)" d="${g.d}"/>`;cursor+=g.advance;previous=char;}
 return `<g transform="translate(${x} ${baseline}) scale(${scale} ${-scale})">${body}</g>`;
}
module.exports={measureTratex,tratexCurves,tratexTextError};
