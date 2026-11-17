// Each pair was checked against the same Órulo asset in Chrome.
const originals = new Map([
  ['xyg3f7pmhaewwcp8ycxqludbi68i.jpg', { large: 1024, width: 1920, height: 1372 }],
  ['q82n2jxl6z5y2k6bq0eyed61qkhs.jpg', { large: 842, width: 1137, height: 1383 }],
  ['960547.jpg', { large: 1024, width: 1440, height: 2561 }],
  ['2082093.png', { large: 1024, width: 1920, height: 740 }],
  ['l17mh7atcn1pkbnwhn28p2tx29fg.png', { large: 764, width: 806, height: 1080, limited: true }],
  ['1882776.jpeg', { large: 1024, width: 1280, height: 1222 }],
  ['6aar1ab196a69prz83btqrjyk7ep.jpg', { large: 576, width: 1290, height: 2293 }],
  ['1823520.png', { large: 413, width: 413, height: 528, limited: true }],
  ['1902523.jpg', { large: 820, width: 820, height: 461, limited: true }],
  ['g2k2ls3lb03wsd7mh5it600r63n0.png', { large: 1024, width: 912, height: 513 }],
]);

export function editorialPhoto(url, sizes) {
  const match = /^https:\/\/static\.orulo\.com\.br\/images\/properties\/large\/(\w+\.(?:jpe?g|png))$/.exec(url);
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
    limited: variant.limited === true,
  };
}
