import wallPhoto from "../../assets/destination-wall.jpg";
import wallExample from "../../assets/destination-wall-example.jpg";
import { getDestinationCube } from "../../data/destinationCube";
import { faceTransform, fittedText } from "./DestinationCubePreview";

const FACE_WIDTH = 450;
const FACE_HEIGHT = 600;
const FACES = [
  { id: "front", corners: [[648,166],[966,143],[957,818],[657,734]] },
  { id: "right", corners: [[985,151],[1034,184],[1026,708],[978,806]] },
];

export default function DestinationWallPreview({ form = {}, maxWidth = 520, example = false }) {
  const { target, floor } = getDestinationCube(form);
  const targetText = fittedText(target, 210, 270);
  const floorText = fittedText(floor, 100, 100);
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="570 105 530 750" role="img"
    aria-label={`Målpunktsskylt för vägg – målpunkt ${example ? "S" : target}, plan ${example ? "4" : floor}`}
    style={{display:"block",width:"100%",height:"auto",maxWidth,overflow:"hidden"}}>
    <image data-destination-wall-photo="true" href={example ? wallExample : wallPhoto} width="1768" height="960"/>
    {!example && <foreignObject x="0" y="0" width="1768" height="960" style={{pointerEvents:"none"}}>
      <div xmlns="http://www.w3.org/1999/xhtml" style={{position:"relative",width:1768,height:960}}>
        {FACES.map(face => <div key={face.id} data-destination-wall-face={face.id} style={{position:"absolute",left:0,top:0,width:FACE_WIDTH,height:FACE_HEIGHT,transform:faceTransform(face.corners, FACE_WIDTH, FACE_HEIGHT),transformOrigin:"0 0",overflow:"hidden"}}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${FACE_WIDTH} ${FACE_HEIGHT}`} width={FACE_WIDTH} height={FACE_HEIGHT}
            aria-hidden="true" fontFamily="Arial, sans-serif" fontWeight="700" fill="#e7e7e5" style={{display:"block"}}>
            <text data-destination-wall-target="true" x="225" y={165+targetText.height/2} fontSize={targetText.size} textAnchor="middle">{target}</text>
            <text data-destination-wall-floor="true" x="225" y="450" fontSize={floorText.size} textAnchor="middle">{floor}</text>
          </svg>
        </div>)}
      </div>
    </foreignObject>}
  </svg>;
}
