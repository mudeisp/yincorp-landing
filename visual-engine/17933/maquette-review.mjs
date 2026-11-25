const assets = [
  ['original-16.webp', 'Planta original do book · p. 16'],
  ['residence-maquette-referencia.webp', 'Maquette aprovada · Residence Brooklin'],
  ['maquette-a.webp', 'A · Maquete fotorrealista em perspectiva superior'],
  ['maquette-b.webp', 'B · Maquete axonométrica com luz natural'],
  ['maquette-c.webp', 'C · Maquete editorial em Travertino & Ouro'],
];

function grid(images) {
  const container = document.createElement('div');
  container.className = 'grid';
  for (const [src, label] of images) {
    const figure = document.createElement('figure');
    const link = document.createElement('a');
    const image = document.createElement('img');
    const caption = document.createElement('figcaption');
    image.src = link.href = src;
    image.alt = caption.textContent = label;
    image.loading = 'lazy';
    link.append(image);
    figure.append(link, caption);
    container.append(figure);
  }
  return container;
}

const archive = document.createElement('p');
const link = document.createElement('a');
link.href = 'rodada-anterior.html';
link.textContent = 'Ver a rodada anterior e os estudos aprovados';
archive.append(link);
document.getElementById('assets').append(grid(assets.slice(0, 2)), document.createElement('hr'), grid(assets.slice(2)), archive);
