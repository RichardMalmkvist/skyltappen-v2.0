import {hangingFaceAppearance} from '../../data/additionalHangingArticles';
import ThreePanelDoorPreview from './ThreePanelDoorPreview';
import {isThreePanelDoor} from '../../data/threePanelDoor';
import {hangingTargetFields,hangingTargetLayout,hangingSymbolRatio} from "../../data/hangingTargetLayout";
import WhiteboardDrawing from "./WhiteboardDrawing";
import DoorPhotoSurface,{DoorPhotoBlankWhiteboard} from "./DoorPhotoSurface";
import SlidingRoomSignPreview from './SlidingRoomSignPreview';
import {normalizeDoorTextReference,getDoorTextPlacement} from '../../data/doorTextReference';
import {getDoorPhotoProfile,photoWhiteboardArea} from "../../data/doorPhotoPreview";
import {getWhiteboardDemoArea} from "../../data/whiteboardDemo";
import ParkingSignPreview from "./ParkingSignPreview";
import TactileBrailleMarks from "./TactileBrailleMarks";
import VinylTextPreview from './VinylTextPreview';
import {greenTargetsEnabled,hangingSymbolKind} from '../../data/hangingTargetRules';
import {getDoorTextConfig,getDoorSignPreviewValues} from "../../data/doorProductionLayout";
import DestinationWallPreview from "./DestinationWallPreview";
import DestinationCubePreview from "./DestinationCubePreview";
import {isDestinationCube,getDestinationCube} from "../../data/destinationCube";
import DoorMagnetPreview from "./DoorMagnetPreview";
import ProfessionBadgePreview from "./ProfessionBadgePreview";
import { getHangingBackForm, isDoubleSidedHangingSign as hasTwoHangingSides } from "../../data/hangingSignBackText";
import NameBadge0201Preview from "./NameBadge0201Preview";
import { isNameBadge0201 } from "../../data/nameBadge0201";
import ParkingPolePreview from './ParkingPolePreview';
import RoadStackPreview from './RoadStackPreview';
import {roadSignModel} from '../../data/roadSignModels';
import HangingStackPreview from "./HangingStackPreview";
import {getCatalogArticles} from "../../data/catalogStore";
import DibondPreview from "./DibondPreview";
import {newDibondSign} from "../../data/dibondHelpers";
import OTBoardPreview from "../orders/OTBoardPreview";
import ElevatorBoardPreview, {newElevatorBoard} from "../orders/ElevatorBoardPreview";
import RevealImage from "./RevealImage";
import { getDoorSignSymbolById } from "../../data/doorSignSymbols";
import { getDoorSignPreviewDimensions, isPersonalDoorSign } from "../../data/doorSignDimensions";
import { supportsDoorSymbol, getDoorSymbolConfig } from "../../data/doorSymbolHelpers";
import { supportsDoorNumber, getDoorNumberConfig } from "../../data/doorNumberHelpers";
import DoorSignAutoFitText from "./DoorSignAutoFitText";
import { useEffect, useRef, useState } from "react";
import "../../data/professionHelpers";
import { isProfessionProductType } from "../../data/productHelpers";
import { getProductById } from "../../data/products";
import { getHangingSignSymbolById } from "../../data/hangingSignSymbols";
import { getHangingSignArrowByDirection } from "../../data/hangingSignArrows";

const NAME_BADGE_TEMPLATE_BY_BADGE_ID = {
  208: "/ftv tom.jpg",
  209: "/ftv tom.jpg",
  500: "/ftv tom.jpg",
  211: "/energikontor blank.jpg",
  212: "/energikontor blank.jpg",
  250: "/tenhult tom.jpg",
  251: "/stora tom.jpg",
  252: "/tenhult tom.jpg",
  253: "/stora tom.jpg",
  310: "/jlt tom.jpg",
  311: "/jlt tom.jpg",
};

const DEFAULT_NAME_BADGE_TEMPLATE_SRC = "/namnskylt-blank.jpg";

const DOOR_SIGN_TEMPLATE_BY_BADGE_ID = {
  601: "/art.-0601 tom.jpg",
  602: "/art.-0601 tom.jpg",
};

const DEFAULT_DOOR_SIGN_TEMPLATE_SRC = "/art.-0601 tom.jpg";


const HANGING_SIGN_VARIANTS = {
  large: {
    template: "/pendlad-vit-tom.png",
    previewWidth: {
      form: 600,
      mini: 220,
    },
    base: {
      width: 700,
      height: 180,
    },
    textLayouts: {
      single: {
        line1: {
          left: 90,
          top: 62,
          width: 525,
          height: 82,
          startFontSize: 42,
          minFontSize: 18,
        },
      },
      double: {
        line1: {
          left: 90,
          top: 42,
          width: 525,
          height: 34,
          startFontSize: 28,
          minFontSize: 14,
        },
        line2: {
          left: 90,
          top: 84,
          width: 525,
          height: 34,
          startFontSize: 28,
          minFontSize: 14,
        },
      },
    },
    arrowLayouts: {
      left: {
        left: 30,
        right: "auto",
        top: 80,
        width: 44,
        height: 44,
      },
      right: {
        left: "auto",
        right: 30,
        top: 80,
        width: 44,
        height: 44,
      },
    },
    secondSignMarginTop: {
      form: -42,
      mini: -20,
    },
  },

  small: {
    template: "/pendlad-vit-liten-tom.png",
    previewWidth: {
      form: 520,
      mini: 200,
    },
    base: {
      width: 700,
      height: 180,
    },
    textLayouts: {
      single: {
        line1: {
          left: 90,
          top: 68,
          width: 525,
          height: 82,
          startFontSize: 42,
          minFontSize: 18,
        },
      },
      double: {
        line1: {
          left: 90,
          top: 42,
          width: 525,
          height: 34,
          startFontSize: 28,
          minFontSize: 14,
        },
        line2: {
          left: 90,
          top: 84,
          width: 525,
          height: 34,
          startFontSize: 28,
          minFontSize: 14,
        },
      },
    },
    arrowLayouts: {
      left: {
        left: 30,
        right: "auto",
        top: 85,
        width: 44,
        height: 44,
      },
      right: {
        left: "auto",
        right: 30,
        top: 85,
        width: 44,
        height: 44,
      },
    },
    secondSignMarginTop: {
      form: -42,
      mini: -20,
    },
  },

  xlarge: {
    template: "/pendlad-vit-stor-tom.png",
    previewWidth: {
      form: 520,
      mini: 200,
    },
    base: {
      width: 700,
      height: 180,
    },
    textLayouts: {
      single: {
        line1: {
          left: 90,
          top: 62,
          width: 525,
          height: 82,
          startFontSize: 42,
          minFontSize: 18,
        },
      },
      double: {
        line1: {
          left: 90,
          top: 55,
          width: 525,
          height: 34,
          startFontSize: 38,
          minFontSize: 14,
        },
        line2: {
          left: 90,
          top: 105,
          width: 525,
          height: 34,
          startFontSize: 38,
          minFontSize: 14,
        },
      },
    },
    arrowLayouts: {
      left: {
        left: 30,
        right: "auto",
        top: 50,
        width: 44,
        height: 44,
      },
      right: {
        left: "auto",
        right: 30,
        top: 50,
        width: 44,
        height: 44,
      },
    },
    secondSignMarginTop: {
      form: -20,
      mini: -8,
    },
  },
};

function getBadgeById(badgeId) {
  return getProductById(badgeId);
}



function getMiniFieldOffset(badgeId, fieldKey) {
  const defaultOffsets = {
    name: -40,
    title: -85,
    titleLine2: -85,
    orgLine1: -55,
    orgLine2: -25,
  };

  const offsetsByBadgeId = {
    1: {
      name: -55,
      title: -140,
    },
    2: {
      name: -55,
      title: -140,
      orgLine1: -120,
    },
    3: {
      name: -55,
      title: -140,
      titleLine2: -140,
    },
    4: {
      name: -55,
      title: -140,
      orgLine1: -105,
      orgLine2: -75,
    },
    208: {
      name: -45,
      title: -140,
      orgLine1: -120,
    },
    211: {
      name: -55,
      title: -140,
    },
    212: {
      name: -55,
      title: -140,
      orgLine1: -120,
    },
  };

  const badgeOffsets = offsetsByBadgeId[badgeId] || defaultOffsets;
  return badgeOffsets[fieldKey] || 0;
}


