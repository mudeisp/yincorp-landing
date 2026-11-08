import {calendar,financialSummary} from './weekly-policy.js';
import {WeeklyLedger} from './weekly-ledger.js';
import {selectWeeklyOpportunity} from './weekly-topics.js';
import {GATES,ORIGIN,allPass,fresh,hash,slug} from './core.js';
import {inferenceSettings} from './inference-config.js';
import {validCorpus,compareTopics} from './comparison-corpus.js';
import {createEditorialAgents,INSTRUCTIONS} from './editorial.js';
import {publishArticle,releaseEvidence} from './publication.js';

export async function runWeeklyProduction({ledger,env,inventory,corpusReader,sourceReader,snapshotReader,checkLinks,editorialFactory,now}){
  if(env.VERCEL_ENV!=='production'||env.SEO_CONTENT_ENABLED!=='true'||env.SEO_CONTENT_KILL_SWITCH!=='false')return {status:'DISABLED'};
  if(!releaseEvidence(env))throw Error('production_verified_release_required');
  if(env.SEO_CONTENT_PUBLICATION_AUTHORIZED!=='true')throw Error('production_publication_disabled');
  const settings=inferenceSettings(env),period=calendar(now()),start=now(),data=await ledger.read();
  if(!data.recurring)throw Error('production_weekly_authorization_required');
  if(financialSummary(data,now()).unknownCalls)throw Error('production_call_outcome_unknown');
  const due=['SP','ES'].filter(s=>period.weekday>=(s==='SP'?1:3)&&period.hour>=9);
  const state=due.find(s=>{const id=data.recurring.jobs[period.week+':'+s],run=data.runs[id];return !run||!['PUBLISHED','WITHDRAWN'].includes(run.publication[s])&&(run.articles[s].status!=='NEEDS_REVIEW'||allPass(run.articles[s].validations));});
  if(!state)return {status:'WAITING_NEXT_SLOT',...financialSummary(data,now()),schedule:'SP Tuesday / ES Thursday 09:00 America/Sao_Paulo'};
  const stock=(await inventory(state)).filter(p=>slug(p.city)===(state==='SP'?'sao-paulo':'vitoria')&&slug(p.neighborhood)===(state==='SP'?'ipiranga':'praia-do-canto'));
  const weekly=new WeeklyLedger(ledger,now);let run=data.runs[data.recurring.jobs[period.week+':'+state]];
  if(!run){
    let gsc=data.recurring.snapshots[period.week];
    if(!gsc||!fresh(gsc.retrievedAt,now())){
      gsc=await snapshotReader({env,now:now()});
      await ledger.transaction(d=>{d.recurring.snapshots[period.week]=gsc;ledger.event(d,'WEEKLY_GSC_SNAPSHOT',{week:period.week,digest:hash(gsc),rows:gsc.response.data.length});});
    }
    const opportunity=selectWeeklyOpportunity({gsc,inventory:stock,state,data,week:period.week,now:now()});
    if(!opportunity)return {status:'NO_NEW_EVIDENCED_TOPIC',state};
    const runId=await weekly.createJob({state,gsc,configuration:settings,opportunity});run=(await ledger.read()).runs[runId];
  }
  if(hash(run.configuration)!==hash(settings))throw Error('production_run_configuration_conflict');
  let input=run.checkpoints[state+'/production-inputs'];
  const stale=value=>!validCorpus(value.corpus,now())||!value.corpus.coverage.complete||value.sources.some(s=>!fresh(s.observedAt,now()))||value.stock.some(p=>!fresh(p.checkedAt,now(),3600000)||!stock.some(c=>c.path===p.path));
  if(input&&stale(input)){
    // Refresh public evidence only before the first paid intent. Paid request
    // identities and UNKNOWN outcomes are never overwritten or replayed.
    await ledger.transaction(d=>{if(Object.values(d.recurring.calls).some(c=>c.runId===run.runId))throw Error('production_saved_evidence_stale');delete d.runs[run.runId].checkpoints[state+'/production-inputs'];ledger.event(d,'WEEKLY_UNSENT_EVIDENCE_EXPIRED',{runId:run.runId,state});});input=null;
  }
  if(!input){
    const opportunity=run.opportunity,corpus=await corpusReader({opportunity,inventory:stock,gscRows:run.gsc.response.data});
    if(!validCorpus(corpus,now())||!corpus.coverage.complete||compareTopics(opportunity,corpus.pages).length){await ledger.transaction(d=>{d.runs[run.runId].articles[state].status='NEEDS_REVIEW';ledger.event(d,'WEEKLY_TOPIC_REVIEW_REQUIRED',{runId:run.runId,state});});return {status:'NEEDS_REVIEW',state,reason:'comparison_corpus'};}
    const sources=(await sourceReader(opportunity,opportunity.scoring.stock)).slice(0,3).map(s=>{const excerpt=s.excerpt.slice(0,2000);return {...s,excerpt,digest:hash(excerpt)};});
    if(sources.length<2||!sources.some(s=>new URL(s.url).hostname!=='www.yincorp.com.br'))throw Error('production_independent_sources_required');
    input={opportunity,stock:opportunity.scoring.stock,corpus,sources};await ledger.checkpoint(run.runId,state+'/production-inputs',input);
  }
  if(stale(input))throw Error('production_saved_evidence_stale');
  if(now()-start>90000)return {status:'CHECKPOINTED',state};
  if(run.articles[state].status==='NEEDS_REVIEW')return {...await publishArticle(ledger,{runId:run.runId,state,env,now:now()}),state,...financialSummary(await ledger.read(),now())};
  const receipts=[],model=editorialFactory({ledger:weekly,runId:run.runId,article:state,settings,apiKey:env.SEO_OPENAI_API_KEY,onUsage:r=>receipts.push(r)});
  const agents=createEditorialAgents({model,checkLinks,now,requireAuditReceipt:true,requireCorpusEvidence:true,releaseEvidence:()=>releaseEvidence(env),writerModel:settings.models.write,writerReceipt:()=>receipts.find(r=>r.stage==='write'),auditReceipt:()=>receipts.find(r=>r.stage==='audit')});
  const context={...await model('research',{opportunity:input.opportunity,sources:input.sources,inventory:input.stock},INSTRUCTIONS.research+' Seja conciso; até 8 afirmações com citações literais das fontes.'),sources:input.sources};
  const content=await agents.write(input.opportunity,context),validations=await agents.verify({opportunity:input.opportunity,context,content,stock:input.stock,pages:input.corpus.pages,corpus:input.corpus});
  await ledger.article(run.runId,state,{id:run.articles[state].id,state,path:input.opportunity.targetCanonical,topicKey:input.opportunity.topicKey,status:'NEEDS_REVIEW',content,validations,validatedHash:hash(content),verifiedAt:new Date(now()).toISOString(),sources:input.sources});
  if(!allPass(validations))return {status:'NEEDS_REVIEW',state,gates:GATES.filter(g=>validations[g]?.status!=='PASS')};
  return {...await publishArticle(ledger,{runId:run.runId,state,env,now:now()}),state,...financialSummary(await ledger.read(),now())};
}
