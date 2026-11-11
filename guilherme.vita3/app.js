const id = name => document.getElementById(name);
const units = JSON.parse(id('unit-data').textContent);
const select = id('unidade');
const currency = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
const areaFormat = new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:3});
const brl = value => currency.format(value);
const key = ([floor,final]) => floor + '-' + final;
const title = ([floor,final]) => floor + 'º andar · final ' + final;
for (const unit of units) select.add(new Option(title(unit)+' · '+brl(unit[8]),key(unit)));
const url = new URL(location.href);
const requestedUnit = url.searchParams.get('joaquim');
select.value = units.some(unit => key(unit) === requestedUnit) ? requestedUnit : '22-4';

function render() {
  const unit = units.find(unit => key(unit) === select.value);
  const [, , area, parking, ato, balance, total, discount, promo, direct, monthly, page] = unit;
  id('price').textContent=brl(promo);
  id('unit-meta').textContent=areaFormat.format(area)+' m² privativos · '+parking+' vagas · '+brl(promo/area)+'/m² promocional';
  id('unit-values').innerHTML=[['Preço de tabela',total],['Desconto informado',discount],['Valor promocional',promo]].map(([name,value])=>'<tr><th scope="row">'+name+'</th><td>'+brl(value)+'</td></tr>').join('');
  id('payment-values').innerHTML=[['Ato · nov/2026',brl(ato)],['Única FD · jan/2027',brl(balance)],['Saldo na opção de financiamento direto',brl(direct)],['Financiamento direto · início em jan/2027','180 × '+brl(monthly)+' (valor-base)']].map(([name,value])=>'<li><span>'+name+'</span><strong>'+value+'</strong></li>').join('');
  id('unit-source').href='tabela.pdf#page='+page;
  id('contact-summary').textContent='1385 Joaquim · '+title(unit)+' · '+brl(promo);
  url.searchParams.set('joaquim',key(unit));
  url.hash=location.hash;
  history.replaceState(null,'',url);
}
select.addEventListener('change',render);
render();
id('copy-summary').addEventListener('click',async () => {
  try {
    await navigator.clipboard.writeText(id('contact-summary').textContent);
    id('copy-feedback').textContent='Unidade copiada.';
  } catch {
    id('copy-feedback').textContent=id('contact-summary').textContent;
  }
});
for (const button of document.querySelectorAll('.gv-gallery button')) {
  button.addEventListener('click',() => {
    const image=button.querySelector('img');
    id('gallery-title').textContent='1385 Joaquim';
    id('gallery-image').src=image.src;
    id('gallery-image').alt=image.alt;
    id('gallery-caption').textContent=image.alt;
    id('gallery-original').href=image.src;
    id('gallery').showModal();
  });
}
id('close-gallery').addEventListener('click',()=>id('gallery').close());
