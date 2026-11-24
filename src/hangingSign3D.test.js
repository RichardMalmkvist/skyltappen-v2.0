import {hangingSign3DLayout,supportsHangingSign3D} from './data/hangingSign3D';
const small={productType:'pendlad_skylt',hangingSignSizeMm:1000,hangingSignHeightMm:93};
test.each([[1000,93],[1000,186],[1500,140],[1500,260]])('%s × %s mm supports both single/double sided and green/white models',(width,height)=>{for(const sides of [1,2])for(const categoryId of ['pendlade-vit','pendlade-gron'])expect(supportsHangingSign3D({...small,hangingSignSizeMm:width,hangingSignHeightMm:height,hangingSignSides:sides,categoryId})).toBe(true);});
test('text-only decals, unrelated products and unresolved stack items remain unsupported',()=>{for(const product of [null,{...small,hangingSignTextOnly:true},{...small,vinylText:true},{...small,hangingSignSizeMm:2000},{...small,hangingSignHeightMm:400},{productType:'skylt'}])expect(supportsHangingSign3D(product)).toBe(false);expect(supportsHangingSign3D(small,{hangingStack:{items:[{id:'second'}]}})).toBe(false);});

test('mixed-size panels share the narrower suspension and use the configured gap', () => {
  const large = {...small,hangingSignSizeMm:1500,hangingSignHeightMm:140,hangingSignSides:2};
  const form = {hangingStack:{gapMm:'25',items:[{id:'second',product:large}]}};
  expect(supportsHangingSign3D(small,form)).toBe(true);
  const {panels,width,height,anchor} = hangingSign3DLayout(small,form);
  expect(panels.map(panel => panel.product)).toEqual([small,large]);
  expect(width).toBe(1.5);
  expect(height).toBeCloseTo(.378);
  expect(anchor).toBeCloseTo(.42);
  expect(panels[0].center - .093/2 - (panels[1].center + .14/2)).toBeCloseTo(.025);
});
