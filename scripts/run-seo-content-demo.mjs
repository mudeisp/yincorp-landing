import {comparisonCorpus,validCorpus,compareTopics} from '../lib/seo-content/comparison-corpus.js';
import {randomUUID} from 'node:crypto';
import {renderArticle} from '../lib/seo-content/render.js';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {contentInventory} from '../lib/seo-content/inventory.js';
import {selectOpportunity} from '../lib/seo-content/discovery.js';
import {SOURCE_REGISTRY,sourceRetriever} from '../lib/seo-content/sources.js';
import {GATES,ORIGIN,dayInBrazil,hash,slug,fresh} from '../lib/seo-content/core.js';
import {createEditorialAgents} from '../lib/seo-content/editorial.js';
import {checkPublicLinks} from '../lib/seo-content/providers.js';
import {isolatedDatabase} from '../lib/seo-content/isolated.js';
import {inferenceReadiness,inferenceSettings} from '../lib/seo-content/inference-config.js';
import {readOnlyPreflightFetch} from '../lib/seo-content/preflight.js';
import {configuredLedger} from '../lib/seo-content/durable-ledger.js';
import {durableEditorial} from '../lib/seo-content/durable-editorial.js';

const v3=process.argv.includes('--inference-v3');
const preflightOnly=process.argv.includes('--preflight-only');
const deterministicDryRun=process.argv.includes('--deterministic-dry-run');
if(deterministicDryRun&&(!preflightOnly||process.env.SEO_CONTENT_INFERENCE_AUTHORIZED!=='false'||process.env.SEO_CONTENT_AUTOPUBLISH!=='false'))throw Error('deterministic_dry_run_requires_private_disabled_inference');
const dryRunDirectory=deterministicDryRun?'.seo-test/deterministic-dry-run/'+randomUUID():null;
if(preflightOnly&&!v3)throw Error('preflight_requires_v3');
if(!v3)throw Error('private_durable_runner_required');
// Hard boundary: preflight can make GET reads only, even if credentials and spending authorization exist.
if(preflightOnly)globalThis.fetch=readOnlyPreflightFetch();
if(v3&&process.env.SEO_CONTENT_AUTOPUBLISH===undefined)process.env.SEO_CONTENT_AUTOPUBLISH='false';
const readiness=v3?inferenceReadiness():null;
if(v3&&readiness.status==='BLOCKED'&&!preflightOnly){
  const report={version:3,observedAt:new Date().toISOString(),commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),status:'BLOCKED',preflight:readiness,secretValuesInspected:false,credentialsCopied:false,providerRequests:0,publications:0,autopublish:false,tokens:{input:0,output:0},cost:{generationActualUSD:0,estimatedUSD:0},states:[['SP','Ipiranga','São Paulo'],['ES','Praia do Canto','Vitória']].map(([state,neighborhood,city])=>({state,city,neighborhood,status:'BLOCKED',article:null,reason:readiness.credentialConfigured?'editorial_inference_configuration_blocked':'editorial_credentials_unavailable',stages:{research:'NOT_EXECUTED',write:'NOT_EXECUTED',audit:'NOT_EXECUTED'},gates:Object.fromEntries(GATES.map(g=>[g,{status:'UNKNOWN',evidence:'Inferência real não executada: preflight bloqueado'}]))})),nextAction:{secret:readiness.mode==='isolated_loopback_bridge'?'Provisionar SEO_OPENAI_API_KEY somente na sessão/secret store do ambiente isolado autorizado; não copiar de outro projeto.':'Provisionar SEO_CONTENT_EDITORIAL_TOKEN somente para o endpoint HTTPS autorizado.',nonSecretRequirements:readiness.missing.filter(k=>!['SEO_OPENAI_API_KEY','SEO_CONTENT_EDITORIAL_TOKEN'].includes(k)),configuration:'deploy/seo-content-inference.example.json'}};
  report.provenance={worktreeDirty:Boolean(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim()),sourceDigests:{}};
  for(const path of ['lib/seo-content/inference-config.js','lib/seo-content/editorial-bridge.js','lib/seo-content/openai-editorial.js','scripts/run-seo-content-demo.mjs'])report.provenance.sourceDigests[path]=hash(await readFile(path,'utf8'));
  // Never replace historical tracked evidence with a new blocked attempt.

  console.log(JSON.stringify({status:report.status,missing:readiness.missing,articlesGenerated:0,providerRequests:0,costUSD:0}));
}else{

// No legacy remote-store credentials or provider/project mutations.
// Only the explicitly pinned private SEO ledger is accepted for persistence.
// GSC input is an authenticated read-only export, NOT synthetic rows or an OAuth key.
const file=process.argv.slice(2).find(a=>!a.startsWith('--'))||'.seo-test/gsc-live.json';
let durable, durableRun;
if(v3&&!preflightOnly){
  if(process.env.SEO_CONTENT_EDITORIAL_URL)throw Error('private_remote_gateway_not_supported');
  durable=await configuredLedger();
  try{
    const state=await durable.ledger.read();
    durableRun=state.runs[process.env.SEO_CONTENT_RUN_ID];
    if(!durableRun)throw Error('private_resume_existing_run_required');
    if(state.reconciliation.status!=='RECONCILED')throw Error('private_consumption_unknown');
    if(Object.values(state.calls).some(call=>call.status!=='COMPLETE'))throw Error('private_call_outcome_unknown');
    const settings=inferenceSettings();
    if(hash(durableRun.configuration)!==hash(settings))throw Error('private_run_configuration_conflict');
  }catch(error){await durable.close();throw error;}
}
const captured=durableRun?.gsc||JSON.parse(await readFile(file,'utf8'));
if(captured.provider!=='windsor/searchconsole'||captured.account!=='https://www.yincorp.com.br/'||captured.response?.status!=='done'||!Array.isArray(captured.response.data)||!fresh(captured.retrievedAt,Date.now())){if(durable)await durable.close();throw Error('authenticated_gsc_export_required');}
const isolated=await isolatedDatabase().catch(async error=>{if(durable)await durable.close();throw error;}),{db,store}=isolated;
// V3 real inference is exclusively backed by the private durable ledger.
const report={version:2,commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),observedAt:new Date().toISOString(),environment:'isolated local PostgreSQL WASM; actual provider reads; no remote database writes',autopublish:false,cronActivated:false,integrations:{gsc:{status:'CONNECTED_READ',transport:'Windsor authenticated connector export',account:captured.account,windowStart:captured.windowStart,windowEnd:captured.windowEnd,rows:captured.response.data.length,exportDigest:hash(captured),runtimeRefresh:'BLOCKED: no OAuth/export scheduler copied into runtime'},supabase:{status:'PENDING_LIVE_READ'},research:{status:'PENDING_LIVE_READ'},ai:{status:'BLOCKED',reason:'No local editorial credential/models/rates; configured secrets in existing projects were not decrypted or copied'},ads:{status:'BLOCKED',reason:'Existing MIA credential owner retained; no authorized aggregate transport to local pipeline'},ga4:{status:'BLOCKED',reason:'Existing MIA credential owner retained; no authorized aggregate transport to local pipeline'}},states:[],publications:0,cost:{generationActualUSD:0,researchBilling:'No paid research provider used; public HTTPS reads only',estimatedGenerationUSD:null}};
try{
  if(v3){report.version=3;report.preflight=readiness;report.providerRequests=0;}
  report.provenance={checkoutHead:report.commit,worktreeDirty:Boolean(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim()),sourceDigests:{}};
  for(const path of ['lib/seo-content/comparison-corpus.js','lib/seo-content/discovery.js','lib/seo-content/sources.js','lib/seo-content/openai-editorial.js','lib/seo-content/inventory.js','lib/seo-content/core.js','scripts/run-seo-content-demo.mjs'])report.provenance.sourceDigests[path]=hash(await readFile(path,'utf8'));
  try{const mia=JSON.parse(await readFile('docs/evidence/v2/mia-read.json','utf8'));if(fresh(mia.observedAt,Date.now()))report.integrations.ads={...mia,runtimeUse:'Read verified; not used as geographic demand without an exact binding'};}catch{}
  for(const state of ['SP','ES']){
    const gates=Object.fromEntries(GATES.map(g=>[g,{status:'UNKNOWN',evidence:'No article generated or independently audited'}]));
    const result={state,status:'BLOCKED',article:null,gates,blockers:[]};
    report.states.push(result);
    if(durableRun?.articles[state]?.status==='NEEDS_REVIEW'){result.status='PRIVATE_DRAFT';result.article={durable:true,runId:durableRun.runId};result.gates=durableRun.articles[state].validations;continue;}
    let inventory;
    try{inventory=await contentInventory(state);report.integrations.supabase={status:'CONNECTED_READ',transport:'existing public Supabase reader',credential:'existing publishable inventory key; no privileged key',checkedAt:new Date().toISOString()};}catch{result.blockers.push('inventory_read_unavailable');continue;}
    const eligible=v3?inventory.filter(p=>slug(p.city)===(state==='SP'?'sao-paulo':'vitoria')&&slug(p.neighborhood)===(state==='SP'?'ipiranga':'praia-do-canto')):inventory;
    const opportunity=selectOpportunity({rows:captured.response.data,inventory:eligible,state,windowStart:captured.windowStart,windowEnd:captured.windowEnd,observedAt:captured.retrievedAt});
    if(!opportunity){result.blockers.push('no_evidenced_opportunity_with_real_inventory');continue;}
    const stock=opportunity.scoring.stock.slice(0,5);
    result.opportunity={query:opportunity.query,city:opportunity.city,neighborhood:opportunity.neighborhood,path:opportunity.targetCanonical,score:opportunity.scoring.value,justification:opportunity.justification,signals:opportunity.evidence.slice(0,10)};
    const corpus=await comparisonCorpus({opportunity,inventory:eligible,gscRows:captured.response.data});
    result.corpus={snapshotHash:corpus.snapshotHash,coverage:corpus.coverage,pages:corpus.pages.map(({text,...metadata})=>metadata),overlaps:compareTopics(opportunity,corpus.pages)};
    if(!preflightOnly&&(!validCorpus(corpus)||!corpus.coverage.complete))result.blockers.push('comparison_corpus_incomplete');
    if(!preflightOnly&&compareTopics(opportunity,corpus.pages).length)result.blockers.push('comparison_topic_requires_review');
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
    if(deterministicDryRun){
      if(result.blockers.length){await store.stage(run,reservation,'FAILED',result.blockers[0]);await store.finish(run,'FAILED');continue;}
      // Explicit deterministic fixture through the existing editorial ports. No provider adapter.
      const fixture={title:'Simulação: '+opportunity.query,description:'Simulação técnica privada para '+opportunity.neighborhood+', '+opportunity.city+'. Não é artigo produzido ou aprovado por IA.',
        introduction:'Esta simulação determinística verifica a integração com o inventário consultado. Não é uma oferta nem um artigo editorial aprovado.',
        sections:[{heading:'Inventário consultado em '+opportunity.neighborhood,level:2,text:stock.map(p=>p.name).join('; ')+'.',claims:[]},
          {heading:'Pontos a confirmar no atendimento',level:3,text:'Confirme as condições atuais, a localização exata e as características da unidade antes de decidir. Esta simulação não informa preço, metragem, valorização ou infraestrutura do bairro.',claims:[]}],
        questions:[{question:'Quais ofertas foram consultadas?',answer:stock.slice(0,2).map(p=>p.name).join('; ')+'.'},{question:'Os dados substituem a confirmação comercial?',answer:'Não. Consulte a equipe para confirmar condições e disponibilidade.'}],
        internalLinks:[{path:'/'+state.toLowerCase(),label:'Imóveis em '+state},...stock.slice(0,2).map(p=>({path:p.path,label:p.name}))],
        cta:'Consulte a Yincorp para confirmar as ofertas indicadas no inventário.',
        claims:stock.flatMap(p=>{const source=sources.find(s=>s.url===ORIGIN+p.path&&s.excerpt.includes(p.name));return source?[{text:p.name,sourceUrl:source.url}]:[];})};
      const simulatedModel=async(stage)=>stage==='write'?structuredClone(fixture):Object.fromEntries(GATES.map(g=>[g,{status:'UNKNOWN',evidence:'Simulação determinística sem inferência ou auditoria editorial independente'}]));
      const agents=createEditorialAgents({model:simulatedModel,checkLinks:checkPublicLinks,requireAuditReceipt:true,requireCorpusEvidence:true});
      const context={sources,inventory:stock,simulation:true};
      await store.stage(run,reservation,'DRAFT');const content=await agents.write(opportunity,context);await store.stage(run,reservation,'VERIFYING');
      const validations=await agents.verify({opportunity,context,content,stock,pages:corpus.pages,corpus});
      const article={id:reservation.id,state,path:opportunity.targetCanonical,topicKey:opportunity.topicKey,status:'NEEDS_REVIEW',content,validations,validatedHash:hash(content),verifiedAt:new Date().toISOString(),sources,simulation:true};
      await store.save(run,article);await store.finish(run,'COMPLETE');
      await mkdir(dryRunDirectory,{recursive:true});await writeFile(dryRunDirectory+'/'+state+'-corpus.json',JSON.stringify(corpus,null,2)+'\n');const privateJson=dryRunDirectory+'/'+state+'.json',privateHtml=dryRunDirectory+'/'+state+'.html';
      const markup=renderArticle(article,{preview:true,stock});await writeFile(privateJson,JSON.stringify(article,null,2)+'\n');await writeFile(privateHtml,markup);
      result.status='DETERMINISTIC_SIMULATION';result.article=null;result.gates=validations;
      result.simulation={privateJson,privateHtml,contentHash:hash(content),title:content.title,headings:content.sections.map(s=>({level:s.level,text:s.heading})),canonical:ORIGIN+article.path,modelCalls:0,notAnEditorialArticle:true,technicalChecks:{oneH1:(markup.match(/<h1\b/g)||[]).length===1,canonical:markup.includes(ORIGIN+article.path),privateNoindex:markup.includes('noindex'),titleLength:content.title.length<=75,descriptionLength:content.description.length<=170,headings:content.sections.every(s=>[2,3].includes(s.level)),exactGeography:stock.every(p=>p.state===state&&slug(p.city)===slug(opportunity.city)&&slug(p.neighborhood)===slug(opportunity.neighborhood)),noPricesOrAreas:!/(?:R\$|m²)\s*\d/.test(JSON.stringify(content))}};
      continue;
    }
    const models={research:process.env.SEO_CONTENT_RESEARCH_MODEL,write:process.env.SEO_CONTENT_WRITE_MODEL,audit:process.env.SEO_CONTENT_AUDIT_MODEL};
    let model;
    try{
      if(preflightOnly)throw Error('preflight_no_inference');
      const onUsage=usage=>{(result.usage??=[]).push(usage);};
      model=durableEditorial({ledger:durable.ledger,runId:durableRun.runId,article:state,settings:inferenceSettings(),apiKey:process.env.SEO_OPENAI_API_KEY,onUsage});
    }catch(e){result.blockers.push(e.message);}
    if(result.blockers.length){await store.stage(run,reservation,'FAILED',result.blockers[0]);await store.finish(run,'FAILED',result.blockers[0]);continue;}
    const callModel=model;model=async(...args)=>{result.generationAttempted=true;result.modelInvocations=(result.modelInvocations||0)+1;report.cost.generationActualUSD=null;return callModel(...args);};
    const agents=createEditorialAgents({model,checkLinks:checkPublicLinks,requireAuditReceipt:v3,requireCorpusEvidence:true,auditReceipt:()=>result.usage?.filter(u=>u.stage==='audit').at(-1),writerReceipt:()=>result.usage?.filter(u=>u.stage==='write').at(-1),writerModel:models.write});
    try{
      // Reuse immutable source/inventory inputs on restart; changed live evidence
      // requires a reviewed new content revision, never another paid call silently.
      let savedCorpus=corpus;
      if(durable){const old=(await durable.ledger.read()).runs[durableRun.runId].checkpoints[state+'/corpus'];if(old){if(!validCorpus(old)||!old.coverage.complete)throw Error('private_saved_corpus_stale');savedCorpus=old;}else await durable.ledger.checkpoint(durableRun.runId,state+'/corpus',corpus);}
      let savedInput={opportunity,sources,inventory:stock};
      if(durable){
        const saved=(await durable.ledger.read()).runs[durableRun.runId].checkpoints[state+'/inputs'];
        if(saved){if(saved.sources.some(source=>!fresh(source.observedAt,Date.now())))throw Error('private_saved_sources_stale');savedInput=saved;}
        else await durable.ledger.checkpoint(durableRun.runId,state+'/inputs',savedInput);
      }
      const context={...await model('research',savedInput,'Pesquise somente nas fontes recuperadas. Retorne perguntas, comparação e fatos citados. JSON.'),sources:savedInput.sources};
      await store.stage(run,reservation,'DRAFT');const content=await agents.write(savedInput.opportunity,context);await store.stage(run,reservation,'VERIFYING');
      const validations=await agents.verify({opportunity:savedInput.opportunity,context,content,stock:savedInput.inventory,pages:savedCorpus.pages,corpus:savedCorpus});
      const article={id:durable?durableRun.articles[state].id:reservation.id,state,path:savedInput.opportunity.targetCanonical,topicKey:savedInput.opportunity.topicKey,status:'NEEDS_REVIEW',content,validations,validatedHash:hash(content),verifiedAt:new Date().toISOString(),sources:savedInput.sources};
      if(durable)await durable.ledger.article(durableRun.runId,state,article);
      await store.save(run,{...article,id:reservation.id});await store.finish(run,'COMPLETE');
      result.status='PRIVATE_DRAFT';result.article={runId:durableRun.runId,state,storage:'seo_engine',contentHash:hash(content)};result.gates=validations;report.integrations.ai={status:'CONNECTED_GENERATION',transport:'private durable ledger → OpenAI Responses'};
    }catch(e){result.blockers.push(/^[a-z_]+$/.test(e.message)?e.message:'editorial_provider_failure');await store.stage(run,reservation,'FAILED',result.blockers.at(-1));await store.finish(run,'FAILED');}
  }
  report.publications=Number((await db.query("select count(*) n from seo_articles where status='PUBLISHED'")).rows[0].n);
  if(report.publications!==0)throw Error('undue_publication');
  report.states.forEach(s=>{if(s.usage?.length){report.cost.generationActualUSD=null;report.cost.estimatedGenerationUSD=(report.cost.estimatedGenerationUSD||0)+s.usage.reduce((sum,u)=>sum+u.estimatedMicros/1000000,0);}});
  if(preflightOnly){report.mode='READ_ONLY_PREFLIGHT';report.integrations.ai={status:'NOT_EXECUTED',reason:'preflight_no_inference'};report.status='BLOCKED';report.generationReadiness=readiness;report.remoteDatabaseWrites=0;report.configuredModels=Object.fromEntries(['research','write','audit'].map(stage=>[stage,process.env['SEO_CONTENT_'+stage.toUpperCase()+'_MODEL']||null]));report.configuredRates=JSON.parse(process.env.SEO_CONTENT_MODEL_RATES||'null');report.modelAccess='UNKNOWN: authenticated account model listing not performed';report.budget={authorized:readiness.budgetAuthorized,contractReservationForSixCallsMicros:600000,maxOutputTokensPerCall:4000,maxInputBytesPerCall:40000,maxCostMicrosPerCall:100000,automaticRetries:0};}
  const out=v3?'docs/evidence/v3':'docs/evidence/v2';
  if(v3){report.modelInvocations=report.states.reduce((n,s)=>n+(s.modelInvocations||0),0);report.completedProviderReceipts=report.states.reduce((n,s)=>n+(s.usage?.length||0),0);report.providerRequests=report.modelInvocations?null:0;}
  if(durable){
    const persisted=await durable.ledger.read();
    report.providerRequests=null;report.providerAttemptsUpperBound=Object.keys(persisted.calls).length;
    report.cost={estimatedRecordedMicros:persisted.estimatedMicros,reservedMicros:persisted.reservedMicros,historicalReconciliation:persisted.reconciliation.status,billedTotalUSD:null};
    await durable.ledger.checkpoint(durableRun.runId,'report/'+new Date().toISOString(),report);
  }
  else {const reportDir=deterministicDryRun?dryRunDirectory:out;await mkdir(reportDir,{recursive:true});await writeFile(reportDir+(deterministicDryRun?'/report.json':preflightOnly?'/preflight.json':v3?'/inference.json':'/editorial-demo.json'),JSON.stringify(report,null,2)+'\n');}
  console.log(JSON.stringify({states:report.states.map(s=>({state:s.state,status:s.status,query:s.opportunity?.query,blockers:s.blockers})),publications:report.publications,...deterministicDryRun?{privateReport:dryRunDirectory+'/report.json'}:{}}));
}finally{await db.close();if(durable)await durable.close();}
}
