import { offices } from './architecture-data.mjs';
import { editorial } from './architecture-editorial.mjs';
import { configurations } from './architecture-configurations.mjs';
import { imageSizes } from './architecture-image-sizes.mjs';
import { footerStyles, renderSiteFooter } from './site-footer.js';

const origin = 'https://www.yincorp.com.br';
export const architectureRoot = '/arquitetura';
export const architectureSitemap = '/sitemap-arquitetura.xml';
const officePath = office => architectureRoot + '/' + office.key;
const escape = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);
const projectName = project => project.n.replace(/ - (?:Residencial|NR)$/, '');
const place = project => [project.b, project.c, project.s].filter(Boolean).join(' · ');
const hubImage = '/mandarim-the-legend/fachada.webp';
const whatsApp = 'https://wa.me/5511992976368?text=Ol%C3%A1%2C%20vim%20pelo%20site%20da%20Yincorp%20e%20gostaria%20de%20conversar.';
const nav = '<a href="/sp">Comprar</a><a href="/alugar">Alugar</a><a href="/arquitetura">Arquitetura</a><a class="nav-contact" href="https://app.yincorp.com.br/?modo=explorar">Explorar a plataforma&nbsp; ↗</a>';
const titleHub = 'A arquitetura transforma a maneira de viver.';
const subtitleHub = 'Dez escritórios. Diferentes visões. Projetos que revelam novas possibilidades de morar.';

function projectImage(project, { eager = false, cover = false } = {}) {
  const src = cover ? hubImage : project.i;
  if (!src) return '';
  const [width, height] = cover ? [1800, 901] : imageSizes[src.split('/').at(-1)];
  const alt = cover ? 'Vista da fachada do Mandarim The Legend, no Brooklin Novo' : 'Imagem de divulgação de ' + projectName(project) + ', ' + place(project);
  return `<img src="${escape(src)}" alt="${escape(alt)}" width="${width}" height="${height}" decoding="async" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'}>`;
}

function projectLink(project, office, label, className = '') {
  return `<a class="${className}" href="${escape(project.path)}" data-project="${escape(project.n)}" data-office="${escape(office.key)}" aria-label="${escape(label + (label === project.n ? '' : ' — ' + project.n))}">${escape(label)} <span aria-hidden="true">↗</span></a>`;
}


const number = new Intl.NumberFormat('pt-BR');
function projectConfiguration(project) {
  const data = configurations[project.path.split('--orulo-').at(-1)];
  if (!data) return '';
  const range = ([min, max]) => min === max ? number.format(max) : number.format(min) + ' a ' + number.format(max);
  const details = [
    data.area && range(data.area) + ' m²',
    data.bedrooms?.[0] > 0 && range(data.bedrooms) + ' dorm.'
  ].filter(Boolean);
  return `<p class="arch-configurations">${escape(details.join(' · '))}</p>`;
}

function projectCard({items, source, note}, office, featured = false) {
  const [project, ...variants] = items;
  const credit = source || origin + project.path;
  return `<article class="arch-card ${featured ? 'arch-feature' : ''}">${projectImage(project)}
    <div class="arch-card-copy"><p class="eyebrow">${escape(place(project))}</p><h3>${escape(projectName(project))}</h3>
    <p>${escape(office.name)}${note ? ' · ' + escape(note) : ''}</p>
    ${projectConfiguration(project)}
    ${projectLink(project, office, 'Conhecer empreendimento', 'arch-cta')}
    ${variants.length ? '<div class="arch-variants">' + variants.map(item => projectLink(item, office, item.n)).join('') + '</div>' : ''}
    <a class="arch-source" href="${escape(credit)}">Fonte dos créditos do projeto</a>
    <small>Imagem de divulgação · Catálogo Órulo</small></div></article>`;
}

function officeCard(office) {
  const project = office.projects[0].items[0];
  const count = office.projects.length;
  return `<article class="arch-card arch-office-card" data-yi-home-reveal>
    <a class="arch-photo-link" href="${officePath(office)}" aria-label="${escape('Conhecer ' + office.name)}">${projectImage(project)}</a>
    <div class="arch-card-copy"><p class="eyebrow">${count} ${count === 1 ? 'empreendimento' : 'empreendimentos'} na seleção</p>
    <h3><a href="${officePath(office)}">${escape(office.name)}</a></h3>
    <p class="arch-signature">${escape(editorial[office.key].signature)}</p>
    <p>${escape(office.intro)}</p>
    <a class="arch-cta" href="${officePath(office)}" aria-label="${escape('Explorar ' + office.name)}">Explorar escritório <span aria-hidden="true">↗</span></a>
    <small>${escape(projectName(project))} · Imagem de divulgação · Catálogo Órulo</small></div></article>`;
}

