export const CANONICAL='https://www.yincorp.com.br/sp/empreendimentos/arizona-1002';
export const brl=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format(n);
export const decimal=n=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2,minimumFractionDigits:2}).format(n);
export const describe=u=>`${u.floor}º andar · final ${u.final} · ${decimal(u.area)} m²`;
export const stages=u=>[
 {label:'Ato',date:'ago. 2026',count:1,each:u.ato,total:u.ato},
 {label:'Sinal',date:'início set. 2026',count:4,each:u.signal,total:4*u.signal},
 {label:'Mensais',date:'início jan. 2027',count:17,each:u.monthly,total:17*u.monthly},
 {label:'Anual',date:'ago. 2027',count:1,each:u.annual,total:u.annual},
 {label:'Parcela única',date:'jun. 2028',count:1,each:u.delivery,total:u.delivery},
 {label:'Saldo / única FD',date:'ago. 2028',count:1,each:u.balance,total:u.balance}
];
export function compare(a,b){return{total:b.total-a.total,perSqm:b.total/b.area-a.total/a.area,area:b.area-a.area,floor:b.floor-a.floor,parking:b.parking-a.parking,beforeBalance:(b.total-b.balance)-(a.total-a.balance)};}
export function resolveUnit(units,id){return units.find(u=>u.id===id)||units[0];}
export function selectionURL(u){const p=new URL(CANONICAL);p.searchParams.set('unidade',u.id);return p.href;}
export function contactMessage(u){return`Olá, tenho interesse no Arizona 1002, da Even. ${describe(u)}, ${u.parking} vagas. Referência histórica ago/2026: ${brl(u.total)}. Gostaria de confirmar preço, disponibilidade e condições atuais. ${selectionURL(u)}`;}
export function leadPayload(u,form,tracking,href){return{nome:form.nome.trim(),telefone:form.telefone.replace(/\D/g,''),email:'',origem:'portal_arizona_1002',perfil:'Compra',purpose:'VENDA',operation:'VENDA',pagina:href,empreendimento:'Arizona 1002 — '+describe(u),property_id:'arizona-1002:'+u.id,property_value:u.total,unit_id:u.id,unit_floor:u.floor,unit_final:u.final,reference_date:'2026-08',inventory_source:'documentos_comerciais',mensagem:contactMessage(u)+' Consentimento para atendimento Yincorp confirmado no formulário.',consent:true,consent_version:'arizona-contact-v1',consent_at:new Date().toISOString(),visitor_id:tracking.visitorId,session_id:tracking.sessionId,lead_event_id:tracking.leadId('arizona-1002:'+u.id),...tracking.attribution(),touches:tracking.touches,session:{number:tracking.session.session_number,is_returning:tracking.session.is_returning,previous_session_id:tracking.session.previous_session_id,days_since_last_visit:tracking.session.days_since_last_visit}};}
