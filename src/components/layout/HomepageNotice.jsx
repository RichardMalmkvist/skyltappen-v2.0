import {useEffect, useRef, useState} from 'react';
import './homepageNotice.css';

function getNoticeImageLayout({imageLayout, scrolling}) {
  if (imageLayout === 'center' && scrolling) return 'repeat';
  return imageLayout === 'repeat' ? 'repeat' : 'fill';
}

export default function HomepageNotice({notice}) {
  const [paused, setPaused] = useState(false);
  const content = useRef(null);
  const image = useRef(null);
  const {heading = '', message = '', tone, scrolling, snow, imageSrc, imageAlt} = notice;
  const imageLayout = getNoticeImageLayout(notice);
  const duration = Math.min(75, 16 + (heading.length + message.length) / 10);
  const tiledImage = Boolean(imageSrc && (scrolling || imageLayout === 'repeat'));

  useEffect(() => {
    if (!tiledImage || typeof ResizeObserver === 'undefined') return;
    const node = image.current;
    const track = content.current;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      if (width > 0) {
        track.style.setProperty('--notice-tile-width', `${width}px`);
        track.style.setProperty('--notice-image-duration', `${width / 36}s`);
      }
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
      track.style.removeProperty('--notice-tile-width');
      track.style.removeProperty('--notice-image-duration');
    };
  }, [tiledImage, imageSrc]);

  return <section aria-label="Meddelande" className="homepage-notice" data-tone={tone || 'green'} data-image-layout={imageSrc ? imageLayout : undefined}
    data-full-width={imageSrc ? true : undefined}>
    <div className="homepage-notice-inner">
      {snow && <span className="homepage-notice-snow" aria-hidden="true">❄</span>}
      <div className="homepage-notice-track" data-scrolling={scrolling || undefined}>
        <div ref={content} className="homepage-notice-content" data-paused={paused} style={{'--notice-duration': `${duration}s`,
          '--notice-image': imageSrc ? `url("${imageSrc}")` : undefined}}>
          {imageSrc ? <img ref={image} className="homepage-notice-image" src={imageSrc} alt={imageAlt}/> :
            <p className="homepage-notice-text">{heading && <strong>{heading}</strong>}<span>{message}</span></p>}
        </div>
      </div>
      {snow && <span className="homepage-notice-snow" aria-hidden="true">❄</span>}
      {scrolling && <button type="button" className="homepage-notice-motion" onClick={() => setPaused(value => !value)}
        aria-label={paused ? 'Starta rullning' : 'Pausa rullning'}/>}
    </div>
  </section>;
}
