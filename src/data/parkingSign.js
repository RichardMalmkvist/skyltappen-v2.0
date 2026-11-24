const artwork=require('./parkingArtwork.json');
const font=require('./parkingFontMetrics.json').bold;
const UPDATE='parking-sign-and-decal-v1';
const DIVIDER_BOTTOM_MM=418.29/artwork.viewBox[3]*artwork.heightMm;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const isParking=item=>item?.previewType==='parking_sign'||Boolean(item?.parkingSignConfig||item?.configuration?.parkingSignConfig);
function parkingConfig(product={}){
 const raw=product.parkingSignConfig||product.configuration?.parkingSignConfig||{},decal=raw.variant==='decal';
 return {variant:decal?'decal':'sign',widthMm:decal?280:artwork.widthMm,heightMm:decal?69:artwork.heightMm,textAreaLeftMm:decal?0:10,textAreaTopMm:decal?0:DIVIDER_BOTTOM_MM+10,textAreaWidthMm:decal?280:artwork.widthMm-20,textAreaHeightMm:decal?69:artwork.heightMm-DIVIDER_BOTTOM_MM-20,textHeightMm:26.5,lineGapMm:6,...raw};
}
function parkingConfigError(product){
 const c=parkingConfig(product);
 for(const key of ['widthMm','heightMm','textAreaWidthMm','textAreaHeightMm','textHeightMm'])if(!Number.isFinite(Number(c[key]))||Number(c[key])<=0||Number(c[key])>2000)return 'Fyll i giltiga positiva mått för parkeringsskylten.';
 for(const key of ['textAreaLeftMm','textAreaTopMm','lineGapMm'])if(!Number.isFinite(Number(c[key]))||Number(c[key])<0)return 'Textytans placering och radmellanrum måste vara 0 eller större.';
 if(Number(c.textAreaLeftMm)+Number(c.textAreaWidthMm)>Number(c.widthMm)+.001||Number(c.textAreaTopMm)+Number(c.textAreaHeightMm)>Number(c.heightMm)+.001)return 'Textytan måste rymmas inom skyltens mått.';
 return null;
}
function parkingLines(form={}){
 return [form.customTextLine1??form.customText??'',form.customTextLine2??''].map(v=>String(v).trim().normalize('NFC')).filter(Boolean);
}
function measure(value,height){
 const scale=height/font.capHeight;let cursor=0,previous='',minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 for(const c of value){const g=font.glyphs[c];if(!g)throw new Error('Tecknet ”'+c+'” stöds inte.');cursor+=(font.kerning[previous+c]||0);const [x0,y0,x1,y1]=g.bbox;if(x1>x0&&y1>y0){minX=Math.min(minX,(cursor+x0)*scale);maxX=Math.max(maxX,(cursor+x1)*scale);minY=Math.min(minY,y0*scale);maxY=Math.max(maxY,y1*scale);}cursor+=g.advance;previous=c;}
 return {minX,minY,maxX,maxY,width:maxX-minX,height:maxY-minY,fontSize:height*font.unitsPerEm/font.capHeight};
}
function parkingLayout(product,form={},options={}){
 const configError=parkingConfigError(product);if(configError)throw new Error(configError);
 const c=Object.fromEntries(Object.entries(parkingConfig(product)).map(([k,v])=>[k,k==='variant'?v:Number(v)]));
 if(form.parkingWithoutText===true)return {config:c,lines:[],totalHeight:0};
 let lines=parkingLines(form);if(!lines.length&&options.example)lines=['Palliativa','vårdenheten'];
 if(!lines.length)throw new Error('Du måste fylla i textrad 1.');
 if(!String(form.customTextLine1??form.customText??'').trim()&&String(form.customTextLine2||'').trim())throw new Error('Du måste fylla i textrad 1.');
 if(lines.some(s=>s.length>80||/[\r\n]/.test(s)))throw new Error('Använd högst två textrader med 80 tecken per rad.');
 const measured=lines.map(text=>({text,...measure(text,c.textHeightMm)}));
 const totalHeight=measured.reduce((sum,line)=>sum+line.height,0)+(lines.length-1)*c.lineGapMm;
 if(measured.some(line=>line.width>c.textAreaWidthMm)||totalHeight>c.textAreaHeightMm)throw new Error('Texten ryms inte med vald texthöjd. Dela upp texten på två rader, förkorta den eller justera texthöjden i artikeln.');
 let top=c.textAreaTopMm+(c.textAreaHeightMm-totalHeight)/2;
 const placed=measured.map(line=>{const result={...line,x:c.textAreaLeftMm+(c.textAreaWidthMm-line.width)/2-line.minX,baseline:top+line.maxY};top+=line.height+c.lineGapMm;return result;});
 return {config:c,lines:placed,totalHeight};
}
function parkingError(product,form){try{parkingLayout(product,form);return parkingSymbolsError(product,form); }catch(e){return e.message;}}
function parkingSymbolSign(product,form={}){const c=parkingConfig(product);return {widthMm:Number(c.widthMm),heightMm:Number(c.heightMm),frameEnabled:false,cornerRadiusMm:0,lines:[],symbols:form.parkingSymbols||[]};}
function parkingSymbolsError(product,form={}){const sign=parkingSymbolSign(product,form);if(!Array.isArray(sign.symbols)||sign.symbols.length>20)return 'Använd högst 20 symboler per skylt.';for(const symbol of sign.symbols){const size=Number(symbol.sizeMm),ratio=Number(symbol.aspectRatio||1),x=Number(symbol.xMm),y=Number(symbol.yMm);if(!/^\/api\/dibond-symbols\/images\/[a-f0-9-]{36}$/.test(String(symbol.image||''))||![size,ratio,x,y].every(Number.isFinite)||size<1||ratio<.05||ratio>20||x<4||y<4||x+size*ratio>sign.widthMm-4+.001||y+size>sign.heightMm-4+.001)return 'Symbolen måste rymmas innanför skyltens kanter.';}return null;}
function parkingSvg(product,form={},options={}){
 const {config:c,lines}=parkingLayout(product,form,options),sx=c.widthMm/artwork.viewBox[2],sy=c.heightMm/artwork.viewBox[3];
 const text=lines.map(line=>options.curves?options.curves(line,c):'<text x="'+line.x+'" y="'+line.baseline+'" font-family="Arial,sans-serif" font-weight="700" font-size="'+line.fontSize+'">'+esc(line.text)+'</text>').join('');
 const symbols=options.symbols===false?'':(form.parkingSymbols||[]).map(s=>'<image data-parking-symbol="true" href="'+esc(s.image)+'?v=svg2" x="'+Number(s.xMm)+'" y="'+Number(s.yMm)+'" width="'+(Number(s.sizeMm)*Number(s.aspectRatio||1))+'" height="'+Number(s.sizeMm)+'" preserveAspectRatio="xMidYMid meet"/>').join('');
 const header=c.variant==='sign'?'<g transform="scale('+sx+' '+sy+')">'+artwork.header+'</g>':'';
 const cut=c.variant==='sign'?'<g transform="scale('+sx+' '+sy+')">'+artwork.cut+'</g>':'<rect x="0" y="0" width="'+c.widthMm+'" height="'+c.heightMm+'" rx="1.5" fill="none" stroke="#EC2A90" stroke-width="0.075"/>';
 return '<svg xmlns="http://www.w3.org/2000/svg" width="'+c.widthMm+'mm" height="'+c.heightMm+'mm" viewBox="0 0 '+c.widthMm+' '+c.heightMm+'"><title>'+esc(c.variant==='decal'?'Dekal till parkeringsskylt':'Reserverad parkering')+'</title>'+(options.production?'':'<rect width="100%" height="100%" fill="white"/>')+header+'<g fill="#2B2A29">'+text+'</g>'+symbols+(options.cut?cut:'')+'</svg>';
}

