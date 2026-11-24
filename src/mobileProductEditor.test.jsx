import React,{useRef,useState} from 'react';
import {render,screen,fireEvent,act,cleanup} from '@testing-library/react';
import '@testing-library/jest-dom';
import QuantityInput from './components/forms/QuantityInput';
import Field,{FieldErrorsContext} from './components/forms/Field';
import useEditorViewport from './hooks/useEditorViewport';
afterEach(()=>{cleanup();jest.restoreAllMocks();delete window.visualViewport;});
function QuantityDemo(){const [value,setValue]=useState(1);return <form onSubmit={e=>{e.preventDefault();throw Error('Stepper submitted form');}}><FieldErrorsContext.Provider value={{quantity:'Kontrollera antal'}}><Field label="Antal" htmlFor="quantity"><QuantityInput id="quantity" min={1} max={3} value={value} onChange={setValue}/></Field></FieldErrorsContext.Provider></form>;}
test('the labelled native quantity field retains limits and updates without submitting',()=>{
 render(<QuantityDemo/>);
 const input=screen.getByRole('spinbutton',{name:'Antal:'});
 expect(input).toHaveAttribute('aria-invalid','true');
 expect(input).toHaveAttribute('aria-describedby','quantity-error');
 expect(input).toHaveAttribute('min','1');
 expect(input).toHaveAttribute('max','3');
 expect(input).toHaveAttribute('step','1');
 for(const value of [2,3,1]){
  fireEvent.change(input,{target:{value:String(value)}});
  expect(input).toHaveValue(value);
 }
});
function ModalDemo(){const ref=useRef(null);useEditorViewport(true,ref);return <div data-testid="backdrop"><div className="jsf-sign-modal" ref={ref}><div className="jsf-sign-fields" data-testid="pane"><input aria-label="Text"/></div></div></div>;}
function setupViewport(){const viewport=new EventTarget();Object.assign(viewport,{height:700,offsetTop:0,scale:1});Object.defineProperty(window,'visualViewport',{configurable:true,value:viewport});window.matchMedia=jest.fn(()=>({matches:true}));jest.spyOn(window,'requestAnimationFrame').mockImplementation(cb=>{setTimeout(cb,0);return 1;});return viewport;}
test('mobile modal follows keyboard viewport and scrolls only its field pane to reveal the focused control',async()=>{jest.useFakeTimers();const viewport=setupViewport();render(<ModalDemo/>);const backdrop=screen.getByTestId('backdrop'),pane=screen.getByTestId('pane'),input=screen.getByLabelText('Text');expect(backdrop.style.height).toBe('700px');pane.getBoundingClientRect=()=>({top:110,bottom:650});input.getBoundingClientRect=()=>({top:400,bottom:444});fireEvent.focusIn(input);input.focus();viewport.height=350;act(()=>{viewport.dispatchEvent(new Event('resize'));jest.advanceTimersByTime(200);});expect(backdrop.style.height).toBe('350px');expect(pane.scrollTop).toBeGreaterThan(0);cleanup();expect(backdrop.style.height).toBe('');jest.useRealTimers();});
test('manual pinch zoom remains under browser control',()=>{jest.useFakeTimers();const viewport=setupViewport();render(<ModalDemo/>);viewport.scale=2;viewport.height=250;act(()=>{viewport.dispatchEvent(new Event('resize'));jest.advanceTimersByTime(200);});expect(screen.getByTestId('backdrop').style.height).toBe('700px');jest.useRealTimers();});

function PublicDemo(){const ref=useEditorViewport('test');return <div><div ref={ref} data-testid="workspace"><div className="jsf-product-fields" data-testid="public-pane"><textarea aria-label="Skylttext"/></div></div></div>;}
test('mobile viewport panning caused by focus alignment cannot start a scroll feedback loop',()=>{
 jest.useFakeTimers();const viewport=setupViewport();
 const scrollBy=jest.spyOn(window,'scrollBy').mockImplementation(()=>{viewport.offsetTop+=12;viewport.dispatchEvent(new Event('scroll'));window.dispatchEvent(new Event('scroll'));});
 render(<PublicDemo/>);
 const workspace=screen.getByTestId('workspace'),pane=screen.getByTestId('public-pane'),input=screen.getByLabelText('Skylttext');
 workspace.getBoundingClientRect=()=>({top:120});pane.getBoundingClientRect=()=>({top:110,bottom:650});input.getBoundingClientRect=()=>({top:400,bottom:444});
 input.focus();viewport.height=350;
 act(()=>{viewport.dispatchEvent(new Event('resize'));jest.advanceTimersByTime(200);});
 expect(scrollBy).toHaveBeenCalledTimes(1);expect(workspace.style.getPropertyValue('--jsf-editor-height')).toBe('334px');
 act(()=>{for(let i=0;i<20;i++){viewport.offsetTop+=i%2?10:-10;viewport.dispatchEvent(new Event('scroll'));window.dispatchEvent(new Event('scroll'));}jest.advanceTimersByTime(2000);});
 act(()=>{viewport.height=345;viewport.dispatchEvent(new Event('resize'));jest.advanceTimersByTime(200);viewport.height=350;viewport.dispatchEvent(new Event('resize'));jest.advanceTimersByTime(200);});expect(scrollBy).toHaveBeenCalledTimes(1);expect(jest.getTimerCount()).toBe(0);
 jest.useRealTimers();
});
test('keyboard animation is settled once, typing does not reposition the page, and blur keeps the editor height stable',()=>{
 jest.useFakeTimers();const viewport=setupViewport();const scrollBy=jest.spyOn(window,'scrollBy').mockImplementation(()=>{});
 render(<PublicDemo/>);const workspace=screen.getByTestId('workspace'),input=screen.getByLabelText('Skylttext');workspace.getBoundingClientRect=()=>({top:100});input.focus();
 act(()=>{for(const height of [640,590,530,470,400,350]){viewport.height=height;viewport.dispatchEvent(new Event('resize'));jest.advanceTimersByTime(30);}});
 expect(scrollBy).not.toHaveBeenCalled();
 act(()=>jest.advanceTimersByTime(200));expect(scrollBy).toHaveBeenCalledTimes(1);
 fireEvent.change(input,{target:{value:'Text på skylten'}});act(()=>jest.advanceTimersByTime(1000));expect(scrollBy).toHaveBeenCalledTimes(1);
 input.blur();act(()=>jest.advanceTimersByTime(200));expect(workspace.style.getPropertyValue('--jsf-editor-height')).toBe('334px');
 cleanup();act(()=>jest.runOnlyPendingTimers());expect(jest.getTimerCount()).toBe(0);jest.useRealTimers();
});
