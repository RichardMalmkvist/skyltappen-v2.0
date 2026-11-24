import React from "react";

export default function AdminCategoryTile({ title, count, status = "open", active, onClick, children }) {
  return (
    <div className={`jsf-cat-tile ${active ? "active" : ""}`}>
      <button type="button" className="jsf-cat-main" aria-pressed={Boolean(active)} onClick={onClick}>
        <span className={`jsf-cat-dot ${status}`} />
        <span className="jsf-cat-copy"><b>{title}</b><small>{count} {count === 1 ? "artikel" : "artiklar"}</small></span>
        <span className="jsf-cat-chevron">›</span>
      </button>
      {children ? <div className="jsf-cat-extra">{children}</div> : null}
      <style>{`
        .jsf-cat-tile{background:#f7f7f7;border:1px solid rgba(255,255,255,.55);border-radius:13px;overflow:hidden;box-shadow:0 5px 18px rgba(0,0,0,.08);transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease}
        .jsf-cat-tile:hover{transform:translateY(-2px);box-shadow:0 10px 25px rgba(0,0,0,.12)}.jsf-cat-tile.active{border-color:#7bb89d;box-shadow:0 0 0 2px rgba(96,190,148,.16),0 10px 25px rgba(0,0,0,.12)}
        .jsf-cat-main{width:100%;min-height:76px;border:0;background:transparent;padding:14px 16px;display:grid;grid-template-columns:10px 1fr 18px;align-items:center;gap:11px;text-align:left;color:#17201c;cursor:pointer;font:inherit}
        .jsf-cat-dot{width:8px;height:8px;border-radius:50%;background:#b8c0bc}.jsf-cat-dot.open{background:#56a77e}.jsf-cat-dot.closed{background:#b9bfbc}.jsf-cat-dot.hidden{background:#d2d5d3}.jsf-cat-dot.internal{background:#6d7c75}
        .jsf-cat-copy{display:grid;gap:5px;min-width:0}.jsf-cat-copy b{font-size:13px;line-height:1.25}.jsf-cat-copy small{font-size:10px;color:#66706b;font-weight:500}.jsf-cat-chevron{font-size:23px;color:#8c9590;line-height:1;text-align:right}
        .jsf-cat-extra{border-top:1px solid #e4e7e4;padding:9px 12px;background:#f3f4f2;color:#25312b}
      `}</style>
    </div>
  );
}
