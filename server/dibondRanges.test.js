const {test}=require('node:test'),assert=require('node:assert/strict');
const {prepareDibond}=require('./dibondProduction');
const {installDibondArticles}=require('../src/data/dibondArticles');
const c=installDibondArticles({articles:[{articleNumber:'0705',id:'a'},{articleNumber:'0706',id:'b'}]});
test('Production accepts each full range and rejects dimensions outside either side',()=>{
 for(const product of c.articles){
  const config=product.dibondConfig,sign={widthMm:config.minWidthMm,heightMm:config.minHeightMm,lines:[{text:'X',sizeMm:2}]};
  assert.doesNotThrow(()=>prepareDibond({...product,dibondSign:sign}));
  assert.doesNotThrow(()=>prepareDibond({...product,dibondSign:{...sign,widthMm:config.maxWidthMm,heightMm:config.maxHeightMm}}));
  for(const delta of [{widthMm:config.minWidthMm-1},{heightMm:config.minHeightMm-1},{widthMm:config.maxWidthMm+1},{heightMm:config.maxHeightMm+1}])assert.throws(()=>prepareDibond({...product,dibondSign:{...sign,...delta}}));
 }
});
