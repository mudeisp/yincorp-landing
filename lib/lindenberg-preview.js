import { visualRelease } from './visual-engine.js';
import { residenceStructure } from './residence-structure.js';

export const LINDENBERG_PATH = '/sp/sao-paulo/empreendimento/praca-lindenberg-clodomiro--orulo-17933';
const figures = items => items.map(({ asset, caption }) =>
  `<figure class="solo"><img src="${asset}" alt="${caption}" loading="lazy"><figcaption>${caption}</figcaption></figure>`).join('');

export function renderLindenbergPreview(html) {
  const release = visualRelease('17933');
  const maquette = release?.assets.find(item => item.key === 'maquette-a');
  const previewError = message => {
    console.error('[Lindenberg preview]', message);
    return html.replace('<main', '<p role="alert" data-residence-preview-error>' + message + '</p><main');
  };
  if (!maquette || !release.commercial) return previewError('Prévia Residence indisponível: maquete ou tabela verificada ausente.');
  const architecture = /(<section\b(?=[^>]*\bid=["']arquitetura["'])(?=[^>]*\bclass=["'][^"']*\bart-architecture\b)[^>]*>)(.*?)<\/section>/s;
  const conventionalPlans = /(<section\b(?=[^>]*\bid=["']plantas["'])(?=[^>]*\bclass=["'][^"']*\bart-plans\b)[^>]*>)(.*?)<\/section>/s;
  if (!architecture.test(html) || !conventionalPlans.test(html)) {
    return previewError('Prévia Residence indisponível: não foi possível localizar arquitetura ou plantas na ficha.');
  }
  const items = {
    name: 'PRAÇA LINDENBERG CLODOMIRO',
    stats: '<div class="stats"><div><b>Adolpho Lindenberg</b>Incorporadora</div><div><b>1.907,62 m²</b>Terreno</div><div><b>1</b>Torre</div></div>',
    lobby: '<figure class="solo"><img src="/visual-engine/17933/original-7.webp" alt="Lobby · perspectiva do book" loading="lazy"><figcaption>Lobby · perspectiva do book</figcaption></figure>',
    leisure: figures(release.assets.filter(item => item.category === 'leisure')),
    planTitle: maquette.caption,
    plans: figures([maquette]),
    originalPlans: '<a href="#plantas" data-catalog-plans>Consultar plantas originais da ficha</a>',
    site: figures(release.assets.filter(item => item.category === 'site')),
  };
  const markup = residenceStructure.replace(/\{\{(\w+)\}\}/g, (_, key) => items[key]);
  // The book and table document the 191.30 m² configuration for unit 32.
  const planCatalog = { unitPlanIds: { '32': 'tipo-191' }, plans: {
    'tipo-191': { src: maquette.asset, caption: maquette.caption }
  }};
  const catalog = '<script type="application/json" id="lindenberg-plan-catalog">' + JSON.stringify(planCatalog) + '</script>';
  const script = '<script type="module" src="/portal-assets/residence-structure/master.mjs"></script>';
  return html.replace(architecture, (_, start, contents) => markup + catalog + script + start +
      contents.replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/, '') + '</section>')
    .replace(conventionalPlans, (_, start, contents) =>
      start.replace(/^<section/, '<details') +
      '<summary>Plantas originais da ficha</summary>' + contents + '</details>')
    .replace(/(<section class="art-amenities[^"]*" id="diferenciais">.*?)<figure\b[^>]*>.*?<\/figure>/s, '$1');
}
