import React,{useState} from 'react';
import {render,screen,fireEvent,waitFor,act} from '@testing-library/react';
import '@testing-library/jest-dom';
import ElevatorBoardConfigurator from './components/products/ElevatorBoardConfigurator';
import ElevatorBoardPreview from './components/orders/ElevatorBoardPreview';
import OTBoardConfigurator from './components/products/OTBoardConfigurator';
import OTBoardPreview from './components/orders/OTBoardPreview';
import AdminDrawingLibraryPage from './pages/admin/AdminDrawingLibraryPage';
jest.mock('./data/browserPdf',()=>({}));
beforeEach(()=>{jest.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);global.fetch=jest.fn(()=>new Promise(()=>{}));});
afterEach(()=>jest.restoreAllMocks());
const oldBoard={widthMm:420,heightMm:485,liftLetter:'G',floors:[{heading:'Plan 5',text:'Psykiatrisk avdelning H'},{heading:'Plan 4',text:'Utgång\nPsykiatrisk avdelning E',marker:true,highlightLine:0}]};
const latestBoard={...oldBoard,floors:[oldBoard.floors[0],{...oldBoard.floors[1],text:'Utgång\nRättspsykiatrisk avdelning B\nPsykiatrisk avdelning E'}]};
const product=(board,floorCopies=4)=>({id:'0808',elevatorBoards:[{id:'g',name:'Hiss G',location:'Ryhov',board,floorCopies,cabinCopies:1,options:{print:{articleId:'0808',articleNumber:'0808'},complete:{articleId:'0807',articleNumber:'0807'}}}]});
function Editor({value}){const [form,setForm]=useState({elevatorBoardId:'g',elevatorBoard:oldBoard,quantity:5});return <><ElevatorBoardPreview board={form.elevatorBoard}/><ElevatorBoardConfigurator product={value} form={form} onChange={patch=>setForm(previous=>({...previous,...patch}))}/></>;}
test('An already selected lift adopts saved admin text and fixed quantities after catalog refresh',async()=>{
 let view;await act(async()=>{view=render(<Editor value={product(oldBoard)}/>);});
 fireEvent.click(screen.getByRole('button',{name:/Plan 4/}));
 expect(screen.getByRole('textbox',{name:'Text på Plan 4'})).toHaveValue(oldBoard.floors[1].text);
 await act(async()=>{view.rerender(<Editor value={product(latestBoard,6)}/>);});
 expect(screen.getByRole('textbox',{name:'Text på Plan 4'})).toHaveValue(latestBoard.floors[1].text);
 expect(screen.getByText('Totalt 7 st (fast antal)')).toBeInTheDocument();
});
test('Catalog refresh preserves customer edits and offers an explicit return to the saved board',async()=>{
 const view=render(<Editor value={product(oldBoard)}/>);
 fireEvent.click(screen.getByRole('button',{name:/Plan 4/}));
 fireEvent.change(screen.getByRole('textbox',{name:'Text på Plan 4'}),{target:{value:'Kundens egen text'}});
 await act(async()=>{view.rerender(<Editor value={product(latestBoard)}/>);});
 expect(screen.getByRole('textbox',{name:'Text på Plan 4'})).toHaveValue('Kundens egen text');
 expect(screen.getByRole('status')).toHaveTextContent('Din text finns kvar');
 fireEvent.click(screen.getByRole('button',{name:'Använd den uppdaterade tavlan'}));
 expect(screen.getByRole('textbox',{name:'Text på Plan 4'})).toHaveValue(latestBoard.floors[1].text);
 expect(screen.queryByRole('status')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:/Komplett hisstavla/}));
 expect(screen.getByText('0807')).toBeInTheDocument();
});
test('Saving an elevator board in the drawing library refreshes the ordering catalog',async()=>{
 window.scrollTo=jest.fn(); const onCatalogChanged=jest.fn();
 const item={id:'g',type:'elevator',name:'Hiss G',folderId:null,board:oldBoard,floorCopies:4,cabinCopies:1};
 global.fetch=jest.fn(async(url,options)=>({ok:true,json:async()=>url==='/api/drawing-library/items/g'&&options?.method==='PUT'?{item:{...item,...JSON.parse(options.body)}}:url==='/api/drawing-library'?{folders:[],items:[item]}:{articles:[]}}));
 render(<AdminDrawingLibraryPage role="admin" adminPassword="test" onCatalogChanged={onCatalogChanged}/>);
 fireEvent.click(await screen.findByTitle('Hiss G'));
 fireEvent.click(screen.getByRole('button',{name:'Spara hisstavla'}));
 await waitFor(()=>expect(onCatalogChanged).toHaveBeenCalledTimes(1));
 expect(await screen.findByText('Hisstavlan är sparad.')).toBeInTheDocument();
});

