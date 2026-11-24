import {artworkBounds} from '../../data/signArtwork';
import DibondInteraction from '../products/DibondInteraction';
import {forwardRef} from "react";

export function newOTBoard(){
  return {widthMm:420,heightMm:840,title:"Avdelningar / mottagningar",targetTitle:"Målpunkt",lineStyle:"dotted",columns:1,targetBackground:true,showFloor:false,rows:[{text:"",target:"",floor:""}]};
}

// The same SVG is used for editing, ordering, cart previews and 1:1 export.
const OTBoardPreview=forwardRef(function OTBoardPreview({board=newOTBoard(),label="OT-tavla",onChange},ref){
  const width=Number(board.widthMm)||420,height=Number(board.heightMm)||840;
  const artwork=artworkBounds(board);
  if(board.uploadedArtwork)return <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox={'0 0 '+width+' '+height} role="img" aria-label={label} style={{display:'block',width:'100%',height:'auto'}}><rect x=".1" y=".1" width={width-.2} height={height-.2} fill="white" stroke="#aaa" strokeWidth=".65" vectorEffect="non-scaling-stroke"/><image href={board.uploadedArtwork.preview} x={artwork.x} y={artwork.y} width={artwork.width} height={artwork.height} preserveAspectRatio="none"/>{onChange&&<DibondInteraction sign={board} onChange={onChange}/>}</svg>;
  const measure=(value,size,bold=false)=>{
    if(typeof document!=="undefined"){
      const context=OTBoardPreview.canvas||(OTBoardPreview.canvas=document.createElement("canvas").getContext("2d"));
      if(context){context.font=`${bold?"700 ":""}${size}px Arial`;return context.measureText(value).width;}
    }
    return value.length*size*.56;
  };
  measure("H",1000);
  let capRatio=.716;
  if(typeof document!=="undefined"){
    const context=OTBoardPreview.canvas;
    if(context){context.font="1000px Arial";const metrics=context.measureText("H");if(metrics.actualBoundingBoxAscent>0)capRatio=metrics.actualBoundingBoxAscent/1000;}
  }
  const rows=board.rows||[],columns=Number(board.columns)===2?2:1;
  const gap=columns===2?width*.024:0,columnWidth=(width-gap)/columns;
  const margin=columnWidth*.045,header=columns===2?24.5:width*.06,box=columns===2?Math.max(columnWidth*.037,7/capRatio):columnWidth*.037;
  const rowsPerColumn=Math.max(1,Math.ceil(rows.length/columns));
  const showFloor=board.showFloor===true;
  const floorWidth=showFloor?columnWidth*.08:0,floorGap=showFloor?columnWidth*.006:0;
  const floorRight=columnWidth-columnWidth*.02;
  const targetRight=(showFloor?floorRight:columnWidth-margin)-floorWidth-floorGap;
  const targetX=targetRight-box,available=targetX-margin-5-columnWidth*.025;
  const preferredFont=columns===2?7/capRatio:columnWidth*.038;
  const lineHeight=Math.min(columns===2?10.3:columnWidth*.052,(height-header-(columns===2?11:margin*2))/rowsPerColumn);
  const font=Math.min(preferredFont,columns===2?lineHeight*(7/10.3)/capRatio:lineHeight*.76);
  const headingFont=columns===2?7/capRatio:columnWidth*.035;
  const lineStyle=board.lineStyle||"dotted",boxed=board.targetBackground!==false;
  const strokeWidth=Math.max(.5,font*.075)/2;
  return <svg ref={ref} xmlns="http://www.w3.org/2000/svg" width={`${width}mm`} height={`${height}mm`} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} style={{display:"block",width:"100%",height:"auto"}}>
    <rect x=".05" y=".05" width={width-.1} height={height-.1} fill="white" stroke="#252525" strokeWidth=".1"/>
    <rect data-ot-header="true" x=".05" y=".05" width={width-.1} height={header} fill="#171717"/>
    {Array.from({length:columns},(_,column)=><g key={column} data-ot-column={column} transform={`translate(${column*(columnWidth+gap)} 0)`}>
      <text data-ot-heading="true" x={margin} y={header/2} dominantBaseline="central" fill="white" fontFamily="Arial, sans-serif" fontSize={headingFont} textLength={Math.min(measure(board.title||"",headingFont),(showFloor?columnWidth*.59:columnWidth*.68))} lengthAdjust="spacingAndGlyphs">{board.title}</text>
      <text data-ot-heading="true" x={targetRight} y={header/2} dominantBaseline="central" textAnchor="end" fill="white" fontFamily="Arial, sans-serif" fontSize={headingFont} textLength={Math.min(measure(board.targetTitle||"",headingFont),columnWidth*.2)} lengthAdjust="spacingAndGlyphs">{board.targetTitle}</text>
      {showFloor&&<text data-ot-floor-heading="true" x={floorRight} y={header/2} dominantBaseline="central" textAnchor="end" fill="white" fontFamily="Arial, sans-serif" fontSize={headingFont} textLength={Math.min(measure("Plan",headingFont),floorWidth)} lengthAdjust="spacingAndGlyphs">Plan</text>}
      {rows.slice(column*rowsPerColumn,(column+1)*rowsPerColumn).map((row,index)=>{
        const measuredWidth=measure(row.text||"",font);
        // Two-column text starts at 7 mm visible capital height, then shrinks proportionally.
        const rowFont=columns===2?font*Math.min(1,available/Math.max(measuredWidth,.1)):font;
        const rowCap=rowFont*capRatio;
        const y=columns===2?header+5.5+lineHeight*index+font*capRatio/2:header+margin*.65+lineHeight*(index+.5),textWidth=Math.min(measure(row.text||"",rowFont),available);
        const size=Math.min(box,lineHeight*.82),targetFont=columns===2&&!boxed?Math.min(font,box/Math.max(measure(row.target||"",1,true),.1)):Math.min(columns===2?font:Infinity,size*.9,(size*.84)/Math.max(measure(row.target||"",1,true),.1));
        const targetLeft=targetX+(box-size)/2,textEnd=margin+textWidth+columnWidth*.008;
        // SVG units are millimetres. Keep 5 mm before each target, including dot caps.
        const lineEnd=targetLeft-5-(lineStyle==="dotted"?strokeWidth/2:0);
        return <g key={index} data-ot-row={column*rowsPerColumn+index}>
          <text data-ot-text="true" x={margin} y={columns===2?y+rowCap/2:y} dominantBaseline={columns===2?"alphabetic":"central"} fontFamily="Arial, sans-serif" fontSize={rowFont} fill="#171717" textLength={textWidth||undefined} lengthAdjust="spacingAndGlyphs">{row.text}</text>
          {row.text&&row.target&&textEnd<lineEnd&&<line data-ot-leader="true" x1={lineEnd} y1={columns===2?y+rowCap/2:y+font*.28} x2={textEnd} y2={columns===2?y+rowCap/2:y+font*.28} stroke="#171717" strokeWidth={strokeWidth} strokeDasharray={lineStyle==="solid"?undefined:lineStyle==="dashed"?`${font*.36} ${font*.22}`:`0 ${font*.26}`} strokeLinecap={lineStyle==="dotted"?"round":"butt"}/>}
          {row.target&&(boxed?<><rect data-ot-target="true" x={targetLeft} y={y-size/2} width={size} height={size} rx={size*.12} fill="#171717"/><text x={targetX+box/2} y={y} textAnchor="middle" dominantBaseline="central" fontFamily="Arial, sans-serif" fontWeight="700" fontSize={targetFont} fill="white">{row.target}</text></>:<text data-ot-target="true" x={targetLeft} y={columns===2?y+targetFont*capRatio/2:y} dominantBaseline={columns===2?"alphabetic":"central"} fontFamily="Arial, sans-serif" fontWeight="700" fontSize={targetFont} fill="#171717">{row.target}</text>)}
          {showFloor&&<text data-ot-floor="true" x={floorRight-columnWidth*.015} y={columns===2?y+rowCap/2:y} textAnchor="end" dominantBaseline={columns===2?"alphabetic":"central"} fontFamily="Arial, sans-serif" fontSize={rowFont} fill="#171717" textLength={row.floor?Math.min(measure(String(row.floor),rowFont),floorWidth-columnWidth*.015):undefined} lengthAdjust="spacingAndGlyphs">{row.floor}</text>}
        </g>;
      })}
    </g>)}
  </svg>;
});
export default OTBoardPreview;
