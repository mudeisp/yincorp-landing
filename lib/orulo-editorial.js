import { html as escapeHtml } from '../.portal-shared/model.js';

const sections = [
  ['arquitetura', 'Arquitetura'],
  ['lazer', 'Lazer e áreas comuns'],
  ['plantas', 'Plantas']
];

function renderFigure({ asset, thumbnail, caption, page, source }, kind) {
  const plan = kind === 'plantas';
  const credit = source && Number.isInteger(page)
    ? `<a href="${escapeHtml(source.split('#')[0] + '#page=' + page)}" target="_blank" rel="noopener">Book, p. ${page}</a>`
    : escapeHtml(Number.isInteger(page) ? 'Book, p. ' + page : page ?? '');
  return `<figure>
    <a href="${escapeHtml(asset)}" data-commercial-image${plan ? ' data-commercial-plan' : ''} aria-label="${escapeHtml('Ampliar ' + caption)}">
      <img src="${escapeHtml(thumbnail ?? asset)}" alt="${escapeHtml(caption)}" loading="lazy" decoding="async">
      ${plan ? '<span aria-hidden="true">Ampliar planta ↗</span>' : ''}
    </a>
    <figcaption>${escapeHtml(caption)}${credit ? ' · ' + credit : ''}</figcaption>
  </figure>`;
}

export function renderCommercialStory({ title, description, galleries, unitsUrl, table, reference, financeNote, resources, contactUrl }) {
  const chapters = sections.flatMap(([id, heading]) => {
    const figures = galleries[id];
    if (!figures?.length) return [];
    return [{ id, heading, html: `<section class="commercial-chapter commercial-chapter--${id}" id="book-${id}" aria-labelledby="book-heading-${id}">
      <h3 id="book-heading-${id}">${heading}</h3>
      <div class="commercial-gallery">${figures.map(figure => renderFigure(figure, id)).join('')}</div>
    </section>` }];
  });
  if (unitsUrl) chapters.push({ id: 'unidades', heading: 'Unidades', html: `<section class="commercial-finance" id="book-unidades" aria-labelledby="commercial-finance-title" data-units="${escapeHtml(unitsUrl)}"${table ? ` data-source-url="${escapeHtml(table)}"` : ''}>
    <h3 id="commercial-finance-title">Escolha sua unidade</h3>
    <p>${reference ? 'Referência de ' + escapeHtml(reference) + '. ' : ''}Confirme preços, disponibilidade e condições atuais com a Yincorp.</p>
    ${financeNote ? '<p>' + escapeHtml(financeNote) + '</p>' : ''}
    <div class="commercial-selection">
      <label for="commercial-unit">Unidade ou faixa da tabela de referência</label>
      <select id="commercial-unit" disabled><option>Carregando unidades…</option></select>
      <div class="commercial-comparison" hidden>
        <label for="commercial-compare">Comparar com outra unidade ou faixa</label>
        <select id="commercial-compare"></select>
        <div data-commercial-comparison aria-live="polite"></div>
      </div>
      <a data-commercial-share hidden>Link desta seleção ↗</a>
    </div>
    <div data-financial-breakdown aria-live="polite"></div>
    ${table ? `<p><a href="${escapeHtml(table)}" target="_blank" rel="noopener">Abrir tabela comercial original em PDF ↗</a></p>` : ''}
    ${contactUrl ? `<a class="button primary commercial-contact" href="${contactUrl}">Confirmar com a Yincorp ↗</a>` : ''}
  </section>` });
  if (resources) chapters.push({ id: 'documentos', heading: 'Documentos', html: `<section class="commercial-sources" id="book-documentos" aria-labelledby="book-heading-documentos">
    <h3 id="book-heading-documentos">Documentos originais</h3>
    ${table && !unitsUrl ? '<p>Confirme preços, disponibilidade e condições atuais com a Yincorp.</p>' : ''}
    ${resources}
  </section>` });
  const navigation = chapters.map(({ id, heading }) => `<a href="#book-${id}">${heading}</a>`).join('');
  return `<section class="commercial-book" id="apresentacao-comercial" aria-labelledby="commercial-book-title" data-commercial-editorial>
    <header class="commercial-intro">
      <h2 id="commercial-book-title">${escapeHtml(title)} em detalhes</h2>
      ${description ? '<p>' + escapeHtml(description) + '</p>' : ''}
    </header>
    <nav class="commercial-chapter-nav" aria-label="Apresentação do empreendimento">${navigation}${contactUrl ? `<a href="${contactUrl}">Contato ↗</a>` : ''}</nav>
    ${chapters.map(({ html }) => html).join('')}
  </section>`;
}

export function oruloStory(project, id, { title, book, table, reference }) {
  const directory = '/commercial/orulo/' + id;
  const galleries = Object.fromEntries(sections.map(([kind], index) => [kind,
    (book ? project.sections[index]?.[1] ?? [] : []).map(([page, caption]) => ({
      page, caption, source: book, asset: directory + '/book-' + page + '.webp',
      thumbnail: kind === 'plantas' ? directory + '/book-' + page + '-thumb.webp' : null
    }))
  ]));
  return {
    title, description: project.description, galleries, table,
    reference: reference ?? project.reference, financeNote: project.financeNote,
    unitsUrl: project.hasUnits === false ? null : project.unitsUrl ?? (table ? directory + '/units.json' : null)
  };
}

export function legacyStory(project, { title, table, reference }) {
  if (!project) return { title, table, reference, galleries: {} };
  const directory = '/commercial/' + project.key + '/';
  const galleries = { arquitetura: [], lazer: [], plantas: [] };
  for (const [image, caption, page] of project.figures) {
    const label = image + ' ' + caption;
    const kind = /planta|configura/i.test(label) ? 'plantas'
      : /piscina|lazer|fitness|área comum|jardim|gourmet/i.test(label) ? 'lazer' : 'arquitetura';
    galleries[kind].push({
      asset: image.startsWith('/') ? image : directory + image + '.webp',
      caption, page, source: /\.pdf(?:[?#]|$)/i.test(project.book ?? '') ? project.book : null
    });
  }
  return { title, description: project.description, galleries, table, reference, unitsUrl: directory + 'units.json' };
}
