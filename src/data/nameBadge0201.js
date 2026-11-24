const {isBraLivBadge,normalizeBraLivForm}=require('./braLivNameBadges');
// Shared catalog setup, validation and accessory rows for RJL name badges.
const UPDATE_KEY = "name-badge-0201-v1";
function isNameBadge0201(product = {}) {
  return isBraLivBadge(product) || ["rjl_0201","rjl_0202","rjl_0205","rjl_0207","ftv_0208","ftv_0209","ftv_0210","school_0250","school_0251","school_0252","school_0253","jlt_0310","energy_0211"].includes(product.nameBadgePreset);
}
function installBaseNameBadge0201(catalog = {}) {
  if ((catalog.productUpdates || []).includes(UPDATE_KEY)) return catalog;
  const articles = [...(catalog.articles || [])];
  const definitions = [
    {id:"jsf-namebadge-0201",articleNumber:"0201",name:"Namnbricka utan verksamhetsnamn",desc:"Utan verksamhetsnamn",categoryId:"namnbrickor",productType:"namnbricka",productTypeLabel:"Namnbricka",nameBadgePreset:"rjl_0201",nameBadgePreviewImage:"/namnskylt-blank.jpg",format:"75 × 30 mm",widthMm:75,heightMm:30,unitPrice:167,currency:"SEK",flowType:"form",previewType:"badge",directAddToCart:false,isImplemented:true,adminArchived:false,image:"/namnskylt.jpg",images:["/namnskylt.jpg"],fields:{name:{label:"Namn",placeholder:"Namn Efternamn"},title:{label:"Titel",placeholder:"Titel"},fastening:true,quantity:true,extraMagnets:{label:"Antal extra magnetfästen – 02030 (52 kr/st)"}},fasteningOptions:["Magnet","Plastklämma","Nål"],extraMagnetArticleNumber:"02030"},
    {id:"jsf-accessory-02030",articleNumber:"02030",name:"Extra magnetfäste",desc:"Extra magnetfäste till namnbrickor",categoryId:"namnbrickor",productType:"tillbehor",productTypeLabel:"Tillbehör",unitPrice:52,currency:"SEK",flowType:"direct",previewType:"image",directAddToCart:true,isImplemented:true,adminArchived:false,image:"",images:[],fields:{quantity:true}}
  ];
  for (const definition of definitions) {
    const index = articles.findIndex(article=>String(article.articleNumber || "").trim()===definition.articleNumber);
    if(index<0) articles.push(definition);
    else {
      const current=articles[index];
      // Keep identity and uploaded images while installing the requested fields and prices.
      articles[index]={...current,...definition,id:current.id,...(current.image || current.images?.length ? {image:current.image,images:current.images || [current.image]} : {})};
    }
  }
  const categories=[...(catalog.categories || [])];
  if(!categories.some(category=>category.id==="namnbrickor")) categories.push({id:"namnbrickor",title:"Namnbrickor",isImplemented:true,status:"open",isCustom:false});
  return {...catalog,categories,articles,productUpdates:[...(catalog.productUpdates || []),UPDATE_KEY]};
}
function installRJLNameBadges(catalog = {}) {
  const base=installBaseNameBadge0201(catalog);
  const updateKey="name-badges-0202-0205-0207-v1";
  if((base.productUpdates || []).includes(updateKey)) return base;
  // Use defaults, so later edits to 0201 never change a different model.
  const template=installBaseNameBadge0201({}).articles.find(article=>article.articleNumber==="0201");
  const variants=[
    {number:"0202",name:"Namnbricka med verksamhetsnamn – en rad",desc:"Med verksamhetsnamn – en rad",fields:{orgLine1:{label:"Verksamhetsnamn",placeholder:"Verksamhetsnamn 1 rad"}}},
    {number:"0205",name:"Namnbricka utan verksamhetsnamn – två titlar",desc:"Utan verksamhetsnamn med två titlar",fields:{titleLine2:{label:"Titel rad 2",placeholder:"Titel"}}},
    {number:"0207",name:"Namnbricka med verksamhetsnamn – två rader",desc:"Med verksamhetsnamn – två rader",fields:{orgLine1:{label:"Verksamhetsnamn rad 1",placeholder:"Verksamhetsnamn"},orgLine2:{label:"Verksamhetsnamn rad 2",placeholder:"2 rader"}}}
  ];
  const articles=[...base.articles];
  for(const variant of variants) {
    const definition={...template,id:`jsf-namebadge-${variant.number}`,articleNumber:variant.number,name:variant.name,desc:variant.desc,nameBadgePreset:`rjl_${variant.number}`,image:`/namebadge-${variant.number}.svg`,images:[`/namebadge-${variant.number}.svg`],fields:{...template.fields,...variant.fields}};
    const index=articles.findIndex(article=>String(article.articleNumber || "").trim()===variant.number);
    if(index<0) articles.push(definition);
    else {
      const current=articles[index];
      articles[index]={...current,...definition,id:current.id,...(current.image || current.images?.length ? {image:current.image,images:current.images || [current.image]} : {})};
    }
  }
  return {...base,articles,productUpdates:[...(base.productUpdates || []),updateKey]};
}
function installFTVNameBadges(catalog = {}) {
  const base=installRJLNameBadges(catalog);
  const updateKey="name-badges-folktandvarden-0208-0209-0210-v1";
  if((base.productUpdates || []).includes(updateKey)) return base;
  const template=installBaseNameBadge0201({}).articles.find(article=>article.articleNumber==="0201");
  const variants=[
    {number:"0208",desc:"Folktandvården – med verksamhetsnamn",fields:{orgLine1:{label:"Verksamhetsnamn",placeholder:"Verksamhetsnamn 1 rad"}}},
    {number:"0209",desc:"Folktandvården – två titlar",fields:{titleLine2:{label:"Titel rad 2",placeholder:"Titel"}}},
    {number:"0210",desc:"Folktandvården – utan verksamhetsnamn",fields:{}}
  ];
  const articles=[...base.articles];
  for(const variant of variants) {
    const definition={...template,id:`jsf-namebadge-${variant.number}`,articleNumber:variant.number,name:`Namnbricka ${variant.desc}`,desc:variant.desc,nameBadgePreset:`ftv_${variant.number}`,nameBadgePreviewImage:"/ftv tom.jpg",format:"75 × 26 mm",heightMm:26,image:`/art.-${variant.number}.jpg`,images:[`/art.-${variant.number}.jpg`],fields:{...template.fields,...variant.fields}};
    const index=articles.findIndex(article=>String(article.articleNumber || "").trim()===variant.number);
    if(index<0) articles.push(definition);
    else {
      const current=articles[index];
      articles[index]={...current,...definition,id:current.id,...(current.image || current.images?.length ? {image:current.image,images:current.images || [current.image]} : {})};
    }
  }
  return {...base,articles,productUpdates:[...(base.productUpdates || []),updateKey]};
}
function installSchoolNameBadges(catalog = {}) {
  const base=installFTVNameBadges(catalog);
  const updateKey="name-badges-schools-0250-0251-0252-0253-v1";
  if((base.productUpdates || []).includes(updateKey)) return base;
  const template=installBaseNameBadge0201({}).articles.find(article=>article.articleNumber==="0201");
  const variants=[
    {number:"0250",school:"Tenhults gymnasiet",title:true},
    {number:"0251",school:"Stora Segerstads gymnasiet",title:true},
    {number:"0252",school:"Tenhults gymnasiet",title:false},
    {number:"0253",school:"Stora Segerstads gymnasiet",title:false}
  ];
  const articles=[...base.articles];
  for(const variant of variants) {
    const fields={...template.fields};
    if(!variant.title) delete fields.title;
    const desc=`${variant.school} – ${variant.title?"namn och titel":"enbart namn"}`;
    const definition={...template,id:`jsf-namebadge-${variant.number}`,articleNumber:variant.number,name:`Namnbricka ${desc}`,desc,nameBadgePreset:`school_${variant.number}`,image:`/namebadge-${variant.number}.svg`,images:[`/namebadge-${variant.number}.svg`],fields};
    const index=articles.findIndex(article=>String(article.articleNumber || "").trim()===variant.number);
    if(index<0) articles.push(definition);
    else {
      const current=articles[index];
      articles[index]={...current,...definition,id:current.id,...(current.image || current.images?.length ? {image:current.image,images:current.images || [current.image]} : {})};
    }
  }
  return {...base,articles,productUpdates:[...(base.productUpdates || []),updateKey]};
}
function installJLTNameBadge(catalog = {}) {
  const base=installSchoolNameBadges(catalog);
  const updateKey="name-badge-jlt-0310-v1";
  if((base.productUpdates || []).includes(updateKey)) return base;
  const template=installBaseNameBadge0201({}).articles.find(article=>article.articleNumber==="0201");
  const definition={...template,id:"jsf-namebadge-0310",articleNumber:"0310",name:"Namnbricka JLT",desc:"Jönköpings Länstrafik – namn och titel",nameBadgePreset:"jlt_0310",image:"/namebadge-0310.svg",images:["/namebadge-0310.svg"]};
  const articles=[...base.articles];
  const index=articles.findIndex(article=>String(article.articleNumber || "").trim()==="0310");
  if(index<0) articles.push(definition);
  else {
    const current=articles[index];
    articles[index]={...current,...definition,id:current.id,...(current.image || current.images?.length ? {image:current.image,images:current.images || [current.image]} : {})};
  }
  return {...base,articles,productUpdates:[...(base.productUpdates || []),updateKey]};
}
function installNameBadge0201(catalog = {}) {
  const base=installJLTNameBadge(catalog);
  const updateKey="name-badge-energikontor-0211-v1";
  if((base.productUpdates || []).includes(updateKey)) return base;
  const template=installBaseNameBadge0201({}).articles.find(article=>article.articleNumber==="0201");
  const definition={...template,id:"jsf-namebadge-0211",articleNumber:"0211",name:"Namnbricka Energikontor Norra Småland",desc:"Energikontor Norra Småland – namn och titel",nameBadgePreset:"energy_0211",image:"/namebadge-0211.svg",images:["/namebadge-0211.svg"]};
  const articles=[...base.articles];
  const index=articles.findIndex(article=>String(article.articleNumber || "").trim()==="0211");
  if(index<0) articles.push(definition);
  else {
    const current=articles[index];
    articles[index]={...current,...definition,id:current.id,...(current.image || current.images?.length ? {image:current.image,images:current.images || [current.image]} : {})};
  }
  return {...base,articles,productUpdates:[...(base.productUpdates || []),updateKey]};
}
function nameBadgeFormError(product, form = {}) {
  if(!isNameBadge0201(product)) return null;
  form=normalizeBraLivForm(product,form);
  if(product.nameBadgePreset==="braliv_0264"&&!form.orgLine2)return "Välj eller skriv vårdcentral.";
  if(!String(form.name || "").trim()) return "Du måste fylla i namn.";
  if(product.fields?.title !== false && !["school_0252","school_0253"].includes(product.nameBadgePreset) && !String(form.title || "").trim()) return "Du måste fylla i titel.";
  if(product.fields?.orgLine1 && !String(form.orgLine1 || "").trim()) return `Du måste fylla i ${(product.fields.orgLine1.label || "Verksamhetsnamn").toLowerCase()}.`;
  if(!(product.fasteningOptions || ["Magnet","Plastklämma","Nål"]).includes(form.fastening)) return "Du måste välja fäste.";
  if(!Number.isSafeInteger(Number(form.extraMagnets ?? 0)) || Number(form.extraMagnets ?? 0)<0) return "Extra magnetfästen måste vara ett heltal från 0.";
  return null;
}
function getNameBadgeCartAdditions(item, accessory) {
  if(!item || !isNameBadge0201(item) || !Number(item.extraMagnets)) return [item];
  const count=Number(item.extraMagnets);
  if(!Number.isSafeInteger(count) || count<0) throw new Error("Extra magnetfästen måste vara ett heltal från 0.");
  const magnet=accessory || item.extraMagnetProduct;
  if(!magnet) throw new Error("Extra magnetfäste 02030 saknas i artikelregistret.");
  const unitPrice=Number(magnet.unitPrice);
  if(!Number.isFinite(unitPrice) || unitPrice<0) throw new Error("Kontrollera priset på extra magnetfäste 02030.");
  return [{...item,extraMagnets:0},{
    id:`${item.id}-magnet`,badgeId:magnet.id,articleId:magnet.id,articleNumber:magnet.articleNumber,
    badgeName:magnet.name || "Extra magnetfäste",productType:"tillbehor",productTypeLabel:"Tillbehör",previewType:"image",categoryId:magnet.categoryId || "namnbrickor",image:magnet.image || "",desc:magnet.desc || "Extra magnetfäste till namnbrickor",quantity:count,unitPrice,currency:"SEK",lineTotal:Math.round(count*unitPrice*100)/100,
    ...(item.projectMarkerId ? {projectMarkerId:item.projectMarkerId,position:item.position,drawingName:item.drawingName} : {})
  }];
}
module.exports={installNameBadge0201,isNameBadge0201,nameBadgeFormError,getNameBadgeCartAdditions};
