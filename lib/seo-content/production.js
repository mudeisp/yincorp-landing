import {GATES,ORIGIN,allPass,fresh,hash,slug} from './core.js';
import {contentInventory} from './inventory.js';
import {selectOpportunity} from './discovery.js';
import {comparisonCorpus,compareTopics,validCorpus} from './comparison-corpus.js';
import {SOURCE_REGISTRY,sourceRetriever} from './sources.js';
import {checkPublicLinks} from './providers.js';
import {createEditorialAgents,INSTRUCTIONS} from './editorial.js';
import {inferenceSettings} from './inference-config.js';
import {durableEditorial} from './durable-editorial.js';
import {gscSnapshot} from './gsc-snapshot.js';
import {publishArticle,releaseEvidence} from './publication.js';

export function productionReadiness(env=process.env){
  const missing=[];
  for(const key of ['SEO_CONTENT_LEDGER_DATABASE_URL','SEO_CONTENT_LEDGER_TLS_CA','SEO_CONTENT_LEDGER_KEY','SEO_CONTENT_OPENAI_PROJECT_ID','CRON_SECRET'])if(!env[key])missing.push(key);
  if(env.CRON_SECRET&&env.CRON_SECRET.length<32)missing.push('CRON_SECRET_MIN_32');
  return {status:missing.length?'BLOCKED':'CONFIGURED',missing,release:releaseEvidence(env)?'VERIFIED':'UNVERIFIED',inferenceAuthorized:env.SEO_CONTENT_INFERENCE_AUTHORIZED==='true',publicationAuthorized:env.SEO_CONTENT_PUBLICATION_AUTHORIZED==='true'};
}

async function collectSources(opportunity,stock){
  const registry=SOURCE_REGISTRY[opportunity.state+'/'+slug(opportunity.city)]||[],sources=[];
  for(const entry of registry)sources.push(await sourceRetriever({allowlist:registry})(entry.url));
  for(const property of stock.slice(0,2))sources.push(await sourceRetriever({allowlist:[{host:'www.yincorp.com.br',pathPrefix:property.path}]})(ORIGIN+property.path));
  if(sources.length<2||!sources.some(s=>new URL(s.url).hostname!=='www.yincorp.com.br'))throw Error('production_independent_sources_required');
  return sources;
}

