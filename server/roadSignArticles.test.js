const test=require('node:test'),assert=require('node:assert/strict');
const {installRoadSignArticles,withRoadSignModel}=require('../src/data/roadSignModels');
const {installParkingPole,poleError}=require('../src/data/parkingPole');
const {expandHangingStackMarkers}=require('../src/data/hangingStack');
const {buildProjectOrderCart}=require('./projectOrderItems');
const {roadAssemblyLayout,ROAD_SIGN_GAP_MM}=require('../src/data/roadSignAssembly');
test('wide road article reuses its CAD at the admin width, keeping depth, artwork and assembly dimensions',()=>{
 const THREE=require('three'),{roadSignModel}=require('../src/data/roadSignModels'),{resizeRoadSignGeometry}=require('../src/data/roadSignGeometry');
 const source=withRoadSignModel({id:'wide',roadSignWidthMm:1200,defaultSignArtwork:{id:'print'}},'800x200'),spec=roadSignModel(source);
 assert.equal(source.format,'1200 × 200 mm');assert.equal(source.dibondConfig.defaultWidthMm,1200);assert.equal(source.defaultSignArtwork.id,'print');
 const geometry=new THREE.BoxGeometry(.8,.2,.025);resizeRoadSignGeometry(geometry,spec);
 const size=geometry.boundingBox.getSize(new THREE.Vector3());assert.ok(Math.abs(size.x-1.2)<.000001);assert.ok(Math.abs(size.y-.2)<.000001);assert.ok(Math.abs(size.z-.025)<.000001);
 const layout=roadAssemblyLayout([{product:source,form:{}}]);assert.equal(layout.width,1200);assert.equal(layout.panels[0].height,200);geometry.dispose();
});
const catalog=()=>installParkingPole(installRoadSignArticles({categories:[{id:'parkeringsskylt',title:'Parkeringsskylt'}],articles:[{id:'other',articleNumber:''}]}));

test('blank template resizes the actual sign geometry in both dimensions, preserving depth and two supports on tall signs',()=>{
 const THREE=require('three'),{roadSignModel}=require('../src/data/roadSignModels'),{resizeRoadSignGeometry}=require('../src/data/roadSignGeometry');
 const blank=catalog().articles.find(a=>a.roadSignBlank),article=withRoadSignModel({...blank,roadSignWidthMm:750,roadSignHeightMm:500},blank.roadSignModel),spec=roadSignModel(article);
 assert.equal(spec.file,'road-sign-400x400.glb');assert.equal(article.format,'750 × 500 mm');assert.equal(article.defaultSignArtwork,undefined);assert.equal(article.dibondConfig.defaultHeightMm,500);
 const geometry=new THREE.BoxGeometry(.4,.4,.025);resizeRoadSignGeometry(geometry,spec);const size=geometry.boundingBox.getSize(new THREE.Vector3());
 assert.ok(Math.abs(size.x-.75)<.000001);assert.ok(Math.abs(size.y-.5)<.000001);assert.ok(Math.abs(size.z-.025)<.000001);geometry.dispose();
});
test('Inventor face spacing is automatic for all combinations, including previously saved gaps',()=>{
 const [small,large]=catalog().articles.filter(a=>a.roadSignModel);
 for(const products of [[large,small,small],[small,large],[large,large]])for(const storedGap of [undefined,0,10,50]){
  const layout=roadAssemblyLayout(products.map((product,i)=>({id:String(i),product,form:{}})),storedGap);
  layout.panels.slice(1).forEach((panel,i)=>assert.equal(panel.y-layout.panels[i].y-layout.panels[i].height,ROAD_SIGN_GAP_MM));
  assert.equal(layout.height,products.reduce((sum,p)=>sum+p.dibondConfig.defaultHeightMm,0)+.5*(products.length-1));
 }
 assert.equal(ROAD_SIGN_GAP_MM,.5);
});
test('six distinct proof-only templates with blank numbers; installation preserves admin edits',()=>{
 const c=catalog(),roads=c.articles.filter(a=>a.roadSignModel);
 assert.equal(roads.length,6);assert.ok(roads.every(a=>a.articleNumber===''&&a.unitPrice===0&&a.storefrontOrderable===false&&a.isImplemented));
 roads[0].name='Egen variant';assert.equal(installRoadSignArticles(c),c);assert.equal(installParkingPole(c),c);
 const swapped=withRoadSignModel(roads[0],'400x400');assert.equal(swapped.dibondConfig.defaultHeightMm,400);assert.equal(swapped.name,'Egen variant');
 const upgraded=installParkingPole({articles:[{id:'my-pole',articleNumber:'1503',name:'Min stolpe',previewType:'image',image:'my-photo.png'}]});
 assert.equal(upgraded.articles.length,1);assert.equal(upgraded.articles[0].id,'my-pole');assert.equal(upgraded.articles[0].image,'my-photo.png');assert.equal(upgraded.articles[0].previewType,'parking_pole');
});

