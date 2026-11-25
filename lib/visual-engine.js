import pilot from '../visual-engine/17933/manifest.json' with { type: 'json' };

const releases = new Map([['17933', pilot]]);
const required = ['facade', 'lobby', 'leisure', 'site', 'maquette', 'blueprint', 'editorial', 'xray'];
const variants = ['maquette', 'blueprint', 'editorial', 'xray'];

export function approvedVisualRelease(release) {
  if (release?.status !== 'approved' || release.commercial?.status !== 'verified' ||
      !release.commercial.unitsUrl || !Array.isArray(release.assets) || !release.assets.length) return false;
  if (!release.assets.every(asset => asset.status === 'approved' && asset.original && asset.asset &&
    Number.isSafeInteger(asset.page) && asset.page > 0 && asset.promptVersion)) return false;
  if (!required.every(category => release.assets.some(asset => asset.category === category))) return false;
  const plans = release.assets.filter(asset => variants.includes(asset.category));
  const pages = new Set(plans.map(asset => asset.page));
  return [...pages].every(page => variants.every(variant =>
    plans.some(asset => asset.page === page && asset.category === variant)));
}

export function visualRelease(id, environment = process.env.VERCEL_ENV) {
  const release = releases.get(id);
  return environment === 'preview' && approvedVisualRelease(release) ? release : null;
}