function getMirroredDirection(direction) {
  if (direction === "left") return "right";
  if (direction === "right") return "left";
  return direction;
}

function getNameBadgeTemplateSrc(badgeId) {
  return (
    NAME_BADGE_TEMPLATE_BY_BADGE_ID[badgeId] || DEFAULT_NAME_BADGE_TEMPLATE_SRC
  );
}

function getDoorSignTemplateSrc(badgeId) {
  return (
    DOOR_SIGN_TEMPLATE_BY_BADGE_ID[badgeId] || DEFAULT_DOOR_SIGN_TEMPLATE_SRC
  );
}

function AutoFitText({
  text,
  maxWidth,
  startFontSize,
  minFontSize,
  fontWeight = 400,
  color = "#222",
  lineHeight = 1.05,
  style = {},
}) {
  const textRef = useRef(null);
  const [fontSize, setFontSize] = useState(startFontSize);

  useEffect(() => {
    const element = textRef.current;
    if (!element) return;

    let nextFontSize = startFontSize;
    element.style.fontSize = `${nextFontSize}px`;

    while (element.scrollWidth > maxWidth && nextFontSize > minFontSize) {
      nextFontSize -= 1;
      element.style.fontSize = `${nextFontSize}px`;
    }

    setFontSize(nextFontSize);
  }, [text, maxWidth, startFontSize, minFontSize]);

  return (
    <div
      ref={textRef}
      style={{
        fontSize,
        fontWeight,
        color,
        lineHeight,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {text}
    </div>
  );
}

function getNameBadgeLayout(badgeId) {
  const base = {
    width: 600,
    height: 240,

    name: {
      left: 32,
      top: 30,
      width: 390,
      startFontSize: 38,
      minFontSize: 18,
      fontWeight: 700,
      color: "#222",
    },

    title: {
      left: 36,
      top: 86,
      width: 300,
      startFontSize: 20,
      minFontSize: 12,
      fontWeight: 400,
      color: "#666",
    },

    titleLine2: {
      left: 36,
      top: 110,
      width: 300,
      startFontSize: 20,
      minFontSize: 12,
      fontWeight: 400,
      color: "#666",
    },

    orgLine1: {
      left: 36,
      top: 156,
      width: 310,
      startFontSize: 18,
      minFontSize: 10,
      fontWeight: 700,
      color: "#333",
    },

    orgLine2: {
      left: 36,
      top: 184,
      width: 240,
      startFontSize: 18,
      minFontSize: 10,
      fontWeight: 700,
      color: "#333",
    },
  };

  if (badgeId === 1) {
    return {
      ...base,
      name: {
        ...base.name,
        left: 32,
        top: 28,
        width: 445,
        startFontSize: 38,
      },
      title: {
        ...base.title,
        left: 35,
        top: 86,
        width: 360,
        startFontSize: 22,
      },
    };
  }

  if (badgeId === 2) {
    return {
      ...base,
      name: {
        ...base.name,
        left: 32,
        top: 28,
        width: 445,
        startFontSize: 38,
      },
      title: {
        ...base.title,
        left: 35,
        top: 84,
        width: 360,
        startFontSize: 20,
      },
      orgLine1: {
        ...base.orgLine1,
        left: 35,
        top: 164,
        width: 330,
        startFontSize: 18,
      },
    };
  }

  if (badgeId === 3) {
    return {
      ...base,
      name: {
        ...base.name,
        left: 32,
        top: 28,
        width: 445,
        startFontSize: 38,
      },
      title: {
        ...base.title,
        left: 35,
        top: 82,
        width: 360,
        startFontSize: 18,
      },
      titleLine2: {
        ...base.titleLine2,
        left: 35,
        top: 106,
        width: 360,
        startFontSize: 18,
      },
    };
  }

  if (badgeId === 4) {
    return {
      ...base,
      name: {
        ...base.name,
        left: 32,
        top: 28,
        width: 445,
        startFontSize: 38,
      },
      title: {
        ...base.title,
        left: 35,
        top: 84,
        width: 360,
        startFontSize: 20,
      },
      orgLine1: {
        ...base.orgLine1,
        left: 35,
        top: 152,
        width: 300,
        startFontSize: 18,
      },
      orgLine2: {
        ...base.orgLine2,
        left: 35,
        top: 180,
        width: 240,
        startFontSize: 18,
      },
    };
  }

  if (badgeId === 208) {
    return {
      ...base,
      name: {
        ...base.name,
        left: 32,
        top: 28,
        width: 445,
        startFontSize: 38,
      },
      title: {
        ...base.title,
        left: 36,
        top: 84,
        width: 360,
        startFontSize: 20,
      },
      orgLine1: {
        ...base.orgLine1,
        left: 36,
        top: 164,
        width: 330,
        startFontSize: 18,
      },
    };
  }

  if (badgeId === 211) {
    return {
      ...base,
      name: {
        ...base.name,
        left: 32,
        top: 28,
        width: 445,
        startFontSize: 38,
      },
      title: {
        ...base.title,
        left: 36,
        top: 86,
        width: 360,
        startFontSize: 22,
      },
    };
  }

  if (badgeId === 212) {
    return {
      ...base,
      name: {
        ...base.name,
        left: 32,
        top: 28,
        width: 445,
        startFontSize: 38,
      },
      title: {
        ...base.title,
        left: 36,
        top: 84,
        width: 360,
        startFontSize: 20,
      },
      orgLine1: {
        ...base.orgLine1,
        left: 36,
        top: 164,
        width: 330,
        startFontSize: 18,
      },
    };
  }

  if (badgeId === 310) {
  return {
    ...base,
    name: {
      ...base.name,
      color: "#761F3A",
    },
    title: {
      ...base.title,
      color: "#761F3A",
    },
  };
}

if (badgeId === 311) {
  return {
    ...base,
    name: {
      ...base.name,
      color: "#761F3A",
    },
    title: {
      ...base.title,
      color: "#761F3A",
    },
    titleLine2: {
      ...base.titleLine2,
      color: "#761F3A",
    },
  };
}

  return base;
}

function getDoorSignLayout(source = {}) {
  const config = getDoorTextConfig(source);

  // Expedition/personalskylten ritas med verkliga produktionsproportioner
  // 192 x 93,75 mm. Övriga dörrskyltar kan fortsätta använda sin egen canvas.
  const { width, height } = getDoorSignPreviewDimensions(source);
  const left = width * (Number(config.leftPct) || 0) / 100;
  const top = height * (Number(config.topPct) || 0) / 100;
  const textWidth = width * Math.max(5, Number(config.widthPct) || 73.6) / 100;
  const lineGap = height * Math.max(5, Number(config.lineGapPct) || 27.5) / 100;
  const fontSize = Math.max(20, Number(config.fontSize) || 178);
  const lineBoxHeight = Math.max(fontSize * 1.35, height * 0.22);

  return {
    width,
    height,
    config,
    line1: {
      left,
      top,
      width: textWidth,
      height: lineBoxHeight,
      startFontSize: fontSize,
      minFontSize: Math.max(20, Math.round(fontSize * 0.72)),
      fontWeight: Number(config.fontWeight) || 400,
      fontFamily: config.fontFamily || "Arial",
      color: config.color || "#222222",
      lineHeight: 1.02,
      letterSpacing: "-0.01em",
    },
    line2: {
      left,
      top: top + lineGap,
      width: textWidth,
      height: lineBoxHeight,
      startFontSize: fontSize,
      minFontSize: Math.max(20, Math.round(fontSize * 0.72)),
      fontWeight: Number(config.fontWeight) || 400,
      fontFamily: config.fontFamily || "Arial",
      color: config.color || "#222222",
      lineHeight: 1.02,
      letterSpacing: "-0.01em",
    },
  };
}



function getHangingSignType(badgeId) {
  if (badgeId === 303 || badgeId === 304) return "small";
  if (badgeId === 305 || badgeId === 306 || badgeId === 307 || badgeId === 308) {
    return "xlarge";
  }
  return "large";
}

function getHangingSignTextMode(badge, productForm) {
  if (badge?.hangingSignTextMode) return badge.hangingSignTextMode;
  if (productForm?.hangingSignTextMode) return productForm.hangingSignTextMode;
  return String(badge?.articleNumber || "").trim() === "0305" ? "double" : "single";
}

function getHangingSignVariantConfig(badgeId, badge, productForm) {
  const type = getHangingSignType(badgeId);
  const textMode = getHangingSignTextMode(badge, productForm);
  const variant = HANGING_SIGN_VARIANTS[type];

  return {
    ...variant,
    type,
    textMode,
    textLayout: variant.textLayouts[textMode] || variant.textLayouts.single,
  };
}

function getHangingSignSymbolIds(productForm = {}) {
  if (Array.isArray(productForm?.hangingSignSymbols)) {
    return productForm.hangingSignSymbols.filter(Boolean);
  }
  const legacy = productForm?.hangingSignSymbol;
  return legacy && legacy !== "none" ? [legacy] : [];
}

function getHangingSignPreviewValues(productForm = {}) {
  let leftArrowDirection = productForm?.leftArrowDirection || "none";
  let rightArrowDirection = productForm?.rightArrowDirection || "none";

  // Bakåtkompatibilitet för redan sparade beställningar med äldre pilmodell.
  if (leftArrowDirection === "none" && rightArrowDirection === "none") {
    if (productForm?.arrowPlacement === "left" && productForm?.arrowDirection) {
      leftArrowDirection = productForm.arrowDirection;
    }
    if (productForm?.arrowPlacement === "right" && productForm?.arrowDirection) {
      rightArrowDirection = productForm.arrowDirection;
    }
  }

  return {
    text: productForm?.hangingSignWithoutText ? "" : productForm?.customText || "Egen text",
    textLine1: productForm?.hangingSignWithoutText ? "" : productForm?.customTextLine1 || productForm?.customText || "Egen text",
    textLine2: productForm?.hangingSignWithoutText ? "" : productForm?.customTextLine2 || "",
    leftArrowDirection,
    rightArrowDirection,
    symbolId: productForm?.hangingSignSymbol || "none",
    symbolIds: getHangingSignSymbolIds(productForm),
  };
}

function renderNameField({
  condition,
  badgeId,
  fieldKey,
  layoutField,
  text,
  mini,
  lineHeight = 1.05,
}) {
  if (!condition || !layoutField) return null;

  const leftOffset = mini ? getMiniFieldOffset(badgeId, fieldKey) : 0;

  return (
    <div
      style={{
        position: "absolute",
        left: layoutField.left + leftOffset,
        top: layoutField.top,
        width: layoutField.width,
      }}
    >
      <AutoFitText
        text={text}
        maxWidth={layoutField.width}
        startFontSize={layoutField.startFontSize}
        minFontSize={layoutField.minFontSize}
        fontWeight={layoutField.fontWeight}
        color={layoutField.color}
        lineHeight={lineHeight}
      />
    </div>
  );
}

function HangingSignArrow({ arrowLayouts, placement, direction }) {
  if (!direction || direction === "none") return null;

  const layout = placement === "left" ? arrowLayouts.left : arrowLayouts.right;
  if (!layout) return null;

  const rotation = { right: 0, down: 90, left: 180, up: -90 }[direction] || 0;

  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      style={{
        position: "absolute",
        left: layout.left,
        right: layout.right,
        top: layout.top,
        width: layout.width,
        height: layout.height,
        display: "block",
        transform: `rotate(${rotation}deg)`,
        transformOrigin: "50% 50%",
        overflow: "visible",
      }}
    >
      <path
        d="M12 50 H78 M57 28 L80 50 L57 72"
        fill="none"
        stroke="#111111"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HangingSignSymbol({ symbolId, arrowLayouts, hasRightArrow }) {
  if (!symbolId || symbolId === "none") return null;
  const symbol = getHangingSignSymbolById(symbolId);
  if (!symbol?.image) return null;

  const rightLayout = arrowLayouts?.right || {};
  const size = 58;
  const top = Math.max(20, Number(rightLayout.top || 60) - 7);
  const right = hasRightArrow ? 92 : 32;

  return (
    <img
      src={symbol.image}
      alt={symbol.name || "Symbol"}
      style={{
        position: "absolute",
        right,
        top,
        width: size,
        height: size,
        objectFit: "contain",
        display: "block",
      }}
    />
  );
}

function HangingSignFace({
  textMode,
  textLayout,
  preview,
  arrowLayouts,
  leftArrowDirection,
  rightArrowDirection,
  symbolId,
}) {
  const hasSymbol = Boolean(symbolId && symbolId !== "none");
  const hasRightArrow = Boolean(rightArrowDirection && rightArrowDirection !== "none");
  const reservedRight = (hasSymbol ? 78 : 0) + (hasRightArrow ? 72 : 0);

  const fitTextLayout = (layout) => ({
    ...layout,
    width: Math.max(150, layout.width - reservedRight),
  });
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
      }}
    >
      {textMode === "double" ? (
        <>
          <div
            style={{
              position: "absolute",
              left: fitTextLayout(textLayout.line1).left,
              top: fitTextLayout(textLayout.line1).top,
              width: fitTextLayout(textLayout.line1).width,
              height: fitTextLayout(textLayout.line1).height,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              textAlign: "left",
            }}
          >
            <AutoFitText
              text={preview.textLine1}
              maxWidth={fitTextLayout(textLayout.line1).width}
              startFontSize={textLayout.line1.startFontSize}
              minFontSize={textLayout.line1.minFontSize}
              fontWeight={500}
              color="#111111"
              lineHeight={1}
              style={{
                width: "100%",
                textAlign: "left",
                letterSpacing: "-0.01em",
              }}
            />
          </div>

          <div
            style={{
              position: "absolute",
              left: fitTextLayout(textLayout.line2).left,
              top: fitTextLayout(textLayout.line2).top,
              width: fitTextLayout(textLayout.line2).width,
              height: fitTextLayout(textLayout.line2).height,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              textAlign: "left",
            }}
          >
            <AutoFitText
              text={preview.textLine2}
              maxWidth={fitTextLayout(textLayout.line2).width}
              startFontSize={textLayout.line2.startFontSize}
              minFontSize={textLayout.line2.minFontSize}
              fontWeight={500}
              color="#111111"
              lineHeight={1}
              style={{
                width: "100%",
                textAlign: "left",
                letterSpacing: "-0.01em",
              }}
            />
          </div>
        </>
      ) : (
        <div
          style={{
            position: "absolute",
            left: textLayout.line1.left,
            top: textLayout.line1.top,
            width: textLayout.line1.width,
            height: textLayout.line1.height,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            textAlign: "left",
          }}
        >
          <AutoFitText
            text={preview.text}
            maxWidth={fitTextLayout(textLayout.line1).width}
            startFontSize={textLayout.line1.startFontSize}
            minFontSize={textLayout.line1.minFontSize}
            fontWeight={500}
            color="#111111"
            lineHeight={1}
            style={{
              width: "100%",
              textAlign: "left",
              letterSpacing: "-0.01em",
            }}
          />
        </div>
      )}

      <HangingSignArrow
        arrowLayouts={arrowLayouts}
        placement="left"
        direction={leftArrowDirection}
      />
      <HangingSignSymbol
        symbolId={symbolId}
        arrowLayouts={arrowLayouts}
        hasRightArrow={hasRightArrow}
      />
      <HangingSignArrow
        arrowLayouts={arrowLayouts}
        placement="right"
        direction={rightArrowDirection}
      />
    </div>
  );
}

