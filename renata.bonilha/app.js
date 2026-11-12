const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });
const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const canonical = 'https://www.yincorp.com.br/renata.bonilha';
const projects = [
  {
    key: 'haute', name: 'Haute Brooklin', short: 'Haute', neighborhood: 'Rua do Estilo Barroco · Brooklin', image: '/renata.bonilha/assets/haute-fachada.jpg',
    blurb: 'Arquitetura contemporânea e áreas de lazer distribuídas em três pavimentos, incluindo rooftop com piscina de 25 metros.',
    feature: '4 dormitórios · 2 ou 3 vagas', source: 'Tabela de venda · nov/2026',
    payment: 'Ato + parcela em 11/12/2026; a tabela também simula financiamento SAC em 300 parcelas. Correções e condições descritas no documento.',
    units: [
      ['F4-23','Final 4 · 23º andar',138.24,243574000,2,0,73072200,170501800],
      ['F4-28','Final 4 · 28º andar',138.24,254812000,2,0,76443600,178368400],
      ['F4-29','Final 4 · 29º andar',138.24,257321000,2,0,77196300,180124700],
      ['F3-08','Final 3 · 8º andar',138.24,224407000,2,0,67322100,157084900],
      ['F3-12','Final 3 · 12º andar',138.24,233084000,2,0,69925200,163158800],
      ['F3-15','Final 3 · 15º andar',138.24,240203000,2,0,72060900,168142100],
      ['F3-27','Final 3 · 27º andar',138.24,251925000,2,0,75577500,176347500],
      ['F3-28','Final 3 · 28º andar',138.24,264720000,2,0,79416000,185304000],
      ['F3-29','Final 3 · 29º andar',138.24,268962000,2,0,80688600,188273400],
      ['F1-28','Final 1 · 28º andar',185.11,356093000,3,1,106827900,249265100],
      ['F1-29','Final 1 · 29º andar',185.11,369518000,3,1,110855400,258662600],
      ['F2-04','Final 2 · 4º andar (garden)',199.59,305185000,3,1,91555500,213629500],
      ['F2-11','Final 2 · 11º andar',185.11,317039000,3,1,95111700,221927300],
      ['F2-18','Final 2 · 18º andar',185.11,351890000,3,1,105567000,246323000],
      ['F2-28','Final 2 · 28º andar',185.11,360045000,3,1,108013500,252031500],
    ].map(([id,label,area,price,parking,storage,down,balance])=>({id,label,area,price,parking,storage,down,balance,meta:`${parking} vagas${storage?' · depósito':''}`})),
  },
  {
    key: 'folhagem', name: 'O Parque · Folhagem', short: 'Folhagem', neighborhood: 'Brooklin · São Paulo', image: '/renata.bonilha/assets/folhagem-fachada.jpg',
    blurb: 'Torre residencial de 44 andares e 149 metros, integrada a um complexo com áreas verdes, serviços e lazer elevado.',
    feature: '167,04 m² ou 197,72 m² · áreas privativas', source: 'Tabela de venda · out/2026',
    payment: 'Tabela com ato, sinal e financiamento. A composição indicada é 12,5% + 12,5% + 75%; confira vencimentos e valores no PDF.',
    units: [
      ['T5-153','Torre 5 · unidade 153',197.72,468123471,4,373.27],
      ['T5-221','Torre 5 · unidade 221',197.72,431976839,4,370.74],
      ['T5-231','Torre 5 · unidade 231',197.72,431976839,4,375.53],
      ['T5-232','Torre 5 · unidade 232',167.04,371636373,4,325.94],
      ['T5-241','Torre 5 · unidade 241',197.72,431976839,4,372.76],
      ['T5-251','Torre 5 · unidade 251',197.72,431976839,4,373.83],
      ['T5-261','Torre 5 · unidade 261',197.72,431976839,4,375.53],
      ['T5-281','Torre 5 · unidade 281',197.72,431976839,4,365.95],
      ['T5-321','Torre 5 · unidade 321',197.72,471868373,4,375.46],
      ['T5-324','Torre 5 · unidade 324',167.04,397926234,4,326.20],
      ['T5-331','Torre 5 · unidade 331',197.72,471868373,4,374.04],
      ['T5-334','Torre 5 · unidade 334',167.04,397926234,4,323.59],
      ['T5-361','Torre 5 · unidade 361',197.72,471868373,4,375.46],
      ['T5-374','Torre 5 · unidade 374',167.04,397926234,4,321.92],
      ['T5-381','Torre 5 · unidade 381',197.72,491546875,4,365.14],
      ['T5-394','Torre 5 · unidade 394',167.04,419568474,4,321.92],
      ['T5-402','Torre 5 · unidade 402',167.04,426124619,4,321.92],
      ['T5-404','Torre 5 · unidade 404',167.04,419568474,4,321.92],
      ['T5-424','Torre 5 · unidade 424',167.04,419568474,4,340.59],
    ].map(([id,label,area,price,parking,totalArea])=>({id,label,area,price,totalArea,meta:`${number.format(area)} m² privativos · ${number.format(totalArea)} m² totais`})),
  },
  {
    key: 'petala', name: 'O Parque · Pétala', short: 'Pétala', neighborhood: 'Brooklin · São Paulo', image: '/renata.bonilha/assets/petala-lazer.jpg',
    blurb: 'Torre de O Parque, com jardins, piscinas, spa e ambientes de convivência compartilhados pelo complexo.',
    feature: 'Unidades de 163,62 m² a 197,72 m²', source: 'Tabela de venda · out/2026',
    payment: 'Tabela com ato, sinal e financiamento. A composição indicada é 12,5% + 12,5% + 75%; confira vencimentos e valores no PDF.',
    units: [
      ['T4-124','Torre 4 · unidade 124',167.04,358665577,4,323.17],
      ['T4-144','Torre 4 · unidade 144',167.04,374026596,4,333.01],
      ['T4-221','Torre 4 · unidade 221',197.72,431976839,4,366.96],
      ['T4-352','Torre 4 · unidade 352',163.62,393201210,3,311.88],
      ['T4-382','Torre 4 · unidade 382',163.62,393201210,3,318.42],
    ].map(([id,label,area,price,parking,totalArea])=>({id,label,area,price,totalArea,meta:`${number.format(area)} m² privativos · ${number.format(totalArea)} m² totais`})),
  },
  {
    key: 'infinity', name: 'Infinity Brooklin', short: 'Infinity', neighborhood: 'Rua Furnas, 55 · Brooklin', image: '/renata.bonilha/assets/infinity-fachada.jpg',
    blurb: 'Duas torres, halls privativos e áreas de lazer organizadas nos conceitos Welcome, Wellness, We Play e We Work.',
    feature: '88 m² a 187 m² · duas vagas nas unidades listadas', source: 'Tabela de venda · nov/2026',
    payment: 'Tabela de novembro/2026: ato e parcela de financiamento com vencimento em 31/12/2026. Valores de venda nominais.',
    units: [
      ['E1-02','East · Final 1 · 2º andar',187,351853000,2,70370600,281482400],
      ['E1-03','East · Final 1 · 3º andar',187,351853000,2,70370600,281482400],
      ['E1-06','East · Final 1 · 6º andar',187,369713100,2,73942600,295770500],
      ['E1-08','East · Final 1 · 8º andar',187,376905900,2,75381200,301524700],
      ['E2-02','East · Final 2 · 2º andar',187,365752000,2,73150400,292601600],
      ['E2-04','East · Final 2 · 4º andar',187,365752000,2,73150400,292601600],
      ['E2-10','East · Final 2 · 10º andar',187,384046500,2,76809300,307237200],
      ['W2-22','West · Final 2 · 22º andar',147,335972900,2,67194600,268778300],
      ['W3-08','West · Final 3 · 8º andar',143,269701800,2,53940400,215761400],
      ['W3-19','West · Final 3 · 19º andar',143,290959000,2,58191800,232767200],
      ['W3-20','West · Final 3 · 20º andar',143,290959000,2,58191800,232767200],
      ['W3-21','West · Final 3 · 21º andar',143,296273400,2,59254700,237018700],
      ['W3-22','West · Final 3 · 22º andar',143,296273400,2,59254700,237018700],
      ['W4-13','West · Final 4 · 13º andar',186,318382000,2,63676400,254705600],
      ['W4-19','West · Final 4 · 19º andar',160,318116000,2,63623200,254492800],
      ['W4-21','West · Final 4 · 21º andar',160,324062000,2,64812400,259249600],
      ['W4-22','West · Final 4 · 22º andar',160,324062000,2,64812400,259249600],
    ].map(([id,label,area,price,parking,down,balance])=>({id,label,area,price,parking,down,balance,meta:`${number.format(area)} m² privativos · ${parking} vagas`})),
  },
  {
    key: 'atelie', name: 'Ateliê 365', short: 'Ateliê 365', neighborhood: 'Rua Nova York, 365 · Brooklin', image: '/renata.bonilha/assets/atelie-fachada.jpg',
    blurb: 'Duas torres de alto padrão. A tabela residencial lista a unidade 32TA; o book descreve plantas de 194 m² com quatro suítes e três vagas.',
    feature: '194,06 m² · 4 suítes · 3 vagas (tipologia do book)', source: 'Tabela de venda · nov/2026',
    payment: 'A tabela anexada apresenta uma unidade, com valor final indicado. Consulte a equipe para o fluxo e a disponibilidade vigentes.',
    promo: 'O PDF promocional, direcionado a parceiros, apresenta lojas de 155 m² por R$ 2.017.308 e 213 m² por R$ 2.773.798, com validade até 30/11/2026. A promoção não foi somada ao valor da unidade residencial.',
    units: [{id:'32TA',label:'Unidade 32TA',area:194.06,price:357000000,parking:'3*',meta:'194,06 m² · unidade listada na tabela',floor:'Torre não indicada na tabela'}],
  },
];

