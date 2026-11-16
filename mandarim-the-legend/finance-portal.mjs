// Read-only commercial reference for the existing Órulo page. No lead submission or tracking changes.
const root=document.getElementById('mandarim-finance');
if(root){
 const select=root.querySelector('#mandarim-unit');
 const output=root.querySelector('#mandarim-breakdown');
 const brl=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format(n);
 const decimal=n=>new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
 const row=(label,value)=>{const tr=document.createElement('tr');const th=document.createElement('th');th.scope='row';th.textContent=label;const td=document.createElement('td');td.textContent=value;tr.append(th,td);return tr};
 fetch('/mandarim-the-legend/units.json').then(r=>{if(!r.ok)throw Error('Tabela indisponível');return r.json()}).then(data=>{
  const units=data.units;
  if(!Array.isArray(units)||!units.length)throw Error('Tabela sem unidades');
  select.replaceChildren(...units.map(u=>{const o=document.createElement('option');o.value=u.id;o.textContent=u.floor+'º andar · final '+u.final+' · '+decimal(u.area)+' m² · '+brl(u.total);return o}));
  const render=()=>{const u=units.find(v=>v.id===select.value)||units[0];const table=document.createElement('table');table.style.cssText='width:100%;border-collapse:collapse;text-align:left';const tbody=document.createElement('tbody');const stages=[['Entrada',brl(u.entrance)],['2 parcelas iniciais', '2 × '+brl(u.initial)],['8 parcelas mensais','8 × '+brl(u.monthly)],['1 semestral',brl(u.semiannual)],['1 parcela única',brl(u.unique)],['Principal do financiamento',brl(u.principal)],['Financiamento em dez/2027 (alternativa ao principal; não somar)',brl(u.financing)]];tbody.append(row('Tipologia',u.typology+' · '+u.parking+' vaga(s)'),row('Área privativa',decimal(u.area)+' m²'),row('Preço impresso em out/2026',brl(u.total)),...stages.map(([k,v])=>row(k,v)));table.append(tbody);output.replaceChildren(table);const note=document.createElement('p');note.style.fontSize='.85rem';note.textContent='Soma nominal das parcelas: '+brl(u.nominalSum)+'. Diferença de arredondamento da tabela: '+brl(Math.abs(u.rounding))+'. Referência histórica; não representa disponibilidade, financiamento aprovado ou preço atual.';output.append(note)};
  select.addEventListener('change',render);render();
 }).catch(()=>{output.textContent='Não foi possível carregar a tabela histórica neste momento.'});
}
