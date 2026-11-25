const money = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
const layoutNames = ['71,70 m² · padrão · 2 dormitórios, 1 suíte','71,70 m² · opção · 2 suítes','88,80 m² · padrão · 2 suítes','88,80 m² · opção · 3 dormitórios, 1 suíte','111,60 m² · padrão · 3 suítes','127,70 m² · padrão · 3 suítes','127,70 m² · opção · 4 dormitórios, 2 suítes'];
const examples = [
  {label:'Torre A · 6º andar · final 1', area:127.7, price:2205545, stages:[88222,44111,17412,51463,110277], principal:1433604, scheduled:1460939, page:4},
  {label:'Torre A · 6º andar · final 2', area:127.7, price:2249656, stages:[89986,44993,17760,52492,112483], principal:1462276, scheduled:1490158, page:4},
  {label:'Torre B · 6º andar · final 1 adaptável',area:111.6,price:1927477,stages:[77099,38550,15217,44974,96374],principal:1252860,scheduled:1276749,page:6},
  {label:'Torre B · 20º andar · final 3',area:88.8,price:1641249,stages:[65650,32825,12957,38296,82062],principal:1066812,scheduled:1087153,page:6}
];
const stages = [['Entrada',1],['Iniciais · jan. e fev./2027',2],['Mensais · desde mar./2027',19],['Semestrais · desde mai./2027',3],['Parcela única · out./2028',1]];
const $ = id => document.getElementById(id);
layoutNames.forEach((name,i)=>$('layouts').add(new Option(name,i)));
function showLayout(){
  const i = Number($('layouts').value);
  $('layout').src = 'planta-' + (46+i) + '.webp';
  $('layout').alt = 'Planta ' + layoutNames[i];
  $('label').textContent = 'Book, p. ' + (46+i) + ' · ' + layoutNames[i];
}
$('layouts').onchange = showLayout;
showLayout();
examples.forEach((unit,i)=>$('units').add(new Option(unit.label,i)));
function showUnit(){
  const u = examples[Number($('units').value)];
  $('price').textContent = money.format(u.price) + ' · ' + money.format(u.price/u.area) + '/m²';
  const rows = stages.map(([label,count],i)=>[label,count,u.stages[i]]);
  const values = [...rows,['Principal do financiamento',1,u.principal]];
  $('flow').replaceChildren(...values.map(([label,count,amount])=>{
    const row=document.createElement('div');
    row.className='bar';
    const text=document.createElement('span');
    text.textContent = label + (count>1?' · '+count+' × ':' · ') + money.format(amount);
    const progress=document.createElement('progress');
    progress.max=u.price;
    progress.value=count*amount;
    progress.setAttribute('aria-label',label+' · '+money.format(count*amount));
    row.append(text,progress);
    return row;
  }));
  const delta=values.reduce((sum,[,count,amount])=>sum+count*amount,0)-u.price;
  $('check').textContent='Tabela, p. '+u.page+' · Financiamento indicado em dez./2028 '+money.format(u.scheduled)+'. A soma do fluxo nominal com o principal difere do preço publicado em '+money.format(Math.abs(delta))+' com os valores exibidos na tabela.';
}
$('units').onchange=showUnit;
showUnit();

const response = await fetch('tratamentos.json');
if (!response.ok) throw new Error('Laboratório indisponível.');
const treatments = await response.json();
const make = (tag,text) => {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  return node;
};
function picture(src, alt) {
  const img = make('img');
  img.src = src;
  img.alt = alt;
  img.loading = 'lazy';
  img.width = 1200;
  img.height = 900;
  return img;
}
for (const item of treatments) {
  if (item.hero) {
    $('cover').src = item.after;
    $('cover').alt = item.name + ' · interpretação ilustrativa gerada com IA';
  }
  if (item.narrative) {
    const figure = make('figure');
    figure.append(picture(item.after,item.name),make('figcaption',item.name+' · Visualização ilustrativa gerada com IA'));
    $('scenes').append(figure);
  }
  const section = make('details');
  section.open = Boolean(item.hero);
  const comparison = make('div');
  comparison.className = 'comparison-view';
  comparison.append(picture(item.before,item.name+' original'),picture(item.after,item.name+' tratada'));
  const slider = make('input');
  slider.type = 'range';
  slider.value = 50;
  slider.setAttribute('aria-label','Proporção da imagem tratada de '+item.name);
  slider.oninput = () => comparison.style.setProperty('--split',slider.value+'%');
  const links = make('p');
  for (const [name,url] of [['Ver original',item.before],['Ver tratamento',item.after]]){
    const link = make('a',name);
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener';
    if (links.childElementCount) links.append(' · ');
    links.append(link);
  }
  section.append(make('summary',item.name+' · '+item.command+' · Book, p. '+item.page),comparison,slider,links,
    make('p',item.review),make('p',item.prompt));
  $('lab').append(section);
}
const day = treatments.find(item=>item.day);
const night = treatments.find(item=>item.hero);
if (day && night) {
  const control = make('button','Ver fachada de dia');
  let daytime = false;
  control.onclick = () => {
    daytime = !daytime;
    $('cover').src = daytime ? day.after : night.after;
    control.textContent = daytime ? 'Ver fachada ao anoitecer' : 'Ver fachada de dia';
  };
  document.querySelector('.hero div').append(' ',control);
}
