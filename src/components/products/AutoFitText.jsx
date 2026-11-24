import { useEffect, useRef, useState } from "react";

export default function AutoFitText({
  text,
  maxWidth,
  maxFontSize,
  startFontSize,
  minFontSize = 18,
  safetyPadding = 0,
  fontWeight,
  color,
  lineHeight,
  style = {},
}) {
  const textRef = useRef(null);
  const resolvedMaxFontSize = Number(maxFontSize || startFontSize || 48);
  const [fontSize, setFontSize] = useState(resolvedMaxFontSize);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;

    let size = resolvedMaxFontSize;
    el.style.fontSize = `${size}px`;

    while (el.scrollWidth > maxWidth - safetyPadding && size > minFontSize) {
      size -= 1;
      el.style.fontSize = `${size}px`;
    }

    setFontSize(size);
  }, [text, maxWidth, resolvedMaxFontSize, minFontSize, safetyPadding]);

  return (
    <div
      ref={textRef}
      style={{
        ...style,
        fontSize: `${fontSize}px`,
        fontWeight: fontWeight ?? style.fontWeight,
        color: color ?? style.color,
        lineHeight: lineHeight ?? style.lineHeight,
        whiteSpace: "nowrap",
        overflow: "hidden",
      }}
    >
      {text}
    </div>
  );
}
