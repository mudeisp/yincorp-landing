import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {nativeDatabase} from './scripts/seo-content-native-db.mjs';
import {DurableLedger} from './lib/seo-content/durable-ledger.js';
import {WeeklyLedger} from './lib/seo-content/weekly-ledger.js';
import {authorizeWeekly,financialSummary} from './lib/seo-content/weekly-policy.js';
import {hash} from './lib/seo-content/core.js';

test('independent PostgreSQL connections serialize weekly jobs and paid intents',{timeout:120000},async()=>{
  const local=await nativeDatabase();
  try{
    const root=new DurableLedger({pool:local.pool,key:randomBytes(32).toString('hex'),projectId:'proj_weekly_fixture'});
    await root.initialize();const now=()=>Date.parse('2026-11-10T12:00:00Z');await authorizeWeekly(root,{now:now()});
    const ledger=new WeeklyLedger(root,now),job=state=>({state,gsc:{},configuration:{},opportunity:{targetCanonical:`/${state.toLowerCase()}/conteudos/synthetic`}});
    const ids=await Promise.all(Array.from({length:20},()=>ledger.createJob(job('SP'))));assert.equal(new Set(ids).size,1);
    let sends=0;const runId=ids[0],input={synthetic:true};
    const receipt=(stage,output)=>({responseId:'resp_synthetic',resolvedModel:'fixture',model:'fixture',stage,inputHash:hash(input),outputHash:hash(output),estimatedMicros:1,inputTokens:1,outputTokens:1});
    const call=(id,article,stage)=>ledger.call({runId:id,article,stage,input,instructions:'fixture',model:'fixture'},async()=>{sends++;await new Promise(r=>setTimeout(r,50));const output={stage};return {output,receipt:receipt(stage,output)};});
    const race=await Promise.allSettled(Array.from({length:20},()=>call(runId,'SP','research')));assert.ok(race.some(r=>r.status==='fulfilled'));assert.equal(sends,1);
    for(const r of race)if(r.status==='rejected')assert.match(r.reason.message,/outcome_unknown/);
    await call(runId,'SP','write');await call(runId,'SP','audit');
    const es=await ledger.createJob(job('ES'));for(const stage of ['research','write','audit'])await call(es,'ES',stage);
    assert.equal(sends,6);assert.equal(financialSummary(await root.read(),now()).weeklyReservedMicros,600000);
    assert.equal((await root.read()).reservedMicros,0,'legacy financial records are preserved');
    await call(runId,'SP','research');assert.equal(sends,6);
  }finally{await local.close();}
});
