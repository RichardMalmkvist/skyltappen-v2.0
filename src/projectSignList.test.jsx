import React from 'react';
import {render,screen,fireEvent,within,waitFor,cleanup} from '@testing-library/react';
import '@testing-library/jest-dom';
import ProjectSignList from './pages/admin/ProjectSignList';
import {projectSigns} from './data/projectSigns';
jest.mock('./data/browserPdf',()=>({}));
const catalog={categories:[],articles:[{id:'a',name:'Dörrskylt',articleNumber:'0601',price:125,image:'/skylt.png',fields:{customText:true,quantity:true}}]};
const project={id:'p',name:'Entré',signs:[{id:'s',kind:'catalog',articleId:'a',position:'S002',quantity:3,text:'Reception',configuration:{customText:'Reception'},unplaced:true}],drawings:[{id:'d',name:'Plan 1',markers:[{id:'m',articleId:'a',position:'S001',text:'Entré',quantity:1,configuration:{customText:'Entré'},page:1,x:.2,y:.3}]}]};
const props={project,catalog,headers:{'x-admin-password':'token'},readOnly:false,onSaved:jest.fn(async()=>{}),onDrawing:jest.fn()};
beforeEach(()=>{global.fetch=jest.fn(async()=>({ok:true,json:async()=>({sign:{id:'new'}}),blob:async()=>new Blob(['<svg/>'],{type:'image/svg+xml'})}));URL.createObjectURL=jest.fn(()=>'blob:original');URL.revokeObjectURL=jest.fn();window.confirm=jest.fn(()=>true);HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};});
afterEach(()=>{cleanup();jest.clearAllMocks();});
test('shared list shows legacy and standalone signs once and preserves drawing navigation',()=>{
 render(<ProjectSignList {...props}/>);
 expect(screen.getAllByRole('article')).toHaveLength(2);expect(screen.getByText('Reception')).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Visa ritning'}));expect(props.onDrawing).toHaveBeenCalledWith('d');
 fireEvent.change(screen.getByRole('searchbox'),{target:{value:'Reception'}});expect(screen.getAllByRole('article')).toHaveLength(1);expect(screen.queryByRole('button',{name:'Visa ritning'})).not.toBeInTheDocument();
 expect(project.drawings[0].markers[0].quantity).toBe(1);
});
test('standard article uses the existing configurator without fetching a drawing PDF and saves quantity',async()=>{
 render(<ProjectSignList {...props}/>);fireEvent.click(screen.getByRole('button',{name:'+ Lägg till artikel'}));
 const dialog=await screen.findByRole('dialog',{name:'Välj och anpassa skylt'});
 fireEvent.click(within(dialog).getByRole('button',{name:/Art. 0601 Dörrskylt/}));
 fireEvent.change(within(dialog).getByLabelText('Antal'),{target:{value:'4'}});
 fireEvent.click(within(dialog).getByRole('button',{name:'Spara skylt i projektet'}));
 await waitFor(()=>expect(props.onSaved).toHaveBeenCalled());
 const [url,options]=fetch.mock.calls.find(([,options])=>options?.method==='POST');expect(url).toBe('/api/projects/p/signs');expect(JSON.parse(options.body)).toMatchObject({kind:'catalog',articleId:'a',quantity:4});
 expect(fetch.mock.calls.some(([url])=>url.includes('/drawings/'))).toBe(false);
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
test('editing catalog content uses the same marker key and retains the quantity',async()=>{
 render(<ProjectSignList {...props}/>);fireEvent.click(screen.getAllByRole('button',{name:'Anpassa'})[0]);
 const dialog=await screen.findByRole('dialog');expect(within(dialog).getByLabelText('Antal')).toHaveValue(1);
 fireEvent.click(within(dialog).getByRole('button',{name:'Spara skylt i projektet'}));
 await waitFor(()=>expect(fetch).toHaveBeenCalled());expect(fetch.mock.calls[0][0]).toBe('/api/projects/p/signs/drawing%3Ad%3Am');expect(JSON.parse(fetch.mock.calls[0][1].body).configuration.customText).toBe('Entré');
});
test('project elevator selection saves the chosen complete article and the fixed number of copies',async()=>{
 const board={widthMm:420,heightMm:485,liftLetter:'G',floors:[{heading:'Plan 4',text:'Entré'}]};
 const lift={id:'g',type:'elevator',name:'Hiss G',folderId:'ryhov',completeArticleNumber:'0807',printArticleNumber:'0808',board,floorCopies:4,cabinCopies:1};
 const categoryId='vaningsplans-och-hisstavlor';
 const complete={id:'complete',articleNumber:'0807',name:'Komplett hisstavla',categoryId};
 const print={id:'print',articleNumber:'0808',name:'Pappersutskrift till hiss',previewType:'elevator_board',categoryId};
 fetch.mockImplementation(async url=>({ok:true,json:async()=>url==='/api/drawing-library'?{items:[lift],folders:[{id:'ryhov',name:'Ryhov'}]}:{sign:{id:'new'}}}));
 render(<ProjectSignList {...props} catalog={{categories:[],articles:[complete,print]}}/>);
 fireEvent.click(screen.getByRole('button',{name:'+ Lägg till artikel'}));
 const dialog=await screen.findByRole('dialog');
 fireEvent.click(within(dialog).getByRole('button',{name:/Våningsplans- och hisstavlor/}));
 expect(await within(dialog).findByRole('option',{name:'Ryhov · Hiss G'})).toBeInTheDocument();
 fireEvent.change(within(dialog).getByLabelText(/Välj hiss/),{target:{value:'g'}});
 fireEvent.click(within(dialog).getByRole('button',{name:/Komplett hisstavla/}));
 fireEvent.change(within(dialog).getByLabelText('Text på Plan 4'),{target:{value:'Huvudentré'}});
 fireEvent.click(within(dialog).getByRole('button',{name:'Spara skylt i projektet'}));
 await waitFor(()=>expect(props.onSaved).toHaveBeenCalledTimes(1));
 const [,options]=fetch.mock.calls.find(([,options])=>options?.method==='POST');
 expect(JSON.parse(options.body)).toMatchObject({articleId:'complete',quantity:5,text:'Hiss G',configuration:{
  elevatorBoardId:'g',elevatorOrderMode:'complete',elevatorBoard:{floors:[{heading:'Plan 4',text:'Huvudentré'}]}
 }});
});
test('project OT selection saves the board identity and editable quantity',async()=>{
 const board={widthMm:420,heightMm:603,title:'Avdelning',targetTitle:'Målpunkt',rows:[{text:'Mottagning',target:'A'}]};
 const ot={id:'ot',articleNumber:'0810',previewType:'ot_board',name:'Pappersutskrift till OT-tavla',otBoards:[{id:'entry',name:'Entré 10',location:'Ryhov',board,unitPrice:475}]};
 fetch.mockImplementation(async url=>({ok:true,json:async()=>url==='/api/drawing-library'?{items:[]}:{sign:{id:'new'}}}));
 render(<ProjectSignList {...props} catalog={{categories:[],articles:[ot]}}/>);
 fireEvent.click(screen.getByRole('button',{name:'+ Lägg till artikel'}));
 const dialog=await screen.findByRole('dialog');
 fireEvent.click(within(dialog).getByRole('button',{name:/0810/}));
 fireEvent.change(within(dialog).getByLabelText('Plats'),{target:{value:'Ryhov'}});
 fireEvent.change(within(dialog).getByLabelText(/Välj OT-tavla/),{target:{value:'entry'}});
 fireEvent.change(within(dialog).getByLabelText(/Antal/),{target:{value:'2'}});
 fireEvent.click(within(dialog).getByRole('button',{name:'Spara skylt i projektet'}));
 await waitFor(()=>expect(props.onSaved).toHaveBeenCalledTimes(1));
 const [,options]=fetch.mock.calls.find(([,options])=>options?.method==='POST');
 expect(JSON.parse(options.body)).toMatchObject({articleId:'ot',quantity:2,text:'Entré 10',configuration:{
  otBoardId:'entry',otBoardName:'Entré 10',otBoardLocation:'Ryhov',otBoard:board
 }});
});
test('SVG import uploads server-side original and metadata without registering an article',async()=>{
 render(<ProjectSignList {...props}/>);fireEvent.click(screen.getByRole('button',{name:'Importera skylt'}));
 const dialog=screen.getByRole('dialog',{name:'Importera skylt'});
 fireEvent.change(within(dialog).getByLabelText('Benämning'),{target:{value:'Egen dekal'}});
 fireEvent.change(within(dialog).getByLabelText('Material'),{target:{value:'Vinyl'}});
 fireEvent.change(within(dialog).getByLabelText('Antal'),{target:{value:'2'}});
 fireEvent.change(within(dialog).getByLabelText('Produktionsfil – SVG eller PDF (max 5 MB)'),{target:{files:[new File(['<svg/>'],'dekal.svg',{type:'image/svg+xml'})]}});
 fireEvent.click(within(dialog).getByRole('button',{name:'Spara skylt'}));
 await waitFor(()=>expect(props.onSaved).toHaveBeenCalled());
 const [url,options]=fetch.mock.calls[0],body=JSON.parse(options.body);expect(url).toBe('/api/projects/p/signs');expect(body).toMatchObject({kind:'svg',name:'Egen dekal',material:'Vinyl',quantity:'2',original:{name:'dekal.svg'}});expect(body.original.dataUrl).toMatch(/^data:image\/svg\+xml;base64,/);expect(body.widthMm).toBeUndefined();
});
test('editing details saves through common endpoint; deletion identifies the existing marker',async()=>{
 render(<ProjectSignList {...props}/>);fireEvent.click(screen.getAllByRole('button',{name:'Uppgifter'})[0]);const dialog=screen.getByRole('dialog');
 fireEvent.change(within(dialog).getByLabelText('Antal'),{target:{value:'8'}});fireEvent.click(within(dialog).getByRole('button',{name:'Spara skylt'}));
 await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
 expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({quantity:'8'});expect(fetch.mock.calls[0][0]).toBe('/api/projects/p/signs/drawing%3Ad%3Am');
 fireEvent.click(screen.getAllByRole('button',{name:'Ta bort'})[0]);expect(window.confirm).not.toHaveBeenCalled();fireEvent.click(within(screen.getByRole('dialog',{name:'Ta bort skylt?'})).getByRole('button',{name:'Ta bort skylt'}));await waitFor(()=>expect(fetch.mock.calls.some(([url,options])=>url==='/api/projects/p/signs/drawing%3Ad%3Am'&&options.method==='DELETE')).toBe(true));
});
test('SVG previews/downloads are authenticated and object URLs are released',async()=>{
 const own={...project,drawings:[],signs:[{id:'v',kind:'svg',position:'S001',name:'Corel',widthMm:280,heightMm:69,productionFile:{id:'asset',name:'corel.svg'}}]};
 const {unmount}=render(<ProjectSignList {...props} project={own}/>);await screen.findByRole('img',{name:'Corel'});
 expect(fetch.mock.calls[0][1].headers['x-admin-password']).toBe('token');
 fireEvent.click(screen.getByRole('button',{name:'Uppgifter'}));expect(screen.getByRole('tab',{name:'Uppgifter'})).toHaveAttribute('aria-selected','true');expect(screen.queryByRole('link',{name:'Hämta produktionsfil'})).toBeNull();fireEvent.click(screen.getByRole('tab',{name:'Filer'}));expect(await screen.findByRole('link',{name:'Hämta produktionsfil'})).toHaveAttribute('download','corel.svg');
 unmount();expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:original');
});
test('validation errors keep the form open; read-only users cannot add, modify or remove signs',async()=>{
 fetch.mockImplementation(async()=>({ok:false,json:async()=>({message:'Omvandla texten till kurvor.'})}));
 const {rerender}=render(<ProjectSignList {...props}/>);fireEvent.click(screen.getAllByRole('button',{name:'Uppgifter'})[0]);fireEvent.click(screen.getByRole('button',{name:'Spara skylt'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Omvandla texten till kurvor.');expect(screen.getByRole('dialog')).toBeVisible();
 rerender(<ProjectSignList {...props} readOnly/>);expect(screen.queryByRole('button',{name:'Spara skylt'})).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'Ta bort'})).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'Importera skylt'})).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'+ Lägg till artikel'})).not.toBeInTheDocument();
});
test('drawing and standalone IDs cannot collide in the shared list',()=>{
 const result=projectSigns({signs:[{id:'m'}],drawings:[{id:'d',markers:[{id:'m'}]},{id:'e',markers:[{id:'m'}]}]});expect(new Set(result.map(sign=>sign.key)).size).toBe(3);
});
test('separate proof image and production file are uploaded in different fields',async()=>{
 render(<ProjectSignList {...props}/>);fireEvent.click(screen.getByRole('button',{name:'Importera skylt'}));const dialog=screen.getByRole('dialog');
 fireEvent.change(within(dialog).getByLabelText('Benämning'),{target:{value:'Egen skylt'}});
 fireEvent.change(within(dialog).getByLabelText('Korrekturbild – PNG, JPG eller SVG (max 5 MB)'),{target:{files:[new File(['image'],'proof.png',{type:'image/png'})]}});
 fireEvent.change(within(dialog).getByLabelText('Produktionsfil – SVG eller PDF (max 5 MB)'),{target:{files:[new File(['%PDF'],'print.pdf',{type:'application/pdf'})]}});
 fireEvent.click(within(dialog).getByRole('button',{name:'Spara skylt'}));
 await waitFor(()=>expect(props.onSaved).toHaveBeenCalled());const body=JSON.parse(fetch.mock.calls[0][1].body);
 expect(body.original).toMatchObject({name:'print.pdf'});expect(body.original.dataUrl).toMatch(/^data:application\/pdf;base64,/);
 expect(body.proofOriginal).toMatchObject({name:'proof.png'});expect(body.proofOriginal.dataUrl).toMatch(/^data:image\/png;base64,/);
});
test('preview uses the proof image endpoint while production download uses the original endpoint',async()=>{
 const own={...project,drawings:[],signs:[{id:'v',kind:'svg',name:'Two files',proofFile:{id:'proof',name:'proof.png'},productionFile:{id:'print',name:'print.pdf',mime:'application/pdf'}}]};
 render(<ProjectSignList {...props} project={own}/>);await screen.findByRole('img',{name:'Two files'});expect(fetch.mock.calls[0][0]).toBe('/api/projects/p/signs/v/preview');
 fireEvent.click(screen.getByRole('button',{name:'Uppgifter'}));expect(screen.getByRole('tab',{name:'Uppgifter'})).toHaveAttribute('aria-selected','true');expect(screen.queryByRole('link',{name:'Hämta produktionsfil'})).toBeNull();fireEvent.click(screen.getByRole('tab',{name:'Filer'}));expect(await screen.findByRole('link',{name:'Hämta korrekturbild'})).toHaveAttribute('download','proof.png');expect(await screen.findByRole('link',{name:'Hämta produktionsfil'})).toHaveAttribute('download','print.pdf');
 expect(fetch.mock.calls.some(([url])=>url==='/api/projects/p/signs/v/original')).toBe(true);
});
test('replacing the proof clears old production-derived measurements so the server reads the proof size',async()=>{
 const own={...project,drawings:[],signs:[{id:'v',kind:'svg',name:'Dibond',widthMm:405,heightMm:405,productionFile:{id:'print',name:'print.svg'}}]};
 render(<ProjectSignList {...props} project={own}/>);fireEvent.click(screen.getByRole('button',{name:'Uppgifter'}));
 expect(screen.getByLabelText('Bredd (mm)')).toHaveValue(405);
 fireEvent.change(screen.getByLabelText('Korrekturbild – PNG, JPG eller SVG (max 5 MB)'),{target:{files:[new File(['<svg/>'],'proof.svg',{type:'image/svg+xml'})]}});
 expect(screen.getByLabelText('Bredd (mm)')).toHaveValue(null);expect(screen.getByLabelText('Höjd (mm)')).toHaveValue(null);
 fireEvent.click(screen.getByRole('button',{name:'Spara skylt'}));
 await waitFor(()=>expect(fetch.mock.calls.some(([,options])=>options?.method==='PATCH')).toBe(true));const body=JSON.parse(fetch.mock.calls.find(([,options])=>options?.method==='PATCH')[1].body);
 expect(body.widthMm).toBeUndefined();expect(body.heightMm).toBeUndefined();expect(body.proofOriginal.name).toBe('proof.svg');
});


