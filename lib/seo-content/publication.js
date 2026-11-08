import {allPass,canonicalPath,fresh,hash} from './core.js';
import {validateEditorialOutput} from './openai-editorial.js';

export function releaseEvidence(env=process.env){
  const sha=env.VERCEL_GIT_COMMIT_SHA;
  return env.VERCEL_ENV==='production'&&/^[a-f0-9]{40}$/.test(sha||'')&&sha===env.SEO_CONTENT_VERIFIED_RELEASE_SHA
    ?{status:'PASS',evidence:'CI verified deployment '+sha}:null;
}

export async function publishArticle(ledger,{runId,state,env=process.env,now=Date.now()}){
  if(env.SEO_CONTENT_PUBLICATION_AUTHORIZED!=='true'||env.SEO_CONTENT_ENABLED!=='true'||env.SEO_CONTENT_KILL_SWITCH!=='false'||!releaseEvidence(env))throw Error('production_publication_disabled');
  return ledger.transaction(data=>{
    const run=data.runs[runId],article=run?.articles[state];
    if(!run||!article||!['SP','ES'].includes(state))throw Error('production_article_missing');
    if(run.publication[state]==='PUBLISHED')return {status:'ALREADY_PUBLISHED',path:article.path};
    if(data.reconciliation.status!=='RECONCILED'||Object.values(data.calls).some(c=>c.status!=='COMPLETE'))throw Error('production_financial_state_unknown');
    if(article.simulation||article.status!=='NEEDS_REVIEW'||article.state!==state||!canonicalPath(article.path,state)||!allPass(article.validations)||article.validatedHash!==hash(article.content)||!fresh(article.verifiedAt,now,3600000))throw Error('production_article_not_approved');
    validateEditorialOutput('write',article.content);
    const writer=data.calls[state+'/write'],auditor=data.calls[state+'/audit'];
    if(writer?.runId!==runId||auditor?.runId!==runId||writer?.result?.receipt?.outputHash!==hash(article.content)||!writer?.result?.receipt?.resolvedModel||!auditor?.result?.receipt?.resolvedModel||writer.result.receipt.resolvedModel===auditor.result.receipt.resolvedModel||!auditor.result.receipt.responseId||hash(auditor.request.input.content)!==hash(article.content)||auditor.result.receipt.inputHash!==hash(auditor.request.input))throw Error('production_audit_receipt_required');
    // Export only this validated article through the reader. Financial/GSC/call
    // records stay encrypted; no public-schema table or Data API grants needed.
    article.status='PUBLISHED';article.publishedAt=new Date(now).toISOString();
    article.releaseSha=env.VERCEL_GIT_COMMIT_SHA;run.publication[state]='PUBLISHED';run.approval[state]='AUTOMATIC_GATES_PASSED';
    ledger.event(data,'ARTICLE_PUBLISHED',{runId,state,path:article.path,contentHash:article.validatedHash,releaseSha:article.releaseSha});
    return {status:'PUBLISHED',path:article.path};
  });
}

export async function withdrawArticle(ledger,{runId,state,reason}){
  if(!['SP','ES'].includes(state)||typeof reason!=='string'||reason.length<5||reason.length>300)throw Error('production_withdrawal_invalid');
  return ledger.transaction(data=>{
    const run=data.runs[runId];if(!run?.articles[state])throw Error('production_article_missing');
    run.publication[state]='WITHDRAWN';run.articles[state].status='WITHDRAWN';
    ledger.event(data,'ARTICLE_WITHDRAWN',{runId,state,reason});return {status:'WITHDRAWN'};
  });
}

export function publishedArticles(data,state){
  return Object.values(data.runs).flatMap(run=>{
    const a=run.articles[state];
    if(run.publication[state]!=='PUBLISHED'||a?.status!=='PUBLISHED'||a.state!==state||a.simulation||a.validatedHash!==hash(a.content)||!allPass(a.validations)||!canonicalPath(a.path,state))return [];
    return [{id:a.id,state:a.state,path:a.path,status:a.status,content:a.content,validations:a.validations,publishedAt:a.publishedAt,sources:(a.sources||[]).map(s=>({url:s.url,observedAt:s.observedAt}))}];
  });
}
