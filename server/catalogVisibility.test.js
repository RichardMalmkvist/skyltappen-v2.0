const test=require('node:test'),assert=require('node:assert/strict');
const {storefrontCatalog,hasProofOnlyItems}=require('../src/data/catalogVisibility');
const {guestCatalog}=require('../src/data/catalogAccess');
const {buildProjectOrderCart}=require('./projectOrderItems');
const catalog={categories:[{id:'namnbrickor',status:'open'}],articles:[
 {id:'normal',articleNumber:'0201',categoryId:'namnbrickor',isImplemented:true,previewType:'badge',productType:'namnbricka',name:'Vanlig bricka',unitPrice:100},
 {id:'proof',articleNumber:'0731',categoryId:'namnbrickor',isImplemented:true,storefrontOrderable:false,productType:'standard',name:'Korrekturartikel',unitPrice:200},
]};
test('storefront hides proof-only articles without changing the shared project catalog',()=>{
 const filtered=storefrontCatalog(catalog);
 assert.deepEqual(filtered.articles.map(a=>a.id),['normal']);
 assert.equal(catalog.articles.length,2);
 assert.deepEqual(guestCatalog(catalog).articles.map(a=>a.id),['normal']);
 assert.equal(storefrontCatalog({...catalog,articles:catalog.articles.map(a=>({...a,storefrontOrderable:true}))}).articles.length,2);
});
test('saved carts cannot order proof-only articles by id, number, custom size or hanging package',()=>{
 for(const item of [{articleId:'proof'},{badgeId:'proof',storefrontOrderable:true},{articleNumber:'0731'},{articleNumber:'0731 spec'},{articleId:'normal',hangingStack:{items:[{articleId:'proof'}]}}])assert.equal(hasProofOnlyItems([item],catalog),true);
 assert.equal(hasProofOnlyItems([{articleId:'normal',articleNumber:'0201'}],catalog),false);
});
test('lift selection cannot expose a proof-only complete or paper option through another article',()=>{
 const lifts={...catalog,articles:[...catalog.articles,{id:'lift',elevatorBoards:[{id:'g',options:{complete:{articleId:'proof'},print:{articleId:'normal'}}},{id:'hidden',options:{print:{articleNumber:'0731'}}}]}]};
 const boards=storefrontCatalog(lifts).articles.find(a=>a.id==='lift').elevatorBoards;
 assert.equal(boards.length,1);assert.equal(boards[0].options.complete,null);assert.equal(boards[0].options.print.articleId,'normal');
});
test('proof-only articles still produce project orders both on drawings and without placement',()=>{
 const project={id:'p',signs:[{id:'s1',kind:'catalog',articleId:'proof',position:'S001',quantity:2,configuration:{customText:'Korrektur'}}],drawings:[{id:'d',name:'Plan 1',markers:[{id:'s2',articleId:'proof',position:'S002',quantity:1,x:.3,y:.4,configuration:{customText:'På ritning'}}]}]};
 const cart=buildProjectOrderCart(project,catalog);
 assert.equal(cart.length,2);assert.ok(cart.every(item=>item.articleId==='proof'));
 assert.equal(cart.reduce((sum,item)=>sum+item.quantity,0),3);
});
test('the storefront order endpoint rejects proof-only carts even for logged-in admins',async()=>{
 const source=require('node:fs').readFileSync(require('node:path').join(__dirname,'server.js'),'utf8');
 const route=source.match(/app\.post\("\/api\/orders", asyncRoute\([\s\S]*?\n\}\)\);/)[0];
 let handler;
 require('node:vm').runInNewContext(route,{app:{post:(_path,fn)=>{handler=fn;}},asyncRoute:fn=>fn,accountSession:async req=>req.session,readCatalog:async()=>catalog,hasProofOnlyItems});
 for(const role of ['bestallare','personal','admin']){
  const response={status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
  await handler({headers:{authorization:'Bearer test'},session:{role},body:{cart:[{articleId:'proof',storefrontOrderable:true}]}},response);
  assert.equal(response.code,403);assert.match(response.body.message,/Projekt & Korrektur/);
 }
});