test('delete dialog cancels without a request and keeps failures visible for retry',async()=>{
 render(<ProjectSignList {...props}/>);
 fireEvent.click(screen.getAllByRole('button',{name:'Ta bort'})[0]);
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Avbryt'}));
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(fetch).not.toHaveBeenCalled();
 fireEvent.click(screen.getAllByRole('button',{name:'Ta bort'})[0]);
 fetch.mockResolvedValueOnce({ok:false,json:async()=>({message:'Kunde inte ta bort skylten.'})});
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Ta bort skylt'}));
 expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent('Kunde inte ta bort skylten.');
 expect(screen.getByRole('button',{name:'Ta bort skylt'})).toBeEnabled();
});


test('The shared list renders saved sign text instead of the article example image and updates after saving',()=>{
 const article={id:'0301',articleNumber:'0301',name:'Hanging sign',previewType:'hanging_sign',productType:'pendlad_skylt',image:'/catalog-example.png',format:'1500 x 140mm',fields:{customText:true}};
 const sign={id:'s',kind:'catalog',articleId:article.id,position:'S001',text:'Reception',quantity:1,configuration:{customText:'Reception',arrowPlacement:'none'}};
 const own={id:'p',signs:[sign],drawings:[]};
 const {container,rerender}=render(<ProjectSignList {...props} project={own} catalog={{articles:[article]}}/>);
 const thumb=container.querySelector('.project-sign-thumb');
 expect(thumb.querySelector('.project-sign-live-preview')).not.toBeNull();
 expect(thumb).toHaveTextContent('Reception');
 expect(thumb.querySelector('img[src="/catalog-example.png"]')).toBeNull();
 rerender(<ProjectSignList {...props} project={{...own,signs:[{...sign,text:'New text',configuration:{...sign.configuration,customText:'New text'}}]}} catalog={{articles:[article]}}/>);
 expect(thumb).toHaveTextContent('New text');expect(thumb).not.toHaveTextContent('Reception');
});

