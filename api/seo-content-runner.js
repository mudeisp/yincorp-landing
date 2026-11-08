import {authorized} from './seo-content.js';
import {ledgerPool,assertLedgerRole,DurableLedger} from '../lib/seo-content/durable-ledger.js';
import {inspectStorage,safeFailure,ledgerConfigurationIssues} from '../lib/seo-content/diagnostics.js';
import {productionReadiness,runProduction} from '../lib/seo-content/production.js';
import {withdrawArticle} from '../lib/seo-content/publication.js';
import {hash} from '../lib/seo-content/core.js';
import {authorizeWeekly,financialSummary} from '../lib/seo-content/weekly-policy.js';
import {providerPreflight} from '../lib/seo-content/provider-preflight.js';

export function createRunner({env=process.env,connect=ledgerPool,run=runProduction}={}){
  return async(req,res)=>{
    res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Robots-Tag','noindex, nofollow');
    if(!authorized(req.headers.authorization,env.CRON_SECRET))return res.status(401).json({error:'unauthorized'});
    if(!['GET','POST'].includes(req.method))return res.status(405).end();
    const op=new URL(req.url,'https://www.yincorp.com.br').searchParams.get('op')||'run';
    if(!['run','health','review-request','initialize','reconcile','withdraw','authorize-weekly','status','providers'].includes(op))return res.status(400).json({error:'invalid_operation'});
    if(op!=='health'&&env.VERCEL_ENV!=='production')return res.status(503).json({error:'production_environment_required'});
    if(['initialize','reconcile','withdraw','authorize-weekly'].includes(op)&&req.method!=='POST')return res.status(405).end();
    if(['initialize','reconcile','authorize-weekly'].includes(op)&&(env.SEO_CONTENT_INFERENCE_AUTHORIZED!=='false'||env.SEO_CONTENT_PUBLICATION_AUTHORIZED==='true'))return res.status(409).json({error:'production_provisioning_requires_inference_disabled'});
    const readiness=productionReadiness(env);
    if(readiness.status==='BLOCKED')return res.status(503).json(readiness);
    const configurationIssues=ledgerConfigurationIssues(env);
    if(configurationIssues.length)return res.status(503).json({status:'BLOCKED',stage:'configuration',reason:'private_ledger_configuration_required',configurationIssues});
    let pool,stage='configuration';
    try{
      pool=connect(env);stage='connection';await assertLedgerRole(pool);
      const ledger=new DurableLedger({pool,key:env.SEO_CONTENT_LEDGER_KEY,projectId:env.SEO_CONTENT_OPENAI_PROJECT_ID});
      stage='storage';
      if(op==='health')return res.status(200).json({readiness,storage:await inspectStorage(pool,env)});
      if(op==='providers'){stage='providers';return res.status(200).json(await providerPreflight({env}));}
      if(op==='authorize-weekly')return res.status(200).json(await authorizeWeekly(ledger));
      if(op==='status'){const data=await ledger.read();return res.status(200).json({...financialSummary(data),jobs:Object.values(data.runs).map(r=>({runId:r.runId,schedule:r.schedule,publication:r.publication,articles:Object.entries(r.articles).map(([state,a])=>({state,status:a.status,path:a.path,gates:a.validations}))}))});}
      if(op==='review-request'){const data=await ledger.read();return res.status(200).json({snapshotHash:hash(data),scope:data.scope,projectId:data.projectId,authorizationMicros:600000,reconciliation:data.reconciliation.status,ledgerCalls:Object.keys(data.calls).length});}
      if(op==='initialize'){await ledger.initialize();return res.status(200).json({status:'INITIALIZED_UNKNOWN'});}
      if(op==='reconcile'){
        if(!req.body||Buffer.byteLength(JSON.stringify(req.body))>1000000)return res.status(400).json({error:'production_review_invalid'});
        await ledger.reconcileReviewed(req.body,env.SEO_CONTENT_RECONCILIATION_REVIEW_PUBLIC_KEY);return res.status(200).json({status:'RECONCILED'});
      }
      if(op==='withdraw')return res.status(200).json(await withdrawArticle(ledger,req.body||{}));
      stage='generation';return res.status(200).json(await run({ledger,env}));
    }catch(error){const failure=safeFailure(error,stage);console.error(JSON.stringify({component:'seo-content-runner',...failure}));return res.status(503).json(failure);}
    finally{if(pool)await pool.end();}
  };
}
export default createRunner();
