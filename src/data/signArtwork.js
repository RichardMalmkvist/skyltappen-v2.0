const getSignArtwork=item=>item?.dibondSign?.uploadedArtwork||item?.otBoard?.uploadedArtwork||item?.configuration?.dibondSign?.uploadedArtwork||item?.configuration?.otBoard?.uploadedArtwork||null;
const round=value=>Math.round(value*1000)/1000;
function artworkBounds(sign){
 const art=sign?.uploadedArtwork;if(!art)return null;
 if(sign.artworkPlacement){const p=sign.artworkPlacement;return {x:Number(p.xMm),y:Number(p.yMm),width:Number(p.widthMm),height:Number(p.heightMm)};}
 const scale=Math.min(Number(sign.widthMm)/art.widthMm,Number(sign.heightMm)/art.heightMm),width=art.widthMm*scale,height=art.heightMm*scale;
 return {x:(Number(sign.widthMm)-width)/2,y:(Number(sign.heightMm)-height)/2,width,height};
}
function placeArtwork(sign,changes={}){
 const b=artworkBounds(sign);if(!b)return sign;
 const w=Number(sign.widthMm),h=Number(sign.heightMm),ratio=sign.uploadedArtwork.widthMm/sign.uploadedArtwork.heightMm;
 let width=changes.widthMm!==undefined?Number(changes.widthMm):changes.heightMm!==undefined?Number(changes.heightMm)*ratio:b.width;
 width=Math.max(.1*ratio,Math.min(width,w,h*ratio));const height=width/ratio;
 const x=Math.max(0,Math.min(Number(changes.xMm??b.x),w-width)),y=Math.max(0,Math.min(Number(changes.yMm??b.y),h-height));
 return {...sign,artworkPlacement:{xMm:round(x),yMm:round(y),widthMm:round(width),heightMm:round(height)}};
}
function signArtworkError(artwork,width,height,placement){
 if(!artwork||!/^[a-f0-9-]{36}$/.test(String(artwork.id))||artwork.preview!==`/api/sign-artworks/${artwork.id}/preview`)return 'Ladda upp ett giltigt original i SVG eller PDF.';
 if(!['image/svg+xml','application/pdf'].includes(artwork.mime))return 'Välj SVG eller PDF.';
 if(![artwork.widthMm,artwork.heightMm,width,height].every(value=>Number.isFinite(Number(value))&&Number(value)>=1&&Number(value)<=5000))return 'Originalets mått är ogiltiga.';
 if(placement){const b=artworkBounds({widthMm:width,heightMm:height,uploadedArtwork:artwork,artworkPlacement:placement});if(![b.x,b.y,b.width,b.height].every(Number.isFinite)||b.width<.1||b.height<.1||b.x<0||b.y<0||b.x+b.width>Number(width)+.01||b.y+b.height>Number(height)+.01)return 'Placera hela originalet inom skyltytan.';}
 return null;
}
module.exports={getSignArtwork,signArtworkError,artworkBounds,placeArtwork};