test('Drawing signs render their own configuration and textless signs do not inherit another sign text',()=>{
 const article={id:'0301',articleNumber:'0301',name:'Hanging sign',previewType:'hanging_sign',productType:'pendlad_skylt',image:'/example.png',format:'1500 x 140mm'};
 const own={id:'p',signs:[],drawings:[{id:'d',markers:[{id:'m',articleId:article.id,position:'S001',text:'Legacy label',configuration:{customText:'',hangingSignWithoutText:true,arrowPlacement:'none'}}]}]};
 const {container}=render(<ProjectSignList {...props} project={own} catalog={{articles:[article]}}/>);
 const thumb=container.querySelector('.project-sign-thumb');expect(thumb.querySelector('.project-sign-live-preview')).not.toBeNull();expect(thumb).not.toHaveTextContent('Legacy label');
});

test('Older drawing markers with text outside configuration still show that text on the sign',()=>{
 const article={id:'0301',articleNumber:'0301',name:'Hanging sign',previewType:'hanging_sign',productType:'pendlad_skylt',format:'1500 x 140mm'};
 const own={id:'p',drawings:[{id:'d',markers:[{id:'old',articleId:article.id,text:'Reception',configuration:{customText:''}}]}]};
 const {container}=render(<ProjectSignList {...props} project={own} catalog={{articles:[article]}}/>);
 expect(container.querySelector('.project-sign-thumb')).toHaveTextContent('Reception');
});

