import React from 'react';
import {render,screen} from '@testing-library/react';
import '@testing-library/jest-dom';
import {projectProofGroups,projectProofPages} from './data/projectProof';
import RoadAssemblyProof from './components/projects/RoadAssemblyProof';
const panel={id:'p',name:'E19 - Parkering',desc:'Reflexklass Ra1',roadSignModel:'400x400',categoryId:'parkeringsskylt',unitPrice:500};
const extra={id:'e',name:'Besökande',roadSignModel:'400x200',categoryId:'parkeringsskylt',unitPrice:250};
const pole={id:'pole',name:'Galvaniserad stolpe',previewType:'parking_pole',unitPrice:1250};
test('assembled proof labels show each article, actual height and price beside its own panel, without the package title',()=>{
 const configuration={dibondSign:{widthMm:400,heightMm:400},hangingStack:{gapMm:.5,items:[{id:'e',articleId:'e',configuration:{dibondSign:{widthMm:400,heightMm:300,roadSupplement:true}}},{id:'pole',articleId:'pole',configuration:{poleHeightMm:2500}}]}};
 const [group]=projectProofGroups({signs:[{id:'s',articleId:'p',configuration,quantity:2}]},[panel,extra,pole]);
 expect(projectProofPages([group])[0].spacious).toBe(true);
 const {container,rerender}=render(<RoadAssemblyProof group={group} showPrices/>);
 expect(screen.getByText('E19 - Parkering')).toBeInTheDocument();
 expect(screen.getByText('400 × 300 mm')).toBeInTheDocument();
 expect(screen.getByText('Ø60 × 2500 mm')).toBeInTheDocument();
 expect(screen.getByText(/Pris: 500/)).toBeInTheDocument();
 expect(screen.getAllByText('Antal: 2 st')).toHaveLength(3);
 // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
 const descriptions=[...container.querySelectorAll('.proof-road-description')];
 expect(descriptions.map(e=>parseFloat(e.style.top))).toEqual([...descriptions.map(e=>parseFloat(e.style.top))].sort((a,b)=>a-b));
 rerender(<RoadAssemblyProof group={group} showPrices={false}/>);
 expect(screen.queryByText(/Pris:/)).not.toBeInTheDocument();
});

test('two poles are drawn at their edge offsets and counted in proof quantity and package price',()=>{
 const configuration={dibondSign:{widthMm:400,heightMm:400},hangingStack:{gapMm:.5,items:[{id:'pole',articleId:'pole',configuration:{poleHeightMm:2500,poleCount:2,poleLeftInsetMm:75,poleRightInsetMm:100}}]}};
 const [group]=projectProofGroups({signs:[{id:'s',articleId:'p',configuration,quantity:3}]},[panel,pole]);expect(group.product.unitPrice).toBe(3000);
 const {container}=render(<RoadAssemblyProof group={group} showPrices/>);
 // Assert the actual drawing geometry alongside its order count.
 // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
 const poles=[...container.querySelectorAll('[data-road-pole]')];expect(poles.map(p=>p.getAttribute('x'))).toEqual(['45','270']);
 expect(screen.getByText('Antal: 6 st')).toBeInTheDocument();expect(screen.getByText('Stolpcentrum: 75 mm från vänster, 100 mm från höger')).toBeInTheDocument();
});