// One article per invocation; concurrent invocations serialize paid intents in
// the ledger. UNKNOWN is never retried, including after serverless termination.
export async function runProduction({ledger,env=process.env,inventory=contentInventory,corpusReader=comparisonCorpus,sourceReader=collectSources,snapshotReader=gscSnapshot,checkLinks=checkPublicLinks,editorialFactory=durableEditorial,now=Date.now}={}){
  if(env.VERCEL_ENV!=='production'||env.SEO_CONTENT_ENABLED!=='true'||env.SEO_CONTENT_KILL_SWITCH!=='false')return {status:'DISABLED'};
  if(!releaseEvidence(env))throw Error('production_verified_release_required');
  if(env.SEO_CONTENT_PUBLICATION_AUTHORIZED!=='true')throw Error('production_publication_disabled');
  const settings=inferenceSettings(env),started=now();
  let data=await ledger.read();
  if(data.reconciliation.status!=='RECONCILED')throw Error('production_consumption_unknown');
  if(Object.values(data.calls).some(c=>c.status!=='COMPLETE'))throw Error('production_call_outcome_unknown');
  let run=Object.values(data.runs)[0];
  if(!run){
    const gsc=await snapshotReader({env,now:now()});
    const runId=await ledger.createRun({authorizedMicros:settings.approvedBudgetMicros,gsc,configuration:settings});
    data=await ledger.read();run=data.runs[runId];
  }
  if(hash(run.configuration)!==hash(settings))throw Error('production_run_configuration_conflict');
  const state=['SP','ES'].find(s=>!['PUBLISHED','WITHDRAWN'].includes(run.publication[s]));
  if(!state)return {status:'PILOT_COMPLETE',published:Object.values(run.publication).filter(p=>p==='PUBLISHED').length,note:'Existing lifetime budget is preserved; no automatic reset.'};
  if(run.articles[state]?.status==='NEEDS_REVIEW'){
    if(!allPass(run.articles[state].validations))return {status:'NEEDS_REVIEW',state,gates:GATES.filter(g=>run.articles[state].validations?.[g]?.status!=='PASS')};
    const saved=run.checkpoints[state+'/production-inputs'],current=await inventory(state);
    if(!saved||!validCorpus(saved.corpus,now())||!saved.corpus.coverage.complete||saved.stock.some(p=>!current.some(c=>c.path===p.path&&c.state===p.state&&slug(c.city)===slug(p.city)&&slug(c.neighborhood)===slug(p.neighborhood))))throw Error('production_saved_evidence_stale');
    return {...await publishArticle(ledger,{runId:run.runId,state,env,now:now()}),state};
  }
  if(!fresh(run.gsc.retrievedAt,now()))throw Error('production_gsc_snapshot_stale');
  const allInventory=await inventory(state),stockForArea=allInventory.filter(p=>slug(p.city)===(state==='SP'?'sao-paulo':'vitoria')&&slug(p.neighborhood)===(state==='SP'?'ipiranga':'praia-do-canto'));
  let input=run.checkpoints[state+'/production-inputs'];
  if(!input){
    const opportunity=selectOpportunity({rows:run.gsc.response.data,inventory:stockForArea,state,windowStart:run.gsc.windowStart,windowEnd:run.gsc.windowEnd,observedAt:run.gsc.retrievedAt,now:now()});
    if(!opportunity)throw Error('production_evidenced_opportunity_required');
    const stock=opportunity.scoring.stock.slice(0,5),corpus=await corpusReader({opportunity,inventory:stockForArea,gscRows:run.gsc.response.data});
    if(!validCorpus(corpus,now())||!corpus.coverage.complete||compareTopics(opportunity,corpus.pages).length)throw Error('production_corpus_requires_review');
    const sources=await sourceReader(opportunity,stock);
    input={opportunity,stock,corpus,sources};await ledger.checkpoint(run.runId,state+'/production-inputs',input);
  }
  if(!validCorpus(input.corpus,now())||!input.corpus.coverage.complete||input.sources.some(s=>!fresh(s.observedAt,now()))||input.stock.some(p=>!fresh(p.checkedAt,now(),3600000)||!allInventory.some(current=>current.path===p.path&&current.state===p.state&&slug(current.city)===slug(p.city)&&slug(current.neighborhood)===slug(p.neighborhood))))throw Error('production_saved_evidence_stale');
  // Leave room for three bounded provider calls and DB commits. A slow preflight
  // can be resumed from the persisted evidence without spending in this request.
  if(now()-started>90000)return {status:'CHECKPOINTED',state,reason:'production_preflight_time_budget'};
  const receipts=[];
  const model=editorialFactory({ledger,runId:run.runId,article:state,settings,apiKey:env.SEO_OPENAI_API_KEY,onUsage:r=>receipts.push(r)});
  const agents=createEditorialAgents({model,checkLinks,now,requireAuditReceipt:true,requireCorpusEvidence:true,releaseEvidence:()=>releaseEvidence(env),writerModel:settings.models.write,writerReceipt:()=>receipts.find(r=>r.stage==='write'),auditReceipt:()=>receipts.find(r=>r.stage==='audit')});
  const context={...await model('research',{opportunity:input.opportunity,sources:input.sources,inventory:input.stock},INSTRUCTIONS.research),sources:input.sources};
  const content=await agents.write(input.opportunity,context);
  const validations=await agents.verify({opportunity:input.opportunity,context,content,stock:input.stock,pages:input.corpus.pages,corpus:input.corpus});
  const article={id:run.articles[state].id,state,path:input.opportunity.targetCanonical,topicKey:input.opportunity.topicKey,status:'NEEDS_REVIEW',content,validations,validatedHash:hash(content),verifiedAt:new Date(now()).toISOString(),sources:input.sources};
  await ledger.article(run.runId,state,article);
  if(!allPass(validations))return {status:'NEEDS_REVIEW',state,gates:GATES.filter(g=>validations[g]?.status!=='PASS')};
  return {...await publishArticle(ledger,{runId:run.runId,state,env,now:now()}),state};
}
