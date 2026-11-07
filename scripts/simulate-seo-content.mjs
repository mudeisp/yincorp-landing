import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {isolatedDatabase} from '../lib/seo-content/isolated.js';
import {runState,GATES,hash} from '../lib/seo-content/core.js';
export async function simulate(){
  const {db,store}=await isolatedDatabase();const reports=[];
  try{
    for(let day=0;day<7;day++){
      const date=new Date(Date.UTC(2026,10,1+day,12)),iso=date.toISOString(),daily=[];
      for(const state of ['SP','ES']){
        const topics=Array.from({length:12},(_,i)=>({state,query:`Como morar no bairro ${day}-${i}?`,intent:'informational',city:state==='SP'?'São Paulo':'Vitória',neighborhood:`Bairro ${day}-${i}`,targetCanonical:`/${state.toLowerCase()}/conteudos/bairro-${day}-${i}`,evidence:[{provider:'gsc',impressions:100,observedAt:iso,url:'https://search.google.com/search-console'}]}));
        const params={state,day:iso.slice(0,10),store,cfg:{enabled:true,kill:false,autopublish:false,quotas:{SP:5,ES:5},maxCostMicros:1000000,maxRuntimeMs:180000},now:()=>date.getTime(),
          discover:async()=>[...topics,...topics],inventory:async()=>topics.map(o=>({state,city:o.city,neighborhood:o.neighborhood,path:`/${state.toLowerCase()}/cidade/empreendimento/real`,checkedAt:iso})),existing:s=>store.existing(s),
          research:async()=>({sources:[{url:'https://www.ibge.gov.br',excerpt:'Fonte sintética exclusiva do teste',digest:hash('Fonte sintética exclusiva do teste'),observedAt:iso}]}),
          write:async o=>({title:o.query,introduction:'Fixture isolada; não é conteúdo publicável',sections:[],description:'teste'}),
          verify:async()=>Object.fromEntries(GATES.map(g=>[g,{status:g==='editorial'?'FAIL':'UNKNOWN',evidence:'Fixture nunca autoriza publicação'}]))};
        // Two simultaneous invocations exercise the database lease, not a JS mock lock.
        const results=await Promise.all([runState(params),runState(params)]);
        assert.equal(results.filter(r=>r.status==='ALREADY_CLAIMED').length,1);
        assert.equal((await db.query('select candidates from seo_publication_runs where state=$1 and day=$2',[state,iso.slice(0,10)])).rows[0].candidates,5);
        assert.equal((await runState(params)).status,'ALREADY_CLAIMED');
        daily.push(await store.report(state,iso.slice(0,10)));
      }
      reports.push({day:iso.slice(0,10),states:daily});
    }
    const counts=(await db.query("select count(*)::int articles,count(*) filter(where status='PUBLISHED')::int published from seo_articles")).rows[0];
    assert.equal(counts.articles,70);assert.equal(counts.published,0);
    const duplicates=(await db.query('select identity_key from seo_opportunities group by identity_key having count(*)>1')).rows;assert.equal(duplicates.length,0);
    return {environment:'isolated PostgreSQL WASM; synthetic fixtures only; no network or public publication',days:7,quotaPerState:5,...counts,duplicates:duplicates.length,reports};
  }finally{await db.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const result=await simulate();await mkdir('docs/evidence',{recursive:true});await writeFile('docs/evidence/seo-content-seven-days.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({days:result.days,articles:result.articles,published:result.published,duplicates:result.duplicates}));}
