export const brl=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
export const decimal=n=>new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:3}).format(n);
export const describe=u=>`${u.unitLabel} · ${decimal(u.area)} m²`;
export const stages=(key,u)=>u.flow;
export const nominalSum=(key,u)=>stages(key,u).reduce((sum,s)=>sum+s[2]*s[3],0);
export const resolveUnit=(p,id)=>p.units.find(u=>u.id===id)||p.units[0];
export function selectedURL(projects,selection,origin='https://www.yincorp.com.br'){
 const url=new URL('/guilherme.vita2',origin);for(const p of projects)url.searchParams.set(p.key,selection[p.key].id);return url.href;
}
export function summary(projects,selection){return projects.map(p=>`${p.project}: ${describe(selection[p.key])}, ${brl(selection[p.key].total)} (tabela ${p.reference}).`).join('\n');}
