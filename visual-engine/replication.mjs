const target = document.querySelector('#replication');
const response = await fetch('./manifest.json');
if (!response.ok) throw new Error('Inventário indisponível');
const manifest = await response.json();
function element(tag, value) {
  const node = document.createElement(tag);
  if (value) node.textContent = value;
  return node;
}

for (const asset of manifest.assets.filter(entry => entry.recipeId)) {
  const section = element('section');
  const state = asset.artisticApproval.status === 'approved' ? 'Aprovado pelo proprietário' : 'Aguardando avaliação artística';
  const technical = asset.technicalApproval.status === 'verified' ? 'Conferência técnica registrada' : 'Em revisão técnica';
  section.append(element('h2', asset.caption), element('p', `Book · p. ${asset.page} · ${technical} · ${state}`));
  const grid = element('div');
  grid.className = 'grid';
  for (const [label, url] of [['Original', asset.original], ['Tratamento', asset.asset]]) {
    const figure = element('figure');
    const link = element('a');
    const image = element('img');
    image.src = link.href = url;
    image.alt = `${asset.caption} · ${label}`;
    image.loading = 'lazy';
    link.append(image);
    figure.append(link, element('figcaption', label));
    grid.append(figure);
  }
  section.append(grid);
  if (asset.additionalOriginal) {
    const second = element('a', 'Abrir desenho do primeiro pavimento · p. 6');
    second.href = asset.additionalOriginal;
    section.append(second);
  }
  target.append(section);
}
for (const item of manifest.exclusions ?? []) target.append(element('p', item));
