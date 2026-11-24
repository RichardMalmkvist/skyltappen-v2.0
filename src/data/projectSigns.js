// Drawing markers are adapted in place; standalone signs live on the project.
export function projectSignDisplayText(sign={}) {
 const text=String(sign.text||sign.signText||'').trim();
 const form=sign.configuration||{},artwork=form.dibondSign?.uploadedArtwork||form.otBoard?.uploadedArtwork;
 // An original's filename describes the attachment, not text printed on the sign.
 if(text===artwork?.name||/^[^\r\n]+\.(svg|pdf|png|jpe?g|webp)$/i.test(text))return '';
 return text;
}
export function projectSigns(project) {
  return [
    ...(project?.signs || []).map(sign => ({...sign, key: sign.id, drawingId: null})),
    ...(project?.drawings || []).flatMap(drawing => (drawing.markers || []).map(sign => ({
      ...sign, kind: sign.kind === 'svg' ? 'svg' : 'catalog', key: `drawing:${drawing.id}:${sign.id}`, drawingId: drawing.id, drawingName: drawing.name
    })))
  ].sort((a,b) => Number(String(a.position).replace(/\D/g,'')) - Number(String(b.position).replace(/\D/g,'')));
}