function renderSingleHangingSign({
  config,
  width,
  height,
  scale,
  preview,
  leftArrowDirection,
  rightArrowDirection,
  symbolId,
}) {
  return (
    <div
      style={{
        width,
        height,
        position: "relative",
        flex: "0 0 auto",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: config.base.width,
          height: config.base.height,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <RevealImage
          src={config.template}
          alt="Pendlad skylt"
          style={{
            width: config.base.width,
            height: config.base.height,
            objectFit: "contain",
            display: "block",
          }}
        />

        <HangingSignFace
          textMode={config.textMode}
          textLayout={config.textLayout}
          preview={preview}
          arrowLayouts={config.arrowLayouts}
          leftArrowDirection={leftArrowDirection}
          rightArrowDirection={rightArrowDirection}
          symbolId={symbolId}
        />
      </div>
    </div>
  );
}

export function renderMeasuredHangingFace({ badge, productForm, maxWidth, mini, back = false, suspension = true, backLabel = true }) {
  const textOnly=Boolean(badge?.hangingSignTextOnly);
  const rules = badge?.hangingSignRules || {};
  const widthMm = Number(badge?.hangingSignSizeMm || rules.widthMm || 1500);
  const defaultHeightMm = widthMm >= 1500 ? 200 : 150;
  const heightMm = Number(badge?.hangingSignHeightMm || rules.heightMm || defaultHeightMm);
  const targetWidth = Math.min(maxWidth || (mini ? 220 : 600), mini ? 220 : 600);
  const pxPerMm = targetWidth / widthMm;
  // Hela previewn följer nu skyltens verkliga bredd/höjd-förhållande.
  const targetHeight = heightMm * pxPerMm;
  const faceForm=textOnly?{...productForm,leftArrowDirection:'none',rightArrowDirection:'none',arrowPlacement:'none',arrowDirection:''}:back?getHangingBackForm(productForm,badge):productForm;
  const targetOptions=hangingTargetFields(faceForm);
  const preview=getHangingSignPreviewValues(faceForm);
  const textMode = getHangingSignTextMode(badge, productForm);
  // Fasta produktionsmått: texten ska aldrig auto-krympa i previewn.
  const textHeightMm = widthMm >= 1500 ? 70 : 40;
  // Skyltarnas angivna texthöjd avser den synliga teckenhöjden, inte CSS-font-size.
  // Arial har en versalhöjd på ungefär 71,5 % av em-rutan, så font-size behöver
  // kompenseras för att 70/40 mm faktiskt ska motsvara synlig teckenhöjd i previewn.
  const ARIAL_CAP_HEIGHT_RATIO = 0.715;
  const textFontSizePx = Math.max(10, (textHeightMm / ARIAL_CAP_HEIGHT_RATIO) * pxPerMm);
  const textVisibleHeightPx = Math.max(10, textHeightMm * pxPerMm);
  // Fasta pilmått: 1500 mm = 110x80 mm, 1000 mm = 60x50 mm.
  const arrowWidthMm = widthMm >= 1500 ? 110 : 60;
  const arrowHeightMm = widthMm >= 1500 ? 80 : 50;
  const arrowWidthPx = arrowWidthMm * pxPerMm;
  const arrowHeightPx = arrowHeightMm * pxPerMm;
  const arrowEdgePx = Number(rules.arrowEdgeMm || 30) * pxPerMm;
  // Keep double-line arrows beside the upper line, with a small optical
  // adjustment downwards to center them against the visible letters.
  const arrowReferenceHeightMm = textMode === "double"
    ? Math.min(heightMm, widthMm >= 1500 ? 140 : 93)
    : heightMm;
  const arrowTopMm = (arrowReferenceHeightMm - arrowHeightMm) / 2 + (textMode === "double" ? 8 : 0);
  const arrowTopPx = arrowTopMm * pxPerMm;
  // 1000 mm-skyltar med två textrader behöver lite mer luft mellan raderna.
  // 1500 mm-varianten lämnas oförändrad.
  const doubleLineGapPx = widthMm >= 1500 ? 0 : (5 * pxPerMm);
  const doubleLineHeight = widthMm >= 1500 ? 1.02 : 1.08;
  // Snap the scaled 4 mm end strips to full CSS pixels so opposite edges
  // have the same rasterized thickness, even when the centered sign is fractional.
  const sideStripePx = Math.max(1, Math.round(Number(rules.sideStripeMm || 4) * pxPerMm));
  const appearance=hangingFaceAppearance(badge,back);
  const isGreenHangingSign=appearance.isGreen;
  const isWhiteHangingSign = !isGreenHangingSign&&!textOnly;
  const backgroundColor=appearance.background;
  // Green signs always use white lettering, including older saved project articles.
  const foregroundColor=appearance.foreground;
  const artworkFor=id=>(productForm.hangingSignSymbolAssets||[]).find(asset=>asset.id===id)||getHangingSignSymbolById(id);
  const symbolIds = isGreenHangingSign ? (greenTargetsEnabled(badge)?(preview.symbolIds||[]).filter(id=>hangingSymbolKind(artworkFor(id)||{id})==='target'):[]) : (preview.symbolIds || []);

  let leftDirection = preview.leftArrowDirection;
  let rightDirection = preview.rightArrowDirection;
  if (back && !productForm.hangingSignDifferentBackText) {
    leftDirection = preview.rightArrowDirection && preview.rightArrowDirection !== "none"
      ? getMirroredDirection(preview.rightArrowDirection) : "none";
    rightDirection = preview.leftArrowDirection && preview.leftArrowDirection !== "none"
      ? getMirroredDirection(preview.leftArrowDirection) : "none";
  }

  const symbolLayout=hangingTargetLayout(badge,faceForm,symbolIds.map(id=>{const asset=artworkFor(id)||{id};return {...asset,id,ratio:hangingSymbolRatio(asset)};}),{strict:false});
  const textStartPx=symbolLayout.textStart*pxPerMm;
  const reserveForRightArrow=rightDirection!=="none"?(arrowEdgePx+arrowWidthPx+14):0;
  const textRightLimit=Math.max((widthMm-symbolLayout.textRight)*pxPerMm,reserveForRightArrow,18);
  const textWidth=Math.max(1,targetWidth-textStartPx-textRightLimit);

  function MeasuredArrow({ side, direction }) {
    if (!direction || direction === "none") return null;
    const arrow = getHangingSignArrowByDirection(direction);
    const commonStyle = {
      position: "absolute",
      top: arrowTopPx,
      left: side === "left" ? arrowEdgePx : "auto",
      right: side === "right" ? arrowEdgePx : "auto",
      width: arrowWidthPx,
      height: arrowHeightPx,
      objectFit: "contain",
      display: "block",
      filter: isGreenHangingSign ? "brightness(0) invert(1)" : "none",
    };
    if (arrow?.image) return <img src={arrow.image} alt="" aria-hidden="true" style={commonStyle} />;
    const rotation = { right: 0, down: 90, left: 180, up: -90 }[direction] || 0;
    return (
      <svg viewBox="0 0 110 80" aria-hidden="true" style={{ ...commonStyle, transform: `rotate(${rotation}deg)`, overflow: "visible" }}>
        <path d="M10 40 H88 M64 16 L90 40 L64 64" fill="none" stroke={foregroundColor} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }

  return (
    <div data-hanging-face={back?"back":"front"} style={{ width: targetWidth, height: targetHeight, position: "relative", background: backgroundColor, border: "none", boxShadow: isWhiteHangingSign ? "inset 0 1px 0 #111111, inset 0 -1px 0 #111111" : "none", boxSizing: "border-box" }}>
      {!textOnly&&suspension&&<div style={{ position: "absolute", left: targetWidth * .08, top: -Math.max(10, targetHeight * .35), height: Math.max(12, targetHeight * .35), borderLeft: "1px solid #555" }} />}
      {!textOnly&&suspension&&<div style={{ position: "absolute", right: targetWidth * .08, top: -Math.max(10, targetHeight * .35), height: Math.max(12, targetHeight * .35), borderLeft: "1px solid #555" }} />}
      {isWhiteHangingSign ? <div className="jsf-hanging-end-strip" aria-hidden="true" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: Math.max(2.5, sideStripePx), background: "#000", zIndex: 3 }} /> : null}
      {isWhiteHangingSign ? <div className="jsf-hanging-end-strip" aria-hidden="true" style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: Math.max(2.5, sideStripePx), background: "#000", zIndex: 3 }} /> : null}
      {badge.hangingSignDivider&&<div data-hanging-divider aria-hidden="true" style={{position:"absolute",left:0,right:0,top:"50%",height:Math.max(.5,pxPerMm),background:foregroundColor}}/>}
      {!targetOptions.hangingSignWithoutText&&<div
        style={{
          position: "absolute",
          left: textStartPx,
          top: "50%",
          transform: "translateY(-50%)",
          width: textWidth,
          minHeight: textMode === "double"
            ? Math.max((textFontSizePx * doubleLineHeight * 2) + doubleLineGapPx, 32)
            : Math.max(textFontSizePx * 1.15, textVisibleHeightPx * 1.35, 24),
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          gap: textMode === "double" ? doubleLineGapPx : 0,
          overflow: "visible",
        }}
        title={textMode === "double" ? `${preview.textLine1}${preview.textLine2 ? ` / ${preview.textLine2}` : ""}` : preview.text}
      >
        {(textMode === "double" ? [preview.textLine1, preview.textLine2] : [preview.text]).map((line, index) => (
          <div
            key={index}
            style={{
              fontFamily: "Arial, sans-serif",
              fontSize: textFontSizePx,
              fontWeight: widthMm >= 1500 ? 400 : 700,
              lineHeight: textMode === "double" ? doubleLineHeight : 1,
              color: foregroundColor,
              whiteSpace: "nowrap",
              flexShrink: 0,
              minHeight: textMode === "double" ? textVisibleHeightPx : undefined,
            }}
          >
            {line || "Egen text"}
          </div>
        ))}
      </div>}
      <MeasuredArrow side="left" direction={leftDirection} />
      <MeasuredArrow side="right" direction={rightDirection} />
      {symbolLayout.items.map(item=>item.image?<img key={item.id} src={item.image} alt={item.name||"Symbol"} data-target-row={item.row} style={{position:'absolute',left:item.x*pxPerMm,top:item.y*pxPerMm,width:item.width*pxPerMm,height:item.height*pxPerMm,objectFit:'contain',display:'block'}}/>:null)}
      {symbolLayout.error&&<span role="alert" style={{position:'absolute',top:'100%',left:0,fontSize:11,color:'#b42318'}}>{symbolLayout.error}</span>}
      {back && !mini && backLabel ? <span style={{ position: "absolute", right: 8, bottom: 5, fontSize: 8, color: "#8b938f", letterSpacing: ".08em" }}>BAKSIDA</span> : null}
    </div>
  );
}

