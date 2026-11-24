// Coordinates are measured on the customer's original product photographs.
const profiles = {
 '0601': {size:[1311,683],frame:[46,38,1220,609],paper:[84,71,1144,544],sample:1160},
 '0602': {size:[529,276],frame:[16,16,494,246],paper:[32,30,462,219],sample:478},
 '0603': {size:[1038,809],frame:[212,74,607,596],paper:[232,90,568,270],sample:770,whiteboard:[232,385,568,268],bottom:734},
 '0604': {size:[1040,810],frame:[224,75,607,596],paper:[244,91,568,270],sample:782,whiteboard:[244,386,568,268],bottom:735},
 '0607': {size:[708,745],frame:[157,60,399,586],paper:[169,72,375,176],sample:526,status:[169,263,375,179],whiteboard:[169,458,375,176],bottom:689},
 '0608': {size:[1352,960],frame:[243,56,869,855],paper:[271,80,813,387],sample:1058,status:[271,501,813,387]},
};
export function getDoorPhotoProfile(product={}) {
 if(product.doorPhotoPreviewEnabled===false)return null;
 return profiles[String(product.articleNumber||'').padStart(4,'0')]||null;
}
export function hasPhotographicDoorPreview(product={}) {
 return Boolean(getDoorPhotoProfile(product))||['0609','0614'].includes(String(product.articleNumber||'').padStart(4,'0'));
}
export function photoWhiteboardArea(profile) {
 if(!profile?.whiteboard)return null;
 const [left,top,width,height]=profile.frame;
 const fullHeight=(profile.bottom||top+height)-top;
 const [x,y,w,h]=profile.whiteboard;
 return {x:(x-left)/width,y:(y-top)/fullHeight,width:w/width,height:h/fullHeight};
}
