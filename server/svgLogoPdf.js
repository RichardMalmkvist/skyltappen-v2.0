const sax=require('sax');
const SVGtoPDF=require('svg-to-pdfkit');
const graphics=new Set(['path','rect','circle','ellipse','polygon','polyline','line','text','image','use']);
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const cache=new Map(),multiplyStates=new WeakMap();

// svg-to-pdfkit ignores CSS mix-blend-mode. Keep the original paint order and
// gradients, but apply the shading overlays with native PDF Multiply instead.
function logoLayers(source){
 if(cache.has(source))return cache.get(source);
 const parser=sax.parser(true),stack=[];let root;
 parser.onopentag=node=>{const entry={tag:node.name,attrs:node.attributes,children:[]};if(stack.length)stack.at(-1).children.push(entry);else root=entry;stack.push(entry);};
 parser.ontext=text=>{if(stack.length)stack.at(-1).children.push(text);};parser.onclosetag=()=>stack.pop();parser.write(source).close();
 const multiplyClasses=new Set();
 for(const rule of source.matchAll(/([^{}]+)\{([^{}]+)\}/g))if(/mix-blend-mode\s*:\s*multiply\b/i.test(rule[2]))for(const match of rule[1].matchAll(/\.([\w-]+)/g))multiplyClasses.add(match[1]);
 const layers=[];
 function visit(node,inherited=false){
  if(typeof node==='string'||node.tag==='defs')return;
  const multiply=inherited||/mix-blend-mode\s*:\s*multiply\b/i.test(node.attrs.style||'')||String(node.attrs.class||'').split(/\s+/).some(name=>multiplyClasses.has(name));
  if(graphics.has(node.tag)){let layer=layers.at(-1);if(!layer||layer.multiply!==multiply){layer={multiply,nodes:new Set()};layers.push(layer);}layer.nodes.add(node);return;}
  for(const child of node.children)visit(child,multiply);
 }
 visit(root);
 function serialize(node,selected,full=false){
  if(typeof node==='string')return full?escape(node):'';
  full=full||node.tag==='defs'||node.tag==='style'||selected.has(node);
  if(graphics.has(node.tag)&&!full)return '';
  const children=node.children.map(child=>serialize(child,selected,full)).join('');
  if(!full&&node!==root&&!children)return '';
  return '<'+node.tag+Object.entries(node.attrs).map(([key,value])=>' '+key+'="'+escape(value)+'"').join('')+'>'+children+'</'+node.tag+'>';
 }
 const result=layers.map(layer=>({multiply:layer.multiply,svg:serialize(root,layer.nodes)}));cache.set(source,result);return result;
}
function drawSvgLogo(doc,source,x,y,options){
 for(const layer of logoLayers(source)){
  doc.save();
  try{
   if(layer.multiply){
    let state=multiplyStates.get(doc);if(!state){state=doc.ref({Type:'ExtGState',BM:'Multiply'});state.end();multiplyStates.set(doc,state);}
    doc.page.ext_gstates.JSFLogoMultiply=state;doc.addContent('/JSFLogoMultiply gs');
   }
   SVGtoPDF(doc,layer.svg,x,y,options);
  }finally{doc.restore();}
 }
}
module.exports={drawSvgLogo,logoLayers};
