import { getDestinationCube } from "../../data/destinationCube";
import cubePhoto from "../../assets/destination-cube-alu.jpg";

const WIDTH = 1052;
const HEIGHT = 772;
const FACE_WIDTH = 450;
const FACE_HEIGHT = 250;

// Project one flat sign face onto its four corners in the original photograph.
// A projective transform keeps the letters on the face as it recedes in depth.
export function faceTransform([p0, p1, p2, p3], width = FACE_WIDTH, height = FACE_HEIGHT) {
  const dx1 = p1[0] - p2[0], dx2 = p3[0] - p2[0];
  const dy1 = p1[1] - p2[1], dy2 = p3[1] - p2[1];
  const dx = p0[0] - p1[0] + p2[0] - p3[0];
  const dy = p0[1] - p1[1] + p2[1] - p3[1];
  const denominator = dx1 * dy2 - dx2 * dy1;
  const g = (dx * dy2 - dx2 * dy) / denominator;
  const h = (dx1 * dy - dx * dy1) / denominator;
  const a = p1[0] - p0[0] + g * p1[0];
  const b = p3[0] - p0[0] + h * p3[0];
  const d = p1[1] - p0[1] + g * p1[1];
  const e = p3[1] - p0[1] + h * p3[1];
  return `matrix3d(${[a / width, d / width, 0, g / width,
    b / height, e / height, 0, h / height,
    0, 0, 1, 0, p0[0], p0[1], 0, 1].join(",")})`;
}
const FACES = [
  { side: "left", transform: faceTransform([[148, 263], [300, 312], [304, 633], [155, 504]]) },
  { side: "front", transform: faceTransform([[313, 313], [884, 288], [876, 563], [315, 636]]) },
];

// Measure the visible glyph, rather than the font's line box, so a capital
// really occupies about two thirds of the physical face height.
let measuringContext;
export function fittedText(text, maxHeight, maxWidth) {
  if (!measuringContext && typeof document !== "undefined") measuringContext = document.createElement("canvas").getContext("2d");
  let height = .7, width = Math.max(1, text.length) * .6;
  if (measuringContext && text) {
    measuringContext.font = "700 1000px Arial";
    const metrics = measuringContext.measureText(text);
    height = (metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent) / 1000 || .7;
    width = (metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight) / 1000 || metrics.width / 1000;
  }
  const size = Math.min(maxHeight / height, maxWidth / width);
  return { size, height: size * height };
}

export default function DestinationCubePreview({ form = {}, maxWidth = 520 }) {
  const { target, floor } = getDestinationCube(form);
  const targetText = fittedText(target, FACE_HEIGHT * 2 / 3, 190);
  // The photographed PLAN label is roughly 88 face units wide.
  const floorText = fittedText(floor, 116, 82);
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img"
    aria-label={`Målpunktskub – målpunkt ${target}, plan ${floor}`}
    style={{ display: "block", width: "100%", height: "auto", maxWidth }}>
    <image data-cube-photo="true" href={cubePhoto} width={WIDTH} height={HEIGHT} />
    <foreignObject x="0" y="0" width={WIDTH} height={HEIGHT} style={{ pointerEvents: "none" }}>
      <div xmlns="http://www.w3.org/1999/xhtml" style={{ position: "relative", width: WIDTH, height: HEIGHT }}>
        {FACES.map(({ side, transform }) => <div key={side} data-cube-face={side} style={{
          position: "absolute", left: 0, top: 0, width: FACE_WIDTH, height: FACE_HEIGHT,
          transformOrigin: "0 0", transform, overflow: "hidden",
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${FACE_WIDTH} ${FACE_HEIGHT}`} width={FACE_WIDTH} height={FACE_HEIGHT}
            aria-hidden="true" style={{ display: "block" }} fontFamily="Arial, sans-serif" fill="#e7e7e5">
            <text data-cube-target={side} x="105" y={(FACE_HEIGHT + targetText.height) / 2} textAnchor="middle" fontSize={targetText.size} fontWeight="700">{target}</text>
            <text data-cube-floor={side} x="360" y="137" textAnchor="middle" fontSize={floorText.size} fontWeight="700">{floor}</text>
          </svg>
        </div>)}
      </div>
    </foreignObject>
  </svg>;
}
