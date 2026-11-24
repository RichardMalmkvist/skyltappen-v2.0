const WIDTH = 110;
const HEIGHT = 80;
const POINTS = '52.2,53.16 105.53,0 65.67,0 0,66.45 65.5,132.86 105.35,132.86 52.2,79.72 182.68,79.72 182.68,53.16';

function largeHangingArrow(direction) {
  const transform = {
    left: '',
    right: `translate(${WIDTH} 0) scale(-1 1)`,
    up: `translate(${HEIGHT} 0) rotate(90)`,
    down: `translate(0 ${WIDTH}) rotate(-90)`,
  }[direction];
  if (transform === undefined) return null;

  const vertical = direction === 'up' || direction === 'down';
  const body = `<g transform="${transform || 'translate(0 0)'}"><polygon transform="scale(${WIDTH / 182.68} ${HEIGHT / 132.86})" points="${POINTS}"/></g>`;
  return {viewBox: [0, 0, vertical ? HEIGHT : WIDTH, vertical ? WIDTH : HEIGHT], body};
}

function largeHangingArrowImage(direction) {
  const {viewBox, body} = largeHangingArrow(direction);
  const [, , width, height] = viewBox;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox.join(' ')}" fill="#2b2a29">${body}</svg>`
  );
}

module.exports = {largeHangingArrow, largeHangingArrowImage};
