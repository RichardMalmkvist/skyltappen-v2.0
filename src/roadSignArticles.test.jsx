import {withRoadSupplement} from './data/roadSupplement';
import React,{useState} from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import '@testing-library/jest-dom';
import {installRoadSignArticles} from './data/roadSignModels';
import {installParkingPole} from './data/parkingPole';
import {newDibondSign} from './data/dibondHelpers';
import {createCartItem,validateCurrentItem} from './data/cartHelpers';
import {duplicateAdminArticle} from './data/articleAdmin';
import {product3DView} from './data/product3DView';
import {roadAssemblyLayout} from './data/roadSignAssembly';
import {hangingStackEntries} from './data/hangingStack';
import HangingStackFields from './components/products/HangingStackFields';
import RoadStackPreview from './components/products/RoadStackPreview';
import DibondFields from './components/products/DibondFields';
import RoadSignArticleFields from './components/products/RoadSignArticleFields';
import DibondPreview from './components/products/DibondPreview';
const catalog=installParkingPole(installRoadSignArticles({})),roads=catalog.articles.filter(a=>a.roadSignModel),pole=catalog.articles.find(a=>a.articleNumber==='1503');
beforeAll(()=>jest.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null));
afterAll(()=>jest.restoreAllMocks());
test('original and model survive duplication and initialize independent editable signs',()=>{
 const artwork={id:'11111111-1111-4111-8111-111111111111',preview:'/api/sign-artworks/11111111-1111-4111-8111-111111111111/preview',mime:'image/svg+xml',name:'P.svg',widthMm:400,heightMm:400};
 const copy=duplicateAdminArticle({...roads[1],defaultSignArtwork:artwork}),sign=newDibondSign(copy);
 expect(copy.roadSignModel).toBe('400x400');expect(copy.storefrontOrderable).toBe(false);expect(sign.uploadedArtwork).toEqual(artwork);expect(sign.uploadedArtwork).not.toBe(artwork);expect(product3DView(copy)).toBe('bent');
 const item=createCartItem(copy,'dibondskylt',{dibondSign:sign,quantity:2});expect(item.dibondSign.uploadedArtwork.id).toBe(artwork.id);
});

