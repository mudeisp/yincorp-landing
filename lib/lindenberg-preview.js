import { visualRelease } from './visual-engine.js';
import { residenceStructure } from './residence-structure.js';

export const LINDENBERG_PATH = '/sp/sao-paulo/empreendimento/praca-lindenberg-clodomiro--orulo-17933';
const figures = items => items.map(({ asset, caption }) =>
  `<figure class="solo"><img src="${asset}" alt="${caption}" loading="lazy"><figcaption>${caption}</figcaption></figure>`).join('');

export function renderLindenbergPreview(html) {
  const release = visualRelease('17933');
  if (!release?.assets.length || !release.commercial) return html;
  const architecture = /(<section class="art-architecture" id="arquitetura">)(.*?)<\/section>/s;
  if (!architecture.test(html)) return html;
  const items = {
    name: 'PRAÇA LINDENBERG CLODOMIRO',
    stats: '<div class="stats"><div><b>Adolpho Lindenberg</b>Incorporadora</div><div><b>1.907,62 m²</b>Terreno</div><div><b>1</b>Torre</div></div>',
    lobby: '<figure class="solo"><img src="/visual-engine/17933/original-7.webp" alt="Lobby · perspectiva do book" loading="lazy"><figcaption>Lobby · perspectiva do book</figcaption></figure>',
    leisure: figures(release.assets.filter(item => item.category === 'leisure')),
    site: figures(release.assets.filter(item => item.category === 'site')),
  };
  const markup = residenceStructure.replace(/<section class="chapter" id="plantas">.*?<\/section>/s, '').replace(/\{\{(\w+)\}\}/g, (_, key) => items[key]);
  const script = '<script type="module" src="/portal-assets/residence-structure/master.mjs"></script>';
  return html.replace(architecture, (_, start, contents) => markup + script + start +
      contents.replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/, '') + '</section>')
    .replace(/(<section class="art-amenities[^"]*" id="diferenciais">.*?)<figure\b[^>]*>.*?<\/figure>/s, '$1');
}
