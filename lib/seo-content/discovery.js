import {ORIGIN,slug,normalize,topicKey,score} from './core.js';
export function opportunitiesFromGsc({rows,inventory,state,windowStart,windowEnd,observedAt}){
  const clusters=new Map();
  for(const row of rows){
    let url;try{url=new URL(row.page);}catch{continue;}
    if(url.origin!==ORIGIN||url.search||url.hash||!url.pathname.startsWith('/'+state.toLowerCase()+'/')||typeof row.query!=='string'||!Number.isFinite(row.impressions)||row.impressions<=0)continue;
    const property=inventory.find(p=>p.path===url.pathname&&p.state===state);if(!property?.neighborhood)continue;
    const key=[state,normalize(property.city),normalize(property.neighborhood)].join('/');
    if(!clusters.has(key))clusters.set(key,{property,signals:[]});
    const fetched=row.data_fetched_at?(String(row.data_fetched_at).endsWith('Z')?row.data_fetched_at:row.data_fetched_at+'Z'):observedAt;
    clusters.get(key).signals.push({provider:'gsc',url:'https://search.google.com/search-console',query:row.query,page:row.page,impressions:row.impressions,clicks:row.clicks,ctr:row.ctr,position:row.position,windowStart,windowEnd,observedAt:fetched,demandScope:'related_existing_page'});
  }
  return [...clusters.values()].map(({property:p,signals})=>{
    // This is an explicit editorial hypothesis, never a measured search query.
    const query=`Como avaliar imóveis em ${p.neighborhood}, ${p.city}?`;
    return {state,city:p.city,neighborhood:p.neighborhood,intent:'informational',query,targetCanonical:`/${state.toLowerCase()}/conteudos/${slug(query)}`,evidence:signals,justification:{kind:'related_query_hypothesis',text:'Consultas reais de páginas comerciais da região justificam pesquisar uma pauta educativa distinta; a demanda por este título não foi medida.',observedQueries:signals.length,observedImpressions:signals.reduce((n,e)=>n+e.impressions,0)}};
  });
}
export function selectOpportunity(options){
  return opportunitiesFromGsc(options).map(o=>({...o,topicKey:topicKey(o),scoring:score(o,options.inventory,options.existing||[],options.now||Date.now())})).filter(o=>o.scoring.value>=60).sort((a,b)=>b.scoring.value-a.scoring.value||b.justification.observedImpressions-a.justification.observedImpressions||a.targetCanonical.localeCompare(b.targetCanonical))[0]||null;
}
