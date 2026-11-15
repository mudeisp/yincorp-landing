// Yincorp-only overlay for the verified, pinned ynteligencia assets.
// Strict replacements fail the build if the upstream tracking template changes.
export function trackingOverlay(path, source) {
  if (typeof source !== 'string') throw new Error('tracking_overlay_invalid_source');
  const swap = (from, to) => {
    const occurrences = source.split(from).length - 1;
    if (occurrences !== 1) throw new Error('tracking_overlay_upstream_changed:' + path + ':' + from);
    source = source.replace(from, to);
  };
  if (path === '.portal-shared/render.js') {
    swap('gtag/js?id=G-Y2W11SX5VV', 'gtag/js?id=G-2ZDJCLSSDN');
  } else if (path === 'portal-assets/analytics.js') {
    swap("gtag('config', 'G-Y2W11SX5VV');", "gtag('config', 'G-2ZDJCLSSDN');\n  gtag('config', 'AW-18371236623');");
    swap("fbq('init', '1552958819302786');", "fbq('init', '1847735489548242');");
  } else {
    throw new Error('tracking_overlay_unexpected_path:' + path);
  }
  return source;
}