test('round road sign clips its article artwork to a 450 mm circular face and retains the model on duplication',()=>{
 const round=catalog.articles.find(a=>a.roadSignModel==='dia400'),artwork={id:'round-art',preview:'data:image/svg+xml,<svg/>',widthMm:400,heightMm:400},copy=duplicateAdminArticle({...round,defaultSignArtwork:artwork});
 expect(copy.roadSignModel).toBe('dia400');expect(copy.format).toBe('Ø 450 mm');expect(copy.storefrontOrderable).toBe(false);
 const {container}=render(<DibondPreview product={copy} sign={newDibondSign(copy)}/>);
 // Check the generated clipping geometry rather than only its accessible label.
 // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
 const circle=container.querySelector('circle'),image=container.querySelector('[data-sign-artwork]');
 expect(circle).toHaveAttribute('r','225');expect(circle).toHaveAttribute('cx','225');expect(image.getAttribute('clip-path')).toMatch(/-face\)/);
});
test('pole is a hollow 60 mm tube with 4.2 mm walls and chosen height; checkout carries height',()=>{
 expect(validateCurrentItem(pole,'stolpe',{quantity:1,poleHeightMm:2200})).toBeNull();
 const item=createCartItem(pole,'stolpe',{quantity:2,poleHeightMm:2200});expect(item.poleHeightMm).toBe(2200);expect(item.format).toContain('2200');expect(product3DView(pole)).toBe('pole');
});
test('proof editor adds stacked sign and pole, preserves individual artwork and updates pole height',()=>{
 let latest;function Editor(){const [state,setState]=useState({product:roads[1],form:{dibondSign:newDibondSign(roads[1])}});latest=state;return <><RoadStackPreview {...state} articles={catalog.articles}/><HangingStackFields {...state} articles={catalog.articles} setForm={fn=>setState(old=>({...old,form:typeof fn==='function'?fn(old.form):fn}))} onRootChange={(product,form)=>setState({product,form})}/></>;}
 render(<Editor/>);fireEvent.click(screen.getByRole('button',{name:'Lägg till skyltfält nedanför'}));fireEvent.click(screen.getByLabelText('Skyltfältets alternativ'));fireEvent.click(screen.getByRole('button',{name:'Lägg till stolpe 1503'}));
 fireEvent.change(screen.getByLabelText('Stolphöjd (mm)'),{target:{value:'2700'}});
 const entries=hangingStackEntries(latest.product,latest.form,catalog.articles),layout=roadAssemblyLayout(entries,10,100);
 expect(entries).toHaveLength(3);expect(layout.height).toBe(2700);expect(layout.panels[1].y).toBe(500.5);expect(latest.form.hangingStack.gapMm).toBe(.5);expect(screen.queryByLabelText('Mellanrum mellan skyltarna (mm)')).not.toBeInTheDocument();expect(product3DView(latest.product,latest.form)).toBe('road-assembly');
});
test('road article artwork is uploaded only in Artiklar and applied automatically without project design controls',async()=>{
 const artwork={id:'11111111-1111-4111-8111-111111111111',preview:'/api/sign-artworks/11111111-1111-4111-8111-111111111111/preview',mime:'image/svg+xml',name:'Parkering.svg',widthMm:400,heightMm:400};
 const fetch=jest.spyOn(global,'fetch').mockResolvedValue({ok:true,json:async()=>({artwork})});
 let saved;function Admin(){const [article,setArticle]=useState(roads[1]);saved=article;return <RoadSignArticleFields article={article} onChange={setArticle} credential="account:admin"/>;}
 const view=render(<Admin/>);
 fireEvent.change(screen.getByLabelText('Ladda upp eget original'),{target:{files:[new File(['<svg/>'],'Parkering.svg',{type:'image/svg+xml'})]}});
 await waitFor(()=>expect(saved.defaultSignArtwork).toEqual(artwork));expect(saved.image).toBe(artwork.preview);view.unmount();fetch.mockRestore();
 let configured;function Project(){const [form,setForm]=useState({dibondSign:{...newDibondSign(roads[1]),lines:[{text:'Tidigare fri text'}],uploadedArtwork:{id:'old-custom-file'}}});configured=form;return <DibondFields product={saved} form={form} onChange={changes=>setForm(old=>({...old,...changes}))}/>;}
 render(<Project/>);await waitFor(()=>expect(configured.dibondSign.uploadedArtwork).toEqual(artwork));
 expect(configured.dibondSign.lines.every(line=>!line.text)).toBe(true);expect(screen.queryByRole('textbox')).not.toBeInTheDocument();expect(screen.queryByLabelText('Ladda upp eget original')).not.toBeInTheDocument();expect(screen.queryByText('+ Lägg till')).not.toBeInTheDocument();
 expect(screen.getByRole('status')).toHaveTextContent('Motivet hämtas från artikeln.');
 const item=createCartItem(saved,'dibondskylt',{...configured,quantity:1});expect(item.dibondSign.uploadedArtwork.id).toBe(artwork.id);
});
test('admin can set a custom width and duplicate the wide road article with its artwork',()=>{
 let saved;function Editor(){const [article,setArticle]=useState(catalog.articles.find(a=>a.roadSignModel==='800x200'));saved=article;return <RoadSignArticleFields article={article} onChange={setArticle}/>;}
 render(<Editor/>);fireEvent.change(screen.getByLabelText('Bredd på skylten (mm)'),{target:{value:'1200'}});
 const copy=duplicateAdminArticle(saved);expect(copy.roadSignWidthMm).toBe('1200');expect(copy.dibondConfig.defaultWidthMm).toBe(1200);expect(newDibondSign(copy).widthMm).toBe(1200);expect(copy.format).toBe('1200 × 200 mm');
});

test('blank template supports both admin dimensions and an independently positioned project original',async()=>{
 let saved;function Admin(){const [article,setArticle]=useState(catalog.articles.find(a=>a.roadSignBlank));saved=article;return <RoadSignArticleFields article={article} onChange={setArticle}/>;}
 const view=render(<Admin/>);
 fireEvent.change(screen.getByLabelText('Bredd på skylten (mm)'),{target:{value:'750'}});
 fireEvent.change(screen.getByLabelText('Höjd på skylten (mm)'),{target:{value:'500'}});
 const copy=duplicateAdminArticle(saved);expect(copy.format).toBe('750 × 500 mm');expect(newDibondSign(copy).heightMm).toBe(500);expect(copy.defaultSignArtwork).toBeUndefined();expect(product3DView(copy)).toBe('bent');view.unmount();
 const artwork={id:'11111111-1111-4111-8111-111111111111',preview:'/api/sign-artworks/11111111-1111-4111-8111-111111111111/preview',mime:'image/svg+xml',name:'Eget.svg',widthMm:400,heightMm:200};
 const fetch=jest.spyOn(global,'fetch').mockResolvedValue({ok:true,json:async()=>({artwork})});
 let latest;function Project(){const [form,setForm]=useState({dibondSign:newDibondSign(copy)});latest=form;return <DibondFields product={copy} form={form} onChange={changes=>setForm(old=>({...old,...changes}))}/>;}
 render(<Project/>);fireEvent.change(screen.getByLabelText('Ladda upp eget original'),{target:{files:[new File(['<svg/>'],'Eget.svg',{type:'image/svg+xml'})]}});
 await waitFor(()=>expect(latest.dibondSign.uploadedArtwork).toEqual(artwork));
 fireEvent.change(screen.getByLabelText('Motivets bredd (mm)'),{target:{value:'300'}});
 expect(latest.dibondSign.artworkPlacement.widthMm).toBe(300);expect(latest.dibondSign.widthMm).toBe(750);expect(latest.dibondSign.heightMm).toBe(500);
 const item=createCartItem(copy,'dibondskylt',{...latest,quantity:1});expect(item.dibondSign.artworkPlacement.widthMm).toBe(300);expect(item.dibondSign.uploadedArtwork.id).toBe(artwork.id);fetch.mockRestore();
});