function parkingFormat(product={}){const c=parkingConfig(product);return c.variant==='sign'?'300 × 210 mm':`${c.widthMm} × ${c.heightMm} mm`;}
// The screen preview has a subtle outline; print and cut artwork stay unchanged.
function parkingPreviewSvg(product,form={},options={}){
 const c=parkingConfig(product),flat=parkingSvg(product,form,{...options,cut:false,production:false});
 if(c.variant==='decal')return flat;
 const line=.2;
 return flat.replace('<svg ','<svg data-parking-presentation="flat" aria-label="'+esc('Parkeringsskylt '+parkingFormat(product))+'" ').replace('</svg>',`<rect data-parking-preview-outline="true" x="${line/2}" y="${line/2}" width="${c.widthMm-line}" height="${c.heightMm-line}" rx="1.5" fill="none" stroke="#555" stroke-opacity=".7" stroke-width="${line}"/></svg>`);
}
const PRESENTATION_UPDATE='parking-flat-presentation-v4';
function upgradeParkingPresentation(catalog){
 if((catalog.productUpdates||[]).includes(PRESENTATION_UPDATE))return catalog;
 const articles=(catalog.articles||[]).map(article=>{
  if(!isParking(article)||parkingConfig(article).variant!=='sign')return article;
  return {...article,format:parkingFormat(article)};
 });
 return {...catalog,articles,productUpdates:[...(catalog.productUpdates||[]),PRESENTATION_UPDATE]};
}

