import { useLayoutEffect, useRef, useState } from "react";
import "../../styles/productEditorViewport.css";

// Fit the complete preview, including tall signs and both sides, without
// changing any production dimensions or product-specific text sizing.
export default function FittedProductPreview({ children, align = "center", horizontalAlign = "center" }) {
  const frame = useRef(null);
  const content = useRef(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    function measure() {
      if (!frame.current || !content.current) return;
      const width = content.current.offsetWidth;
      const height = content.current.offsetHeight;
      if (!width || !height) return;
      setScale(Math.min(1, frame.current.clientWidth / width, frame.current.clientHeight / height));
    }
    measure();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (observer) { observer.observe(frame.current); observer.observe(content.current); }
    window.addEventListener("resize", measure);
    return () => { observer?.disconnect(); window.removeEventListener("resize", measure); };
  }, []);
  return <div ref={frame} className="jsf-fitted-preview" data-align={align} data-horizontal-align={horizontalAlign} style={{"--jsf-preview-pixel":`${1 / scale}px`}}>
    <div ref={content} className="jsf-fitted-preview-content" style={{ transform: `translate(${horizontalAlign === "right" ? "0" : "-50%"}, ${align === "top" || align === "bottom" ? "0" : "-50%"}) scale(${scale})` }}>{children}</div>
  </div>;
}
