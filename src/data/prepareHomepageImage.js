async function prepareHomepageImage(file) {
  if (!/^image\/(jpeg|png|webp)$/i.test(file.type) && !/\.(jpe?g|png|webp)$/i.test(file.name)) {
    throw new Error('Välj en JPG-, PNG- eller WebP-bild.');
  }
  if (file.size > 15 * 1024 * 1024) throw new Error('Bilden får vara högst 15 MB.');
  const data = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Filen kunde inte läsas. Om den ligger i OneDrive, ladda ned den till datorn först.'));
    reader.onabort = () => reject(new Error('Bildvalet avbröts. Välj bilden igen.'));
    reader.readAsDataURL(file);
  });
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Bilden kunde inte öppnas. Prova att spara den som JPG eller PNG.'));
    img.src = data;
  });
  const scale = Math.min(1, 2400 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Bildbehandling stöds inte i webbläsaren.');
  return {image, canvas, ctx};
}

export async function compressHomepageImage(file, {transparent = false} = {}) {
  const {image, canvas, ctx} = await prepareHomepageImage(file);
  const format = transparent ? 'image/webp' : 'image/jpeg';
  if (!transparent) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  let src = canvas.toDataURL(format, .86);
  if (src.length > 2800000) src = canvas.toDataURL(format, .65);
  if (src.length > 3000000) throw new Error('Välj en mindre bild.');
  if (!/^data:image\/(jpeg|webp|png);base64,/.test(src)) throw new Error('Bilden kunde inte bearbetas. Prova en annan bild.');
  return src;
}