const params = new URLSearchParams(location.search);
const selected = {};
for (const p of projects) selected[p.key] = p.units.find(u=>u.id===params.get(p.key))?.id || [...p.units].sort((a,b)=>a.price-b.price)[0].id;
const cards=document.querySelector('#project-cards');
const head=document.querySelector('#compare-head');
const body=document.querySelector('#compare-body');
const status=document.querySelector('#selection-status');

function chosen(p){return p.units.find(u=>u.id===selected[p.key])}
function currency(cents){return money.format(cents/100)}
function perM2(u){return money.format((u.price/100)/u.area)}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

function renderCards(){
  cards.innerHTML=projects.map((p,i)=>{
    const u=chosen(p), cheapest=Math.min(...p.units.map(x=>x.price));
    return `<article class="project-card"><div class="project-card-image"><img src="${p.image}" alt="Perspectiva ilustrada de ${esc(p.name)}" loading="lazy"><span class="card-index">0${i+1}</span></div><div class="project-card-body"><h3>${esc(p.name)}</h3><p class="local">${esc(p.neighborhood)}</p><p class="card-price">A partir de<strong>${currency(cheapest)}</strong></p><label class="unit-select-label" for="select-${p.key}">Unidade para comparar</label><select class="unit-select" id="select-${p.key}" data-key="${p.key}">${p.units.map(x=>`<option value="${x.id}" ${x.id===u.id?'selected':''}>${esc(x.label)} · ${currency(x.price)}</option>`).join('')}</select><p class="unit-fact">${esc(u.meta||`${number.format(u.area)} m² privativos`)}</p><p class="card-foot">${p.units.length===1?'1 unidade listada':`${p.units.length} unidades na tabela`} · ${esc(p.source.replace('Tabela de venda · ',''))}</p></div></article>`;
  }).join('');
  cards.querySelectorAll('select').forEach(el=>el.addEventListener('change',()=>{selected[el.dataset.key]=el.value;render();}));
}
function renderTable(){
  head.innerHTML=`<tr><th scope="col">Comparativo</th>${projects.map(p=>`<th scope="col">${esc(p.short)}</th>`).join('')}</tr>`;
  const rows=[
    ['Unidade',u=>`<strong>${esc(u.label)}</strong>`],
    ['Área privativa',u=>`${number.format(u.area)} m²`],
    ['Pavimento',u=>esc(u.floor||u.label.replace(/^.*?· /,''))],
    ['Vagas',u=>u.parking?`${u.parking} vagas${u.storage?' + depósito':''}`:(u.totalArea?'Consultar discriminação no PDF':'—')],
    ['Valor de venda',u=>`<strong>${currency(u.price)}</strong>`],
    ['Valor por m²',u=>perM2(u)],
    ['Característica em destaque',(u,p)=>esc(p.feature)],
  ];
  body.innerHTML=rows.map(([label,fn],i)=>`<tr class="${i===4?'price-row':''}"><th scope="row">${label}</th>${projects.map(p=>`<td>${fn(chosen(p),p)}</td>`).join('')}</tr>`).join('');
}
function renderPayments(){
  document.querySelector('#payment-cards').innerHTML=projects.map(p=>{
    const u=chosen(p); let detail=p.payment;
    if(p.key==='haute'&&u.down) detail=`Ato de ${currency(u.down)} · parcela de ${currency(u.balance)} em 11/12/2026. Simulação SAC: 300 parcelas.`;
    if(p.key==='infinity'&&u.down) detail=`Ato de ${currency(u.down)} · parcela de ${currency(u.balance)} em 31/12/2026.`;
    return `<article class="payment-card"><h4>${esc(p.short)}</h4><p>${esc(detail)}</p></article>`;
  }).join('');
}
function queryUrl(){const q=new URLSearchParams();for(const p of projects)q.set(p.key,selected[p.key]);return `${canonical}?${q.toString()}`}
function summaryText(){return `Renata, segue sua comparação Yincorp:\n${projects.map(p=>`• ${p.name}: ${chosen(p).label} · ${number.format(chosen(p).area)} m² · ${currency(chosen(p).price)}`).join('\n')}\n${queryUrl()}`}
function render(){
  renderCards();renderTable();renderPayments();
  const chosenProjects=projects.length;
  status.textContent=`${chosenProjects} projetos selecionados · link personalizado pronto para compartilhar.`;
  document.querySelector('#contact-summary').textContent=projects.map(p=>`${p.short}: ${chosen(p).label} · ${currency(chosen(p).price)}`).join('  /  ');
  document.querySelector('#whatsapp').href=`https://wa.me/?text=${encodeURIComponent(summaryText())}`;
  if(location.protocol!=='file:'){const url=new URL(location.href);for(const p of projects)url.searchParams.set(p.key,selected[p.key]);history.replaceState(null,'',url);}
}
render();
document.querySelector('#share').addEventListener('click',async()=>{
  const url=queryUrl();
  try{if(navigator.share)await navigator.share({title:'Renata Bonilha · Comparativo Yincorp',text:'Cinco projetos no Brooklin, lado a lado.',url});else{await navigator.clipboard.writeText(url);document.querySelector('#share-feedback').textContent='Link da comparação copiado.';}}
  catch(e){if(e.name!=='AbortError')document.querySelector('#share-feedback').textContent=`Compartilhe este link: ${url}`;}
});
document.querySelector('#copy-summary').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(summaryText());document.querySelector('#copy-feedback').textContent='Resumo copiado.';}
  catch{document.querySelector('#copy-feedback').textContent=summaryText();}
});

