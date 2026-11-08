import {opportunitiesFromGsc} from './discovery.js';
import {hash,score,slug,normalize} from './core.js';

const templates=[
  ['visita',(b,c)=>`Como organizar a visita a um imóvel em ${b}, ${c}?`],
  ['plantas',(b,c)=>`Como comparar plantas de imóveis em ${b}, ${c}?`],
  ['entorno',(b,c)=>`O que conferir no entorno de um imóvel em ${b}, ${c}?`],
  ['areas-comuns',(b,c)=>`Como avaliar áreas comuns de empreendimentos em ${b}, ${c}?`],
  ['comparacao',(b,c)=>`Como comparar imóveis disponíveis em ${b}, ${c}?`],
  ['perguntas',(b,c)=>`Que perguntas fazer antes de escolher um imóvel em ${b}, ${c}?`],
  ['rotina',(b,c)=>`Como avaliar se um imóvel em ${b}, ${c}, combina com sua rotina?`],
  ['prioridades',(b,c)=>`Como definir prioridades na busca de imóvel em ${b}, ${c}?`],
  ['unidades',(b,c)=>`Como comparar unidades do mesmo empreendimento em ${b}, ${c}?`],
  ['checklist',(b,c)=>`Checklist para conferir um imóvel do catálogo em ${b}, ${c}`],
  ['informacoes',(b,c)=>`Quais informações confirmar sobre um imóvel em ${b}, ${c}?`],
  ['decisao',(b,c)=>`Como organizar sua decisão de compra de imóvel em ${b}, ${c}?`]
];
export function selectWeeklyOpportunity({gsc,inventory,state,data,week,now=Date.now()}){
  const used=new Set(Object.values(data.runs).flatMap(r=>[r.opportunity?.targetCanonical,...Object.values(r.articles).map(a=>a.path)]).filter(Boolean));
  const existingTitles=new Set(Object.values(data.runs).flatMap(r=>Object.values(r.articles).filter(a=>a.content).map(a=>normalize(a.content.title))));
  const rotation=Math.floor(Date.parse(week+'T12:00:00Z')/604800000)%templates.length;
  const candidates=opportunitiesFromGsc({rows:gsc.response.data,inventory,state,windowStart:gsc.windowStart,windowEnd:gsc.windowEnd,observedAt:gsc.retrievedAt}).flatMap(base=>templates.map(([angle,title],i)=>{
    const query=title(base.neighborhood,base.city),targetCanonical=`/${state.toLowerCase()}/conteudos/${slug(query)}`;
    const o={...base,query,targetCanonical,topicKey:hash([state,base.city,base.neighborhood,angle]),justification:{...base.justification,angle,titleDemandMeasured:false},evidence:[...base.evidence].sort((a,b)=>b.impressions-a.impressions).slice(0,10)};
    const scoring=score(o,inventory,[],now);return {...o,scoring:{...scoring,stock:scoring.stock.slice(0,3)},priority:(i-rotation+templates.length)%templates.length};
  })).filter(o=>o.scoring.value>=60&&!used.has(o.targetCanonical)&&!existingTitles.has(normalize(o.query)));
  return candidates.sort((a,b)=>b.scoring.value-a.scoring.value||a.priority-b.priority||a.targetCanonical.localeCompare(b.targetCanonical))[0]||null;
}
