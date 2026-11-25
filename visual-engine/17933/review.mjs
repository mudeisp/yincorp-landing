const response = await fetch('./manifest.json');
const target = document.getElementById('assets');
function node(tag, text) {
  const element = document.createElement(tag);
  if (text) element.textContent = text;
  return element;
}
if (!response.ok) {
  target.textContent = 'Revisão indisponível.';
} else {
  const release = await response.json();
  target.replaceChildren(...release.assets.map(asset => {
    const article = node('article');
    const images = node('div');
    images.className = 'pair';
    const sources = asset.originals ?? [asset.original];
    for (const [label, src] of [
      ...sources.map((url, index) => ['Original · p. ' + (asset.sourcePages?.[index] ?? asset.page), url]),
      ['Versão gerada', asset.asset]
    ]) {
      const figure = node('figure');
      const img = node('img');
      img.src = src;
      img.alt = asset.caption + ' · ' + label;
      img.loading = 'lazy';
      figure.append(img, node('figcaption', label));
      images.append(figure);
    }
    const prompt = node('details');
    prompt.append(node('summary', asset.prompt ? 'Prompt executado · v' + asset.promptVersion : 'Tratamento determinístico · v' + asset.recipeVersion), node('p', asset.prompt ?? asset.review));
    article.append(node('h2', asset.caption), node('p', asset.category + ' · ' + asset.status),
      images, node('p', asset.review), prompt);
    return article;
  }));
}
