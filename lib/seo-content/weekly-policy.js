import {dayInBrazil,hash} from './core.js';

export const WEEKLY_LIMIT=600000,MONTHLY_LIMIT=3000000,ARTICLE_LIMIT=300000,CALL_LIMIT=100000;
export function calendar(now=Date.now()){
  const day=dayInBrazil(new Date(now)),date=new Date(day+'T12:00:00Z'),weekday=(date.getUTCDay()+6)%7;
  date.setUTCDate(date.getUTCDate()-weekday);
  const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'America/Sao_Paulo',hour:'2-digit',hourCycle:'h23'}).format(new Date(now)));
  return {day,month:day.slice(0,7),week:date.toISOString().slice(0,10),weekday,hour};
}
export function validateWeekly(data){
  const r=data.recurring;if(!r)return;
  if(r.version!==1||r.policy.weeklyMicros!==WEEKLY_LIMIT||r.policy.monthlyMicros!==MONTHLY_LIMIT||!Number.isFinite(Date.parse(r.policy.effectiveAt)))throw Error('production_weekly_policy_invalid');
  const weeks={},months={},articles={};
  for(const c of Object.values(r.calls)){
    if(!Number.isFinite(Date.parse(c.createdAt))||calendar(Date.parse(c.createdAt)).week!==c.week||calendar(Date.parse(c.createdAt)).month!==c.month)throw Error('production_weekly_period_invalid');
    if(!['UNKNOWN','COMPLETE'].includes(c.status)||!Number.isSafeInteger(c.reservedMicros)||c.reservedMicros<1||c.reservedMicros>CALL_LIMIT||c.requestHash!==hash(c.request)||!data.runs[c.runId]?.schedule||c.week!==data.runs[c.runId].schedule.week||!/^\d{4}-\d{2}$/.test(c.month)||Date.parse(c.createdAt)<Date.parse(r.policy.effectiveAt))throw Error('production_weekly_call_invalid');
    weeks[c.week]=(weeks[c.week]||0)+c.reservedMicros;months[c.month]=(months[c.month]||0)+c.reservedMicros;articles[c.runId]=(articles[c.runId]||0)+c.reservedMicros;
    if(c.status==='COMPLETE'&&(!Number.isSafeInteger(c.result?.receipt?.estimatedMicros)||c.result.receipt.estimatedMicros<0||c.result.receipt.estimatedMicros>c.reservedMicros))throw Error('production_weekly_receipt_invalid');
  }
  if(Object.values(weeks).some(n=>n>WEEKLY_LIMIT)||Object.values(months).some(n=>n>MONTHLY_LIMIT)||Object.values(articles).some(n=>n>ARTICLE_LIMIT))throw Error('production_weekly_budget_invalid');
  for(const [key,id] of Object.entries(r.jobs)){const run=data.runs[id];if(!run?.schedule||key!==run.schedule.week+':'+run.schedule.state)throw Error('production_weekly_job_invalid');}
}
export function financialSummary(data,now=Date.now()){
  const period=calendar(now),r=data.recurring,calls=Object.values(r?.calls||{});
  return {policy:r?'AUTHORIZED_FUTURE_CYCLES':'NOT_CONFIGURED',week:period.week,month:period.month,weeklyLimitMicros:WEEKLY_LIMIT,monthlyLimitMicros:MONTHLY_LIMIT,weeklyReservedMicros:calls.filter(c=>c.week===period.week).reduce((n,c)=>n+c.reservedMicros,0),monthlyReservedMicros:calls.filter(c=>c.month===period.month).reduce((n,c)=>n+c.reservedMicros,0),unknownCalls:[...Object.values(data.calls),...calls].filter(c=>c.status!=='COMPLETE').length,historicalReconciliation:data.reconciliation.status};
}
export async function authorizeWeekly(ledger,{now=Date.now()}={}){
  return ledger.transaction(data=>{
    if(Object.values(data.calls).some(c=>c.status!=='COMPLETE'))throw Error('production_call_outcome_unknown');
    if(data.recurring){validateWeekly(data);return {status:'ALREADY_AUTHORIZED',...financialSummary(data,now)};}
    data.recurring={version:1,policy:{weeklyMicros:WEEKLY_LIMIT,monthlyMicros:MONTHLY_LIMIT,effectiveAt:new Date(now).toISOString(),authorization:'OWNER_APPROVED_WEEKLY_SP_ES_2026_11_08'},jobs:{},calls:{},snapshots:{}};
    ledger.event(data,'WEEKLY_FUTURE_BUDGET_AUTHORIZED',{weeklyMicros:WEEKLY_LIMIT,monthlyMicros:MONTHLY_LIMIT,effectiveAt:data.recurring.policy.effectiveAt,historicalReconciliationUnchanged:true});
    return {status:'AUTHORIZED_FUTURE_CYCLES',...financialSummary(data,now)};
  });
}
