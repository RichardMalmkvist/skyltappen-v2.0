import braLivLogo from '../../assets/logos/bra-liv.svg';
import {BRA_LIV_LAYOUT,isBraLivBadge,hasBraLivOrganization,normalizeBraLivForm} from '../../data/braLivNameBadges';
import regionLogo from '../../assets/logos/region.svg';
import "../../styles/nameBadgeFonts.css";
import { useId } from "react";
import energyLogo from "../../assets/logos/energik.svg";
import jltLogo from "../../assets/logos/jlt.svg";
import ftvLogo from "../../assets/logos/ftv.svg";
import tenhultLogo from "../../assets/logos/tenhult.svg";
import segerstadLogo from "../../assets/logos/stora-segerstad.svg";
import DoorSignAutoFitText from "./DoorSignAutoFitText";

export default function NameBadge0201Preview({product,form={},maxWidth=600}) {
  const clipId=`namebadge-${useId().replace(/:/g,"")}`;
  const preset=product?.nameBadgePreset || form.nameBadgePreset;
  const braLiv=isBraLivBadge(product || form);
  form=normalizeBraLivForm(product || form,form);
  const isEnergy=preset==="energy_0211";
  const isJLT=preset==="jlt_0310";
  const textColor=isJLT?"#761D39":"#171717";
  const isFTV=String(preset || "").startsWith("ftv_");
  const height=isFTV?26:30;
  const isSchool=String(preset || "").startsWith("school_");
  const isTenhult=["school_0250","school_0252"].includes(preset);
  const nameOnly=["school_0252","school_0253"].includes(preset);
  const orgWidth=braLiv?BRA_LIV_LAYOUT.organizationWidthMm:isFTV?37:42.2;
  const backgroundImage=product?.nameBadgePreviewImage || (isFTV?"/ftv tom.jpg":"/namnskylt-blank.jpg");
  const standardBackground=backgroundImage==="/namnskylt-blank.jpg" || backgroundImage==="/ftv tom.jpg";
  const twoTitles=preset==="rjl_0205" || preset==="ftv_0209" || preset==="braliv_0263";
  const hasOrganization=preset==="rjl_0202" || preset==="rjl_0207" || preset==="ftv_0208" || hasBraLivOrganization(product || form);
  const twoOrgLines=preset==="rjl_0207" || (braLiv && hasOrganization && Boolean(form.orgLine2 || preset==="braliv_0264"));
  const titleExample=!form.title && !form.titleLine2;
  const orgExample=!form.orgLine1 && !form.orgLine2;
  const titleLines=nameOnly?[]:[{text:form.title || "Titel",x:isJLT?2.5:isEnergy?3.1:4.3,y:isJLT?13.8:12.85,fontSize:isJLT?3.7:3.15,maxWidth:isJLT?70:66.55},...(twoTitles?[{text:form.titleLine2 || (titleExample?"Titel":""),x:4.3,y:16.75,fontSize:3.15,maxWidth:66.55}]:[])];
  const organizationLines=hasOrganization ? [{text:form.orgLine1 || (twoOrgLines?"Verksamhetsnamn":"Verksamhetsnamn 1 rad"),x:4.3,y:isFTV?21.8:twoOrgLines?22.1:26,fontSize:3.15,maxWidth:orgWidth},...(twoOrgLines?[{text:form.orgLine2 || (orgExample?"2 rader":""),x:4.3,y:26,fontSize:3.15,maxWidth:orgWidth}]:[])] : [];
  return <svg role="img" aria-label="Förhandsvisning av namnbrickan" viewBox={`0 0 75 ${height}`} style={{width:"100%",maxWidth,height:"auto",display:"block",margin:"auto"}}>
    <defs><clipPath id={clipId}><rect x={isJLT?2.5:isEnergy?2.8:4.15} y="2" width={isJLT?70:isEnergy?69.4:66.7} height="17"/></clipPath><clipPath id={`${clipId}-org`}><rect x="4.3" y="18" width={orgWidth} height={height-19}/></clipPath></defs>
    {standardBackground ? <>
      <rect data-namebadge-outline="true" x=".06" y=".06" width="74.88" height={height-.12} rx="2.9" fill={isJLT?"#f2cfd3":"#fff"} stroke="#555" strokeWidth=".08"/>
      {braLiv ? <image href={braLivLogo} x={BRA_LIV_LAYOUT.logo.x} y={BRA_LIV_LAYOUT.logo.y} width={BRA_LIV_LAYOUT.logo.width} height={BRA_LIV_LAYOUT.logo.height} preserveAspectRatio="xMidYMid meet"/> : isJLT ? <image href={jltLogo} x="57.4" y="20.15" width="14.3508" height="6.2834" preserveAspectRatio="xMidYMid meet"/> : isFTV ? <image href={ftvLogo} x="43.5" y="16.6" width="27.2101" height="5.3693" preserveAspectRatio="xMidYMid meet"/> : <>
        {isEnergy && <image href={energyLogo} x="33.4" y="20.7" width="13.1862" height="5.462" preserveAspectRatio="xMidYMid meet"/>}
        {isSchool && <image href={isTenhult?tenhultLogo:segerstadLogo} x={isTenhult?34.5:27.6} y="17.5" width={isTenhult?15.9201:22.8485} height="8.709" preserveAspectRatio="xMidYMid meet"/>}
        <image href={regionLogo} x={isSchool?53:48.7} y={isSchool?21.5:20.5} width={isSchool?17.8:22.1} height={isSchool?4.5:5.6} preserveAspectRatio="xMidYMid meet"/>
      </>}
    </> : <image href={backgroundImage} width="75" height={height} preserveAspectRatio="none"/>}
    <DoorSignAutoFitText clipId={clipId} color={textColor} fontFamily={'"JSF Gotham Narrow Medium", Arial, sans-serif'} fontWeight={500} capHeightRatio={.7} lines={[{text:form.name || "Namn Efternamn",x:isJLT?2.5:isEnergy?2.8:4.15,y:isJLT?8.6:isEnergy?8.2:8.05,fontSize:isJLT?6:isEnergy?5.8:5.2,maxWidth:isJLT?70:isEnergy?69.4:66.7}]}/>
    <DoorSignAutoFitText clipId={clipId} color={textColor} fontFamily={'"JSF Gotham Light", Arial, sans-serif'} fontWeight={300} capHeightRatio={.7} lines={titleLines}/>
    {braLiv ? organizationLines.map((line,index)=><DoorSignAutoFitText key={index} clipId={`${clipId}-org`} color={textColor} fontFamily={'"JSF Gotham Narrow Medium", Arial, sans-serif'} fontWeight={500} capHeightRatio={.7} lines={[line]}/>) : organizationLines.length>0 && <DoorSignAutoFitText clipId={`${clipId}-org`} color={textColor} fontFamily={'"JSF Gotham Narrow Medium", Arial, sans-serif'} fontWeight={500} capHeightRatio={.7} lines={organizationLines}/>}
  </svg>;
}
