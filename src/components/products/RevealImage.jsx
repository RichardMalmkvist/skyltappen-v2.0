import { createElement, useEffect, useRef, useState } from "react";

// Only the image fades; overlaid sign text continues to update immediately.
export default function RevealImage({ svgImage = false, className = "", onLoad, ...props }) {
  const image = useRef(null);
  const source = props.src || props.href;
  const [loadedSource, setLoadedSource] = useState(null);
  useEffect(() => {
    if (!svgImage && image.current?.complete && image.current.naturalWidth > 0) setLoadedSource(source);
  }, [source, svgImage]);
  return createElement(svgImage ? "image" : "img", {
    ...props,
    key: source,
    ref: image,
    className: [className, loadedSource === source ? "jsf-image-reveal-ready" : ""].filter(Boolean).join(" "),
    onLoad: event => { setLoadedSource(source); onLoad?.(event); },
  });
}
