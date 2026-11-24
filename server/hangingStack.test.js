const {test}=require('node:test'),assert=require('node:assert/strict'),express=require('express');
const {markerFields}=require('./projectMarkerFields');const {installDrawingLibrary}=require('./drawingLibrary');const {buildProjectOrderItems}=require('./projectOrderGrouping');
const {expandHangingStackMarkers,validateProjectConfiguration}=require('../src/data/hangingStack');
const articles=[{id:'one',articleNumber:'0301',name:'Skylt',productType:'pendlad_skylt',previewType:'hanging_sign',unitPrice:100,hangingSignSides:1},{id:'two',articleNumber:'0302',name:'Skylt 2',productType:'pendlad_skylt',previewType:'hanging_sign',unitPrice:200,hangingSignSides:2}];
const configuration={customText:'Reception',hangingStack:{gapMm:10,items:[{id:'child',articleId:'two',configuration:{customText:'Toalett'}}]}};
test('One saved marker expands to independent production rows with the same position and correct quantities/prices',()=>{
 const marker={id:'m',articleId:'one',position:'S040',page:1,x:.5,y:.5,quantity:2,configuration};const expanded=expandHangingStackMarkers([marker],articles);assert.equal(expanded.length,2);assert.deepEqual(expanded.map(m=>m.position),['S040','S040']);
 const items=buildProjectOrderItems([marker],articles);assert.equal(items.length,2);assert.deepEqual(items.map(i=>[i.articleNumber,i.quantity,i.unitPrice]),[['0301',2,100],['0302',2,200]]);assert.equal(items[1].configuration.customText,'Toalett');assert.equal(items[1].configuration.hangingStack,undefined);assert.match(items[1].notes,/Skylt 2 av 2/);
});
const targets=Array.from({length:12},(_,i)=>({id:'target-'+i,name:'Målpunkt '+i,image:'data:image/png;base64,'+'A'.repeat(50000)}));
const twoRows={customTextLine1:'',customTextLine2:'',hangingSignWithoutText:true,hangingTargetRows:2,hangingTargetPosition:'left',hangingTargetRowAssignments:Object.fromEntries(targets.map((s,i)=>[s.id,i<3?1:2])),hangingSignSymbols:targets.map(s=>s.id),hangingSignSymbolAssets:targets};
test('Two rows of targets retain artwork and row assignments instead of hitting the old 12KB limit',()=>{
 const saved=markerFields({articleId:'one',configuration:twoRows});assert.deepEqual(saved.configuration,twoRows);assert.ok(JSON.stringify(twoRows).length>12000);
 assert.throws(()=>validateProjectConfiguration({hangingSignSymbolAssets:[{image:'A'.repeat(8*1024*1024)}]}),/symbolbild/);
 assert.throws(()=>validateProjectConfiguration({hangingStack:{gapMm:10,items:Array(8).fill({id:'x',articleId:'one',configuration:{}})}}),/8 skyltar/);
});
test('Drawing-library register saves two target rows and grouped signs through the actual endpoint',async()=>{
 const app=express();app.use(express.json({limit:'5mb'}));const library={folders:[],items:[{id:'d',name:'Plan',type:'file',markers:[]}]};let writes=0;
 installDrawingLibrary(app,{read:async()=>structuredClone(library),write:async next=>{Object.assign(library,next);writes++;},canAccess:async()=>true,canEdit:async()=>true});
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 try{const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/drawing-library/items/d/register',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Plan',markers:[{id:'m',position:'S040',articleId:'one',x:.5,y:.5,page:1,configuration:{...twoRows,hangingStack:configuration.hangingStack}}]})});assert.equal(response.status,200,JSON.stringify(await response.clone().json()));assert.equal(writes,1);assert.equal(library.items[0].markers.length,1);assert.equal(library.items[0].markers[0].configuration.hangingSignSymbolAssets.length,12);assert.equal(library.items[0].markers[0].configuration.hangingStack.items.length,1);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