function hubContent() {
  const highlights = [offices[0], offices[1], offices[6]];
  return `<section class="arch-section wrap" id="escritorios"><h2>Assinaturas arquitetônicas</h2>
    <div class="arch-grid arch-offices">${offices.map(officeCard).join('')}</div></section>
    <section class="arch-band"><div class="arch-section wrap"><h2>Projetos em destaque</h2>
    <div class="arch-grid arch-highlights">${highlights.map(office => projectCard(office.projects[0], office)).join('')}</div></div></section>
    <section class="arch-section arch-reading wrap"><h2>Da arquitetura à escolha de onde morar</h2>
    <div><p>A planta ajuda a imaginar a rotina dentro de casa. A implantação mostra como o edifício ocupa o terreno. Já a fachada e os acessos revelam a relação com a rua. Juntos, esses elementos explicam por que empreendimentos de um mesmo bairro podem oferecer experiências tão distintas.</p>
    <p>O guia reúne projetos do catálogo Yincorp em diferentes contextos urbanos, da capital paulista a Alphaville e Curitiba. Cada perfil reúne referências sobre a autoria e links para consultar configurações e condições comerciais nas fichas dos empreendimentos.</p></div></section>`;
}

function officeContent(office) {
  const profile = editorial[office.key];
  const [featured, ...gallery] = office.projects;
  const regions = new Map(office.projects.map(({items: [project]}) =>
    [project.path.split('/').slice(0, 3).join('/'), project.c + ', ' + project.s]));
  return `<section class="arch-section arch-reading wrap" id="perfil"><h2>Perfil arquitetônico</h2>
    <div><p>${escape(profile.introduction)}</p><p class="arch-observation">${escape(profile.focus)}</p></div></section>
    <section class="arch-section wrap" id="projetos"><h2>Projetos no catálogo</h2>
    ${projectCard(featured, office, true)}
    ${gallery.length ? '<div class="arch-grid arch-gallery">' + gallery.map(item => projectCard(item, office)).join('') + '</div>' : ''}</section>
    <section class="arch-band"><div class="arch-section arch-reading wrap"><h2>Perguntas frequentes</h2><div class="arch-faq">
    <details><summary>${escape(profile.question)}</summary><p>${escape(profile.answer)}</p></details>
    <details><summary>Como consultar condições comerciais?</summary><p>Abra a ficha do empreendimento para conferir as opções cadastradas e os canais de consulta da Yincorp.</p></details>
    </div></div></section>
    <section class="arch-section arch-reading wrap"><h2>Continue explorando</h2><div>
    <nav class="arch-related" aria-label="Regiões">${Array.from(regions, ([path, label]) => `<a href="${escape(path)}">${escape(label)} ↗</a>`).join('')}</nav>
    <nav class="arch-related" aria-label="Outros escritórios">${offices.filter(other => other !== office).map(other => `<a href="${officePath(other)}">${escape(other.name)} ↗</a>`).join('')}</nav></div></section>`;
}

