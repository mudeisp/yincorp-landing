import pilot from '../visual-engine/17933/manifest.json' with { type: 'json' };

const releases = new Map([['17933', pilot]]);
const categories = new Set(['facade', 'lobby', 'leisure', 'site', 'maquette', 'blueprint', 'editorial', 'xray']);
const local = /^\/(?!\/)[\w/.-]+\.webp$/;

export function approvedVisualModules(release) {
  const assets = (release?.assets ?? []).filter(asset =>
    asset.status === 'approved' && categories.has(asset.category) && local.test(asset.asset ?? '') &&
    asset.original && Number.isSafeInteger(asset.page) && asset.page > 0 &&
    (asset.recipeVersion || asset.promptVersion));
  const commercial = release?.commercial?.status === 'verified' &&
    /^\/(?!\/)[\w/.-]+\.json$/.test(release.commercial.unitsUrl ?? '') ? release.commercial : null;
  return assets.length || commercial ? { assets, commercial } : null;
}

export function visualRelease(id, environment = process.env.VERCEL_ENV) {
  return environment === 'preview' ? approvedVisualModules(releases.get(id)) : null;
}
