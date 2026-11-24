// Six-dot Swedish sign lettering. Lowercase follows the supplied Corel original.
// Dot numbering: 1/2/3 down the left column, 4/5/6 down the right.
const LETTERS={a:1,b:3,c:9,d:25,e:17,f:11,g:27,h:19,i:10,j:26,k:5,l:7,m:13,n:29,o:21,p:15,q:31,r:23,s:14,t:30,u:37,v:39,w:58,x:45,y:61,z:53,å:33,ä:28,ö:42,é:63,è:46,ü:51,à:55};
const PUNCTUATION={' ':0,',':2,'.':4,'-':36,':':18,';':6,'?':34,'!':22,'/':12,'(':38,')':52,"'":16,'’':16,'"':48,'“':48,'”':48};
// Measured in "0601 taktil produktionsfil.svg"; fixed geometry, never auto-fit.
const REFERENCE={dotDiameterMm:1.3324,dotPitchMm:2.3313,cellPitchMm:6.087,fontSizeMm:6.5};
function brailleCells(value){
 const text=String(value||'').normalize('NFC').toLowerCase().replace(/[\s\u00a0]+/g,' ').trim(),cells=[];
 let numeric=false;
 for(const char of text){
  if(/^[0-9]$/.test(char)){if(!numeric)cells.push(60);cells.push(LETTERS['jabcdefghi'[Number(char)]]);numeric=true;continue;}
  if(Object.prototype.hasOwnProperty.call(LETTERS,char)){
   if(numeric&&/^[a-j]$/.test(char))cells.push(49);
   cells.push(LETTERS[char]);numeric=false;continue;
  }
  if(Object.prototype.hasOwnProperty.call(PUNCTUATION,char)){cells.push(PUNCTUATION[char]);if(char!=='.'&&char!==',')numeric=false;continue;}
  throw new Error('Tecknet ”'+char+'” stöds inte i punktskriftsexporten. Använd bokstäver, siffror eller vanliga skiljetecken.');
 }
 return {text,cells};
}
function layoutBraille(value,{leftMm=15.85,bottomMm=70.5,fontSizeMm=6.5,maxWidthMm=180,maxHeightMm=89}={}){
 const encoded=brailleCells(value),scale=Number(fontSizeMm)/REFERENCE.fontSizeMm;
 if(![leftMm,bottomMm,fontSizeMm,maxWidthMm,maxHeightMm].every(v=>Number.isFinite(Number(v)))||scale<=0||scale>5)throw new Error('Punktskriftens mått är ogiltiga.');
 const diameter=REFERENCE.dotDiameterMm*scale,pitch=REFERENCE.dotPitchMm*scale,cellPitch=REFERENCE.cellPitchMm*scale,radius=diameter/2;
 const width=encoded.cells.length?(encoded.cells.length-1)*cellPitch+pitch+diameter:0,height=2*pitch+diameter,left=Number(leftMm),top=Number(bottomMm)-height;
 if(encoded.cells.length&&(left<0||top<0||left+width>Number(maxWidthMm)||Number(bottomMm)>Number(maxHeightMm)))throw new Error('Punktskriften får inte plats i fasta mått. Korta texten eller justera placeringen. Punkterna krymps inte automatiskt.');
 const dots=[];
 encoded.cells.forEach((cell,index)=>{for(let bit=0;bit<6;bit++)if(cell&(1<<bit))dots.push({cx:left+index*cellPitch+(bit>=3?pitch:0)+radius,cy:top+(bit%3)*pitch+radius,r:radius,cell:index,dot:bit+1});});
 return {...encoded,dots,width,height,left,top,diameter,pitch,cellPitch};
}
function doorBrailleText(product,preview,{personal}={}){
 return personal?[preview.heading,preview.extra].filter(Boolean).join(' '):[preview.textLine1,product.doorUseLine2?preview.textLine2:''].filter(Boolean).join(' ');
}
function brailleDotPath({cx:x,cy:y,r}){
 const k=r*.5522847498307936;
 return 'M'+(x+r)+' '+y+' C'+(x+r)+' '+(y+k)+' '+(x+k)+' '+(y+r)+' '+x+' '+(y+r)+' C'+(x-k)+' '+(y+r)+' '+(x-r)+' '+(y+k)+' '+(x-r)+' '+y+' C'+(x-r)+' '+(y-k)+' '+(x-k)+' '+(y-r)+' '+x+' '+(y-r)+' C'+(x+k)+' '+(y-r)+' '+(x+r)+' '+(y-k)+' '+(x+r)+' '+y+' Z';
}
function doorBrailleError(product,form){
 const {getDoorTextConfig,getDoorSignPreviewValues}=require('./doorProductionLayout');
 const config=getDoorTextConfig(product);
 if(!['tactile','whiteboard'].includes(config.layoutMode))return null;
 const preview=getDoorSignPreviewValues(form,config),personal=config.layoutMode!=='tactile'||['0602','0603','0604','0607','0608','0616','0620'].includes(String(product.articleNumber||'').trim());
 try{layoutBraille(doorBrailleText(form,preview,{personal}),{leftMm:Number(config.brailleLeftMm)||0,bottomMm:Number(config.brailleBaselineMm)||70.5,fontSizeMm:Number(config.brailleFontSizeMm)||6.5});return null;}catch(error){return error.message;}
}
module.exports={REFERENCE,brailleCells,layoutBraille,brailleDotPath,doorBrailleText,doorBrailleError};
