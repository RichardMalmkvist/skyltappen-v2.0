import React from 'react';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import '@testing-library/jest-dom';
import ProjectApprovalPanel from './components/projects/ProjectApprovalPanel';
import {projectProofGroups} from './data/projectProof';
jest.mock('./components/projects/ProjectProofModal',()=>props=><div role="dialog" aria-label="Korrekturversion"><span>{props.publication.proofNumber}</span><span>{props.project.signs?.map(sign=>sign.name).join(',')}</span><button onClick={()=>{props.onReady();props.onClose();}}>Granskat</button>{props.onArchive&&<button onClick={()=>props.onArchive({pages:['PNG'],artwork:[],showPrices:true})}>Arkivera test-PDF</button>}{props.onPublish&&<button onClick={()=>props.onPublish({showPrices:true})}>Skicka korrektur</button>}</div>);
const project={id:'p',number:'PRJ-1',updatedAt:'r1',purchaserName:'Anna',purchaserEmail:'anna@example.test',drawings:[{id:'d',name:'Plan 1',markers:[{id:'m',articleId:'a',position:'S001',text:'Reception',quantity:2}]}],signs:[{id:'s',kind:'svg',name:'Egen dekal',position:'S002',quantity:3,proofImage:'data:image/png;base64,ORIGINAL',widthMm:400,heightMm:400,price:500}]};
const catalog={articles:[{id:'a',articleNumber:'0601',name:'Dörrskylt',price:100}]};
let proofs,documents;
const proof=(id,number)=>({id,proofNumber:number,seriesId:id,projectId:'p',version:'1',status:'pending',current:true,recipientName:'Anna',recipientEmail:project.purchaserEmail,selectedSignKeys:['s'],archiveRequired:true,sentAt:'2026-11-05T10:00:00Z',sourceUpdatedAt:'r1'});
beforeEach(()=>{
 proofs=[];documents={};global.fetch=jest.fn(async(url,options={})=>{
  let data={},body=options.body?JSON.parse(options.body):{};
  if(url.split('?')[0]==='/api/project-proofs')data={proofs};
  else if(url.endsWith('/prepare')){const record={...proof('new','KOR-2026-0003'),version:body.version,status:'draft',current:false,selectedSignKeys:body.selectedSignKeys};proofs.push(record);documents.new={proof:record,snapshot:{project,catalog,artwork:[]}};data={proof:record};}
  else if(url.endsWith('/pdf')&&options.method==='POST'){const record=proofs.find(proof=>proof.id===url.split('/')[3]);record.pdf={sha256:'hash',pageCount:1,showPrices:true};data={proof:record};}
  else if(url.endsWith('/send')){const record=proofs.find(proof=>proof.id===url.split('/')[3]);record.status='pending';record.current=true;data={proof:record};}
  else if(url.endsWith('/files'))data={files:[{signKey:'s',kind:'production',name:'print.svg',position:'S002'},{signKey:'s',kind:'proof',name:'proof.png',position:'S002'}]};
  else if(url.endsWith('/approve'))data={proof:{}};
  else data=documents[url.split('/').at(-1)]||{};
  return {ok:true,json:async()=>JSON.parse(JSON.stringify(data)),blob:async()=>new Blob(['file'])};
 });
});
afterEach(()=>{cleanup();jest.clearAllMocks();});

