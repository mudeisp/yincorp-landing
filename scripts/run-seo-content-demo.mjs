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
import {inferenceReadiness,inferenceSettings} from '../lib/seo-content/inference-config.js';
import {startEditorialBridge,authenticatedEditorial} from '../lib/seo-content/editorial-bridge.js';
import {readOnlyPreflightFetch} from '../lib/seo-content/preflight.js';

const v3=process.argv.includes('--inference-v3');
const preflightOnly=process.argv.includes('--preflight-only');
if(preflightOnly&&!v3)throw Error('preflight_requires_v3');
// Hard boundary: preflight can make GET reads only, even if credentials and spending authorization exist.
if(preflightOnly)globalThis.fetch=readOnlyPreflightFetch();
if(v3&&process.env.SEO_CONTENT_AUTOPUBLISH===undefined)process.env.SEO_CONTENT_AUTOPUBLISH='false';
const readiness=v3?inferenceReadiness():null;
if(v3&&readiness.status==='BLOCKED'&&!preflightOnly){
  const report={version:3,observedAt:new Date().toISOString(),commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),status:'BLOCKED',preflight:readiness,secretValuesInspected:false,credentialsCopied:false,providerRequests:0,publications:0,autopublish:false,tokens:{input:0,output:0},cost:{generationActualUSD:0,estimatedUSD:0},states:[['SP','Ipiranga','São Paulo'],['ES','Praia do Canto','Vitória']].map(([state,neighborhood,city])=>({state,city,neighborhood,status:'BLOCKED',article:null,reason:readiness.credentialConfigured?'editorial_inference_configuration_blocked':'editorial_credentials_unavailable',stages:{research:'NOT_EXECUTED',write:'NOT_EXECUTED',audit:'NOT_EXECUTED'},gates:Object.fromEntries(GATES.map(g=>[g,{status:'UNKNOWN',evidence:'Inferência real não executada: preflight bloqueado'}]))})),nextAction:{secret:readiness.mode==='isolated_loopback_bridge'?'Provisionar SEO_OPENAI_API_KEY somente na sessão/secret store do ambiente isolado autorizado; não copiar de outro projeto.':'Provisionar SEO_CONTENT_EDITORIAL_TOKEN somente para o endpoint HTTPS autorizado.',nonSecretRequirements:readiness.missing.filter(k=>!['SEO_OPENAI_API_KEY','SEO_CONTENT_EDITORIAL_TOKEN'].includes(k)),configuration:'deploy/seo-content-inference.example.json'}};
  report.provenance={worktreeDirty:Boolean(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim()),sourceDigests:{}};
  for(const path of ['lib/seo-content/inference-config.js','lib/seo-content/editorial-bridge.js','lib/seo-content/openai-editorial.js','scripts/run-seo-content-demo.mjs'])report.provenance.sourceDigests[path]=hash(await readFile(path,'utf8'));
  await mkdir('docs/evidence/v3',{recursive:true});await writeFile('docs/evidence/v3/inference.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({status:report.status,missing:readiness.missing,articlesGenerated:0,providerRequests:0,costUSD:0}));
}else{

// Never accepts remote database URLs or mutates a provider/project configuration.
// GSC input is an authenticated read-only export, NOT synthetic rows or an OAuth key.
const file=process.argv.slice(2).find(a=>!a.startsWith('--'))||'.seo-test/gsc-live.json';
const captured=JSON.parse(await readFile(file,'utf8'));
if(captured.provider!=='windsor/searchconsole'||captured.account!=='https://www.yincorp.com.br/'||captured.response?.status!=='done'||!Array.isArray(captured.response.data)||!fresh(captured.retrievedAt,Date.now()))throw Error('authenticated_gsc_export_required');
const isolated=await isolatedDatabase(),{db,store}=isolated;
let bridge;
if(v3&&!preflightOnly&&!process.env.SEO_CONTENT_EDITORIAL_URL)bridge=await startEditorialBridge({env:process.env});
let approvedReservedMicros=0;
const inferenceStore={...store,rpc:async(action,payload)=>{
  if(action==='spend'&&v3){if(approvedReservedMicros+payload.micros>inferenceSettings().approvedBudgetMicros)return false;approvedReservedMicros+=payload.micros;}
  return store.rpc(action,payload);
}};
const report={version:2,commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),observedAt:new Date().toISOString(),environment:'isolated local PostgreSQL WASM; actual provider reads; no remote database writes',autopublish:false,cronActivated:false,integrations:{gsc:{status:'CONNECTED_READ',transport:'Windsor authenticated connector export',account:captured.account,windowStart:captured.windowStart,windowEnd:captured.windowEnd,rows:captured.response.data.length,exportDigest:hash(captured),runtimeRefresh:'BLOCKED: no OAuth/export scheduler copied into runtime'},supabase:{status:'PENDING_LIVE_READ'},research:{status:'PENDING_LIVE_READ'},ai:{status:'BLOCKED',reason:'No local editorial credential/models/rates; configured secrets in existing projects were not decrypted or copied'},ads:{status:'BLOCKED',reason:'Existing MIA credential owner retained; no authorized aggregate transport to local pipeline'},ga4:{status:'BLOCKED',reason:'Existing MIA credential owner retained; no authorized aggregate transport to local pipeline'}},states:[],publications:0,cost:{generationActualUSD:0,researchBilling:'No paid research provider used; public HTTPS reads only',estimatedGenerationUSD:null}};
try{
  if(v3){report.version=3;report.preflight=readiness;report.providerRequests=0;}
  report.provenance={checkoutHead:report.commit,worktreeDirty:Boolean(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim()),sourceDigests:{}};
  for(const path of ['lib/seo-content/discovery.js','lib/seo-content/sources.js','lib/seo-content/openai-editorial.js','lib/seo-content/inventory.js','lib/seo-content/core.js','scripts/run-seo-content-demo.mjs'])report.provenance.sourceDigests[path]=hash(await readFile(path,'utf8'));
  try{const mia=JSON.parse(await readFile('docs/evidence/v2/mia-read.json','utf8'));if(fresh(mia.observedAt,Date.now()))report.integrations.ads={...mia,runtimeUse:'Read verified; not used as geographic demand without an exact binding'};}catch{}
  for(const state of ['SP','ES']){
    const gates=Object.fromEntries(GATES.map(g=>[g,{status:'UNKNOWN',evidence:'No article generated or independently audited'}]));
    const result={state,status:'BLOCKED',article:null,gates,blockers:[]};
    report.states.push(result);
    let inventory;
    try{inventory=await contentInventory(state);report.integrations.supabase={status:'CONNECTED_READ',transport:'existing public Supabase reader',credential:'existing publishable inventory key; no privileged key',checkedAt:new Date().toISOString()};}catch{result.blockers.push('inventory_read_unavailable');continue;}
    const eligible=v3?inventory.filter(p=>slug(p.city)===(state==='SP'?'sao-paulo':'vitoria')&&slug(p.neighborhood)===(state==='SP'?'ipiranga':'praia-do-canto')):inventory;
    const opportunity=selectOpportunity({rows:captured.response.data,inventory:eligible,state,windowStart:captured.windowStart,windowEnd:captured.windowEnd,observedAt:captured.retrievedAt});
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
    try{
      if(preflightOnly)throw Error('preflight_no_inference');
      const onUsage=usage=>{(result.usage??=[]).push(usage);};
      model=v3?authenticatedEditorial({url:bridge?.url||process.env.SEO_CONTENT_EDITORIAL_URL,token:bridge?.token||process.env.SEO_CONTENT_EDITORIAL_TOKEN,store:inferenceStore,runRef:()=>run,models:inferenceSettings().models,allowIsolatedLoopback:Boolean(bridge),onUsage}):openaiEditorial({apiKey:process.env.SEO_OPENAI_API_KEY,models,rates:JSON.parse(process.env.SEO_CONTENT_MODEL_RATES||'null'),store,runRef:()=>run,onUsage});
    }catch(e){result.blockers.push(e.message);}
    if(result.blockers.length){await store.stage(run,reservation,'FAILED',result.blockers[0]);await store.finish(run,'FAILED',result.blockers[0]);continue;}
    const callModel=model;model=async(...args)=>{result.generationAttempted=true;result.gatewayAttempts=(result.gatewayAttempts||0)+1;report.cost.generationActualUSD=null;return callModel(...args);};
    const agents=createEditorialAgents({model,checkLinks:checkPublicLinks,requireAuditReceipt:v3,auditReceipt:()=>result.usage?.filter(u=>u.stage==='audit').at(-1),writerReceipt:()=>result.usage?.filter(u=>u.stage==='write').at(-1),writerModel:models.write});
    try{
      const context={...await model('research',{opportunity,sources,inventory:stock},'Pesquise somente nas fontes recuperadas. Retorne perguntas, comparação e fatos citados. JSON.'),sources};
      await store.stage(run,reservation,'DRAFT');const content=await agents.write(opportunity,context);await store.stage(run,reservation,'VERIFYING');
      const validations=await agents.verify({opportunity,context,content,stock,pages:[]});
      const article={id:reservation.id,state,path:opportunity.targetCanonical,topicKey:opportunity.topicKey,status:'NEEDS_REVIEW',content,validations,validatedHash:hash(content),verifiedAt:new Date().toISOString(),sources};
      await store.save(run,article);await store.finish(run,'COMPLETE');
      const privateDir=v3?`.seo-test/articles/v3/${reservation.id}`:'.seo-test/articles';
      await mkdir(privateDir,{recursive:true});await writeFile(`${privateDir}/${state}.json`,JSON.stringify(article,null,2));await writeFile(`${privateDir}/${state}.html`,renderArticle(article,{preview:true,stock}));
      result.status='PRIVATE_DRAFT';result.article={privatePath:`${privateDir}/${state}.html`,contentHash:hash(content)};result.gates=validations;report.integrations.ai={status:'CONNECTED_GENERATION',transport:v3?'authenticated editorial contract → OpenAI Responses':'OpenAI Responses; existing env only'};
    }catch(e){result.blockers.push(/^[a-z_]+$/.test(e.message)?e.message:'editorial_provider_failure');await store.stage(run,reservation,'FAILED',result.blockers.at(-1));await store.finish(run,'FAILED');}
  }
  report.publications=Number((await db.query("select count(*) n from seo_articles where status='PUBLISHED'")).rows[0].n);
  if(report.publications!==0)throw Error('undue_publication');
  report.states.forEach(s=>{if(s.usage?.length){report.cost.generationActualUSD=null;report.cost.estimatedGenerationUSD=(report.cost.estimatedGenerationUSD||0)+s.usage.reduce((sum,u)=>sum+u.estimatedMicros/1000000,0);}});
  if(preflightOnly){report.mode='READ_ONLY_PREFLIGHT';report.integrations.ai={status:'NOT_EXECUTED',reason:'preflight_no_inference'};report.status='BLOCKED';report.generationReadiness=readiness;report.remoteDatabaseWrites=0;report.configuredModels=Object.fromEntries(['research','write','audit'].map(stage=>[stage,process.env['SEO_CONTENT_'+stage.toUpperCase()+'_MODEL']||null]));report.configuredRates=JSON.parse(process.env.SEO_CONTENT_MODEL_RATES||'null');report.modelAccess='UNKNOWN: authenticated account model listing not performed';report.budget={authorized:readiness.budgetAuthorized,contractReservationForSixCallsMicros:600000,maxOutputTokensPerCall:4000,maxInputBytesPerCall:40000,maxCostMicrosPerCall:100000,automaticRetries:0};}
  const out=v3?'docs/evidence/v3':'docs/evidence/v2';
  if(v3){report.gatewayAttempts=report.states.reduce((n,s)=>n+(s.gatewayAttempts||0),0);report.completedProviderReceipts=report.states.reduce((n,s)=>n+(s.usage?.length||0),0);report.providerRequests=bridge?bridge.providerRequests():report.gatewayAttempts?null:0;report.approvedReservedMicros=approvedReservedMicros;report.bridgeReservedMicros=bridge?.reserved()??null;}
  await mkdir(out,{recursive:true});await writeFile(out+(preflightOnly?'/preflight.json':v3?'/inference.json':'/editorial-demo.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({states:report.states.map(s=>({state:s.state,status:s.status,query:s.opportunity?.query,blockers:s.blockers})),publications:report.publications}));
}finally{if(bridge)await bridge.close();await db.close();}
}
