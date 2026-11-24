import {layoutBraille} from '../../data/tactileBraille';
export default function TactileBrailleMarks({value,config,color='#222222'}){
 try{
  const layout=layoutBraille(value,{leftMm:Number(config.brailleLeftMm)||0,bottomMm:Number(config.brailleBaselineMm)||70.5,fontSizeMm:Number(config.brailleFontSizeMm)||6.5});
  return <g aria-label="Punktskrift" transform="translate(6 3.525)" fill={color}>{layout.dots.map((dot,index)=><circle key={index} cx={dot.cx} cy={dot.cy} r={dot.r}/>)}</g>;
 }catch(error){return <text x="12" y={3.525+(Number(config.brailleBaselineMm)||70.5)} fontSize="2.5" fill="#b42318" aria-label={error.message}>Kontrollera punktskriftens text och placering</text>;}
}
