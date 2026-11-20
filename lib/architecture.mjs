import { offices } from './architecture-data.mjs';

const origin = 'https://www.yincorp.com.br';
export const architectureRoot = '/arquitetura';
export const architectureSitemap = '/sitemap-arquitetura.xml';
const officePath = office => architectureRoot + '/' + office.key;
const escape = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);

function projectCard({items, source, note}) {
  const [project, ...variants] = items;
  const name = project.n.replace(/ - (?:Residencial|NR)$/, '');
  const image = project.i ? '<img src="' + escape(project.i) + '" alt="" loading="lazy" decoding="async" width="640" height="420">' : '';
  const variantLinks = variants.map(item => '<a href="' + escape(item.path) + '">' + escape(item.n) + '</a>').join('');
  return '<article class="card">' + image + '<div class="card-body"><p class="location">' +
    escape([project.b, project.c, project.s].filter(Boolean).join(' · ')) + '</p><h3>' + escape(name) + '</h3>' +
    (note ? '<p>' + escape(note) + '</p>' : '') +
    '<a class="cta" href="' + escape(project.path) + '">Consultar ' + escape(name) + ' na Yincorp</a>' +
    (variantLinks ? '<div class="variants">' + variantLinks + '</div>' : '') +
    (source ? '<a class="source" href="' + escape(source) + '">Fonte do crédito de arquitetura</a>' : '') + '</div></article>';
}

function officeLinks(except) {
  return offices.filter(office => office !== except).map(office =>
    '<li><a href="' + officePath(office) + '"><strong>' + escape(office.name) +
    '</strong><span>' + escape(office.tagline) + '</span></a></li>').join('');
}

function render(office, preview) {
  const path = office ? officePath(office) : architectureRoot;
  const heading = office?.name || 'Escritórios de arquitetura';
  const title = heading + (office ? ' | Projetos no catálogo Yincorp' : ' | Guia Yincorp');
  const description = office?.intro || 'Conheça os escritórios que assinam projetos no catálogo da Yincorp e consulte as fichas dos empreendimentos.';
  const canonical = origin + path;
  const breadcrumb = [
    {name: 'Yincorp', item: origin + '/'},
    {name: 'Arquitetura', item: origin + architectureRoot},
    ...(office ? [{name: heading, item: canonical}] : [])
  ];
  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {'@type': 'CollectionPage', name: title, description, url: canonical, inLanguage: 'pt-BR'},
      {'@type': 'BreadcrumbList', itemListElement: breadcrumb.map((entry, index) => ({
        '@type': 'ListItem', position: index + 1, ...entry
      }))}
    ]
  }).replace(/</g, '\\u003c');
  return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>' + escape(title) + '</title><meta name="description" content="' + escape(description) + '">' +
    (preview ? '<meta name="robots" content="noindex, follow">' : '') +
    '<link rel="canonical" href="' + canonical + '"><meta property="og:type" content="website"><meta property="og:title" content="' + escape(title) +
    '"><meta property="og:description" content="' + escape(description) + '"><meta property="og:url" content="' + canonical + '">' +
    '<link rel="stylesheet" href="/public/architecture-directory.css"><script type="application/ld+json">' + schema + '</script></head><body>' +
    '<header><div class="wrap top"><a class="brand" href="/" aria-label="Yincorp, página inicial">YIN<span>CORP</span></a>' +
    '<nav aria-label="Navegação"><a href="/arquitetura">Escritórios</a><a href="/sp">Imóveis em SP</a></nav></div></header>' +
    '<main id="conteudo"><section class="hero"><div class="wrap">' +
    (office ? '<a class="eyebrow" href="/arquitetura">Guia de arquitetura</a>' : '<p class="eyebrow">Guia Yincorp</p>') +
    '<h1>' + escape(heading) + '</h1>' +
    (office ? '<p class="tagline">' + escape(office.tagline) + '</p>' : '') +
    '<p class="intro">' + escape(description) + '</p></div></section><div class="wrap sections">' +
    (office ? '<section aria-labelledby="projects"><h2 id="projects">Projetos no catálogo Yincorp</h2><div class="cards">' +
      office.projects.map(projectCard).join('') + '</div></section>' : '') +
    '<nav aria-labelledby="offices"><h2 id="offices">' + (office ? 'Outros escritórios' : 'Explore os escritórios') +
    '</h2><ul class="offices">' + officeLinks(office) + '</ul></nav></div></main>' +
    '<footer><div class="wrap"><a href="/">Yincorp</a><a href="/politica-de-privacidade">Política de privacidade</a></div></footer></body></html>';
}

export function serveArchitecture(req, res, path, {preview = false} = {}) {
  const sitemap = path === architectureSitemap;
  const office = offices.find(entry => officePath(entry) === path);
  if (!sitemap && path !== architectureRoot && !office) return false;
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.setHeader('Allow', 'GET, HEAD');
    res.status(405).end();
    return true;
  }
  const body = sitemap
    ? '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      [architectureRoot, ...offices.map(officePath)].map(route => '<url><loc>' + origin + route + '</loc></url>').join('') + '</urlset>'
    : render(office, preview);
  res.setHeader('Content-Type', sitemap ? 'application/xml; charset=utf-8' : 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', preview ? 'no-store' : 'public, max-age=0, s-maxage=3600');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (preview) res.setHeader('X-Robots-Tag', 'noindex, follow');
  res.status(200);
  if (req.method === 'HEAD') res.end();
  else res.send(body);
  return true;
}
