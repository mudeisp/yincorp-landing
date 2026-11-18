import {brl, decimal} from '/guilherme.vita/model.mjs';
import projects from './projects.mjs';

const $ = id => document.getElementById(id);
const missing = 'A confirmar';
const initial = new URL(location.href).searchParams;
const chosen = Object.fromEntries(projects.map(p => [
  p.key, p.units.find(u => u.id === initial.get(p.key)) ?? p.units.find(u => u.id === p.preferred)
]));
const live = ['www.yincorp.com.br', 'yincorp.com.br'].includes(location.hostname);

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function link(text, href) {
  const node = el('a', text);
  node.href = href;
  return node;
}
const money = value => value == null ? missing : brl(value);
const unitLabel = u => u.id + ' · ' + decimal(u.area) + ' m²';
const summary = () => projects.map(p => p.name + ' · ' + unitLabel(chosen[p.key]) + ' · ' + brl(chosen[p.key].total)).join('\n');

function buildCards() {
  projects.forEach(p => {
    const card = el('article', undefined, 'selection-card');
    const label = el('label', 'Unidade');
    const select = el('select');
    label.htmlFor = select.id = 'select-' + p.key;
    p.units.forEach(u => {
      const option = el('option', unitLabel(u) + ' · ' + brl(u.total) + (u.status === 'Reservada' ? ' · Reservada' : ''));
      option.value = u.id;
      select.append(option);
    });
    select.value = chosen[p.key].id;
    select.addEventListener('change', () => {
      chosen[p.key] = p.units.find(u => u.id === select.value);
      render();
    });
    const price = el('p', undefined, 'selection-price');
    const meta = el('p', undefined, 'selection-meta');
    price.id = 'price-' + p.key;
    meta.id = 'meta-' + p.key;
    card.append(el('p', p.bairro, 'eyebrow'), el('h3', p.name), label, select, price, meta, link('Plantas e lazer ↓', '#projeto-' + p.key));
    $('selection-cards').append(card);
  });
}

function render() {
  const url = new URL(location.href);
  projects.forEach(p => {
    const u = chosen[p.key];
    $('price-' + p.key).textContent = brl(u.total);
    $('meta-' + p.key).textContent = decimal(u.area) + ' m² · ' + brl(u.total / u.area) + ' / m²';
    url.searchParams.set(p.key, u.id);
  });
  history.replaceState(null, '', url.pathname + url.search + url.hash);

  const rows = [
    ['Unidade', (_, u) => u.id],
    ['Bairro', p => p.bairro],
    ['Tipo / uso', (_, u) => [u.type, u.cls].filter(Boolean).join(' · ') || missing],
    ['Área', (_, u) => decimal(u.area) + ' m²'],
    ['Vagas', (_, u) => u.v ?? missing],
    ['Preço de referência', (_, u) => brl(u.total)],
    ['Preço por m²', (_, u) => brl(u.total / u.area)],
    ['Preço associativo (011)', (_, u) => u.assoc ? brl(u.assoc) : '—'],
    ['Ato / sinal', (_, u) => money(u.stages?.[0][2])],
    ['Entrega / situação', p => p.delivery],
    ['Status informado na tabela', (_, u) => u.status ?? missing]
  ];
  $('compare-body').replaceChildren(...rows.map(([name, value]) => {
    const tr = el('tr', undefined, name === 'Preço de referência' ? 'price-row' : undefined);
    const label = el('th', name);
    label.scope = 'row';
    tr.append(label, ...projects.map(p => el('td', value(p, chosen[p.key]))));
    return tr;
  }));

  $('payments').replaceChildren(...projects.map(p => {
    const u = chosen[p.key];
    const panel = el('article', undefined, 'payment-panel');
    panel.append(el('h3', p.name), el('p', unitLabel(u), 'payment-selection'));
    const list = el('ul', undefined, 'payment-list');
    const stages = u.stages ?? [[u.assoc ? 'Tabela direta' : 'Valor final', 1, u.total]];
    const items = [...stages];
    if (u.assoc) items.push(['Preço associativo sem correção', 1, u.assoc]);
    if (u.original) items.push(['Valor sem desconto', 1, u.original]);
    items.forEach(([name, count, each]) => {
      const li = el('li');
      li.append(el('span', name), el('strong', (count > 1 ? count + ' × ' : '') + brl(each)));
      list.append(li);
    });
    panel.append(list);
    if (u.stages) {
      const sum = u.stages.reduce((total, [, count, each]) => total + count * each, 0);
      panel.append(el('p', 'Preço da tabela ' + brl(u.total) + ' · Soma nominal ' + brl(sum), 'payment-note'));
    }
    panel.append(el('p', p.note, 'payment-note'));
    const pdf = link('Conferir tabela ↗', '/aruan.bufani/pdfs/' + p.key + '-tabela.pdf' + (u.page ? '#page=' + u.page : ''));
    pdf.target = '_blank';
    pdf.rel = 'noopener';
    panel.append(pdf);
    return panel;
  }));

  $('contact-summary').textContent = projects.map(p => p.name + ' · ' + chosen[p.key].id).join(' / ');
  const whatsapp = $('whatsapp');
  if (live && window.YntWhatsAppContact?.url) {
    whatsapp.href = window.YntWhatsAppContact.url('Olá, sou Aruan. Gostaria de confirmar as condições destas unidades:\n\n' + summary() + '\n' + url.href);
    whatsapp.removeAttribute('aria-disabled');
  }
}

const heading = el('tr');
['Referência', ...projects.map(p => p.name)].forEach(name => {
  const th = el('th', name);
  th.scope = 'col';
  heading.append(th);
});
$('compare-head').append(heading);
buildCards();
render();
window.addEventListener('load', render, {once: true});

$('share').addEventListener('click', async () => {
  try {
    if (navigator.share) await navigator.share({title: 'Aruan Bufani · Yincorp', url: location.href});
    else {
      await navigator.clipboard.writeText(location.href);
      $('share-feedback').textContent = 'Link copiado.';
    }
  } catch (error) {
    if (error.name !== 'AbortError') $('share-feedback').textContent = location.href;
  }
});
$('copy-summary').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(summary() + '\n' + location.href);
    $('copy-feedback').textContent = 'Resumo copiado.';
  } catch {
    $('copy-feedback').textContent = summary();
  }
});
$('whatsapp').addEventListener('click', event => {
  if (event.currentTarget.hasAttribute('aria-disabled')) event.preventDefault();
});
const gallery = $('gallery');
$('close-gallery').addEventListener('click', () => gallery.close());
document.querySelectorAll('[data-image]').forEach(button => button.addEventListener('click', () => {
  $('gallery-title').textContent = button.dataset.label;
  $('gallery-image').alt = button.dataset.label;
  $('gallery-image').src = button.dataset.image;
  gallery.showModal();
}));
