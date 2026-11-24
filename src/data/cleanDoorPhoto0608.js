export const cleanDoorPhoto0608Url = `${typeof process!=='undefined' ? process.env.PUBLIC_URL || '' : ''}/door-photo-0608-clean.svg`;

function isOriginalPhoto(value) {
 if(typeof value!=='string'||value.length!==21187)return false;
 let hash=2166136261;
 for(let i=0;i<value.length;i++)hash=Math.imul(hash^value.charCodeAt(i),16777619)>>>0;
 return hash===2583519766;
}

// Only replace the known photograph with the CAD axis in its white margin.
// A newly uploaded photograph must always remain the customer's choice.
export function cleanDoorPhoto0608(article) {
 if(String(article?.articleNumber||'').padStart(4,'0')!=='0608')return article;
 const clean=value=>isOriginalPhoto(value)?cleanDoorPhoto0608Url:value;
 const fields=['image','cardImage','doorSignPreviewImage'];
 const changed=fields.some(key=>isOriginalPhoto(article[key]))||article.images?.some(isOriginalPhoto);
 if(!changed)return article;
 return {...article,...Object.fromEntries(fields.filter(key=>key in article).map(key=>[key,clean(article[key])])),...(Array.isArray(article.images)?{images:article.images.map(clean)}:{})};
}
