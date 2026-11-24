import React from 'react';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import ProjectProduct3DPreview from './components/projects/ProjectProduct3DPreview';
import {product3DView} from './data/product3DView';

jest.mock('./components/products/FittedProductPreview',()=>({children})=><>{children}</>);
jest.mock('./components/products/HangingSign3D',()=>function Viewer({form}){
 return <div data-testid="hanging-viewer">{1+(form.hangingStack?.items.length||0)}</div>;
});
jest.mock('./components/products/BentMetal3D',()=>function Viewer({form,onSignChange,onUnavailable,frontViewRequest}){return <div data-testid="viewer" data-front={frontViewRequest}><span>{form.dibondSign.lines[0].text}</span><button type="button" onClick={()=>onSignChange({...form.dibondSign,lines:[{text:'Moved text'}]})}>Move text</button><button type="button" onClick={onUnavailable}>WebGL unavailable</button></div>;});
afterEach(cleanup);
const product={id:'alu',articleNumber:'1230',previewType:'dibond_sign',productType:'dibondskylt'};
const form={dibondSign:{widthMm:600,heightMm:400,lines:[{text:'Current project text'}]}};

test('Project editor uses current configuration, shares editing changes and supports front view',async()=>{
 const changed=jest.fn();render(<ProjectProduct3DPreview product={product} form={form} onChange={changed}><svg data-testid="source"/></ProjectProduct3DPreview>);
 await screen.findByText('Current project text');
 fireEvent.click(screen.getByText(/Redigera fram/));expect(screen.getByTestId('viewer').dataset.front).toBe('1');
 fireEvent.click(screen.getByText('Move text'));expect(changed).toHaveBeenCalledWith({dibondSign:{...form.dibondSign,lines:[{text:'Moved text'}]}});
 expect(form.dibondSign.lines[0].text).toBe('Current project text');
 fireEvent.click(screen.getByText('WebGL unavailable'));await waitFor(()=>expect(screen.queryByTestId('viewer')).toBeNull());
 expect(screen.getByTestId('source')).toBeTruthy();
});

test('Read-only project preview cannot alter sign configuration',async()=>{
 const changed=jest.fn();render(<ProjectProduct3DPreview readOnly product={product} form={form} onChange={changed}><svg/></ProjectProduct3DPreview>);
 await screen.findByText('Current project text');fireEvent.click(screen.getByText('Move text'));
 expect(changed).not.toHaveBeenCalled();expect(screen.queryByText(/Redigera fram/)).toBeNull();
});

test('Unsupported products retain their existing preview',()=>{
 expect(product3DView({articleNumber:'unknown'})).toBeNull();
 expect(product3DView({articleNumber:'0301',productType:'pendlad_skylt'},{hangingStack:{items:[{}]}})).toBeNull();
 render(<ProjectProduct3DPreview product={{id:'unknown'}} form={{}}><svg data-testid="source"/></ProjectProduct3DPreview>);
 expect(screen.getByTestId('source')).toBeTruthy();
});

test('Adding and removing a second hanging sign keeps the project 3D viewer mounted',async()=>{
 const product={id:'0303',articleNumber:'0303',productType:'pendlad_skylt',hangingSignSizeMm:1000,hangingSignHeightMm:93};
 const {rerender}=render(<ProjectProduct3DPreview product={product} form={{}}><svg/></ProjectProduct3DPreview>);
 const viewer=await screen.findByTestId('hanging-viewer');
 expect(viewer.textContent).toBe('1');
 const form={hangingStack:{gapMm:10,items:[{id:'second',articleId:product.id,product,configuration:{customText:'Sluss'}}]}};
 rerender(<ProjectProduct3DPreview product={product} form={form}><svg/></ProjectProduct3DPreview>);
 expect(screen.getByTestId('hanging-viewer')).toBe(viewer);
 expect(viewer.textContent).toBe('2');
 rerender(<ProjectProduct3DPreview product={product} form={{}}><svg/></ProjectProduct3DPreview>);
 expect(screen.getByTestId('hanging-viewer')).toBe(viewer);
 expect(viewer.textContent).toBe('1');
});