function renderMeasuredHangingSignPreview(badge, productForm, maxWidth, mini) {
  const isDoubleSided = hasTwoHangingSides(badge);
  return (
    <div style={wrapperStyle}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: mini ? 7 : 14 }}>
        {renderMeasuredHangingFace({ badge, productForm, maxWidth, mini, back: false })}
        {isDoubleSided ? renderMeasuredHangingFace({ badge, productForm, maxWidth, mini, back: true }) : null}
      </div>
    </div>
  );
}

function renderHangingSignPreview(badgeId, productForm, maxWidth, mini, product = null) {
  const badge = product || getBadgeById(badgeId) || productForm;
  if (badge?.hangingSignRules || badge?.hangingSignPreset) {
    return renderMeasuredHangingSignPreview(badge, productForm, maxWidth, mini);
  }
  const config = getHangingSignVariantConfig(badgeId, badge, productForm);
  const preview = getHangingSignPreviewValues(productForm);

  const previewWidth = mini ? config.previewWidth.mini : config.previewWidth.form;
  const targetWidth = Math.min(maxWidth || previewWidth, previewWidth);
  const scale = targetWidth / config.base.width;
  const targetHeight = config.base.height * scale;

  const secondSignMarginTop = mini
    ? config.secondSignMarginTop.mini
    : config.secondSignMarginTop.form;

  const isDoubleSided = hasTwoHangingSides({...badge, badgeId});
  const backPreview = getHangingSignPreviewValues(getHangingBackForm(productForm));

  return (
    <div style={wrapperStyle}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {renderSingleHangingSign({
          config,
          width: targetWidth,
          height: targetHeight,
          scale,
          preview,
          leftArrowDirection: preview.leftArrowDirection,
          rightArrowDirection: preview.rightArrowDirection,
          symbolId: preview.symbolId,
        })}

        {isDoubleSided && (
          <div style={{ marginTop: secondSignMarginTop }}>
            {renderSingleHangingSign({
              config,
              width: targetWidth,
              height: targetHeight,
              scale,
              preview: backPreview,
              leftArrowDirection: productForm.hangingSignDifferentBackText ? backPreview.leftArrowDirection :
                preview.rightArrowDirection && preview.rightArrowDirection !== "none"
                  ? getMirroredDirection(preview.rightArrowDirection)
                  : "none",
              rightArrowDirection: productForm.hangingSignDifferentBackText ? backPreview.rightArrowDirection :
                preview.leftArrowDirection && preview.leftArrowDirection !== "none"
                  ? getMirroredDirection(preview.leftArrowDirection)
                  : "none",
              symbolId: backPreview.symbolId,
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function renderProfessionPreview(productForm, maxWidth, mini) {
  return <div style={wrapperStyle}><ProfessionBadgePreview item={productForm} maxWidth={mini?Math.min(maxWidth||190,190):maxWidth||700}/></div>;
}

function renderNameBadgePreview(badgeId, productForm, maxWidth, mini) {
  const badge = getBadgeById(badgeId);
  if (!badge) return null;

  const fields = badge.fields || {};
  const layout = getNameBadgeLayout(badgeId);
  const templateSrc = getNameBadgeTemplateSrc(badgeId);

  const targetWidth = Math.min(maxWidth || layout.width, layout.width);
  const scale = targetWidth / layout.width;
  const targetHeight = layout.height * scale;

  return (
    <div style={wrapperStyle}>
      <div
        style={{
          width: targetWidth,
          height: targetHeight,
          position: "relative",
          flex: "0 0 auto",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: layout.width,
            height: layout.height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <RevealImage
            src={templateSrc}
            alt="Namnskylt"
            style={{
              width: layout.width,
              height: layout.height,
              objectFit: "contain",
              display: "block",
            }}
          />

          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
            }}
          >
            {renderNameField({
              condition: fields.name,
              badgeId,
              fieldKey: "name",
              layoutField: layout.name,
              text: productForm?.name || "Namn Efternamn",
              mini,
            })}

            {renderNameField({
              condition: fields.title,
              badgeId,
              fieldKey: "title",
              layoutField: layout.title,
              text: productForm?.title || "Titel",
              mini,
              lineHeight: 1.08,
            })}

            {renderNameField({
              condition: fields.titleLine2,
              badgeId,
              fieldKey: "titleLine2",
              layoutField: layout.titleLine2,
              text: productForm?.titleLine2 || "Titel",
              mini,
              lineHeight: 1.08,
            })}

            {renderNameField({
              condition: fields.orgLine1,
              badgeId,
              fieldKey: "orgLine1",
              layoutField: layout.orgLine1,
              text: productForm?.orgLine1 || "Verksamhetsnamn 1 rad",
              mini,
            })}

            {renderNameField({
              condition: fields.orgLine2,
              badgeId,
              fieldKey: "orgLine2",
              layoutField: layout.orgLine2,
              text: productForm?.orgLine2 || "2 rader",
              mini,
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function renderDoorSignPreview(badgeId, productForm, maxWidth, mini, product = null, interactiveWhiteboard = false, photographic = false) {
  if(isThreePanelDoor(product||productForm))return <ThreePanelDoorPreview product={product||productForm} form={productForm} maxWidth={maxWidth} mini={mini} interactive={interactiveWhiteboard} renderPanel={(part,values)=>renderDoorSignPreview(badgeId+'-'+part.articleNumber,values,maxWidth,mini,part,false,true)}/>;
  const sourceProduct = normalizeDoorTextReference(product || productForm || {});
  const numberConfig = getDoorNumberConfig(sourceProduct, productForm);
  const symbolConfig = getDoorSymbolConfig(sourceProduct);
  const doorSymbol = getDoorSignSymbolById(productForm?.doorSymbol);
  const doorSymbolImage = productForm?.doorSymbolImage || doorSymbol?.image;
  const layout = getDoorSignLayout(sourceProduct);
  const overlayHeightMm = 192 * layout.height / layout.width;
  const photoProfile=(photographic||interactiveWhiteboard)&&!mini?getDoorPhotoProfile(sourceProduct):null;
  const stageHeight=photoProfile?layout.height*((photoProfile.bottom||photoProfile.frame[1]+photoProfile.frame[3])-photoProfile.frame[1])/photoProfile.frame[3]:layout.height;
  const whiteboardArea=interactiveWhiteboard&&!mini?(photoProfile?photoWhiteboardArea(photoProfile):getWhiteboardDemoArea(sourceProduct,overlayHeightMm)):null;
  const templateSrc = sourceProduct?.doorSignPreviewImage || sourceProduct?.image || getDoorSignTemplateSrc(badgeId);
  const preview = getDoorSignPreviewValues(productForm, layout.config);
  const numberClipId = `doorNumberClip-${String(badgeId || "preview").replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const previewWidth = mini
    ? Math.min(maxWidth || 240, 240)
    : Math.min(maxWidth || 760, 760);

  const scale = previewWidth / layout.width;
  const targetHeight = stageHeight * scale;


  return (
    <div style={wrapperStyle}>
      <div
        style={{
          width: previewWidth,
          height: targetHeight,
          position: "relative",
          flex: "0 0 auto",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: layout.width,
            height: stageHeight,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {photoProfile ? <DoorPhotoSurface profile={photoProfile} articleNumber={sourceProduct.articleNumber} width={layout.width} height={layout.height} interactive={interactiveWhiteboard}/> : sourceProduct?.doorSignPreviewImage ? <svg width={layout.width} height={layout.height}
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            preserveAspectRatio="none" aria-label="Förvald previewbild för dörrskylt" style={{display:"block"}}>
            <RevealImage svgImage href={sourceProduct.doorSignPreviewImage} x="0" y="0" width={layout.width}
              height={layout.height}
              preserveAspectRatio="xMidYMid meet"/>
          </svg> : ["expedition","tactile","whiteboard","whiteboard_personal","occupancy","occupancy_whiteboard","occupancy_whiteboard_personal","dual_whiteboard","room_number_status"].includes(layout.config.layoutMode) ? (
            <svg
              width={layout.width}
              height={layout.height}
              viewBox={`0 0 192 ${overlayHeightMm}`}
              preserveAspectRatio="none"
              aria-label="Kodritad dörrskylt"
              style={{ display: "block", overflow: "visible" }}
            >
              {/*
                Fysisk produktgeometri:
                - yttermått 192 x 93,75 mm
                - vit utskriftsyta 180 x 86,7 mm
                Den vita ytan centreras i profilen.
              */}
              {(() => {
                const mode = layout.config.layoutMode;
                const h = overlayHeightMm;
                const innerH = h - 7.05;
                const nodes = [
                  <rect key="outer" x="0" y="0" width="192" height={h} fill="#1f1f1f" />,
                  <rect key="inner" x="6" y="3.525" width="180" height={innerH} fill="#ffffff" />,
                  // De korta profilkanterna ligger INNANFOR skyltens yttermatt.
                  // De ska synas som sma avslut i topp/botten, inte sticka ut at sidorna.
                  <rect key="tl" x="6" y="0" width="42" height="1.35" fill="#1f1f1f" />,
                  <rect key="tr" x="144" y="0" width="42" height="1.35" fill="#1f1f1f" />,
                  <rect key="bl" x="6" y={h-1.35} width="42" height="1.35" fill="#1f1f1f" />,
                  <rect key="br" x="144" y={h-1.35} width="42" height="1.35" fill="#1f1f1f" />
                ];
                if (["whiteboard","whiteboard_personal"].includes(mode)) {
                  nodes.push(<rect key="div" x="6" y="92" width="180" height="2.5" fill="#1f1f1f" />);
                  nodes.push(<text key="wb" x="96" y="139" textAnchor="middle" fontFamily="Arial" fontSize="8" fontStyle="italic" fontWeight="700" fill="#222">WHITEBOARD</text>);
                }
                if (mode === "dual_whiteboard") {
                  nodes.push(<rect key="div1" x="6" y="55" width="180" height="2.5" fill="#1f1f1f" />);
                  nodes.push(<rect key="div2" x="6" y="92" width="180" height="2.5" fill="#1f1f1f" />);
                  nodes.push(<text key="wb" x="96" y="139" textAnchor="middle" fontFamily="Arial" fontSize="8" fontStyle="italic" fontWeight="700" fill="#222">WHITEBOARD</text>);
                }
                if (mode === "occupancy") {
                  nodes.push(<rect key="red" x="6" y="54" width="90" height="36.2" fill="#ef2b20" />);
                  nodes.push(<rect key="green" x="96" y="54" width="90" height="36.2" fill="#93dcc0" />);
                  nodes.push(<text key="occ" x="51" y="75" textAnchor="middle" fontFamily="Arial" fontSize="6.3" fill="#fff">UPPTAGET</text>);
                  nodes.push(<text key="free" x="141" y="75" textAnchor="middle" fontFamily="Arial" fontSize="6.3" fill="#fff">LEDIGT</text>);
                }
                if (mode === "occupancy_whiteboard") {
                  nodes.push(<rect key="div1" x="6" y="62" width="180" height="2.5" fill="#1f1f1f" />);
                  nodes.push(<rect key="red" x="6" y="64.5" width="90" height="50" fill="#ef2b20" />);
                  nodes.push(<rect key="green" x="96" y="64.5" width="90" height="50" fill="#93dcc0" />);
                  nodes.push(<text key="occ" x="51" y="91" textAnchor="middle" fontFamily="Arial" fontSize="6.3" fill="#fff">UPPTAGET</text>);
                  nodes.push(<text key="free" x="141" y="91" textAnchor="middle" fontFamily="Arial" fontSize="6.3" fill="#fff">LEDIGT</text>);
                  nodes.push(<rect key="div2" x="6" y="114.5" width="180" height="2.5" fill="#1f1f1f" />);
                  nodes.push(<text key="wb" x="96" y="151" textAnchor="middle" fontFamily="Arial" fontSize="8" fontStyle="italic" fontWeight="700" fill="#222">WHITEBOARD</text>);
                }
                if (mode === "occupancy_whiteboard_personal") {
                  nodes.push(<rect key="div1" x="6" y="92" width="180" height="2.5" fill="#1f1f1f" />);
                  nodes.push(<rect key="red" x="6" y="94.5" width="90" height="89.5" fill="#ef2b20" />);
                  nodes.push(<rect key="green" x="96" y="94.5" width="90" height="89.5" fill="#93dcc0" />);
                  nodes.push(<text key="occ" x="51" y="142" textAnchor="middle" fontFamily="Arial" fontSize="10" fill="#fff">UPPTAGET</text>);
                  nodes.push(<text key="free" x="141" y="142" textAnchor="middle" fontFamily="Arial" fontSize="10" fill="#fff">LEDIGT</text>);
                  nodes.push(<rect key="div2" x="6" y="184" width="180" height="2.5" fill="#1f1f1f" />);
                  nodes.push(<text key="wb" x="96" y={(186.5 + h - 3.525) / 2} textAnchor="middle" fontFamily="Arial" fontSize="8" fontStyle="italic" fontWeight="700" fill="#222">WHITEBOARD</text>);
                }
                if (mode === "room_number_status") {
                  nodes.push(<rect key="div1" x="6" y="58" width="180" height="2.5" fill="#1f1f1f" />);
                  nodes.push(<rect key="div2" x="6" y="120" width="180" height="2.5" fill="#1f1f1f" />);
                  nodes.push(<rect key="warn" x="6" y="122.5" width="58" height="61.5" fill="#ffd912" />);
                  nodes.push(<polygon key="tri" points="35,136 23,158 47,158" fill="none" stroke="#111" strokeWidth="2.2" />);
                  nodes.push(<text key="bang" x="35" y="155" textAnchor="middle" fontFamily="Arial" fontSize="11" fontWeight="700">!</text>);
                  nodes.push(<text key="smitta" x="35" y="169" textAnchor="middle" fontFamily="Arial" fontSize="6.2" fontWeight="700">SMITTA</text>);
                  nodes.push(<rect key="statusright" x="64" y="122.5" width="122" height="61.5" fill="#fff" />);
                }
                // Pennhallaren ar en fast del av de mallar som har whiteboard.
                // Den ritas under skylten och foljer alltid med i produktpreviewn.
                if (["whiteboard","whiteboard_personal","occupancy_whiteboard","occupancy_whiteboard_personal","dual_whiteboard"].includes(mode)) {
                  const holderY = h + 1.8;
                  nodes.push(
                    <g key="pen-holder" aria-label="Pennhallare">
                      <rect x="72" y={holderY} width="48" height="8.8" rx="0.8" fill="#171717" />
                      <rect x="75" y={holderY + 1.35} width="42" height="4.9" rx="0.55" fill="#2b2b2b" />
                      <rect x="79" y={holderY + 2.15} width="34" height="2.1" rx="1.05" fill="#d9d9d9" opacity="0.96" />
                      <rect x="82" y={holderY + 2.5} width="28" height="1.35" rx="0.68" fill="#f6f6f6" />
                      <rect x="108.4" y={holderY + 2.15} width="4.6" height="2.1" rx="1" fill="#8f8f8f" />
                      <path d={`M 76 ${holderY + 6.8} L 116 ${holderY + 6.8}`} stroke="#050505" strokeWidth="1.15" />
                    </g>
                  );
                }
                return nodes;
              })()}
            </svg>
          ) : (
            <RevealImage
              src={templateSrc}
              alt="Dörrskylt"
              style={{
                width: layout.width,
                height: layout.height,
                objectFit: "contain",
                display: "block",
              }}
            />
          )}

          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
            }}
          >
            {isPersonalDoorSign(sourceProduct) ? (() => {
              const color=layout.config.color||"#111111";
              const clipId=`doorTextClip-${String(badgeId||"preview").replace(/[^a-zA-Z0-9_-]/g,"")}`;
              const obstacles=[];
              if(supportsDoorNumber(sourceProduct)&&productForm?.doorUseNumber&&productForm?.doorNumber){
                const width=Math.min(80,String(productForm.doorNumber).length*numberConfig.textHeightMm/.715*.62);
                obstacles.push({x:productForm.doorNumberSide==='right'?186-numberConfig.rightMm-width:6+numberConfig.leftMm,y:3.525+numberConfig.topMm,width,height:numberConfig.textHeightMm});
              }
              if(supportsDoorSymbol(sourceProduct)&&productForm?.doorUseSymbol&&doorSymbolImage)obstacles.push({x:productForm.doorSymbolSide==='left'?6+symbolConfig.leftMm:186-symbolConfig.rightMm-symbolConfig.sizeMm,y:3.525+symbolConfig.topMm,width:symbolConfig.sizeMm,height:symbolConfig.sizeMm});
              const braille=["whiteboard","tactile"].includes(layout.config.layoutMode);
              const placement=getDoorTextPlacement(layout.config,preview,{obstacles,braille});
              return <svg width={layout.width} height={layout.height} viewBox={`0 0 192 ${overlayHeightMm}`} preserveAspectRatio="none" style={{position:"absolute",inset:0,overflow:"visible"}}>
                <defs><clipPath id={clipId}><rect x="6" y="3.525" width="180" height="86.7"/></clipPath></defs>
                <DoorSignAutoFitText color={color} clipId={clipId} lines={placement.heading}/>
                {placement.names.length>0&&<DoorSignAutoFitText color={color} clipId={clipId} lines={placement.names}/>}
                {placement.titles.length>0&&<DoorSignAutoFitText color={color} clipId={clipId} lines={placement.titles}/>}
                {braille&&<TactileBrailleMarks value={[preview.heading,preview.extra].filter(Boolean).join(" ")} config={layout.config} color={color}/>}
              </svg>;
            })() : layout.config.layoutMode === "tactile" ? (() => {
              // Samma uppmätta textkoordinater som den vanliga rumsfunktionsskylten.
              // Allt ligger i skyltens verkliga 192 x 93,75 mm-koordinatsystem.
              const whiteX = 6;
              const whiteY = 3.525;
              const line1X = whiteX + (Number(layout.config.line1LeftMm) || 0);
              const line2X = line1X;
              const capRatio = 0.715;
              const line1FontSize = (Number(layout.config.line1TextHeightMm) || 15.5) / capRatio;
              const line2FontSize = line1FontSize;
              const line1BaselineMm = Number(layout.config.line1BaselineMm) || 27.5;
              const line2BaselineMm = Number(layout.config.line2BaselineMm) || 47.5;
              const text1 = preview.textLine1 || "EGEN TEXT";
              const text2 = productForm?.doorUseLine2 ? (preview.textLine2 || "") : "";
              const brailleSource = [text1, text2].filter(Boolean).join(" ");
              const clipId = `tactileTextClip-${String(badgeId || "preview").replace(/[^a-zA-Z0-9_-]/g, "")}`;

              return (
                <svg
                  width={layout.width}
                  height={layout.height}
                  viewBox={`0 0 192 ${overlayHeightMm}`}
                  preserveAspectRatio="none"
                  style={{ position: "absolute", inset: 0, overflow: "visible" }}
                >
                  <defs>
                    <clipPath id={clipId}>
                      <rect x={whiteX} y={whiteY} width="180" height="86.7" />
                    </clipPath>
                  </defs>
                  <DoorSignAutoFitText color={layout.config.color || "#111111"} clipId={clipId} lines={[
                    { text: text1, x: line1X, y: whiteY + line1BaselineMm, fontSize: line1FontSize },
                    ...(text2 ? [{ text: text2, x: line2X, y: whiteY + line2BaselineMm, fontSize: line2FontSize, maxWidth: Math.max(1, 170 - line2X) }] : [])
                  ]} />
                  <TactileBrailleMarks value={brailleSource} config={layout.config} color={layout.config.color || "#111111"}/>
                </svg>
              );
            })() : (() => {
              // Enkel rumsfunktion och whiteboard använder samma mm-baserade
              // textplacering som övriga dörrskyltar. Själva bakgrunden kan
              // fortfarande vara artikelns produkt-/previewbild.
              const capRatio = 0.715;
              const x1 = 6 + (Number(layout.config.line1LeftMm) || 0);
              const x2 = x1;
              const y1 = 3.525 + (Number(layout.config.line1BaselineMm) || 27.5);
              const y2 = 3.525 + (Number(layout.config.line2BaselineMm) || 47.5);
              const f1 = (Number(layout.config.line1TextHeightMm) || 15.5) / capRatio;
              const f2 = f1;
              const clipId = `simpleDoorTextClip-${String(badgeId || "preview").replace(/[^a-zA-Z0-9_-]/g, "")}`;
              return (
                <svg width={layout.width} height={layout.height} viewBox={`0 0 192 ${overlayHeightMm}`} preserveAspectRatio="none" style={{position:"absolute",inset:0,overflow:"visible"}}>
                  <defs><clipPath id={clipId}><rect x="6" y="3.525" width="180" height="86.7"/></clipPath></defs>
                  <DoorSignAutoFitText color={layout.config.color || "#222"} clipId={clipId} fontWeight={Number(layout.config.fontWeight) || 400} lines={[
                    { text: preview.textLine1, x: x1, y: y1, fontSize: f1 },
                    ...(preview.textLine2 ? [{ text: preview.textLine2, x: x2, y: y2, fontSize: f2 }] : [])
                  ]} />
                  {["whiteboard","room_number_status"].includes(layout.config.layoutMode) ? (
                    <TactileBrailleMarks value={[preview.textLine1,preview.textLine2].filter(Boolean).join(" ")} config={layout.config} color={layout.config.color || "#222222"}/>
                  ) : null}
                  {["occupancy","occupancy_whiteboard","room_number_status"].includes(layout.config.layoutMode) && productForm?.doorExtra ? (
                    <text x={6 + (Number(layout.config.roomNumberLeftMm)||138)} y={3.525 + (Number(layout.config.roomNumberBaselineMm)||66)} fontFamily="Arial, Helvetica, sans-serif" fontSize={(Number(layout.config.roomNumberTextHeightMm)||28)/capRatio} fontWeight="400" fill={layout.config.color||"#222"} textAnchor="start" style={{dominantBaseline:"alphabetic"}}>{productForm.doorExtra}</text>
                  ) : null}
                </svg>
              );
            })()}
            {supportsDoorSymbol(sourceProduct) && productForm?.doorUseSymbol && doorSymbolImage ? <svg width={layout.width} height={layout.height} viewBox={`0 0 192 ${overlayHeightMm}`} preserveAspectRatio="none" style={{position:"absolute",inset:0,pointerEvents:"none"}} aria-label="Symbol på dörrskylt">
              <image href={doorSymbolImage} x={productForm.doorSymbolSide==="left"?6+symbolConfig.leftMm:186-symbolConfig.rightMm-symbolConfig.sizeMm} y={3.525+symbolConfig.topMm} width={symbolConfig.sizeMm} height={symbolConfig.sizeMm} preserveAspectRatio="xMidYMid meet"/>
            </svg> : null}
            {supportsDoorNumber(sourceProduct) && productForm?.doorUseNumber && productForm?.doorNumber ? (
              <svg width={layout.width} height={layout.height} viewBox={`0 0 192 ${overlayHeightMm}`} preserveAspectRatio="none" style={{ position: "absolute", inset: 0, overflow: "visible" }} aria-label="Nummer på dörrskylt">
                <defs><clipPath id={numberClipId}><rect x="6" y="3.525" width="180" height="86.7" /></clipPath></defs>
                <DoorSignAutoFitText color={layout.config.color || "#111"} clipId={numberClipId} fontWeight={700} lines={[{
                  text: String(productForm.doorNumber),
                  x: productForm.doorNumberSide === "right" ? 186 - numberConfig.rightMm : 6 + numberConfig.leftMm,
                  y: 3.525 + numberConfig.topMm + numberConfig.textHeightMm,
                  fontSize: numberConfig.textHeightMm / .715, maxWidth: Math.max(1, Math.min(80, 172 - (productForm.doorNumberSide === "right" ? numberConfig.rightMm : numberConfig.leftMm))),
                  textAnchor: productForm.doorNumberSide === "right" ? "end" : "start"
                }]} />
              </svg>
            ) : null}
          </div>
          {whiteboardArea?<WhiteboardDrawing key={String(sourceProduct.articleNumber||badgeId)} area={whiteboardArea} pixelScale={scale} surface={photoProfile?<DoorPhotoBlankWhiteboard profile={photoProfile} articleNumber={sourceProduct.articleNumber}/>:null}/>:null}
        </div>
      </div>
    </div>
  );
}

export default function BadgePreview({
  badgeId,
  productType,
  productForm,
  product = null,
  maxWidth = 600,
  mini = false,
  interactiveWhiteboard = false,
  photographic = false,
  onDibondChange,
  onOTBoardChange,
}) {
  if(product?.previewType==='parking_pole'||productForm?.previewType==='parking_pole')return <ParkingPolePreview form={productForm} maxWidth={maxWidth}/>;
  if(roadSignModel(product)&&productForm?.hangingStack?.items?.length)return <RoadStackPreview product={product} form={productForm} articles={getCatalogArticles()} maxWidth={maxWidth}/>;
  if(productForm?.hangingStack?.items?.length)return <HangingStackPreview product={product||getBadgeById(badgeId)} form={productForm} articles={getCatalogArticles()} maxWidth={maxWidth} mini={mini}/>;
  if(photographic&&['0609','0614'].includes(String(product?.articleNumber||productForm?.articleNumber||'').padStart(4,'0')))return <div style={{width:'100%',maxWidth,margin:'auto'}}><SlidingRoomSignPreview articleNumber={product?.articleNumber||productForm?.articleNumber} interactive={false}/></div>;
  if(isDestinationCube(product) || isDestinationCube(productForm) || productForm?.destinationCube || productForm?.configuration?.destinationCube) return getDestinationCube(productForm,product).variant==="wall" ? <DestinationWallPreview form={productForm} maxWidth={maxWidth}/> : <DestinationCubePreview form={productForm} maxWidth={maxWidth}/>;
  const nameBadgeProduct=product || getBadgeById(badgeId) || productForm;
  if(product?.previewType==='profession'||product?.productType==='yrkestitelsskylt')return renderProfessionPreview({...product,...productForm},maxWidth,mini);
  if(nameBadgeProduct?.previewType==="parking_sign" || nameBadgeProduct?.parkingSignConfig || productForm?.parkingSignConfig)return <ParkingSignPreview product={productForm?.parkingSignConfig?{...nameBadgeProduct,parkingSignConfig:productForm.parkingSignConfig}:nameBadgeProduct} form={productForm} maxWidth={maxWidth}/>;
  if(nameBadgeProduct?.vinylText||productForm?.vinylText)return <VinylTextPreview product={nameBadgeProduct} form={productForm} maxWidth={maxWidth}/>;
  if(String(nameBadgeProduct?.articleNumber||productForm?.articleNumber)==="0613") return <DoorMagnetPreview form={productForm} maxWidth={maxWidth}/>;
  if(isNameBadge0201(nameBadgeProduct) || isNameBadge0201(productForm)) return <NameBadge0201Preview product={nameBadgeProduct} form={productForm} maxWidth={maxWidth}/>;
  if(product?.previewType==="dibond_sign"||productForm?.dibondSign||productForm?.configuration?.dibondSign)return <div style={{width:"100%",maxWidth,margin:"auto"}}><DibondPreview product={product} onChange={mini?undefined:onDibondChange} sign={productForm?.dibondSign||productForm?.configuration?.dibondSign||newDibondSign(product)} label={product?.name||"Dibondskylt"}/></div>;
  const isProfession =
    isProfessionProductType(productType) ||
    productForm?.previewType === "profession" ||
    productForm?.productType === "yrkestitelsskylt" ||
    productForm?.categoryId === "yrkestitelsskyltar";

  if(product?.previewType==="ot_board" || productForm?.otBoard || productForm?.previewType==="ot_board") {
    const variant=product?.otBoards?.find(item=>item.id===productForm?.otBoardId);
    const board=productForm?.otBoard||variant?.board;
    if(!board)return <div style={{padding:30,color:"#817a72",textAlign:"center"}}>Välj plats och OT-tavla för att visa förhandsvisning</div>;
    return <div style={{width:"100%",maxWidth:Math.min(maxWidth,400),margin:"auto"}}><OTBoardPreview onChange={mini?undefined:onOTBoardChange} board={board} label={productForm?.otBoardName||variant?.name||"OT-tavla"}/></div>;
  }
  if(product?.previewType==="elevator_board" || productForm?.previewType==="elevator_board") {
    const variant=productForm?.elevatorBoardVariant?.id===productForm?.elevatorBoardId?productForm.elevatorBoardVariant:product?.elevatorBoards?.find(item=>item.id===productForm?.elevatorBoardId);
    if(!variant&&!productForm?.elevatorBoard) return <div style={{minHeight:260,display:"flex",alignItems:"center",justifyContent:"center",textAlign:"center",color:"#777",fontSize:14,border:"1px dashed #ddd",padding:24}}>Välj hiss för att visa förhandsvisning</div>;
    const board=productForm?.elevatorBoard || variant?.board || newElevatorBoard();
    return <div style={{width:"100%",maxWidth:Math.min(maxWidth,400),margin:"auto"}}><ElevatorBoardPreview board={board} label={variant?.name||"Hisstavla"} mode={productForm?.elevatorOrderMode||"print"}/></div>;
  }

  const isHangingSign =
    productType === "pendlad_skylt" ||
    productForm?.productType === "pendlad_skylt" ||
    productForm?.previewType === "hanging_sign" ||
    productForm?.categoryId === "pendlade-vit";

  const isDoorSign =
    productType === "dorrskylt" ||
    productForm?.productType === "dorrskylt" ||
    productForm?.previewType === "door_sign" ||
    productForm?.categoryId === "dorrskyltar";

  if (isProfession) {
    return renderProfessionPreview(productForm, maxWidth, mini);
  }

  if (isHangingSign) {
    return renderHangingSignPreview(badgeId, productForm, maxWidth, mini, product);
  }

  if (isDoorSign) {
    return renderDoorSignPreview(badgeId, productForm, maxWidth, mini, product, interactiveWhiteboard, photographic);
  }

  return renderNameBadgePreview(badgeId, productForm, maxWidth, mini);
}

const wrapperStyle = {
  display: "flex",
  width: "100%",
  justifyContent: "center",
  alignItems: "center",
  marginTop: 0,
  marginBottom: 0,
};