test('The actual saved library replaces stale catalog data in the lift fields and preview',async()=>{
 const saved={...latestBoard,floors:[latestBoard.floors[0],{...latestBoard.floors[1],text:'Huvudentré\nRättspsykiatrisk avdelning B\nPsykiatrisk avdelning E'}]};
 global.fetch=jest.fn(async()=>({ok:true,json:async()=>({items:[{id:'g',type:'elevator',completeArticleNumber:'0807',printArticleNumber:'0808',name:'Hiss G',board:saved,floorCopies:4,cabinCopies:1}]})}));
 render(<Editor value={product(oldBoard)}/>);
 fireEvent.click(screen.getByRole('button',{name:/Plan 4/}));
 await waitFor(()=>expect(screen.getByRole('textbox',{name:'Text på Plan 4'})).toHaveValue(saved.floors[1].text));
 expect(screen.getByRole('img',{name:'Hisstavla'})).toHaveTextContent('Huvudentré');
 expect(fetch).toHaveBeenCalledWith('/api/drawing-library',expect.objectContaining({cache:'no-store'}));
});
const otBoard={widthMm:770,heightMm:1385,title:'Avdelningar',targetTitle:'Målpunkt',rows:[{text:'Gammal mottagning',target:'A',floor:'2'}]};
function OTEditor(){const [form,setForm]=useState({otBoardId:'ot',otBoard,quantity:3});return <><OTBoardPreview board={form.otBoard}/><OTBoardConfigurator product={{id:'0810',otBoards:[{id:'ot',name:'Entré',location:'Värnamo',board:otBoard}]}} form={form} onChange={patch=>setForm(previous=>({...previous,...patch}))}/></>;}
test('OT selection reads the saved library, preserves customer edits on focus, and can restore latest saved content',async()=>{
 let saved={...otBoard,rows:[{text:'Senast sparad mottagning',target:'B',floor:'4'}]};
 global.fetch=jest.fn(async()=>({ok:true,json:async()=>({items:[{id:'ot',type:'ot',name:'Entré',board:saved}]})}));
 render(<OTEditor/>);
 const input=await screen.findByRole('textbox',{name:'Avdelning / mottagning 1'});
 await waitFor(()=>expect(input).toHaveValue('Senast sparad mottagning'));
 expect(screen.getByRole('img')).toHaveTextContent('Senast sparad mottagning');
 fireEvent.change(input,{target:{value:'Kundens mottagning'}});
 saved={...saved,rows:[{text:'Ännu nyare mottagning',target:'C',floor:'5'}]};
 fireEvent.focus(window);
 await screen.findByRole('status');
 expect(input).toHaveValue('Kundens mottagning');
 fireEvent.click(screen.getByRole('button',{name:'Använd den uppdaterade tavlan'}));
 expect(input).toHaveValue('Ännu nyare mottagning');
 expect(screen.getByRole('spinbutton',{name:/Antal/})).toHaveValue(3);
});

test('duplicating an OT board opens an editable copy and saves it as a new library item',async()=>{
 window.scrollTo=jest.fn();
 const original={id:'original',type:'ot',name:'Entré 10',folderId:null,articleNumber:'0810',board:otBoard,unitPrice:570,productionOrderIds:['past']};
 global.fetch=jest.fn(async(url,options)=>({ok:true,json:async()=>url==='/api/drawing-library/items'
  ?{item:{...JSON.parse(options.body),id:'copy'}}
  :url==='/api/drawing-library'?{folders:[],items:[original]}:{articles:[{id:'ot',articleNumber:'0810'}]}}));
 render(<AdminDrawingLibraryPage role="admin" adminPassword="test"/>);
 fireEvent.click(await screen.findByTitle('Entré 10'));
 fireEvent.click(screen.getByRole('button',{name:'Duplicera OT-tavla'}));
 expect(screen.getByLabelText('Namn')).toHaveValue('Entré 10 – kopia');
 expect(screen.getByRole('textbox',{name:'Avdelning / mottagning 1'})).toHaveValue('Gammal mottagning');
 fireEvent.change(screen.getByLabelText('Namn'),{target:{value:'Entré 11'}});
 fireEvent.change(screen.getByRole('textbox',{name:'Avdelning / mottagning 1'}),{target:{value:'Ny mottagning'}});
 fireEvent.click(screen.getByRole('button',{name:'Spara OT-tavla'}));
 await screen.findByText('OT-tavlan är sparad.');
 const [,options]=fetch.mock.calls.find(([url])=>url==='/api/drawing-library/items');
 const body=JSON.parse(options.body);
 expect(options.method).toBe('POST');
 expect(body).toMatchObject({name:'Entré 11',articleNumber:'0810',unitPrice:570,board:{widthMm:770,rows:[{text:'Ny mottagning'}]}});
 expect(body.id).toBeUndefined();
 expect(body.productionOrderIds).toBeUndefined();
 expect(original.board.rows[0].text).toBe('Gammal mottagning');
});
