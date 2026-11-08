import {randomUUID} from 'node:crypto';
import {hash,canonicalPath} from './core.js';
import {calendar,financialSummary,ARTICLE_LIMIT,CALL_LIMIT,WEEKLY_LIMIT,MONTHLY_LIMIT} from './weekly-policy.js';

export class WeeklyLedger{
  constructor(ledger,now=Date.now){this.ledger=ledger;this.now=now;}
  async createJob({state,gsc,configuration,opportunity}){
    if(!['SP','ES'].includes(state)||!canonicalPath(opportunity?.targetCanonical,state))throw Error('production_weekly_job_invalid');
    const period=calendar(this.now());
    return this.ledger.transaction(data=>{
      const recurring=data.recurring;if(!recurring)throw Error('production_weekly_authorization_required');
      const key=period.week+':'+state;
      if(recurring.jobs[key])return recurring.jobs[key];
      if(Object.values(data.runs).some(r=>r.opportunity?.targetCanonical===opportunity.targetCanonical||Object.values(r.articles).some(a=>a.path===opportunity.targetCanonical)))throw Error('production_topic_already_reserved');
      const runId=randomUUID();
      data.runs[runId]={runId,configuration,gsc,opportunity,schedule:{week:period.week,state},autopublish:false,status:'READY_PRIVATE',approval:{[state]:'PENDING'},publication:{[state]:'NOT_PUBLISHED'},articles:{[state]:{id:randomUUID(),status:'NOT_STARTED'}},checkpoints:{}};
      recurring.jobs[key]=runId;
      this.ledger.event(data,'WEEKLY_JOB_CREATED',{runId,state,week:period.week,path:opportunity.targetCanonical});return runId;
    });
  }
  async call({runId,article,stage,input,instructions,model,maxCostMicros=CALL_LIMIT},invoke){
    if(!['SP','ES'].includes(article)||!['research','write','audit'].includes(stage)||maxCostMicros!==CALL_LIMIT)throw Error('production_weekly_call_invalid');
    const request={input,instructions,model},requestHash=hash(request),callKey=runId+'/'+article+'/'+stage;
    const intent=await this.ledger.transaction(data=>{
      const r=data.recurring,run=data.runs[runId],period=calendar(this.now());
      if(!r||!run?.schedule||run.schedule.state!==article||run.schedule.week!==period.week)throw Error('production_weekly_job_expired');
      const existing=r.calls[callKey];
      if(existing){if(existing.requestHash!==requestHash)throw Error('private_call_identity_conflict');if(existing.status!=='COMPLETE')throw Error('private_call_outcome_unknown');return {cached:existing.result};}
      if([...Object.values(data.calls),...Object.values(r.calls)].some(c=>c.status!=='COMPLETE'))throw Error('private_call_outcome_unknown');
      const summary=financialSummary(data,this.now()),articleReserved=Object.values(r.calls).filter(c=>c.runId===runId).reduce((n,c)=>n+c.reservedMicros,0);
      if(summary.weeklyReservedMicros+maxCostMicros>WEEKLY_LIMIT||summary.monthlyReservedMicros+maxCostMicros>MONTHLY_LIMIT||articleReserved+maxCostMicros>ARTICLE_LIMIT)throw Error('private_budget_exhausted');
      const callId=randomUUID();r.calls[callKey]={runId,callId,article,stage,request,requestHash,status:'UNKNOWN',reservedMicros:maxCostMicros,week:period.week,month:period.month,createdAt:new Date(this.now()).toISOString()};
      this.ledger.event(data,'WEEKLY_CALL_RESERVED_UNKNOWN',{runId,callId,stage,week:period.week,month:period.month,reservedMicros:maxCostMicros});return {callId};
    });
    if(Object.hasOwn(intent,'cached'))return intent.cached;
    const checkpoint=async response=>this.ledger.transaction(data=>{const c=data.recurring.calls[callKey];if(c.callId!==intent.callId||c.status!=='UNKNOWN')throw Error('private_call_identity_conflict');c.response=response;this.ledger.event(data,'WEEKLY_RESPONSE_SAVED',{callId:c.callId,digest:hash(response)});});
    let result;
    try{result=await invoke({callId:intent.callId,checkpoint});}
    catch(error){
      const code=/^editorial_[a-z_]{1,80}$/.test(error?.message||'')?error.message:'private_provider_interrupted';
      try{await this.ledger.transaction(data=>{data.recurring.calls[callKey].errorCode=code;data.runs[runId].status='BLOCKED_UNKNOWN';this.ledger.event(data,'WEEKLY_CALL_INTERRUPTED',{callId:intent.callId,code});});}catch{}
      throw Error(code);
    }
    const receipt=result?.receipt;
    if(!receipt?.responseId||!receipt.resolvedModel||receipt.model!==model||receipt.stage!==stage||receipt.inputHash!==hash(input)||receipt.outputHash!==hash(result.output)||!Number.isSafeInteger(receipt.inputTokens)||receipt.inputTokens<0||!Number.isSafeInteger(receipt.outputTokens)||receipt.outputTokens<0||receipt.outputTokens>4000||!Number.isSafeInteger(receipt.estimatedMicros)||receipt.estimatedMicros<0||receipt.estimatedMicros>maxCostMicros)throw Error('private_receipt_invalid');
    await this.ledger.transaction(data=>{const c=data.recurring.calls[callKey];if(c.callId!==intent.callId||c.status!=='UNKNOWN')throw Error('private_call_identity_conflict');c.result=result;c.status='COMPLETE';data.runs[runId].status='CHECKPOINTED';this.ledger.event(data,'WEEKLY_CALL_COMPLETED',{callId:intent.callId,responseId:receipt.responseId});});
    return result;
  }
}
