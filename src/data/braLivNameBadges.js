// Bra Liv badge variants, editable suggestion lists and fixed organisation line.
const BRA_LIV_LAYOUT = {organizationWidthMm:36,organizationFontSizeMm:3.15,logo:{x:41.3,y:21.75,width:30,height:30*5.3691/38.0991}};
const BRA_LIV_TITLES = [
  "Apotekare",
  "Arbetsterapeut",
  "Assistent",
  "Beteendevetare",
  "Bitr verksamhetschef",
  "BT-läkare",
  "Distriktsläkare",
  "Distriktssköterska",
  "Enhetschef",
  "Fotvårdsspecialist",
  "Fysioterapeut",
  "Kurator",
  "Kurator psykoterapeut",
  "Läkare",
  "Läkarsekreterare",
  "Psykolog",
  "Sjukgymnast",
  "Sjuksköterska",
  "ST-läkare",
  "Städerska",
  "Underläkare",
  "Undersköterska",
  "Verksamhetschef",
  "Verksamhetsutvecklare",
  "Vårdadministratör",
  "Överläkare"
];
const BRA_LIV_CLINICS = [
  "Bra Liv Anderstorp vårdcentralsfilial",
  "Bra Liv Bankeryd vårdcentral",
  "Bra Liv Bodafors vårdcentral",
  "Bra Liv Eksjö vårdcentral",
  "Bra Liv Gislaved vårdcentral",
  "Bra Liv Gnosjö vårdcentral",
  "Bra Liv Gränna vårdcentral",
  "Bra Liv Habo vårdcentral",
  "Bra Liv Hälsan 1 vårdcentral",
  "Bra Liv Hälsan 2 vårdcentral",
  "Bra Liv Kungshälsan vårdcentral",
  "Bra Liv Landsbro vårdcentral",
  "Bra Liv Mariannelund vårdcentralsfilial",
  "Bra Liv Mullsjö vårdcentral",
  "Bra Liv Norrahammar vårdcentral",
  "Bra Liv Nässjö vårdcentral",
  "Bra Liv Reftele vårdcentralsfilial",
  "Bra Liv Rosenhälsan vårdcentral",
  "Bra Liv Rosenlund vårdcentral",
  "Bra Liv Rydaholm vårdcentral",
  "Bra Liv Råslätt vårdcentral",
  "Bra Liv Skillingaryd vårdcentral",
  "Bra Liv Smålandsstenar vårdcentral",
  "Bra Liv Sävsjö vårdcentral",
  "Bra Liv Tenhult vårdcentral",
  "Bra Liv Tranås vårdcentral",
  "Bra Liv Vaggeryd vårdcentral",
  "Bra Liv Vetlanda vårdcentral",
  "Bra Liv Vrigstad vårdcentralsfilial",
  "Bra Liv Vråen vårdcentral",
  "Bra Liv Väster Vårdcentral",
  "Bra Liv Öxnehaga vårdcentral",
  "Vårdcentralerna Bra Liv Stab"
];
const BRA_LIV_VARIANTS = [
  {number:'0261',source:'0201',description:'utan verksamhetsnamn'},
  {number:'0262',source:'0202',description:'med verksamhetsnamn, en eller två rader'},
  {number:'0263',source:'0205',description:'utan verksamhetsnamn, två titlar'},
  {number:'0264',source:'0207',description:'med verksamhetsnamn, två rader'},
];
const isBraLivBadge = product => /^braliv_026[1-4]$/.test(product?.nameBadgePreset || '');
const hasBraLivOrganization = product => ['braliv_0262','braliv_0264'].includes(product?.nameBadgePreset);
const cleanOptions = values => [...new Set((Array.isArray(values)?values:[]).map(value=>String(value).trim()).filter(Boolean))];
const braLivClinicText = value => String(value || '').trim().replace(/^Bra Liv\s+/i,'');
function normalizeBraLivForm(product,form={}) {
  if(!isBraLivBadge(product))return form;
  return {...form,orgLine1:hasBraLivOrganization(product)?'Bra Liv':'',orgLine2:hasBraLivOrganization(product)?braLivClinicText(form.orgLine2):''};
}
function braLivOptions(product,key) {
  const config=product?.braLivBadgeConfig;
  return cleanOptions(config && Object.prototype.hasOwnProperty.call(config,key)?config[key]:key==='titles'?BRA_LIV_TITLES:BRA_LIV_CLINICS);
}
function installBraLivNameBadges(catalog={}) {
  const updateKey='bra-liv-name-badges-0261-0264-v1';
  if((catalog.productUpdates||[]).includes(updateKey))return catalog;
  const articles=[...(catalog.articles||[])];
  for(const variant of BRA_LIV_VARIANTS){
    if(articles.some(article=>String(article.articleNumber)===variant.number))continue;
    const source=articles.find(article=>String(article.articleNumber)===variant.source);
    if(!source)throw new Error('Regionens namnbricksmall '+variant.source+' saknas.');
    const fields=JSON.parse(JSON.stringify(source.fields));
    if(['0262','0264'].includes(variant.number)){
      fields.orgLine1={label:'Verksamhetsnamn rad 1',fixedValue:'Bra Liv'};
      fields.orgLine2={label:'Vårdcentral – rad 2'+(variant.number==='0262'?' (valfri)':'')};
    }
    const image='/namebadge-'+variant.number+'.svg';
    articles.push({...source,id:'jsf-namebadge-'+variant.number,articleNumber:variant.number,
      name:'Namnbricka Bra Liv – '+variant.description,desc:'Bra Liv – '+variant.description,
      nameBadgePreset:'braliv_'+variant.number,nameBadgeGroup:'braliv',group:'Bra Liv vårdcentralerna',
      nameBadgePreviewImage:'/namnskylt-blank.jpg',image,images:[image],primaryImageIndex:0,cardImageIndex:0,cardImage:image,
      braLivBadgeConfig:{titles:[...BRA_LIV_TITLES],clinics:[...BRA_LIV_CLINICS]},fields,
      isImplemented:true,adminArchived:false});
  }
  return {...catalog,articles,productUpdates:[...(catalog.productUpdates||[]),updateKey]};
}
module.exports={BRA_LIV_LAYOUT,BRA_LIV_TITLES,BRA_LIV_CLINICS,BRA_LIV_VARIANTS,isBraLivBadge,hasBraLivOrganization,braLivOptions,braLivClinicText,normalizeBraLivForm,installBraLivNameBadges};
