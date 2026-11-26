import { readFile, writeFile, access } from 'node:fs/promises';
import { entities, editions, sources, consulted } from './library.mjs';
import { images } from './images.mjs';

const id = 'arborea-ibirapuera';
const edition = editions[id];
const root = new URL('../../', import.meta.url);
const output = new URL('.' + edition.preview, root);
const title = 'Arbórea Ibirapuera | Arquitetura, paisagismo e cidade — Yincorp';
const description = 'Revista de arquitetura da Yincorp sobre o Arbórea Ibirapuera, Jacobsen Arquitetura, Orsini Paisagismo, Grupo Bueno Netto e o Parque Ibirapuera.';
const site = 'https://www.yincorp.com.br';
const assetPath = edition.preview;
const sharedPath = '/canva/architecture-collection/';
const park = images[0];
const absolute = (path) => site + path;
const asset = (file) => assetPath + file;
const html = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const entityMap = Object.fromEntries(entities.map((e) => [e.id, e]));
const ref = (key) => '<a href="' + html(sources[key][1]) + '">' + html(sources[key][0]) + '</a>';
const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const raw = await readFile(new URL(id + '.txt', import.meta.url), 'utf8');
const chapters = raw.trim().split(/^# /m).filter(Boolean).map((entry) => {
  const [header, ...lines] = entry.trim().split('\n');
  const [slug, name, subtitle, refs] = header.split(' | ');
  return { slug, name, subtitle, refs: refs.split(' '), paragraphs: lines.join('\n').split(/\n+/).filter(Boolean) };
});
const cover = (picture, loading = 'lazy') =>
  '<img ' + (loading === 'eager' ? 'fetchpriority="high" srcset="' + asset('ibirapuera-mobile.webp') + ' 840w, ' + asset(picture.file) + ' 1680w" sizes="(max-width: 760px) 100vw, 62vw"' : '') +
  ' src="' + asset(picture.file) + '" width="' + picture.width + '" height="' + picture.height + '" loading="' + loading + '" decoding="async" alt="' + html(picture.alt) + '">';
