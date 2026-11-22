import { html as escapeHtml } from '../.portal-shared/model.js';

const sectionIds = ['arquitetura', 'lazer', 'plantas'];

export function renderOruloEditorial(project, id, { title, book, table, reference }, resources) {
  const directory = '/commercial/orulo/' + id;
  const chapters = book ? project.sections.map(([heading, figures], index) => {
    const slug = sectionIds[index];
    const plan = slug === 'plantas';
    const gallery = figures.map(([page, caption]) => {
      const asset = directory + '/book-' + page;
      const source = escapeHtml(book + '#page=' + page);
      return `<figure>
        <a href="${asset}.webp"${plan ? ' data-commercial-plan' : ''} aria-label="${escapeHtml('Ampliar ' + caption)}">
          <img src="${asset}${plan ? '-thumb' : ''}.webp" alt="${escapeHtml(caption)}" loading="lazy" decoding="async">
          ${plan ? '<span aria-hidden="true">Ampliar planta ↗</span>' : ''}
        </a>
        <figcaption>${escapeHtml(caption)} · <a href="${source}" target="_blank" rel="noopener">Book, p. ${page}</a></figcaption>
      </figure>`;
    }).join('');
    return { slug, heading, html: `<section class="commercial-chapter commercial-chapter--${slug}" id="book-${slug}">
      <h3>${heading}</h3><div class="commercial-gallery">${gallery}</div>
    </section>` };
  }) : [];
  const finance = table && project.hasUnits !== false ? `<section class="commercial-finance" id="book-unidades" aria-labelledby="commercial-finance-title" data-units="${directory}/units.json" data-source-url="${escapeHtml(table)}">
    <h3 id="commercial-finance-title">Consulta de unidades</h3>
    <p>Referência de ${escapeHtml(reference)}. Confirme preços, disponibilidade e condições atuais com a Yincorp.</p>
    <label for="commercial-unit">Unidade da tabela de referência</label>
    <select id="commercial-unit" disabled><option>Carregando unidades.</option></select>
    <div data-financial-breakdown aria-live="polite"></div>
    <p><a href="${escapeHtml(table)}" target="_blank" rel="noopener">Abrir tabela comercial original em PDF ↗</a></p>
  </section>` : '';
  const navigation = chapters.map(({ slug, heading }) => `<a href="#book-${slug}">${heading}</a>`).join('');
  return `<section class="commercial-book" aria-labelledby="commercial-book-title" data-commercial-editorial>
    <h2 id="commercial-book-title">${escapeHtml(title)} em detalhes</h2>
    <p>${escapeHtml(project.description)}</p>
    <nav class="commercial-chapter-nav" aria-label="Material do empreendimento">${navigation}${finance ? '<a href="#book-unidades">Unidades</a>' : ''}${resources ? '<a href="#book-documentos">Documentos</a>' : ''}</nav>
    ${chapters.map(({ html }) => html).join('')}
    ${finance}
    ${resources ? `<section class="commercial-sources" id="book-documentos" aria-label="Documentos do empreendimento"><h3>Documentos originais</h3>${resources}</section>` : ''}
  </section>`;
}
