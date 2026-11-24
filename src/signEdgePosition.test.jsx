import React,{useState} from 'react';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import SignPositionFields from './components/products/SignPositionFields';
import DibondInteraction from './components/products/DibondInteraction';
import {dibondItemBounds} from './data/dibondManipulation';

afterEach(cleanup);
const original={widthMm:600,heightMm:400,frameEnabled:false,lines:[{text:'Test',sizeMm:20,bold:true,firstLineBottomMm:100,offsetXMm:0}],symbols:[{id:'one',xMm:30,yMm:200,sizeMm:30,aspectRatio:2}]};
let latest;
function Position({kind}){const [sign,setSign]=useState(original);latest=sign;return <SignPositionFields sign={sign} kind={kind} index={0} onChange={setSign}/>;}

test.each(['text','symbol'])('Positions %s from either edge without changing size or other objects',kind=>{
 render(<Position kind={kind}/>);
 const name=kind==='text'?'Textblock 1':'Symbol 1',bounds=()=>dibondItemBounds(latest,kind,0),before=bounds();
 fireEvent.change(screen.getByLabelText(name+' avst\u00e5nd i sidled (mm)'),{target:{value:'25'}});
 expect(bounds().x).toBeCloseTo(25,1);
 fireEvent.change(screen.getByLabelText(name+' utg\u00e5ngspunkt i sidled'),{target:{value:'right'}});
 fireEvent.change(screen.getByLabelText(name+' avst\u00e5nd i sidled (mm)'),{target:{value:'40'}});
 expect(600-bounds().x-bounds().width).toBeCloseTo(40,1);
 fireEvent.change(screen.getByLabelText(name+' utg\u00e5ngspunkt i h\u00f6jdled'),{target:{value:'bottom'}});
 fireEvent.change(screen.getByLabelText(name+' avst\u00e5nd i h\u00f6jdled (mm)'),{target:{value:'30'}});
 expect(400-bounds().y-bounds().height).toBeCloseTo(30,1);
 expect(bounds().width).toBeCloseTo(before.width);expect(bounds().height).toBeCloseTo(before.height);
 expect(kind==='text'?latest.symbols:latest.lines).toEqual(kind==='text'?original.symbols:original.lines);
});

test('Other panels in the same SVG do not clear a selected resize handle on pointer down',()=>{
 const scope={};
 render(<svg><g transform="translate(100 500)"><DibondInteraction sign={original} selectionScope={scope} selectionPanel={0} onChange={()=>{}}/></g><g transform="translate(100 1000)"><DibondInteraction sign={original} selectionScope={scope} selectionPanel={1} onChange={()=>{}}/></g></svg>);
 fireEvent.focus(screen.getAllByRole('button',{name:'Flytta textblock 1'})[1]);
 const handle=screen.getByRole('button',{name:'\u00c4ndra storlek p\u00e5 textblock 1'});
 fireEvent.pointerDown(handle,{button:0});
 expect(screen.queryByRole('button',{name:'\u00c4ndra storlek p\u00e5 textblock 1'})).not.toBeNull();
});

test.each(['text','symbol'])('Allows clearing and typing multi-digit %s distances without snapping back to the margin',kind=>{
 render(<Position kind={kind}/>);
 const name=kind==='text'?'Textblock 1':'Symbol 1';
 for(const axis of ['sidled','h\u00f6jdled']){
  const input=screen.getByLabelText(name+' avst\u00e5nd i '+axis+' (mm)');
  fireEvent.focus(input);fireEvent.change(input,{target:{value:'0'}});fireEvent.blur(input);
  expect(Number(input.value)).toBeGreaterThan(0);
  fireEvent.focus(input);fireEvent.change(input,{target:{value:''}});expect(input.value).toBe('');
  fireEvent.change(input,{target:{value:'1'}});expect(input.value).toBe('1');
  fireEvent.change(input,{target:{value:'10'}});expect(input.value).toBe('10');
  fireEvent.change(input,{target:{value:'100'}});fireEvent.blur(input);
  expect(Number(input.value)).toBeCloseTo(100,1);
  const bounds=dibondItemBounds(latest,kind,0);expect(axis==='sidled'?bounds.x:bounds.y).toBeCloseTo(100,1);
 }
});