const credit = (picture) => html(picture.caption) + ' <a href="' + html(picture.source) + '">' + html(picture.author) + '</a> · <a href="' + picture.licenseUrl + '">' + picture.license + '</a> · redimensionamento e WebP';
const collection = ['arborea-itaim', 'arborea-europa', 'arborea-jardins', id].map((key) => {
  const entry = entityMap[key];
  const href = key === id ? '#arborea' : sources[entry.sourceIds[0]][1];
  return '<li><a href="' + html(href) + '">' + html(entry.name) + '</a><p>' + html(entry.biography) + '</p><small>' + entry.credits.map((item) => html(entityMap[item].name)).join(' · ') + '</small></li>';
}).join('');
const timeline = [
  ['1975', 'Fundação da Bueno Netto', 'O primeiro endereço residencial do grupo fica no Itaim Bibi, segundo a memória institucional.'],
  ['1992', 'Associação Colmeia', 'O grupo relata articulação de melhorias urbanas na Vila Olímpia com agentes locais e o poder público.'],
  ['2008', 'Standard Building', 'Master Imobiliário de retrofit por um projeto comercial no Rio de Janeiro.'],
  ['2011', 'Rio Branco 115', 'Master Imobiliário de retrofit comercial no centro do Rio.'],
  ['2012', 'Benx', 'A incorporação passa a constituir unidade própria na reorganização da Bueno Netto.'],
  ['2013–14', 'Parque Global', 'Lançamento na Marginal Pinheiros em 2013 e prêmio de Soluções Urbanísticas em 2014.'],
  ['2015', 'Berrini One', 'Master Imobiliário de empreendimento comercial.'],
];
const insertions = {
  arborea: '<aside class="fact-sheet"><h3>Ficha do projeto</h3><dl><dt>Endereço</dt><dd>Av. República do Líbano, 2168 · Moema, São Paulo</dd><dt>Configuração</dt><dd>Uma torre · 25 unidades · 575 m² na ficha pública</dd><dt>Arquitetura e interiores</dt><dd>Jacobsen Arquitetura</dd><dt>Paisagismo</dt><dd>Orsini Paisagismo</dd></dl></aside>',
  benx: '<div class="timeline" aria-label="Linha do tempo">' + timeline.map(([year, label, detail]) => '<details><summary><span class="timeline-year">' + year + '</span><span>' + label + '</span></summary><p>' + detail + '</p></details>').join('') + '</div>',
  colecao: '<ul class="collection-list">' + collection + '</ul>',
  ibirapuera: '<div class="gallery" aria-label="Galeria de patrimônio">' + images.slice(1).map((picture) => '<figure><a data-zoom href="' + asset(picture.file) + '" aria-label="' + html('Ampliar: ' + picture.alt) + '">' + cover(picture) + '</a><figcaption>' + credit(picture) + '</figcaption></figure>').join('') + '</div>',
};
const knowledge = entities.map((entry) => {
  const connections = [...new Set([...entry.credits, ...entry.portfolio])];
  return '<details id="ent-' + entry.id + '" data-entity="' + entry.kind + '"><summary>' + html(entry.name) + '</summary><p>' + html(entry.biography) + '</p>' +
    (connections.length ? '<ul class="connections">' + connections.map((item) => '<li><a href="#ent-' + item + '">' + html(entityMap[item].name) + '</a></li>').join('') + '</ul>' : '') +
    '<p class="source-links">' + entry.sourceIds.map(ref).join(' · ') + '</p></details>';
}).join('');
const chaptersMarkup = chapters.map((chapter, index) =>
  '<section class="chapter" id="' + chapter.slug + '" aria-labelledby="heading-' + chapter.slug + '"><header><p class="eyebrow">Capítulo ' + roman[index] +
  '</p><h2 id="heading-' + chapter.slug + '">' + html(chapter.name) + '</h2><p class="subtitle">' + html(chapter.subtitle) + '</p></header><div class="body-copy">' +
  chapter.paragraphs.map((line) => line.startsWith('## ') ? '<h3>' + html(line.slice(3)) + '</h3>' : '<p>' + html(line) + '</p>').join('') +
  '</div>' + (insertions[chapter.slug] ?? '') + '<p class="source-links">Referências do capítulo · ' + chapter.refs.map(ref).join(' · ') + '</p></section>'
).join('');
const publicationUrl = absolute(edition.preview);
const graph = {
  '@context': 'https://schema.org', '@graph': [
    { '@type': 'Article', '@id': publicationUrl + '#edicao', headline: 'Arbórea Ibirapuera', description, inLanguage: 'pt-BR',
      author: { '@id': publicationUrl + '#redacao' }, about: { '@id': publicationUrl + '#projeto' }, image: { '@id': publicationUrl + '#parque-imagem' },
      citation: [...new Set(chapters.flatMap((chapter) => chapter.refs))].map((key) => sources[key][1]),
      ...(edition.published ? { datePublished: edition.published } : {}) },
    { '@type': 'Organization', '@id': publicationUrl + '#redacao', name: 'Redação Yincorp', url: site },
    { '@type': 'ApartmentComplex', '@id': publicationUrl + '#projeto', name: 'Arbórea Ibirapuera', address: { '@type': 'PostalAddress', streetAddress: 'Av. República do Líbano, 2168', addressLocality: 'São Paulo', addressRegion: 'SP', addressCountry: 'BR' }, numberOfAccommodationUnits: 25 },
    { '@type': 'Place', name: 'Parque Ibirapuera', sameAs: sources.park[1] },
    { '@type': 'Organization', name: 'Jacobsen Arquitetura', url: 'https://jacobsenarquitetura.com/' },
    { '@type': 'Organization', name: 'Orsini Paisagismo', url: sources.orsini[1] },
    { '@type': 'Person', name: 'Tania Ginjas', sameAs: sources.spa[1] },
    { '@type': 'ImageObject', '@id': publicationUrl + '#parque-imagem', contentUrl: absolute(asset(park.file)), caption: park.caption, creditText: park.author, license: park.licenseUrl },
  ],
};
for (const picture of images) await access(new URL(picture.file, output));
await writeFile(new URL('index.html', output), `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,follow">
<meta name="description" content="${description}">
<title>${title}</title>
<meta property="og:type" content="article"><meta property="og:locale" content="pt_BR">
<meta property="og:title" content="${title}"><meta property="og:description" content="${description}">
<meta property="og:url" content="${publicationUrl}"><meta property="og:image" content="${absolute(asset(park.file))}">
<meta property="og:image:alt" content="${html(park.alt)}">
<link rel="stylesheet" href="${sharedPath + 'edition.css'}">
<script type="application/ld+json">${JSON.stringify(graph).replace(/</g, '\\u003c')}</script>
<script type="module" src="${sharedPath + 'experience.js'}"></script>
</head>
<body>
<a class="skip" href="#edicao">Ir para a matéria</a>
<header class="masthead">
<a class="wordmark" href="/canva" aria-label="Yincorp Canva"><strong>Y</strong><span>Yincorp<br>Architecture Collection</span></a>
<nav aria-label="Modos de navegação"><a href="#cinema" data-mode="cinema">Cinema</a><a href="#edicao" data-mode="editorial">Editorial</a><a href="#explore" data-mode="explore">Explore</a></nav>
<div class="reading-progress" aria-hidden="true"></div>
</header>
<main id="edicao" data-edition="${id}" tabindex="-1">
<article aria-labelledby="cover-title">
<header id="cinema" class="cover">
<div class="cover-copy"><p class="eyebrow">São Paulo · Moema</p>
<h1 id="cover-title">Arbórea<br><em>Ibirapuera</em></h1>
<p class="deck">Arquitetura, paisagem e vida urbana na borda de um parque público.</p>
<p class="byline">Redação Yincorp · Edição ${edition.number}</p>
<a class="cover-link" href="#capitulos">Ler a edição <span aria-hidden="true">↓</span></a></div>
<figure class="cover-visual">${cover(park, 'eager')}<figcaption>${credit(park)}</figcaption></figure>
</header>
<div class="edition-layout"><nav class="chapter-nav" id="capitulos" aria-label="Capítulos"><p class="eyebrow">Nesta edição</p><ol>${chapters.map((chapter, index) => '<li><a href="#' + chapter.slug + '"><span aria-hidden="true">' + roman[index] + '</span>' + html(chapter.name) + '</a></li>').join('')}</ol></nav>
<div class="chapters">${chaptersMarkup}</div></div>
<section class="explore" id="explore"><p class="eyebrow">Explore</p><h2>As relações por trás da obra</h2><p>Abra um perfil para percorrer os projetos, autores e documentos desta edição.</p>
<div class="entity-network" data-network aria-hidden="true" hidden></div>
<div class="entity-filter" hidden><label for="entity-kind">Filtrar perfis</label><select id="entity-kind"><option value="">Todos</option>${[...new Set(entities.map((entry) => entry.kind))].map((kind) => '<option value="' + kind + '">' + kind.charAt(0).toUpperCase() + kind.slice(1) + '</option>').join('')}</select></div>
<div class="entity-graph">${knowledge}</div></section>
<section class="bibliography" aria-labelledby="bibliography-title"><h2 id="bibliography-title">Fontes e acervo</h2><p>Consulta em <time datetime="${consulted}">26 de novembro de 2026</time>.</p><ol>${Object.keys(sources).map((key) => '<li>' + ref(key) + ' <span>' + html(sources[key][2]) + '</span></li>').join('')}</ol></section>
<section class="closing" aria-labelledby="contact-title"><h2 id="contact-title">Arbórea Ibirapuera</h2><a class="contact-link" data-contact href="https://wa.me/5511992976368">Entre em contato <span aria-hidden="true">↗</span></a></section>
</article>
</main>
<footer class="edition-footer"><a href="/" aria-label="Yincorp, início"><strong>Y</strong> Yincorp</a><p>Architecture Collection é uma iniciativa editorial independente da Yincorp.</p></footer>
<dialog class="zoom-dialog" aria-label="Imagem ampliada"><button type="button" data-close>Fechar <span aria-hidden="true">×</span></button><figure></figure></dialog>
</body></html>\n`);
