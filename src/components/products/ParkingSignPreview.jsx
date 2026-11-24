import {parkingPreviewSvg} from '../../data/parkingSign';
export default function ParkingSignPreview({product,form={},maxWidth=600}) {
 let svg,error;try{svg=parkingPreviewSvg(product,form,{example:true});}catch(e){error=e.message;}
 return <figure aria-label="Förhandsvisning av parkeringsskylt" style={{width:'100%',maxWidth,margin:'auto',minWidth:0}}>{svg?<div dangerouslySetInnerHTML={{__html:svg.replace('<svg ','<svg style="display:block;width:100%;height:auto" ')}}/>:<p role="status" style={{padding:20,color:'#9b4935',font:'13px/1.5 Arial'}}>{error}</p>}</figure>;
}
