const {vinylTextSettings,vinylTextError}=require('../src/data/vinylText');
const {fonts,textCurves}=require('./productionText');
function vinylTextLayout(product,form){
 const error=vinylTextError(form,product);if(error)throw new Error(error);
 const {text,heightMm,fontWeight}=vinylTextSettings(form,product),font=fontWeight===700?fonts.bold:fonts.regular;
 const curves=textCurves(text,font,heightMm,0,0),[left,top,right,bottom]=curves.bbox;
 const width=right-left+10,height=bottom-top+10;
 if(![width,height].every(n=>Number.isFinite(n)&&n>=1&&n<=4900))throw new Error('Texten blir för stor för en produktionsfil. Korta texten eller välj lägre texthöjd.');
 return {width,height,body:'<g transform="translate('+(5-left)+' '+(5-top)+')">'+curves.body+'</g>'};
}
module.exports={vinylTextLayout};
