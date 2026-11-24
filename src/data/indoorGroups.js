export function indoorGroup(product) {
  if(product.vinylText||String(product.group||'').trim().toLowerCase()==='tillbehör')return 'accessories';
  const text=String([product.indoorGroup,product.subgroup,product.group,product.productType,product.previewType,product.name,product.desc].join(" ")).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  if(product.productType==='dekal'||product.indoorGroup==='decals')return 'decals';
  if (product.previewType==="destination_cube" || /malpunkts(?:kub|skylt)/.test(text)) return "cubes";
  if (/flagg|flag[_ -]?sign/.test(text)) return "flags";
  if (product.previewType==="dibond_sign" || /dibond/.test(text)) return "dibond";
  if (/dekal|decal|vinyl|foliedekor/.test(text)) return "decals";
  return "other";
}
