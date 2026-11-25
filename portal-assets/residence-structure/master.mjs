const host = document.querySelector('[data-residence-master]');
if (host) await initialize(host);

async function initialize(host) {
  const template = host.querySelector('template');
  const root = host.shadowRoot || host.attachShadow({ mode: 'open' });
  if (template) root.append(template.content.cloneNode(true));
  const $ = id => root.getElementById(id);
  for (const anchor of root.querySelectorAll('a[href^="#"]')) {
    anchor.addEventListener('click', event => {
      const section = anchor.hash === '#plantas' && anchor.closest('.chapter')
        ? document.getElementById('plantas') : $(anchor.hash.slice(1));
      if (!section) return;
      event.preventDefault();
      if (section.tagName === 'DETAILS') section.open = true;
      section.scrollIntoView({ block: 'start' });
    });
  }

  const dialog = $('zoom');
  $('closezoom').onclick = () => dialog.close();
  root.querySelectorAll('#arquitetura img, #lazer img, #implantacao img, #plantas img').forEach(image => {
    image.tabIndex = 0;
    image.setAttribute('role', 'button');
    const open = () => {
      const enlarged = dialog.querySelector('img');
      enlarged.src = image.src;
      enlarged.alt = image.alt;
      dialog.showModal();
      $('closezoom').focus();
    };
    image.onclick = open;
    image.onkeydown = event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open();
      }
    };
  });

  const details = $('details');
  const response = await fetch('/commercial/orulo/17933/units.json').catch(() => null);
  if (!response?.ok) {
    details.textContent = 'Tabela temporariamente indisponível.';
    return;
  }
  const { units, reference } = await response.json();
  const money = value => (value / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const area = value => value.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const plan = $('plantas').querySelector('img')?.getAttribute('src');
  const thumb = unit => unit.totalArea === 191.3 && plan
    ? `<img src="${plan}" alt="Maquete ilustrativa de 191 m²">` : '';
  const priceArea = unit => money(Math.round(unit.totalCents / unit.totalArea));
  const a = $('a'), b = $('b');
  for (const select of [a,b]) {
    units.forEach((unit, index) => select.add(new Option(unit.id + ' · ' + area(unit.totalArea) + ' m²', index)));
  }
  b.selectedIndex = 1;
  function compare() {
    const first = units[a.value], second = units[b.value];
    for (const [unit, id] of [[first, 'ra'], [second, 'rb']]) {
      $(id).innerHTML = `<p><strong>${money(unit.totalCents)}</strong></p><p>${area(unit.totalArea)} m² · ${priceArea(unit)}/m²</p>`;
    }
    $('delta').textContent = 'Diferença absoluta: ' + money(Math.abs(first.totalCents - second.totalCents))
      + ' · ' + area(Math.abs(first.totalArea - second.totalArea)) + ' m²';
  }
  a.onchange = b.onchange = compare;
  compare();

  let filter = 'all', mode = 'list';
  function render() {
    const items = units.map((unit,index) => ({ unit,index })).filter(({unit}) => filter === 'all' || unit.totalArea === filter);
    $('rows').innerHTML = items.map(({unit,index}) => `<tr data-id="${index}"><td><div class="pa-unit">${thumb(unit)}${unit.id}</div></td><td>${area(unit.totalArea)} m²</td><td><strong>${money(unit.totalCents)}</strong></td><td>${priceArea(unit)}</td><td><button data-unit="${index}">Ver condições ›</button></td></tr>`).join('');
    $('pa-cards').innerHTML = items.map(({unit,index}) => `<article>${thumb(unit) || '<p>Maquete não disponível para esta tipologia.</p>'}<h3>${area(unit.totalArea)} m²</h3><p>${unit.id} · ${money(unit.totalCents)}</p><button data-unit="${index}">Ver condições</button></article>`).join('');
    $('pa-cards').hidden = mode === 'list';
    root.querySelector('#price-panel .scroll').hidden = mode !== 'list';
    details.style.display = 'none';
    root.querySelectorAll('#filters button').forEach(button => {
      const active = button.dataset.f === String(filter);
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    $('list-mode').setAttribute('aria-pressed', String(mode === 'list'));
    $('plan-mode').setAttribute('aria-pressed', String(mode === 'plan'));
  }
  for (const value of ['all', ...new Set(units.map(unit => unit.totalArea))]) {
    const button = document.createElement('button');
    button.dataset.f = value;
    button.textContent = value === 'all' ? 'Todas as unidades' : area(value) + ' m²';
    button.onclick = () => { filter = value; render(); };
    $('filters').append(button);
  }
  $('list-mode').onclick = () => { mode = 'list'; render(); };
  $('plan-mode').onclick = () => { mode = 'plan'; render(); };
  $('price-panel').addEventListener('click', event => {
    const button = event.target.closest('[data-unit]');
    const row = event.target.closest('tr[data-id]');
    if (!button && !row) return;
    const unit = units[Number(button?.dataset.unit ?? row?.dataset.id)];
    details.style.display = 'block';
    details.innerHTML = `<h3>Condições de aquisição · ${unit.id}</h3><div class="terms"><div class="term">Preço de tabela<b>${money(unit.totalCents)}</b></div><div class="term">Área total<b>${area(unit.totalArea)} m²</b></div><div class="term">Vagas<b>${unit.parking}</b></div></div><p>Referência ${reference}. Confirme a disponibilidade e as condições comerciais com a Yincorp.</p>`;
  });
  render();
}