function render(office, preview) {
  const path = office ? officePath(office) : architectureRoot;
  const heading = office?.name || titleHub;
  const signature = office && editorial[office.key].signature;
  const heroOffice = office || offices[0];
  const project = heroOffice.projects[0].items[0];
  const title = office ? office.name + ' | Arquitetura e projetos · Yincorp' : 'Arquitetura autoral | Escritórios e projetos · Yincorp';
  const description = office?.intro || 'Conheça dez escritórios de arquitetura e descubra os empreendimentos que assinam. Consulte os projetos, os créditos e as fichas no catálogo Yincorp.';
  const canonical = origin + path;
  const image = office ? project.i : origin + hubImage;
  const imageAlt = 'Imagem de divulgação de ' + projectName(project) + ', ' + place(project);
  const breadcrumb = [
    {name: 'Yincorp', item: origin + '/', path: '/'},
    {name: 'Arquitetura', item: origin + architectureRoot, path: architectureRoot},
    ...(office ? [{name: heading, item: canonical, path}] : [])
  ];
  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {'@type': 'Organization', '@id': origin + '/#organization', name: 'Yincorp', url: origin + '/'},
      {'@type': 'CollectionPage', '@id': canonical, name: title, description, url: canonical, inLanguage: 'pt-BR', publisher: {'@id': origin + '/#organization'}},
      {'@type': 'BreadcrumbList', itemListElement: breadcrumb.map(({name, item}, index) => ({
        '@type': 'ListItem', position: index + 1, name, item
      }))}
    ]
  }).replace(/</g, '\\u003c');
  const metrics = preview ? '' : `<script async src="https://www.googletagmanager.com/gtag/js?id=G-2ZDJCLSSDN"></script>
    <script defer src="/assets/js/integrations/analytics.js"></script><script type="module" src="/public/architecture-directory.js"></script>`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escape(title)}</title><meta name="description" content="${escape(description)}">
    <meta name="robots" content="${preview ? 'noindex,follow' : 'index,follow'}"><meta name="theme-color" content="#faf7f1">
    <link rel="canonical" href="${canonical}"><link rel="icon" href="/icon-192.png">
    <meta property="og:type" content="website"><meta property="og:locale" content="pt_BR"><meta property="og:site_name" content="Yincorp">
    <meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${escape(image)}"><meta property="og:image:alt" content="${escape(imageAlt)}">
    <meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(title)}"><meta name="twitter:description" content="${escape(description)}">
    <meta name="twitter:image" content="${escape(image)}"><meta name="twitter:image:alt" content="${escape(imageAlt)}">
    <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="/home-assets/home.css"><link rel="stylesheet" href="/home-assets/travertine-cinema.css">
    <link rel="stylesheet" href="/home-assets/brand-shell.css">${footerStyles}
    <link rel="stylesheet" href="/public/architecture-directory.css"><script type="application/ld+json">${schema}</script>${metrics}
    <script defer src="/home-assets/travertine-cinema.js"></script></head>
    <body class="arch" data-architecture-office="${office ? escape(office.key) : ''}">
    <a class="skip" href="#conteudo">Pular para o conteúdo</a>
    <header class="header yi-brand-shell"><div class="wrap header-inner">
    <a class="brand yi-brand-mark" href="/"><strong>yincorp</strong><span>PLACES WORTH LIVING</span></a>
    <nav class="desktop-nav" aria-label="Navegação principal">${nav}</nav>
    <details class="mobile-menu"><summary>Menu</summary><nav aria-label="Navegação no celular">${nav}</nav></details></div></header>
    <main id="conteudo"><div class="arch-opening">
    <nav class="arch-breadcrumb wrap" aria-label="Localização"><ol>${breadcrumb.map(({name, path}, index) =>
      '<li>' + (index === breadcrumb.length - 1 ? '<span aria-current="page">' + escape(name) + '</span>' :
        '<a href="' + path + '">' + escape(name) + '</a>') + '</li>').join('')}</ol></nav>
    <section class="hero wrap" aria-labelledby="architecture-title"><div class="hero-copy">
    <p class="eyebrow">Yincorp · Arquitetura autoral</p>
    <h1 id="architecture-title">${office ? escape(heading) : 'A arquitetura transforma a maneira de <em>viver.</em>'}</h1>
    <p>${escape(signature || subtitleHub)}</p>
    <div class="actions"><a class="button primary" href="${office ? '#projetos' : '#escritorios'}">${office ? 'Explorar os projetos' : 'Explore as assinaturas arquitetônicas'} <span aria-hidden="true">↓</span></a></div></div>
    <figure class="hero-figure"><a href="${escape(project.path)}" data-project="${escape(project.n)}" data-office="${escape(heroOffice.key)}" aria-label="${escape('Conhecer ' + projectName(project))}">${projectImage(project, {eager: true, cover: !office})}</a>
    <figcaption><span>${escape(projectName(project))} · ${escape(project.b)}</span><span>Imagem de divulgação · ${office ? 'Catálogo Órulo' : 'Book do empreendimento'}</span></figcaption></figure></section></div>
    ${office ? officeContent(office) : hubContent()}
    <section class="arch-contact"><div class="wrap"><h2>Converse com a Yincorp</h2><p>Conheça as opções e confirme informações com nosso atendimento.</p>
    <a href="${whatsApp}" class="button" data-architecture-contact>Falar pelo WhatsApp <span aria-hidden="true">↗</span></a></div></section></main>
    ${renderSiteFooter({links:'<a href="/arquitetura">Arquitetura</a><a href="/sp">Comprar</a><a href="/alugar">Alugar</a>', note: 'Imagens de divulgação. As configurações são referências do catálogo. Confirme preços, condições e disponibilidade na ficha do empreendimento.'})}</body></html>`;
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