test('standalone copy opens its saved settings and later saves as the new sign, leaving the source untouched',async()=>{
 const copy={...project.signs[0],id:'copy',position:'S003',configuration:{customText:'Reception'}};
 fetch.mockResolvedValueOnce({ok:true,json:async()=>({sign:copy})});
 render(<ProjectSignList {...props}/>);expect(screen.getAllByRole('button',{name:'Duplicera'})).toHaveLength(1);
 fireEvent.click(screen.getByRole('button',{name:'Duplicera'}));
 const dialog=await screen.findByRole('dialog',{name:'Välj och anpassa skylt'});expect(within(dialog).getByLabelText('Antal')).toHaveValue(3);
 expect(fetch.mock.calls[0][0]).toBe('/api/projects/p/signs/s/duplicate');expect(fetch.mock.calls[0][1].method).toBe('POST');
 fireEvent.click(within(dialog).getByRole('button',{name:'Spara skylt i projektet'}));
 await waitFor(()=>expect(fetch.mock.calls.some(([url,options])=>url==='/api/projects/p/signs/copy'&&options.method==='PATCH')).toBe(true));expect(project.signs[0].id).toBe('s');expect(project.signs[0].configuration.customText).toBe('Reception');
});
test('failed copy leaves the source visible and allows retry; read-only users cannot copy',async()=>{
 fetch.mockResolvedValueOnce({ok:false,json:async()=>({message:'Kunde inte duplicera skylten.'})});
 const {rerender}=render(<ProjectSignList {...props}/>);fireEvent.click(screen.getByRole('button',{name:'Duplicera'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Kunde inte duplicera skylten.');expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(screen.getByText('Reception')).toBeVisible();
 await waitFor(()=>expect(screen.getByRole('button',{name:'Duplicera'})).toBeEnabled());rerender(<ProjectSignList {...props} readOnly/>);expect(screen.queryByRole('button',{name:'Duplicera'})).not.toBeInTheDocument();
});

test('original details and files use independent tabs while the large preview stays visible',async()=>{const own={...project,drawings:[],signs:[{id:'v',kind:'svg',name:'Corel',widthMm:400,heightMm:300,quantity:1,productionFile:{id:'asset',name:'print.svg'}}]};render(<ProjectSignList {...props} project={own}/>);fireEvent.click(screen.getByRole('button',{name:'Uppgifter'}));const dialog=screen.getByRole('dialog');expect(within(dialog).getByRole('tab',{name:'Uppgifter'})).toHaveAttribute('aria-selected','true');expect(within(dialog).getByLabelText('Benämning')).toBeVisible();expect(within(dialog).getByLabelText(/Produktionsfil/)).not.toBeVisible();fireEvent.change(within(dialog).getByLabelText('Benämning'),{target:{value:'Ändrad skylt'}});fireEvent.click(within(dialog).getByRole('tab',{name:'Filer'}));expect(within(dialog).getByLabelText(/Produktionsfil/)).toBeVisible();expect(within(dialog).getByLabelText('Benämning')).not.toBeVisible();await waitFor(()=>expect(dialog.querySelector('.project-original-large img')).toBeInTheDocument());fireEvent.click(within(dialog).getByRole('tab',{name:'Uppgifter'}));expect(within(dialog).getByLabelText('Benämning')).toHaveValue('Ändrad skylt');});
