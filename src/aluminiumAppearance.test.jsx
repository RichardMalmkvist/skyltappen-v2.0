import React from 'react';
import {render,cleanup} from '@testing-library/react';
import '@testing-library/jest-dom';
import DibondPreview from './components/products/DibondPreview';
import {aluminiumArticles} from './data/aluminiumArticles';
import {newDibondSign} from './data/dibondHelpers';
afterEach(cleanup);
test('existing folded articles have a square frameless surface in editable and static previews',()=>{
 for(const number of ['1230','1231','1232','1233','1234']){
  const product={articleNumber:number},sign=newDibondSign(aluminiumArticles()[0]);
  const {container,unmount}=render(<DibondPreview sign={sign} product={product}/>);
  expect(container.querySelector('[data-dibond-frame]')).toBeNull();
  expect(container.querySelector('[data-aluminium-surface]')).toHaveAttribute('rx','0');unmount();
 }
});
test('regular dibond and flat aluminium keep their existing frame',()=>{
 const {container}=render(<DibondPreview sign={newDibondSign({})} product={{articleNumber:'0706'}}/>);
 const frame=container.querySelector('[data-dibond-frame]');
 expect(frame).toHaveAttribute('fill','#171717');
 expect(frame.nextElementSibling).toHaveAttribute('x','4');
 expect(frame.nextElementSibling).toHaveAttribute('y','4');
 expect(container.querySelector('[data-aluminium-surface]')).toBeNull();
});
