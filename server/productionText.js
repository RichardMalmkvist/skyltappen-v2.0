const fonts={regular:require('./plotter-assets/arial-regular.json'),bold:require('./plotter-assets/arial-bold.json'),italic:require('./plotter-assets/arial-italic.json')};
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
const fail=message=>{throw new Error(message);};
function textCurves(value,font,capMm,x,baseline){
  const text=String(value||'').normalize('NFC');if(!text.trim())fail('Skylttext saknas.');
  if(text.length>300)fail('Skylttexten är för lång.');
  const scale=capMm/font.capHeight;let cursor=0,previous='',body='',minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  for(const char of text){
    const glyph=font.glyphs[char];if(!glyph)fail('Tecknet ”'+char+'” saknar produktionskurvor.');
    cursor+=(font.kerning[previous+char]||0);
    if(glyph.d){body+='<path transform="translate('+cursor+' 0)" d="'+glyph.d+'"/>';minX=Math.min(minX,(cursor+glyph.bbox[0])*scale+x);maxX=Math.max(maxX,(cursor+glyph.bbox[2])*scale+x);minY=Math.min(minY,baseline-glyph.bbox[3]*scale);maxY=Math.max(maxY,baseline-glyph.bbox[1]*scale);}
    cursor+=glyph.advance;previous=char;
  }
  return {body:'<g transform="translate('+x+' '+baseline+') scale('+scale+' '+(-scale)+')">'+body+'</g>',bbox:[minX,minY,maxX,maxY]};
}

function measureText(value,sizeMm,bold){
 const font=bold?fonts.bold:fonts.regular,text=String(value||'').normalize('NFC'),scale=sizeMm/font.capHeight;
 let advance=0,previous='',ascent=0,descent=0;
 for(const char of text||'H'){const glyph=font.glyphs[char];if(!glyph)fail('Tecknet ”'+char+'” saknar produktionskurvor.');advance+=(font.kerning[previous+char]||0)+glyph.advance;previous=char;if(glyph.d){ascent=Math.max(ascent,glyph.bbox[3]*scale);descent=Math.max(descent,-glyph.bbox[1]*scale);}}
 return {fontSize:font.unitsPerEm*scale,width:text?advance*scale:0,ascent:ascent||sizeMm,descent};
}
module.exports={fonts,textCurves,measureText};
