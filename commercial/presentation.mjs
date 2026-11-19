const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const decimal = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 });
const period = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });

const day = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });

const formatCents = cents => currency.format(cents / 100);
const formatPeriod = month => period.format(new Date(month + '-01T00:00:00Z'));

function formatDueDate(date) {
  if (!date) return 'Não informado';
  return date.length === 10 ? day.format(new Date(date)) : formatPeriod(date);
}

function element(tag, value) {
  const node = document.createElement(tag);
  if (value !== undefined) node.textContent = value;
  return node;
}

function paymentTable(stages) {
  const table = element('table');
  table.append(element('caption', 'Fluxo de pagamento da tabela histórica'));
  const heading = table.createTHead().insertRow();
  for (const label of ['Etapa', 'Primeiro vencimento', 'Parcelas', 'Valor por parcela']) {
    const cell = element('th', label);
    cell.scope = 'col';
    heading.append(cell);
  }
  const body = table.createTBody();
  for (const stage of stages) {
    const row = body.insertRow();
    const label = element('th', stage.label);
    label.scope = 'row';
    row.append(label);
    for (const value of [formatDueDate(stage.firstDue), stage.count, formatCents(stage.amountCents)]) {
      row.append(element('td', value));
    }
  }
  return table;
}

async function initializeFinance(root) {
  const selector = root.querySelector('select');
  const output = root.querySelector('[data-financial-breakdown]');

  try {
    const response = await fetch(root.dataset.units);
    if (!response.ok) throw new Error('Tabela indisponível');
    const data = await response.json();
    const units = new Map(data.units.map(unit => [unit.id, unit]));
    selector.replaceChildren(...data.units.map(unit => new Option(unit.id, unit.id)));

    function render() {
      const unit = units.get(selector.value);
      const total = element('strong', formatCents(unit.totalCents));
      const details = [
        unit.area == null ? null : decimal.format(unit.area) + ' m²',
        unit.coveredArea == null ? null : decimal.format(unit.coveredArea) + ' m² de área coberta',
        unit.totalArea == null || (unit.coveredArea == null && unit.area != null) ? null : decimal.format(unit.totalArea) + ' m² de área total',
        unit.terraceArea == null ? null : decimal.format(unit.terraceArea) + ' m² de terraço',
        unit.typology ?? (unit.bedrooms == null ? null : unit.bedrooms + ' dorm.'),
        unit.suites == null ? null : unit.suites + ' suítes',
        unit.parking == null ? null : unit.parking + (unit.parking === 1 ? ' vaga' : ' vagas')
      ].filter(Boolean);
      const overview = element('div');
      overview.className = 'commercial-price';
      overview.append(element('span', 'Preço total · ' + unit.id), total, element('span', details.join(' · ')));
      const table = element('div');
      table.className = 'commercial-table';
      table.tabIndex = 0;
      table.setAttribute('role', 'region');
      table.setAttribute('aria-label', 'Parcelas por etapa');
      if (unit.valuationCents != null) overview.append(element('span', 'Avaliação indicada no PDF: ' + formatCents(unit.valuationCents)));
      if (unit.listCents != null) {
        overview.append(element('span', 'Preço de tabela: ' + formatCents(unit.listCents) + ' · Desconto: ' + formatCents(unit.discountCents)));
      }
      if (unit.stages?.length) table.append(paymentTable(unit.stages));
      const payment = unit.stages?.length ? table : element('p', 'A tabela de referência informa o preço, sem detalhar as parcelas. Consulte a Yincorp sobre as condições de pagamento.');
      output.replaceChildren(overview, payment, element('p', 'Referência: ' + formatPeriod(data.reference) + ' · ' + data.source + (unit.sourcePage == null ? '.' : ', p. ' + unit.sourcePage + '.')));
      if (unit.financingReference) {
        output.append(element('p', 'Financiamento indicado separadamente no PDF em ' + formatDueDate(unit.financingReference.date) + ': ' + formatCents(unit.financingReference.amountCents) + '.'));
      }
      if (unit.financingSimulation) {
        const { method, count, firstCents, lastCents } = unit.financingSimulation;
        output.append(element('p', 'Simulação histórica do PDF: ' + method + ' · ' + count + ' parcelas · primeira de ' + formatCents(firstCents) + ' · última de ' + formatCents(lastCents) + '.'));
      }
      if (unit.alternativePriceCents != null) output.append(element('p', 'Preço associativo na tabela histórica: ' + formatCents(unit.alternativePriceCents) + '.'));
      if (unit.sourceStatus) output.append(element('p', 'Situação registrada na data da tabela: ' + unit.sourceStatus + '.'));
      if (data.notes) output.append(element('p', data.notes));
      if (unit.roundingCents) {
        output.append(element('p', 'Diferença de arredondamento na fonte: ' + formatCents(Math.abs(unit.roundingCents)) + '.'));
      }
    }

    render();
    selector.addEventListener('change', render);
    selector.disabled = false;
  } catch {
    selector.replaceChildren(new Option('Tabela indisponível'));
    output.replaceChildren(element('p', 'Não foi possível carregar os valores. Consulte a equipe Yincorp.'));
  }
}

for (const root of document.querySelectorAll('.commercial-finance[data-units]')) initializeFinance(root);
