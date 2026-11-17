// Each pair was checked against the same Órulo asset in Chrome.
const originals = new Map([
  ['xyg3f7pmhaewwcp8ycxqludbi68i.jpg', { large: 1024, width: 1920, height: 1372 }],
  ['q82n2jxl6z5y2k6bq0eyed61qkhs.jpg', { large: 842, width: 1137, height: 1383 }],
  ['g2k2ls3lb03wsd7mh5it600r63n0.png', { large: 1024, width: 912, height: 513 }],
]);

export function editorialPhoto(url, sizes) {
  const match = /^https:\/\/static\.orulo\.com\.br\/images\/properties\/large\/(\w+\.(?:jpg|png))$/.exec(url);
  const variant = match && originals.get(match[1]);
  if (!variant) return null;
  const original = url.replace('/large/', '/original/');
  return {
    src: variant.width > variant.large ? url : original,
    srcset: variant.width > variant.large
      ? ` srcset="${url} ${variant.large}w, ${original} ${variant.width}w" sizes="${sizes}"`
      : '',
    width: variant.width,
    height: variant.height,
  };
}