test('proof selection shows article names and actual sign text without original filenames',async()=>{
 const variant={...project,drawings:[{...project.drawings[0],markers:[{...project.drawings[0].markers[0],text:'P 400x400.svg',configuration:{dibondSign:{uploadedArtwork:{name:'P 400x400.svg'}}}},{...project.drawings[0].markers[0],id:'text-sign',position:'S003',text:'Besökare'}]}]};
 render(<ProjectApprovalPanel project={variant} catalog={catalog} role="admin" adminPassword="token"/>);
 const fixed=await screen.findByRole('checkbox',{name:/S001 · Dörrskylt/});expect(fixed).toHaveAccessibleName('S001 · Dörrskylt · 2 st · Plan 1');
 expect(screen.queryByText(/P 400x400\.svg/)).not.toBeInTheDocument();expect(screen.getByRole('checkbox',{name:/S003 · Dörrskylt · Besökare/})).toBeInTheDocument();
 expect(variant.drawings[0].markers[0].configuration.dibondSign.uploadedArtwork.name).toBe('P 400x400.svg');
});
test('standalone and drawing signs can be selected together or individually before creating a new numbered proof',async()=>{
 render(<ProjectApprovalPanel project={project} catalog={catalog} role="admin" adminPassword="token"/>);
 fireEvent.click(await screen.findByRole('checkbox',{name:/S001/}));
 fireEvent.click(screen.getByRole('button',{name:'Förhandsgranska och skicka korrektur'}));
 expect(await screen.findByRole('dialog')).toHaveTextContent('KOR-2026-0003');
 const body=JSON.parse(fetch.mock.calls.find(([url])=>url.endsWith('/prepare'))[1].body);expect(body).toMatchObject({newProof:true,selectedSignKeys:['s'],version:'1.1',expectedUpdatedAt:'r1'});
 expect(fetch.mock.calls.some(([url])=>url.includes('includeDrafts=1'))).toBe(true);
});
test('new versions start with the previous sign selection; a new independent proof can include all signs',async()=>{
 const record=proof('a','KOR-2026-0001');record.status='approved';proofs=[record];
 render(<ProjectApprovalPanel project={project} catalog={catalog} role="admin"/>);await screen.findByText('KOR-2026-0001 · Version 1');
 expect(screen.getByRole('checkbox',{name:/S001/})).not.toBeChecked();expect(screen.getByRole('checkbox',{name:/S002/})).toBeChecked();
 fireEvent.change(screen.getByLabelText('Nytt korrektur eller ny version'),{target:{value:'new'}});expect(screen.getByRole('checkbox',{name:/S001/})).toBeChecked();
 fireEvent.change(screen.getByLabelText('Nytt korrektur eller ny version'),{target:{value:'a'}});
 fireEvent.click(screen.getByRole('button',{name:'Förhandsgranska och skicka korrektur'}));await screen.findByRole('dialog');
 const body=JSON.parse(fetch.mock.calls.find(([url])=>url.endsWith('/prepare'))[1].body);expect(body).toMatchObject({newProof:false,baseProofId:'a',version:'1.2',selectedSignKeys:['s']});
});
test('drafts can be reopened, archived and sent through the existing approval panel',async()=>{
 const record={...proof('draft','KOR-2026-0001'),status:'draft',current:false};proofs=[record];documents.draft={proof:record,snapshot:{project,catalog}};
 render(<ProjectApprovalPanel project={project} catalog={catalog} role="admin"/>);fireEvent.click(await screen.findByRole('button',{name:'Visa korrektur 1'}));await screen.findByRole('dialog');
 fireEvent.click(screen.getByRole('button',{name:'Arkivera test-PDF'}));await waitFor(()=>expect(fetch.mock.calls.some(([url,options])=>url.endsWith('/pdf')&&options.method==='POST')).toBe(true));
 fireEvent.click(screen.getByRole('button',{name:'Skicka korrektur'}));await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('anna@example.test'));
});
test('a notification selects the exact proof; the buyer can switch between independent proofs',async()=>{
 const a=proof('a','KOR-2026-0001'),b=proof('b','KOR-2026-0002');proofs=[a,b];documents.b={proof:b,snapshot:{project,catalog}};
 render(<ProjectApprovalPanel project={project} catalog={catalog} role="bestallare" initialProofId="b"/>);
 await screen.findByRole('combobox',{name:'Välj korrektur och version'});expect(screen.getByRole('combobox',{name:'Välj korrektur och version'})).toHaveValue('b');
 expect(screen.getByRole('button',{name:'Godkänn korrektur 1'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Visa korrektur 1'}));fireEvent.click(await screen.findByRole('button',{name:'Granskat'}));
 fireEvent.click(screen.getByRole('checkbox',{name:/Jag har granskat/}));expect(screen.getByRole('button',{name:'Godkänn korrektur 1'})).toBeEnabled();
 fireEvent.change(screen.getByRole('combobox',{name:'Välj korrektur och version'}),{target:{value:'a'}});expect(screen.getByRole('button',{name:'Godkänn korrektur 1'})).toBeDisabled();expect(screen.queryByRole('button',{name:'Originalfiler'})).not.toBeInTheDocument();
});
test('clearing sign selection prevents preparation and staff can list the frozen original files',async()=>{
 proofs=[proof('a','KOR-2026-0001')];render(<ProjectApprovalPanel project={project} catalog={catalog} role="admin"/>);await screen.findByRole('button',{name:'Originalfiler'});
 fireEvent.click(screen.getByRole('button',{name:'Rensa val'}));expect(screen.getByRole('button',{name:'Förhandsgranska och skicka korrektur'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Originalfiler'}));expect(await screen.findByText(/Produktion · print.svg/)).toBeVisible();expect(screen.getByText(/Korrekturbild · proof.png/)).toBeVisible();
});
test('proof groups combine catalog and own signs while keeping their stable references and individual images',()=>{
 const groups=projectProofGroups(project,catalog.articles);expect(groups).toHaveLength(2);expect(groups[0].locations[0].signKey).toBe('drawing:d:m');expect(groups[1].locations[0]).toMatchObject({drawingId:'__standalone__',signKey:'s',unplaced:true});expect(groups[1].product.image).toBe(project.signs[0].proofImage);expect(groups[1].quantity).toBe(3);
});
