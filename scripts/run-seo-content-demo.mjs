import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {contentInventory} from '../lib/seo-content/inventory.js';
import {selectOpportunity} from '../lib/seo-content/discovery.js';
import {SOURCE_REGISTRY,sourceRetriever} from '../lib/seo-content/sources.js';
import {GATES,ORIGIN,dayInBrazil,hash,slug,fresh} from '../lib/seo-content/core.js';
import {createEditorialAgents} from '../lib/seo-content/editorial.js';
import {openaiEditorial} from '../lib/seo-content/openai-editorial.js';
import {checkPublicLinks} from '../lib/seo-content/providers.js';
import {isolatedDatabase} from '../lib/seo-content/isolated.js';
import {renderArticle} from '../lib/seo-content/render.js';

// Never accepts remote database URLs or mutates a provider/project configuration.
// GSC input is an authenticated read-only export, NOT synthetic rows or an OAuth key.
const file=process.argv[2]||'.seo-test/gsc-live.json';
const captured=JSON.parse(await readFile(file,'utf8'));
if(captured.provider!=='windsor/searchconsole'||captured.account!=='https://www.yincorp.com.br/'||captured.response?.status!=='done'||!Array.isArray(captured.response.data)||!fresh(captured.retrievedAt,Date.now()))throw Error('authenticated_gsc_export_required');
const isolated=await isolatedDatabase(),{db,store}=isolated;
const report={version:2,commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),observedAt:new Date().toISOString(),environment:'isolated local PostgreSQL WASM; actual provider reads; no remote database writes',autopublish:false,cronActivated:false,integrations:{gsc:{status:'CONNECTED_READ',transport:'Windsor authenticated connector export',account:captured.account,windowStart:captured.windowStart,windowEnd:captured.windowEnd,rows:captured.response.data.length,exportDigest:hash(captured),runtimeRefresh:'BLOCKED: no OAuth/export scheduler copied into runtime'},supabase:{status:'PENDING_LIVE_READ'},research:{status:'PENDING_LIVE_READ'},ai:{status:'BLOCKED',reason:'No local editorial credential/models/rates; configured secrets in existing projects were not decrypted or copied'},ads:{status:'BLOCKED',reason:'Existing MIA credential owner retained; no authorized aggregate transport to local pipeline'},ga4:{status:'BLOCKED',reason:'Existing MIA credential owner retained; no authorized aggregate transport to local pipeline'}},states:[],publications:0,cost:{generationActualUSD:0,researchBilling:'No paid research provider used; public HTTPS reads only',estimatedGenerationUSD:null}};
try{
  try{const mia=JSON.parse(await readFile('docs/evidence/v2/mia-read.json','utf8'));if(fresh(mia.observedAt,Date.now()))report.integrations.ads={...mia,runtimeUse:'Read verified; not used as geographic demand without an exact binding'};}catch{}
  for(const state of ['SP','ES']){
    const gates=Object.fromEntries(GATES.map(g=>[g,{status:'UNKNOWN',evidence:'No article generated or independently audited'}]));
    const result={state,status:'BLOCKED',article:null,gates,blockers:[]};
    report.states.push(result);
    let inventory;
    try{inventory=await contentInventory(state);report.integrations.supabase={status:'CONNECTED_READ',transport:'existing public Supabase reader',credential:'existing publishable inventory key; no privileged key',checkedAt:new Date().toISOString()};}catch{result.blockers.push('inventory_read_unavailable');continue;}
    const opportunity=selectOpportunity({rows:captured.response.data,inventory,state,windowStart:captured.windowStart,windowEnd:captured.windowEnd,observedAt:captured.retrievedAt});
    if(!opportunity){result.blockers.push('no_evidenced_opportunity_with_real_inventory');continue;}
    const stock=opportunity.scoring.stock.slice(0,5);
    result.opportunity={query:opportunity.query,city:opportunity.city,neighborhood:opportunity.neighborhood,path:opportunity.targetCanonical,score:opportunity.scoring.value,justification:opportunity.justification,signals:opportunity.evidence.slice(0,10)};
    result.inventory=stock;result.gates.inventory={status:'PASS',evidence:`${stock.length} current canonical inventory recommendations; no price copied`};
    const run=await store.claim({state,day:dayInBrazil(),quota:1,budget:1000000}),reservation=await store.reserve(run,opportunity);
    if(!reservation){result.blockers.push('local_reservation_failed');continue;}
    await store.stage(run,reservation,'RESEARCHING');
    const registry=SOURCE_REGISTRY[state+'/'+slug(opportunity.city)]||[];
    const retrieve=sourceRetriever({allowlist:registry});
    const sources=[];
    result.sources=[];
    for(const entry of registry){try{const source=await retrieve(entry.url);sources.push(source);result.sources.push({url:source.url,observedAt:source.observedAt,digest:source.digest,bodyDigest:source.bodyDigest,bytes:source.bytes,transport:source.transport});}catch(e){result.sources.push({url:entry.url,status:'BLOCKED',reason:e.message});}}
    // Existing canonical property pages provide inventory-specific primary facts.
    const portalRegistry=stock.map(p=>({host:'www.yincorp.com.br',pathPrefix:p.path}));
    for(const property of stock.slice(0,2))try{const source=await sourceRetriever({allowlist:portalRegistry})(ORIGIN+property.path);sources.push(source);result.sources.push({url:source.url,observedAt:source.observedAt,digest:source.digest,bodyDigest:source.bodyDigest,bytes:source.bytes,transport:source.transport});}catch(e){result.sources.push({url:ORIGIN+property.path,status:'BLOCKED',reason:e.message});}
    report.integrations.research={status:sources.length?'CONNECTED_READ':'BLOCKED',transport:'DNS-pinned HTTPS; exact-host/path allowlist; no redirects'};
    if(sources.length<2||!sources.some(s=>new URL(s.url).hostname!=='www.yincorp.com.br'))result.blockers.push('insufficient_independent_primary_sources');
    else result.gates.sources={status:'PASS',evidence:'Fetched official city source and current canonical inventory source with byte limits and integrity hashes'};
    const models={research:process.env.SEO_CONTENT_RESEARCH_MODEL,write:process.env.SEO_CONTENT_WRITE_MODEL,audit:process.env.SEO_CONTENT_AUDIT_MODEL};
    let model;
    try{model=openaiEditorial({apiKey:process.env.OPENAI_API_KEY,models,rates:JSON.parse(process.env.SEO_CONTENT_MODEL_RATES||'null'),store,runRef:()=>run,onUsage:usage=>{(result.usage??=[]).push(usage);}});}catch(e){result.blockers.push(e.message);}
    if(result.blockers.length){await store.stage(run,reservation,'FAILED',result.blockers[0]);await store.finish(run,'FAILED',result.blockers[0]);continue;}
    const callModel=model;model=async(...args)=>{result.generationAttempted=true;report.cost.generationActualUSD=null;return callModel(...args);};
    const agents=createEditorialAgents({model,checkLinks:checkPublicLinks});
    try{
      const context={...await model('research',{opportunity,sources,inventory:stock},'Pesquise somente nas fontes recuperadas. Retorne perguntas, comparação e fatos citados. JSON.'),sources};
      await store.stage(run,reservation,'DRAFT');const content=await agents.write(opportunity,context);await store.stage(run,reservation,'VERIFYING');
      const validations=await agents.verify({opportunity,context,content,stock,pages:[]});
      const article={id:reservation.id,state,path:opportunity.targetCanonical,topicKey:opportunity.topicKey,status:'NEEDS_REVIEW',content,validations,validatedHash:hash(content),verifiedAt:new Date().toISOString(),sources};
      await store.save(run,article);await store.finish(run,'COMPLETE');
      await mkdir('.seo-test/articles',{recursive:true});await writeFile(`.seo-test/articles/${state}.json`,JSON.stringify(article,null,2));await writeFile(`.seo-test/articles/${state}.html`,renderArticle(article,{preview:true,stock}));
      result.status='PRIVATE_DRAFT';result.article={privatePath:`.seo-test/articles/${state}.html`,contentHash:hash(content)};result.gates=validations;report.integrations.ai={status:'CONNECTED_GENERATION',transport:'OpenAI Responses; existing env only'};
    }catch(e){result.blockers.push(/^[a-z_]+$/.test(e.message)?e.message:'editorial_provider_failure');await store.stage(run,reservation,'FAILED',result.blockers.at(-1));await store.finish(run,'FAILED');}
  }
  report.publications=Number((await db.query("select count(*) n from seo_articles where status='PUBLISHED'")).rows[0].n);
  if(report.publications!==0)throw Error('undue_publication');
  report.states.forEach(s=>{if(s.usage?.length){report.cost.generationActualUSD=null;report.cost.estimatedGenerationUSD=(report.cost.estimatedGenerationUSD||0)+s.usage.reduce((sum,u)=>sum+u.estimatedMicros/1000000,0);}});
  await mkdir('docs/evidence/v2',{recursive:true});await writeFile('docs/evidence/v2/editorial-demo.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({states:report.states.map(s=>({state:s.state,status:s.status,query:s.opportunity?.query,blockers:s.blockers})),publications:report.publications}));
}finally{await db.close();}
