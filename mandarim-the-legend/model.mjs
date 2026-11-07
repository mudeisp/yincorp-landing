export const CANONICAL='https://www.yincorp.com.br/sp/empreendimentos/mandarim-the-legend/lucas.schoch';
export const brl=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format(n);
export const decimal=n=>new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
export const describe=u=>`${u.floor}º andar · final ${u.final} · ${decimal(u.area)} m²`;
export const stages=u=>[
 {label:'Entrada',date:'Tabela out. 2026',count:1,each:u.entrance,total:u.entrance},
 {label:'Iniciais',date:'dez. 2026 e jan. 2027',count:2,each:u.initial,total:2*u.initial},
 {label:'Mensais',date:'início fev. 2027',count:8,each:u.monthly,total:8*u.monthly},
 {label:'Semestral',date:'abr. 2027',count:1,each:u.semiannual,total:u.semiannual},
 {label:'Única',date:'out. 2027',count:1,each:u.unique,total:u.unique},
 {label:'Principal do financiamento',date:'Base nominal da tabela',count:1,each:u.principal,total:u.principal}
];
export const resolveUnit=(units,id)=>units.find(u=>u.id===id)||units[0];
export const compare=(a,b)=>({total:b.total-a.total,area:b.area-a.area,perSqm:b.total/b.area-a.total/a.area,parking:b.parking-a.parking});
export function selectionURL(u){const url=new URL(CANONICAL);url.searchParams.set('unidade',u.id);return url.href;}
export const contactMessage=u=>`Olá, tenho interesse no Mandarim The Legend, da Cyrela, no Brooklin. ${describe(u)}, ${u.typology}, ${u.parking} vaga(s). Referência histórica de outubro/2026: ${brl(u.total)}. Gostaria de confirmar preço, disponibilidade e condições atuais. ${selectionURL(u)}`;
export function leadPayload(u,fields,t,href){return{nome:fields.nome.trim(),telefone:fields.telefone.replace(/\D/g,''),email:'',origem:'portal_mandarim_the_legend',perfil:'Compra',purpose:'VENDA',operation:'VENDA',pagina:href,empreendimento:'Mandarim The Legend — '+describe(u),property_id:'mandarim-the-legend:'+u.id,property_value:u.total,unit_id:u.id,unit_floor:u.floor,unit_final:u.final,reference_date:'2026-10',inventory_source:'documentos_comerciais',mensagem:contactMessage(u)+' Consentimento para atendimento Yincorp confirmado no formulário.',consent:true,consent_version:'mandarim-contact-v1',consent_at:new Date().toISOString(),visitor_id:t.visitorId,session_id:t.sessionId,lead_event_id:t.leadId('mandarim-the-legend:'+u.id),...t.attribution(),touches:t.touches,session:{number:t.session.session_number,is_returning:t.session.is_returning,previous_session_id:t.session.previous_session_id,days_since_last_visit:t.session.days_since_last_visit}};}
