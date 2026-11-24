import { useEffect, useId, useRef } from "react";

// A temporary SVG alpha mask reveals the original artwork through fine grain.
export default function NoiseRevealLogo({ src, alt, className, delay = 0, duration = 3600 }) {
  const id = `jsf-logo-grain-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const image = useRef(null);
  const alpha = useRef(null);
  useEffect(() => {
    const node = image.current;
    const alphaNode = alpha.current;
    if (!node || !alphaNode || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || !window.requestAnimationFrame) return;
    let frame;
    let started;
    const previousFilter = node.style.filter;
    alphaNode.setAttribute("intercept", "-8");
    node.style.filter = `url(#${id})`;
    function reveal(time) {
      if (started === undefined) started = time;
      const progress = Math.min(1, Math.max(0, (time - started - delay) / duration));
      alphaNode.setAttribute("intercept", String(-8 + progress * 9));
      if (progress < 1) frame = window.requestAnimationFrame(reveal);
      else node.style.filter = previousFilter;
    }
    frame = window.requestAnimationFrame(reveal);
    return () => { window.cancelAnimationFrame(frame); node.style.filter = previousFilter; };
  }, [id, delay, duration]);
  return <>
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute", pointerEvents: "none" }}>
      <defs><filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="1" seed="7" result="grain"/>
        <feColorMatrix in="grain" type="luminanceToAlpha" result="grainAlpha"/>
        <feComponentTransfer in="grainAlpha" result="reveal"><feFuncA ref={alpha} type="linear" slope="8" intercept="1"/></feComponentTransfer>
        <feComposite in="SourceGraphic" in2="reveal" operator="in"/>
      </filter></defs>
    </svg>
    <img ref={image} className={className} src={src} alt={alt}/>
  </>;
}
