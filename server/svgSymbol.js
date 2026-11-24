const sax=require('sax');
const MAX_SVG_BYTES=1024*1024;
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const fail=message=>{throw Object.assign(new Error(message),{validation:true});};
const paintProps=new Set(['fill','stroke','fill-rule','clip-rule','fill-opacity','stroke-opacity','opacity','stroke-width','stroke-miterlimit','stroke-linecap','stroke-linejoin','stroke-dasharray','stroke-dashoffset','color','stop-color','stop-opacity','clip-path']);
const ignoredStyles=new Set(['shape-rendering','text-rendering','image-rendering']);
const tags=new Set(['svg','g','defs','path','rect','circle','ellipse','polygon','polyline','line','clipPath','linearGradient','radialGradient','stop']);
const geometryAttrs=new Set(['d','x','y','x1','y1','x2','y2','width','height','rx','ry','cx','cy','r','fx','fy','points','offset']);
function safeProperty(key,value){
 value=String(value).trim();
 if(!paintProps.has(key)||value.length>1000||/[<>"'\\;]/.test(value)||/(?:javascript:|https?:|data:|expression|@)/i.test(value))fail('SVG-symbolen innehåller en funktion som inte stöds. Exportera som enkla vektorkurvor från Corel.');
 if(/url\s*\(/i.test(value)&&!/^url\(#[A-Za-z_][\w.-]*\)$/.test(value))fail('SVG-symboler får inte länka till externa filer.');
 return value;
}
function declarations(text){
 const props={};
 for(const declaration of text.split(';')){
  if(!declaration.trim())continue;
  const colon=declaration.indexOf(':');if(colon<1)fail('SVG-symbolens formatregler kunde inte läsas.');
  const key=declaration.slice(0,colon).trim(),value=declaration.slice(colon+1).trim().replace(/\s*!important\s*$/,'');
  if(ignoredStyles.has(key))continue;
  props[key]=safeProperty(key,value);
 }
 return props;
}
function sanitizeSvgSymbol(input,{maxBytes=MAX_SVG_BYTES,maxElements=10000}={}){
 const source=Buffer.isBuffer(input)?input.toString('utf8'):String(input);
 if(Buffer.byteLength(source)>maxBytes||/<!ENTITY/i.test(source))fail('SVG-filen är för stor eller innehåller externa entiteter.');
 const parser=sax.parser(true,{trim:false}),stack=[],classes=new Map();let root=null,css='',count=0,skip=0,depth=0,inStyle=false;
 parser.onopentag=node=>{
  depth++;if(depth>50||++count>maxElements)fail('SVG-symbolen är för komplicerad. Förenkla kurvorna i Corel.');
  const tag=node.name.split(':').pop();
  if(skip)return;
  if(['metadata','title','desc','namedview'].includes(tag)){skip=depth;return;}
  if(tag==='style'){inStyle=true;return;}
  if(!tags.has(tag))fail(tag==='text'||tag==='tspan'?'Omvandla symbolens text till kurvor i Corel innan du laddar upp SVG-filen.':tag==='image'?'SVG-symbolen innehåller en pixelbild. Använd ett original med vektorkurvor.':'SVG-elementet '+tag+' stöds inte. Exportera symbolen som vektorkurvor.');
  for(const key of Object.keys(node.attributes))if(/^on/i.test(key)||/href$/i.test(key))fail('SVG-symboler får inte innehålla script eller externa bilder.');
  const item={tag,attrs:node.attributes,children:[]};
  if(!root){if(tag!=='svg')fail('Filen är inte en SVG-symbol.');root=item;}else if(!stack.length||tag==='svg')fail('SVG-symbolens struktur är ogiltig.');else stack[stack.length-1].children.push(item);
  stack.push(item);
 };
 parser.ontext=text=>{if(inStyle&&!skip)css+=text;};parser.oncdata=parser.ontext;
 parser.onclosetag=name=>{const tag=name.split(':').pop();if(skip===depth)skip=0;else if(!skip){if(tag==='style')inStyle=false;else stack.pop();}depth--;};
 parser.onerror=()=>fail('SVG-symbolen kunde inte läsas.');
 parser.write(source).close();if(!root)fail('Filen saknar en SVG-symbol.');
 const style=css.replace(/\/\*[\s\S]*?\*\//g,'');
 const rules=[...style.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
 if(style.replace(/([^{}]+)\{([^{}]*)\}/g,'').trim())fail('SVG-symbolens formatregler stöds inte.');
 for(const rule of rules){
  const props=declarations(rule[2]);
  for(const selector of rule[1].split(',')){const match=/^\.([A-Za-z_][\w-]*)$/.exec(selector.trim());if(!match)fail('Använd enkla SVG-klasser eller vektorkurvor i symbolen.');classes.set(match[1],{...classes.get(match[1]),...props});}
 }
 let viewBox=String(root.attrs.viewBox||'').trim().split(/[\s,]+/).map(Number);
 if(viewBox.length!==4||!viewBox.every(Number.isFinite)||viewBox[2]<=0||viewBox[3]<=0){const w=parseFloat(root.attrs.width),h=parseFloat(root.attrs.height);if(!(w>0&&h>0))fail('SVG-symbolen saknar giltiga mått.');viewBox=[0,0,w,h];}
 const aspectRatio=viewBox[2]/viewBox[3];if(aspectRatio<.05||aspectRatio>20)fail('Symbolbildens proportioner är för extrema.');
 let shapes=0;
 function serialize(node){
  let attrs='',props={};
  for(const name of String(node.attrs.class||'').split(/\s+/))props={...props,...classes.get(name)};
  for(const [key,value] of Object.entries(node.attrs)){
   if(paintProps.has(key))props[key]=safeProperty(key,value);
   else if(key==='style')props={...props,...declarations(value)};
   else if(geometryAttrs.has(key)&&node!==root){if(!/^[0-9a-zA-Z+.,%\s-]+$/.test(value)||/nan|infinity/i.test(value))fail('SVG-symbolen innehåller ogiltiga kurvdata.');attrs+=' '+key+'="'+esc(value)+'"';}
   else if(key==='transform'||key==='gradientTransform'){if(!/^(?:\s*(?:matrix|translate|scale|rotate|skewX|skewY)\s*\([0-9eE+.,\s-]+\)\s*)+$/.test(value))fail('SVG-symbolens transformering är ogiltig.');attrs+=' '+key+'="'+esc(value)+'"';}
   else if(key==='id'){if(!/^[A-Za-z_][\w.-]*$/.test(value))fail('SVG-symbolen innehåller ett ogiltigt id.');attrs+=' id="'+esc(value)+'"';}
   else if(['gradientUnits','clipPathUnits','spreadMethod'].includes(key)){if(!/^[A-Za-z]+$/.test(value))fail('Ogiltiga SVG-inställningar.');attrs+=' '+key+'="'+value+'"';}
  }
  for(const [key,value] of Object.entries(props))attrs+=' '+key+'="'+esc(value)+'"';
  if(['path','rect','circle','ellipse','polygon','polyline','line'].includes(node.tag))shapes++;
  if(node===root)attrs=' xmlns="http://www.w3.org/2000/svg" version="1.1" width="'+viewBox[2]+'" height="'+viewBox[3]+'" viewBox="'+viewBox.join(' ')+'"'+attrs;
  return '<'+node.tag+attrs+'>'+node.children.map(serialize).join('')+'</'+node.tag+'>';
 }
 const svg=serialize(root);if(!shapes)fail('SVG-symbolen innehåller inga vektorkurvor.');
 return {svg,viewBox,aspectRatio};
}
function decodeSvgDataUrl(data){
 const match=/^data:image\/svg\+xml(?:;charset=[\w-]+)?;base64,([A-Za-z0-9+/]+={0,2})$/i.exec(String(data));
 if(!match)fail('SVG-symbolens filformat är ogiltigt.');
 return sanitizeSvgSymbol(Buffer.from(match[1],'base64'));
}
module.exports={MAX_SVG_BYTES,sanitizeSvgSymbol,decodeSvgDataUrl};
