import { useLayoutEffect, useRef, useState } from "react";

// SVG font measurements use the sign's mm coordinate system, independent of
// screen zoom. Only font size changes; left edge and visible cap top stay fixed.
export default function DoorSignAutoFitText({ lines, color, clipId, fontWeight = 400, fontFamily = "Arial, Helvetica, sans-serif", capHeightRatio = .715 }) {
  const refs = useRef([]);
  const [fitted, setFitted] = useState(null);
  useLayoutEffect(() => {
    let cancelled = false;
    const measure = () => {
      if (cancelled) return;
      const measured = lines.map((line, index) => {
        const node = refs.current[index];
        const size = Number(node?.getAttribute("font-size"));
        const length = node?.getComputedTextLength?.() || 0;
        const units = size > 0 ? length / size : 0;
        // The white panel ends at 186 mm; leave 8 mm of breathing room.
        const available = Math.max(.1, line.maxWidth ?? (178 - line.x));
        return { units, available, overflows: units * line.fontSize > available };
      });
      const needsShrink = measured.some(item => item.overflows);
      const commonSize = needsShrink ? Math.min(
        ...lines.map(line => line.fontSize),
        ...measured.filter(item => item.units > 0).map(item => item.available / item.units * .995)
      ) : null;
      const next = lines.map(line => commonSize == null ? line.fontSize : Math.max(.1, commonSize));
      setFitted(previous => previous && next.every((size, index) => Math.abs(size - previous[index]) < .001) ? previous : next);
    };
    measure();
    document.fonts?.ready.then(measure);
    document.fonts?.addEventListener?.("loadingdone", measure);
    return () => {
      cancelled = true;
      document.fonts?.removeEventListener?.("loadingdone", measure);
    };
  }, [lines, fontWeight, fontFamily, capHeightRatio]);
  return <g aria-label="Automatiskt anpassad skylttext">
    {lines.map((line, index) => {
      const fontSize = fitted?.[index] ?? line.fontSize;
      const top = line.y - line.fontSize * capHeightRatio;
      return <text key={index} ref={node => { refs.current[index] = node; }}
        x={line.x} y={top + fontSize * capHeightRatio} textAnchor={line.textAnchor || "start"}
        fontFamily={fontFamily} fontSize={fontSize}
        fontWeight={fontWeight} fill={color} clipPath={`url(#${clipId})`}
        fontStyle={line.italic?'italic':undefined}
        style={{ dominantBaseline: "alphabetic" }}>
        {line.text}
      </text>;
    })}
  </g>;
}
