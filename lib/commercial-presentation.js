import { html as escapeHtml } from '../.portal-shared/model.js';

const presentations = new Map([
  ['/sp/sao-paulo/empreendimento/o-parque-cipo--orulo-47763', {
    key: 'o-parque-cipo',
    title: 'O Parque Cipó',
    developer: 'Gamaro',
    description: 'Apartamentos de 104,60 m² com três suítes, terraço, lavabo e duas vagas. O book apresenta piscina de borda infinita, espaço gourmet e áreas de fitness.',
    figures: [
      ['fachada', 'Perspectiva da torre', 17],
      ['piscina', 'Piscina de borda infinita', 8],
      ['parque', 'Perspectiva aérea do parque', 3],
      ['planta', 'Planta ilustrativa de três suítes', 16]
    ]
  }],
  ['/es/linhares/empreendimento/haus-linhares--orulo-82830', {
    key: 'haus-linhares',
    title: 'Haus Linhares',
    developer: 'Oktō',
    description: 'Studios e apartamentos de um quarto em Linhares. Veja as perspectivas do book, as plantas e as condições históricas dos apartamentos e das vagas avulsas.',
    figures: [
      ['fachada', 'Perspectiva da fachada', 3],
      ['piscina', 'Piscina', 7],
      ['area-comum', 'Perspectiva de área comum', 9],
      ['plantas-22', 'Plantas ilustrativas', 22],
      ['plantas-23', 'Plantas ilustrativas', 23],
      ['plantas-24', 'Plantas ilustrativas', 24],
      ['plantas-25', 'Planta ilustrativa', 25]
    ]
  }]
]);

export function enrichCommercialPresentation(body, path) {
  const project = presentations.get(path);
  if (!project || typeof body !== 'string' || !body.startsWith('<!doctype html>')) return body;

  const main = /<main\b[^>]*>/i.exec(body);
  if (!main || !body.includes('</body>')) return body;

  const { key, title, developer, description, figures } = project;
  const assetPath = '/commercial/' + key + '/';
  const gallery = figures.map(([image, caption, page]) => {
    const url = assetPath + image + '.webp';
    return `<figure><a href="${url}"><img src="${url}" alt="${escapeHtml(caption)}" loading="lazy" decoding="async"></a><figcaption>${escapeHtml(caption)} · book p. ${page}</figcaption></figure>`;
  }).join('');

  const section = `<section class="commercial-book" aria-labelledby="commercial-book-title">
    <p class="commercial-kicker">Apresentação comercial · ${escapeHtml(developer)}</p>
    <h2 id="commercial-book-title">${escapeHtml(title)} em detalhes</h2>
    <p>${escapeHtml(description)}</p>
    <div class="commercial-gallery">${gallery}</div>
    <section class="commercial-finance" aria-labelledby="commercial-finance-title" data-units="${assetPath}units.json">
      <h3 id="commercial-finance-title">Tabela financeira por unidade</h3>
      <p>Selecione uma unidade para consultar o preço e o fluxo de pagamento da tabela histórica. Consulte a Yincorp para confirmar valores e disponibilidade atuais.</p>
      <label for="commercial-unit">Unidade da tabela histórica</label>
      <select id="commercial-unit" disabled><option>Carregando unidades…</option></select>
      <div data-financial-breakdown aria-live="polite"></div>
    </section>
  </section>`;
  const assets = '<link rel="stylesheet" href="/commercial/presentation.css"><script type="module" src="/commercial/presentation.mjs"></script>';
  const insertion = main.index + main[0].length;
  return body.slice(0, insertion) + section + body.slice(insertion).replace('</body>', assets + '</body>');
}