function parkingArticles(categoryId='parkeringsskylt'){
 return ['sign','decal'].map(variant=>{
  const decal=variant==='decal',config=parkingConfig({parkingSignConfig:{variant}});
  const article={id:decal?'jsf-parking-text-decal':'jsf-parking-reserved-1501',articleNumber:decal?'':'1501',categoryId,name:decal?'Dekal till befintlig parkeringsskylt':'Reserverad parkering – egen text',desc:decal?'Dekal med egen text till befintlig P-skylt.':'Parkeringsskylt med fast P-symbol och rubrik samt egen text under strecket.',format:decal?'280 × 69 mm':'300 × 210 mm',productType:'parkeringsskylt',productTypeLabel:decal?'Parkeringsdekal':'Parkeringsskylt',previewType:'parking_sign',parkingSignConfig:config,flowType:'form',directAddToCart:false,fields:{customTextLine1:{label:'Textrad 1',placeholder:'T.ex. Palliativa',maxLength:80},customTextLine2:{label:'Textrad 2 (valfri)',placeholder:'T.ex. vårdenheten',maxLength:80},quantity:true},unitPrice:decal?0:660,currency:'SEK',isImplemented:!decal,adminArchived:false};
  article.image='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(parkingPreviewSvg(article,{}, {example:true}));article.images=[article.image];return article;
 });
}
function installParkingProducts(catalog={}){
 if((catalog.productUpdates||[]).includes(UPDATE))return upgradeParkingPresentation(catalog);
 const categories=[...(catalog.categories||[])],found=categories.find(c=>/parkeringsskylt/i.test(c.id||'')),categoryId=found?.id||'parkeringsskylt';
 if(found)categories[categories.indexOf(found)]={...found,isImplemented:true,status:'open'};else categories.push({id:categoryId,title:'Parkeringsskylt',isImplemented:true,status:'open',isCustom:false});
 const articles=[...(catalog.articles||[])];for(const article of parkingArticles(categoryId)){const exists=articles.some(a=>a.id===article.id||(article.articleNumber&&String(a.articleNumber)===article.articleNumber));if(!exists)articles.push(article);}
 return upgradeParkingPresentation({...catalog,categories,articles,productUpdates:[...(catalog.productUpdates||[]),UPDATE]});
}
module.exports={parkingSymbolSign,parkingSymbolsError,isParking,parkingConfig,parkingConfigError,parkingLines,parkingLayout,parkingError,parkingSvg,parkingPreviewSvg,parkingFormat,parkingArticles,installParkingProducts};
