export const brl=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format(n);
export const decimal=n=>new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
export const describe=u=>`${u.floorsLabel||u.floor+'º andar'} · final ${u.final} · ${decimal(u.area)} m²`;
export function stages(key,u){
 if(key==='arizona')return[
 ['Ato','ago/2026',1,u.ato],['Sinal','início set/2026',4,u.signal],['Mensais','início jan/2027',17,u.monthly],['Anual','ago/2027',1,u.annual],['Parcela única','jun/2028',1,u.delivery],['Saldo / única FD','ago/2028',1,u.balance]];
 if(key==='haus')return[
 ['Ato','out/2026',1,u.entrance],['Parcelas iniciais','30 / 60 / 90 / 120 / 150 dias · nov/2026',5,u.initial],['Mensais','início abr/2027',5,u.monthly],['Única','jun/2027',1,u.unique],['Financiamento','set/2027',1,u.principal]];
 return[['Entrada','out/2026',1,u.entrance],['Iniciais','dez/2026 e jan/2027',2,u.initial],['Mensais','início fev/2027',key==='brooklin'?20:8,u.monthly],['Semestrais',key==='brooklin'?'início abr/2027':'abr/2027',key==='brooklin'?3:1,u.semiannual],['Única',key==='brooklin'?'out/2028':'out/2027',1,u.unique],['Principal do financiamento','base nominal da tabela',1,u.principal]];
}
export const nominalSum=(key,u)=>stages(key,u).reduce((sum,s)=>sum+s[2]*s[3],0);
export const resolveUnit=(p,id)=>p.units.find(u=>u.id===id)||p.units[0];
export function selectedURL(projects,selection,origin='https://www.yincorp.com.br'){
 const url=new URL('/guilherme.vita',origin);for(const p of projects)url.searchParams.set(p.key,selection[p.key].id);return url.href;
}
export function summary(projects,selection){return projects.map(p=>`${p.project}: ${describe(selection[p.key])}, ${brl(selection[p.key].total)} (tabela ${p.reference==='2026-08'?'ago':'out'}/2026).`).join('\n');}
