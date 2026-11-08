import {readFile} from 'node:fs/promises';
import {DurableLedger,ledgerPool,assertLedgerRole} from '../lib/seo-content/durable-ledger.js';
import {inferenceSettings} from '../lib/seo-content/inference-config.js';
import {hash} from '../lib/seo-content/core.js';

// Explicit lifecycle tooling; never migration, provider inference or publication.
let pool;
try {
  const command=process.argv[2];
  if(!['initialize','status','prepare','review-request','reconcile','recover-response'].includes(command))throw Error('invalid_private_ledger_command');
  pool=ledgerPool();
  await assertLedgerRole(pool);
  const ledger=new DurableLedger({pool,key:process.env.SEO_CONTENT_LEDGER_KEY,projectId:process.env.SEO_CONTENT_OPENAI_PROJECT_ID});
  if(command==='initialize')await ledger.initialize();
  if(command==='reconcile')await ledger.reconcileReviewed(JSON.parse(await readFile(process.argv[3],'utf8')));
  if(command==='recover-response')await ledger.recoverResponse(process.argv[3],process.argv[4]);
  if(command==='prepare'){
    const gscRaw=await readFile(process.argv[3],'utf8'),gsc=JSON.parse(gscRaw);
    if(gsc.provider!=='windsor/searchconsole'||gsc.account!=='https://www.yincorp.com.br/'||gsc.response?.status!=='done'||!Array.isArray(gsc.response.data))throw Error('authenticated_gsc_export_required');
    // Saving an authorization is not proof that historical spend is zero.
    const configuration=inferenceSettings();
    await ledger.createRun({authorizedMicros:configuration.approvedBudgetMicros,gsc,gscRaw,configuration});
  }
  const state=await ledger.read();
  if(command==='review-request')console.log(JSON.stringify({snapshotHash:hash(state),scope:state.scope,projectId:state.projectId,
    authorizationMicros:600000,ledgerCalls:Object.keys(state.calls).length,reconciliation:state.reconciliation.status,
    note:'Reviewer must obtain complete official usage/cost exports independently; this is not proof of zero cost.'}));
  console.log(JSON.stringify({status:state.reconciliation.status==='RECONCILED'?'PRIVATE_CHECKPOINT_ONLY':'BLOCKED',reconciliation:state.reconciliation.status,
    runIds:Object.keys(state.runs),authorizedMicros:state.authorizedMicros,reservedMicros:state.reservedMicros,
    estimatedRecordedMicros:state.estimatedMicros,availableMicros:state.reconciliation.status==='RECONCILED'?Math.max(0,state.authorizedMicros-state.reservedMicros-state.reconciliation.priorSpentMicros):null,
    unknownCalls:Object.values(state.calls).filter(c=>c.status!=='COMPLETE').length,
    autopublish:false,note:'Status does not authorize inference; historical balance must be reconciled.'}));
}catch{
  // Do not echo database exception, URL, TLS material, query text or credentials.
  console.error('private_ledger_command_blocked');process.exitCode=1;
}finally{if(pool)await pool.end();}
