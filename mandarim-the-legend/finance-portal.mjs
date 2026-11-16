// Presentation-only module: historical values, no lead submission or tracking changes.
const root=document.getElementById('mandarim-finance');
if(root){
 const select=root.querySelector('#mandarim-unit'),output=root.querySelector('#mandarim-breakdown');
 const brl=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
 const decimal=n=>new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
 const card=(label,value,detail)=>{const item=el('div','mf-mini');item.append(el('span','mf-label',label),el('strong','',value),el('small','',detail));return item};
 const stage=(label,date,value,detail)=>{const item=el('li','mf-stage');item.append(el('span','mf-stage-name',label),el('span','mf-stage-date',date),el('strong','',value),el('span','mf-stage-detail',detail));return item};
 fetch('/mandarim-the-legend/units.json').then(r=>{if(!r.ok)throw Error('Tabela indisponível');return r.json()}).then(data=>{
  const units=data.units;
  if(!Array.isArray(units)||!units.length)throw Error('Tabela sem unidades');
  select.replaceChildren(...units.map(u=>{const o=document.createElement('option');o.value=u.id;o.textContent=u.floor+'º andar · final '+u.final+' · '+decimal(u.area)+' m² · '+brl(u.total);return o}));
  const render=()=>{
   const u=units.find(v=>v.id===select.value)||units[0];
   const overview=el('div','mf-overview'),price=el('div','mf-price');
   price.append(el('span','mf-label','Valor total de referência'),el('strong','',brl(u.total)),el('p','',u.floor+'º andar · final '+u.final+' · tabela de outubro de 2026'));
   const minis=el('div','mf-mini-grid');minis.append(card('Entrada',brl(u.entrance),'Parcela de entrada'),card('Área privativa',decimal(u.area)+' m²',u.typology+' · '+u.parking+' vaga(s)'),card('Preço por m²',brl(u.total/u.area),'Calculado sobre o preço impresso'),card('Total de parcelas', '12 + entrada','2 iniciais · 8 mensais · 1 semestral · 1 única'));
   overview.append(price,minis);
   const title=el('h4','mf-section-title','O caminho até a entrega'),subtitle=el('p','mf-section-subtitle','Fluxo nominal da tabela, sem projeção de reajustes.');
   const timeline=el('ol','mf-timeline');timeline.append(stage('Entrada','Tabela · out/2026',brl(u.entrance),'1 pagamento'),stage('Parcelas iniciais','Dez/2026 e jan/2027',brl(u.initial),'2 parcelas deste valor · total '+brl(2*u.initial)),stage('Mensais','A partir de fev/2027',brl(u.monthly),'8 parcelas deste valor · total '+brl(8*u.monthly)),stage('Semestral','Abr/2027',brl(u.semiannual),'1 parcela'),stage('Parcela única','Out/2027',brl(u.unique),'1 parcela'));
   const finance=el('div','mf-financing');finance.append(el('h4','mf-section-title','Saldo para financiamento'),el('p','mf-section-subtitle','Duas leituras do mesmo saldo na tabela original — não são parcelas cumulativas.'));
   const fg=el('div','mf-financing-grid');
   const fc=(label,value,desc)=>{const c=el('div','mf-financing-card');c.append(el('span','mf-label',label),el('strong','',brl(value)),el('small','',desc));return c};
   fg.append(fc('Principal',u.principal,'Valor principal impresso na tabela.'),fc('Referência dez/2027',u.financing,'Valor da coluna de financiamento para dezembro de 2027; não somar ao principal.'));
   finance.append(fg);
   const note=el('p','mf-disclaimer','Fonte: tabela comercial de outubro de 2026. Soma nominal impressa: '+brl(u.nominalSum)+'. Diferença de arredondamento: '+brl(Math.abs(u.rounding))+'. Valores históricos sujeitos a correção e confirmação, sem indicação de disponibilidade atual, crédito aprovado ou preço vigente. Consulte a equipe Yincorp.');
   output.replaceChildren(overview,title,subtitle,timeline,finance,note);
  };
  select.addEventListener('change',render);render();
 }).catch(()=>{output.replaceChildren(el('p','mf-error','Não foi possível carregar a tabela histórica neste momento.'))});
}
