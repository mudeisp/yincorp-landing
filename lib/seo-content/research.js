import {SOURCE_REGISTRY,sourceRetriever} from './sources.js';
import {ORIGIN,slug} from './core.js';
import {INSTRUCTIONS} from './editorial.js';
export function directResearch(model){
  return async(opportunity,stock)=>{
    const registry=(SOURCE_REGISTRY[opportunity.state+'/'+slug(opportunity.city)]||[]).filter(s=>!s.neighborhood||s.neighborhood===slug(opportunity.neighborhood));
    const internal=stock.slice(0,2).map(p=>({url:ORIGIN+p.path,host:'www.yincorp.com.br',pathPrefix:p.path}));
    const retrieve=sourceRetriever({allowlist:[...registry,...internal]});
    const settled=await Promise.allSettled([...registry,...internal].map(e=>retrieve(e.url)));
    const sources=settled.flatMap(r=>r.status==='fulfilled'?[r.value]:[]);
    if(sources.length<2||!sources.some(s=>new URL(s.url).hostname!=='www.yincorp.com.br'))throw Error('insufficient_independent_primary_sources');
    const result=await model('research',{opportunity,sources,inventory:stock},INSTRUCTIONS.research);
    return {...result,sources};
  };
}