test('round model upgrades existing catalogues without replacing edited parking articles',()=>{
 const old={articles:[{id:'jsf-road-sign-400x200',name:'Min egna skylt',defaultSignArtwork:{id:'original'}}],productUpdates:['parking-road-sign-models-v1']},next=installRoadSignArticles(old),round=next.articles.find(a=>a.roadSignModel==='dia400');
 assert.strictEqual(next.articles[0],old.articles[0]);assert.equal(round.format,'Ø 450 mm');assert.equal(round.dibondConfig.fixedDimensions,true);assert.equal(round.dibondConfig.defaultCornerRadiusMm,225);assert.equal(round.storefrontOrderable,false);assert.strictEqual(installRoadSignArticles(next),next);
});
test('pole defaults, limits and order quantities retain entered height; assembly expands into separate items',()=>{
 const c=catalog(),[small,large]=c.articles.filter(a=>a.roadSignModel),pole=c.articles.find(a=>a.articleNumber==='1503');
 assert.equal(pole.unitPrice,1250);assert.equal(pole.storefrontOrderable,true);assert.equal(poleError({poleHeightMm:2500}),null);assert.ok(poleError({poleHeightMm:''}));assert.ok(poleError({poleHeightMm:7000}));
 const configuration={dibondSign:{widthMm:400,heightMm:400,lines:[]},hangingStack:{gapMm:10,items:[{id:'s',articleId:small.id,configuration:{dibondSign:{widthMm:400,heightMm:200,lines:[]}}},{id:'p',articleId:pole.id,configuration:{poleHeightMm:2500}}]}};
 const marker={id:'m',articleId:large.id,position:'S001',quantity:2,configuration};
 const expanded=expandHangingStackMarkers([marker],c.articles);assert.equal(expanded.length,3);assert.ok(expanded.every(m=>m.position==='S001'));
 const cart=buildProjectOrderCart({signs:[marker],drawings:[]},c),pipe=cart.find(i=>i.articleNumber==='1503');
 assert.equal(cart.length,3);assert.equal(pipe.quantity,2);assert.equal(pipe.poleHeightMm,2500);assert.match(pipe.format,/2500/);assert.equal(pipe.lineTotal,2500);
 configuration.hangingStack.items[1].configuration.poleHeightMm=500;assert.throws(()=>expandHangingStackMarkers([marker],c.articles),/rymma/);
});
test('saving an incorrect article preset cannot permanently remove pole 1503 from assemblies',()=>{
 const c=catalog(),index=c.articles.findIndex(a=>a.articleNumber==='1503');
 c.articles[index]={...c.articles[index],name:'Min stolpe',unitPrice:1400,previewType:'destination_cube',productType:'malpunktsskylt_vagg',fields:{destinationCube:true},image:'own-image.png'};
 const fixed=installParkingPole(c),pole=fixed.articles[index];
 assert.equal(pole.previewType,'parking_pole');assert.equal(pole.fields.poleHeight,true);
 assert.equal(pole.name,'Min stolpe');assert.equal(pole.unitPrice,1400);assert.equal(pole.image,'own-image.png');
 assert.equal(fixed.articles.length,c.articles.length);assert.strictEqual(installParkingPole(fixed),fixed);
});

test('two poles use independent edge distances and expand into the correct order quantity',()=>{
 const {roadAssemblyError}=require('../src/data/roadSignAssembly'),c=catalog(),source=c.articles.find(a=>a.roadSignModel==='800x200'),panel=withRoadSignModel({...source,roadSignWidthMm:1200},'800x200'),pole=c.articles.find(a=>a.articleNumber==='1503');
 const form={dibondSign:{widthMm:1200,heightMm:200,lines:[]},hangingStack:{gapMm:.5,items:[{id:'pole',articleId:pole.id,product:pole,configuration:{poleHeightMm:2500,poleCount:2,poleLeftInsetMm:150,poleRightInsetMm:200}}]}};
 const layout=roadAssemblyLayout([{product:panel,form},{product:pole,form:form.hangingStack.items[0].configuration}]);assert.deepEqual(layout.poleXs,[150,1000]);assert.equal(roadAssemblyError(layout),null);
 const cart=buildProjectOrderCart({signs:[{id:'two',articleId:panel.id,position:'S001',quantity:3,configuration:form}],drawings:[]},{articles:[panel,pole]});
 const poles=cart.find(i=>i.articleNumber==='1503');assert.equal(poles.quantity,6);assert.equal(poles.lineTotal,7500);assert.equal(poles.configuration.poleRightInsetMm,200);assert.equal(cart.find(i=>i.articleId===panel.id).quantity,3);
 form.hangingStack.items[0].configuration.poleRightInsetMm=1100;assert.throws(()=>buildProjectOrderCart({signs:[{id:'bad',articleId:panel.id,configuration:form}]},{articles:[panel,pole]}),/Stolparnas centrum/);
});

test('proof template keeps 200 mm height while the saved instance controls CAD and assembly width',()=>{
 const {roadSignModel}=require('../src/data/roadSignModels'),c=catalog(),article=c.articles.find(a=>a.id==='jsf-road-sign-variable-width-200');
 assert.equal(article.storefrontOrderable,false);assert.equal(article.dibondConfig.fixedDimensions,false);assert.equal(article.dibondConfig.minHeightMm,200);assert.equal(article.dibondConfig.maxHeightMm,200);
 for(const width of [550,800,1200]){const form={dibondSign:{widthMm:width,heightMm:200,uploadedArtwork:{id:'own-original'}}},model=roadSignModel(article,form.dibondSign),layout=roadAssemblyLayout([{product:article,form}]);assert.equal(model.file,'road-sign-800x200.glb');assert.equal(model.widthMm,width);assert.equal(layout.width,width);assert.equal(layout.panels[0].height,200);}
 assert.equal(article.roadSignWidthMm,550);
});
