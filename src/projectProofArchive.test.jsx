import React from 'react';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import '@testing-library/jest-dom';
import ProjectProofModal,{ProofProduct} from './components/projects/ProjectProofModal';
import {captureProjectProof} from './data/captureProjectProof';
jest.mock('./data/browserPdf',()=>({}));
jest.mock('./data/captureProjectProof',()=>({captureProjectProof:jest.fn(async()=>({pages:['PNG'],artwork:[{signKey:'s',signKeys:['s'],image:'CROP'}]}))}));
const project={id:'p',number:'PRJ-1',name:'Akuten',drawings:[],signs:[{id:'s',kind:'svg',name:'Egen skylt',position:'S001',quantity:2,price:100,widthMm:400,heightMm:400,proofImage:'data:image/png;base64,PROOF'}]};
const publication={id:'proof',proofNumber:'KOR-2026-0001',version:'1',status:'draft',archiveRequired:true};
beforeEach(()=>{captureProjectProof.mockResolvedValue({pages:['PNG'],artwork:[{signKey:'s',signKeys:['s'],image:'CROP'}]});global.fetch=jest.fn(async()=>({ok:true,blob:async()=>new Blob(['%PDF'])}));URL.createObjectURL=jest.fn(()=>'blob:pdf');URL.revokeObjectURL=jest.fn();jest.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});});
afterEach(()=>{cleanup();jest.clearAllMocks();jest.restoreAllMocks();});
test('PDF download archives the existing layout once and locks the price setting before publication',async()=>{
 const archive=jest.fn(async()=>({sha256:'hash',pageCount:1,showPrices:true})),publish=jest.fn(async()=>{});
 render(<ProjectProofModal project={project} catalog={{articles:[]}} publication={publication} adminPassword="token" onArchive={archive} onPublish={publish} onClose={()=>{}}/>);
 await waitFor(()=>expect(screen.getByRole('button',{name:'Hämta PDF'})).toBeEnabled());fireEvent.click(screen.getByRole('button',{name:'Hämta PDF'}));
 await waitFor(()=>expect(archive).toHaveBeenCalled());expect(captureProjectProof).toHaveBeenCalledTimes(1);expect(archive).toHaveBeenCalledWith(expect.objectContaining({showPrices:true,pages:['PNG']}));
 await waitFor(()=>expect(screen.getByRole('checkbox',{name:'Visa priser'})).toBeDisabled());expect(fetch.mock.calls[0][0]).toBe('/api/project-proofs/proof/pdf');
 fireEvent.click(screen.getByRole('button',{name:'Skicka för godkännande'}));await waitFor(()=>expect(publish).toHaveBeenCalledWith({showPrices:true}));expect(archive).toHaveBeenCalledTimes(1);
});
test('failed PDF archival prevents sending the proof',async()=>{
 const publish=jest.fn();render(<ProjectProofModal project={project} catalog={{articles:[]}} publication={publication} onArchive={async()=>{throw new Error('Filen kunde inte sparas.');}} onPublish={publish} onClose={()=>{}}/>);
 await waitFor(()=>expect(screen.getByRole('button',{name:'Skicka för godkännande'})).toBeEnabled());fireEvent.click(screen.getByRole('button',{name:'Skicka för godkännande'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Filen kunde inte sparas.');expect(publish).not.toHaveBeenCalled();
});
test('reopening an archived proof downloads its saved PDF without rendering a replacement',async()=>{
 render(<ProjectProofModal project={project} catalog={{articles:[]}} publication={{...publication,status:'approved',pdf:{sha256:'saved'}}} onClose={()=>{}}/>);
 await waitFor(()=>expect(screen.getByRole('button',{name:'Hämta PDF'})).toBeEnabled());fireEvent.click(screen.getByRole('button',{name:'Hämta PDF'}));
 await waitFor(()=>expect(fetch).toHaveBeenCalled());expect(captureProjectProof).not.toHaveBeenCalled();
});
test('saved artwork has priority over a changed live product image',()=>{
 render(<ProofProduct group={{product:{name:'Skylt',image:'/changed.png'},form:{},archivedImage:'data:image/png;base64,FROZEN'}}/>);
 expect(screen.getByRole('img')).toHaveAttribute('src','data:image/png;base64,FROZEN');
});
test('proof shows the selected OT board and library price even for a sign saved by ID only',()=>{
 const board={widthMm:420,heightMm:603,title:'Avdelning',targetTitle:'Målpunkt',rows:[{text:'Mottagning',target:'A'}]};
 const article={id:'ot',articleNumber:'0810',name:'Pappersutskrift',previewType:'ot_board',unitPrice:0,
  otBoards:[{id:'entry',name:'Entré 10',location:'Ryhov',board,unitPrice:475}]};
 const sign={id:'ot-sign',position:'S038',articleId:'ot',quantity:2,configuration:{otBoardId:'entry',otBoard:board}};
 render(<ProjectProofModal project={{...project,signs:[sign]}} catalog={{articles:[article]}} onClose={()=>{}}/>);
 expect(screen.getByText('Ryhov · Entré 10')).toBeVisible();
 expect(screen.getByText(/475,00 kr \/ st exkl\. moms/)).toBeVisible();
 fireEvent.click(screen.getByRole('checkbox',{name:'Visa priser'}));
 expect(screen.queryByText(/475,00 kr/)).toBeNull();
 expect(screen.getByText('Ryhov · Entré 10')).toBeVisible();
});
