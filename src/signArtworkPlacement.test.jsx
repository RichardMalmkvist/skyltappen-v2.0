import React,{useState} from 'react';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import SignArtworkPlacement from './components/products/SignArtworkPlacement';
import DibondPreview from './components/products/DibondPreview';
import {createCartItem} from './data/cartHelpers';
const id='11111111-2222-3333-4444-555555555555',art={id,name:'Corel.svg',mime:'image/svg+xml',widthMm:600,heightMm:400,preview:'/api/sign-artworks/'+id+'/preview'};
const initial={widthMm:600,heightMm:400,frameEnabled:false,lines:[],symbols:[],uploadedArtwork:art};let latest;
afterEach(cleanup);
function Editor(){const [sign,setSign]=useState(initial);latest=sign;return <><SignArtworkPlacement sign={sign} onChange={setSign}/><DibondPreview sign={sign} onChange={setSign}/></>;}
test('Numeric artwork size and edge distances are reflected in the preview and cart configuration',()=>{
 render(<Editor/>);const width=screen.getByLabelText('Motivets bredd (mm)');fireEvent.focus(width);fireEvent.change(width,{target:{value:''}});fireEvent.change(width,{target:{value:'3'}});fireEvent.change(width,{target:{value:'300'}});fireEvent.blur(width);
 expect(latest.artworkPlacement.widthMm).toBe(300);expect(latest.artworkPlacement.heightMm).toBe(200);
 fireEvent.change(screen.getByLabelText('Original avstånd i sidled (mm)'),{target:{value:'50'}});fireEvent.change(screen.getByLabelText('Original avstånd i höjdled (mm)'),{target:{value:'60'}});
 expect(latest.artworkPlacement).toMatchObject({xMm:50,yMm:60,widthMm:300,heightMm:200});
 const item=createCartItem({id:'alu',articleNumber:'1230',previewType:'dibond_sign',dibondConfig:{maxWidthMm:600,maxHeightMm:400}},'skylt',{dibondSign:latest,quantity:1});expect(item.dibondSign.artworkPlacement).toEqual(latest.artworkPlacement);
 fireEvent.click(screen.getByText('Centrera motivet'));expect(latest.artworkPlacement).toMatchObject({xMm:150,yMm:100});
});
test('Uploaded artwork can move with the keyboard and resize using its corner control',()=>{
 render(<Editor/>);fireEvent.change(screen.getByLabelText('Motivets bredd (mm)'),{target:{value:'300'}});
 const move=screen.getByRole('button',{name:'Flytta originalet'});fireEvent.focus(move);fireEvent.keyDown(move,{key:'ArrowRight'});const before=latest.artworkPlacement.widthMm;
 fireEvent.keyDown(screen.getByRole('button',{name:'Ändra storlek på originalet'}),{key:'ArrowDown'});expect(latest.artworkPlacement.widthMm).toBeLessThan(before);expect(latest.artworkPlacement.xMm).toBe(1);
 expect(latest.uploadedArtwork).toBe(art);
});
