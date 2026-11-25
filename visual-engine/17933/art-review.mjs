const studies = [
  {
    name: 'Academia · Cinema',
    asset: 'fitness',
    source: 'original-8.webp',
    pages: 'p. 8',
    note: 'Edição generativa da cena. Confira a posição, a quantidade e o desenho dos equipamentos contra o book.',
  },
  {
    name: 'Planta de 191 m² · Maquette',
    asset: 'maquette',
    source: 'original-16.webp',
    pages: 'p. 16',
    note: 'Modelo 3D com paredes traçadas sobre os trechos legíveis do book. O desenho original permanece no piso. Alturas e espessura da base são ilustrativas.',
  },
  {
    name: 'Implantação · Exploded',
    asset: 'implantacao',
    source: 'original-5.webp',
    pages: 'p. 5 · térreo',
    extraSource: 'original-6.webp',
    note: 'Projeção axonométrica de duas lajes tridimensionais, com os desenhos do térreo e do primeiro pavimento registrados na mesma escala. Espessuras e afastamento vertical são ilustrativos.',
  },
];

function element(tag, text) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  return node;
}

function link(path, text) {
  const anchor = element('a', text);
  anchor.href = path;
  return anchor;
}

function panel(study) {
  const article = element('article');
  const grid = element('div');
  grid.className = 'grid';
  const versions = [
    [study.source, 'Original do book · ' + study.pages],
    [study.asset + '.webp', 'Tratamento da versão 1.0'],
    [study.asset + '-v11.webp', 'Tratamento da versão 1.1'],
    [study.asset + '-proposta.webp', 'Nova proposta · aprovação pendente'],
  ];
  for (const [index, [path, label]] of versions.entries()) {
    const figure = element('figure');
    const anchor = link(path);
    const image = element('img');
    image.src = path;
    image.alt = study.name + ' · ' + label;
    image.loading = 'lazy';
    anchor.append(image);
    const caption = element('figcaption', label);
    if (index === 0 && study.extraSource) {
      caption.append(' · ', link(study.extraSource, 'Abrir p. 6 · primeiro pavimento'));
    }
    figure.append(anchor, caption);
    grid.append(figure);
  }
  article.append(element('h2', study.name), element('p', study.note), grid);
  return article;
}

document.getElementById('assets').replaceChildren(...studies.map(panel));