test('pole controls select two poles and retain independent edge distances when switching sign fields',()=>{
 let latest;function Editor(){const [state,setState]=useState({product:roads[1],form:{dibondSign:newDibondSign(roads[1])}});latest=state;return <HangingStackFields {...state} articles={catalog.articles} setForm={fn=>setState(old=>({...old,form:typeof fn==='function'?fn(old.form):fn}))} onRootChange={(product,form)=>setState({product,form})}/>;}
 render(<Editor/>);fireEvent.click(screen.getByLabelText('Skyltfältets alternativ'));fireEvent.click(screen.getByRole('button',{name:'Lägg till stolpe 1503'}));
 fireEvent.change(screen.getByLabelText('Antal stolpar'),{target:{value:'2'}});
 fireEvent.change(screen.getByLabelText('Stolpcentrum från vänster ytterkant (mm)'),{target:{value:'75'}});fireEvent.change(screen.getByLabelText('Stolpcentrum från höger ytterkant (mm)'),{target:{value:'100'}});
 expect(roadAssemblyLayout(hangingStackEntries(latest.product,latest.form,catalog.articles)).poleXs).toEqual([75,300]);
 fireEvent.change(screen.getByLabelText('Välj skyltfält'),{target:{value:'0'}});fireEvent.change(screen.getByLabelText('Välj skyltfält'),{target:{value:'1'}});
 expect(screen.getByLabelText('Antal stolpar')).toHaveValue('2');expect(screen.getByLabelText('Stolpcentrum från vänster ytterkant (mm)')).toHaveValue(75);
 fireEvent.change(screen.getByLabelText('Antal stolpar'),{target:{value:'1'}});expect(roadAssemblyLayout(hangingStackEntries(latest.product,latest.form,catalog.articles)).poleXs).toEqual([200]);
});
test('ordinary custom-text articles keep their text editor and original upload',()=>{
 const product={...roads[1],roadSignModel:undefined},onChange=jest.fn();render(<DibondFields product={product} form={{dibondSign:newDibondSign(product)}} onChange={onChange}/>);
 expect(screen.getByLabelText('Ladda upp eget original')).toBeInTheDocument();expect(screen.getByRole('textbox')).toBeInTheDocument();
});

test('signs move past the pole in both directions, retaining their artwork, text, pole height and assembly offset',()=>{
 let latest;const first=roads[1],last=withRoadSupplement({...roads[0],id:'dynamic-test'}),articles=[...catalog.articles,last];
 function Editor(){const [state,setState]=useState({product:first,form:{dibondSign:newDibondSign(first),roadAssemblyTopMm:20,hangingStack:{gapMm:.5,items:[{id:'pole',articleId:pole.id,product:pole,configuration:{poleHeightMm:2700}},{id:'last',articleId:last.id,product:last,configuration:{dibondSign:{...newDibondSign(last),lines:[{text:'Besökare',sizeMm:35}]}}}]}}});latest=state;return <HangingStackFields {...state} articles={articles} setForm={fn=>setState(old=>({...old,form:typeof fn==='function'?fn(old.form):fn}))} onRootChange={(product,form)=>setState({product,form})}/>;}
 render(<Editor/>);
 fireEvent.change(screen.getByLabelText('Välj skyltfält'),{target:{value:'2'}});fireEvent.click(screen.getByLabelText('Skyltfältets alternativ'));
 expect(screen.getByRole('button',{name:'Flytta skyltfält upp'})).toBeEnabled();fireEvent.click(screen.getByRole('button',{name:'Flytta skyltfält upp'}));
 let entries=hangingStackEntries(latest.product,latest.form,articles);expect(entries.map(e=>e.product.id)).toEqual([last.id,pole.id,first.id]);expect(entries[0].form.dibondSign.lines[0].text).toBe('Besökare');expect(entries[1].form.poleHeightMm).toBe(2700);expect(latest.form.roadAssemblyTopMm).toBe(20);
 fireEvent.click(screen.getByLabelText('Skyltfältets alternativ'));expect(screen.getByRole('button',{name:'Flytta skyltfält ner'})).toBeEnabled();fireEvent.click(screen.getByRole('button',{name:'Flytta skyltfält ner'}));
 entries=hangingStackEntries(latest.product,latest.form,articles);expect(entries.map(e=>e.product.id)).toEqual([first.id,pole.id,last.id]);expect(entries[2].form.dibondSign.lines[0].text).toBe('Besökare');expect(latest.form.roadAssemblyTopMm).toBe(20);
 fireEvent.change(screen.getByLabelText('Välj skyltfält'),{target:{value:'1'}});fireEvent.click(screen.getByLabelText('Skyltfältets alternativ'));expect(screen.getByRole('button',{name:'Flytta skyltfält upp'})).toBeDisabled();expect(screen.getByRole('button',{name:'Flytta skyltfält ner'})).toBeDisabled();
});
