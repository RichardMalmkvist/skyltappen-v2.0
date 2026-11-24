import {roadSupplementSurface,isRoadSupplement,roadSupplementStyle,roadSupplementFont} from '../../data/roadSupplement';
import {artworkBounds} from '../../data/signArtwork';
import {roadSignModel} from '../../data/roadSignModels';
import DirectionSignPreview from './DirectionSignPreview';
import OutdoorStandPreview from "./OutdoorStandPreview";
import {dibondSeparators} from "../../data/dibondSeparators";
import {A4_WIDTH_MM,A4_HEIGHT_MM} from "../../data/acrylicPocket";
import {useId} from "react";
import {isFoldedAluminium} from "../../data/aluminiumArticles";
import DibondInteraction from './DibondInteraction';
import {dibondSymbolPreviewUrl} from '../../data/dibondSymbols';
import {DIBOND_TEXT_MARGIN_MM,dibondCornerRadius,dibondLayout,DIBOND_FRAME_MM,DIBOND_MARGIN_MM,DIBOND_SEPARATOR_MM} from "../../data/dibondHelpers";
export default function DibondPreview({sign,product,label="Dibondskylt",onChange,panelOnly=false,viewport,selectionScope=sign,selectionPanel=0}){
  const id="dibond-"+useId().replace(/[^a-z0-9]/gi,"");
  const width=Math.max(30,Number(sign?.widthMm)||300),height=Math.max(30,Number(sign?.heightMm)||200);
  const artwork=artworkBounds(sign);
  const edit=onChange&&(!roadSignModel(product)||isRoadSupplement(product)||product.roadSignBlank)?onChange:undefined;
  const folded=isFoldedAluminium(product);
  const frameEnabled=sign?.frameEnabled!==false&&!sign.uploadedArtwork;
  const round=roadSignModel(product)?.shape==='circle';
  const radius=round?width/2:folded?0:dibondCornerRadius(product,sign);
  const layout=dibondLayout({...sign,widthMm:width,heightMm:height});
  if(sign?.outdoorSign?.kind==='direction'&&!panelOnly)return <DirectionSignPreview sign={sign} product={product} label={label} onChange={onChange}/>;
  const panel=<svg xmlns="http://www.w3.org/2000/svg" x={viewport?.x} y={viewport?.y} width={viewport?width:`${width}mm`} height={viewport?height:`${height}mm`} viewBox={`0 0 ${width} ${height}`} role={onChange?'group':'img'} aria-label={label} style={viewport?{overflow:"visible"}:{display:"block",width:"100%",height:"auto",overflow:folded||!frameEnabled?"visible":undefined}}>
    <defs>{round&&<clipPath id={id+'-face'}><circle cx={width/2} cy={height/2} r={width/2}/></clipPath>}<clipPath id={id}><rect x={DIBOND_TEXT_MARGIN_MM} y={DIBOND_TEXT_MARGIN_MM} width={width-2*DIBOND_TEXT_MARGIN_MM} height={height-2*DIBOND_TEXT_MARGIN_MM}/></clipPath><clipPath id={`${id}-symbols`}><rect x={DIBOND_FRAME_MM} y={DIBOND_FRAME_MM} width={width-2*DIBOND_FRAME_MM} height={height-2*DIBOND_FRAME_MM}/></clipPath></defs>
    {sign.roadSupplement?<g data-road-supplement-surface dangerouslySetInnerHTML={{__html:roadSupplementSurface(width,height,sign)}}/>:folded?<rect data-aluminium-surface="true" x="0.1" y="0.1" width={width-.2} height={height-.2} rx="0" fill="white" stroke="#262626" strokeWidth="1" vectorEffect="non-scaling-stroke" style={{filter:"drop-shadow(0px 3px 5px rgba(0,0,0,0.12))"}}/>:!frameEnabled?<rect data-dibond-surface="true" x=".06" y=".06" width={width-.12} height={height-.12} rx={radius} fill="white" stroke="#555" strokeWidth="0.65" vectorEffect="non-scaling-stroke"/>:<g><rect data-dibond-frame="true" x="0" y="0" width={width} height={height} rx={radius} fill="#171717"/><rect x={DIBOND_FRAME_MM} y={DIBOND_FRAME_MM} width={width-2*DIBOND_FRAME_MM} height={height-2*DIBOND_FRAME_MM} rx={Math.max(0,radius-DIBOND_FRAME_MM)} fill="white"/></g>}
    {sign.uploadedArtwork&&<image data-sign-artwork="true" clipPath={round?`url(#${id}-face)`:undefined} href={sign.uploadedArtwork.preview} x={artwork.x} y={artwork.y} width={artwork.width} height={artwork.height} preserveAspectRatio="none"/>}
    {!sign.uploadedArtwork&&<>
    {dibondSeparators(sign).map(line=><line key={line.index} data-dibond-separator="true" data-separator-index={line.index} x1={Math.max(DIBOND_MARGIN_MM,width*.08)} x2={width-Math.max(DIBOND_MARGIN_MM,width*.08)} y1={height/2+(Number(line.offsetYMm)||0)} y2={height/2+(Number(line.offsetYMm)||0)} stroke="#000000" strokeWidth={DIBOND_SEPARATOR_MM} strokeLinecap="butt"/>)}
    <g clipPath={`url(#${id}-symbols)`}>{(sign?.symbols||[]).map((symbol,index)=><image key={symbol.id||index} data-dibond-symbol={symbol.id||index} href={dibondSymbolPreviewUrl(symbol.image)} x={Number(symbol.xMm)||0} y={Number(symbol.yMm)||0} width={(Number(symbol.sizeMm)||1)*(Number(symbol.aspectRatio)||1)} height={Number(symbol.sizeMm)||1} preserveAspectRatio="xMidYMid meet"/>)}</g>
    <g clipPath={`url(#${id})`}>{layout.lines.map((line,index)=>sign.roadSupplement?<g key={index} data-dibond-line={index} fill={roadSupplementStyle(sign).text} dangerouslySetInnerHTML={{__html:roadSupplementFont(sign).tratexCurves(line.text,Number(sign.lines[line.blockIndex].sizeMm),line.x,line.y)}}/>:<text key={index} data-dibond-line={index} x={line.centerX} y={line.y} fontFamily="Arial, sans-serif" fontSize={line.fontSize} fontWeight={line.bold?700:400} textAnchor="middle" fill="#171717">{line.text}</text>)}</g>
    {sign?.acrylicPocket?.enabled&&<g data-acrylic-pocket="true" transform={`translate(${Number(sign.acrylicPocket.xMm)||0} ${Number(sign.acrylicPocket.yMm)||0})`} pointerEvents="none"><rect width={A4_WIDTH_MM} height={A4_HEIGHT_MM} fill="#e9f5fa" fillOpacity=".85" stroke="#666" strokeWidth=".7"/><path d="M16 46l24-24m-20 36l24-24M166 268l24-24m-20 36l24-24" fill="none" stroke="#a4b5bd" strokeWidth=".7"/><text x={A4_WIDTH_MM/2} y={A4_HEIGHT_MM/2-3} textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="12" fill="#526068">Vikt akryl<tspan x={A4_WIDTH_MM/2} dy="17">A4</tspan></text></g>}
    {edit&&Number(sign?.widthMm)>=30&&Number(sign?.heightMm)>=30&&<DibondInteraction sign={sign} onChange={edit} selectionScope={selectionScope} selectionPanel={selectionPanel}/>}
    </>}
    {sign.uploadedArtwork&&edit&&<DibondInteraction sign={sign} onChange={edit} selectionScope={selectionScope} selectionPanel={selectionPanel}/>}
  </svg>;
  return sign?.outdoorSign?.withPosts?<OutdoorStandPreview sign={sign} label={label}>{panel}</OutdoorStandPreview>:panel;
}
