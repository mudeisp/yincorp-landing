import test from 'node:test';
import assert from 'node:assert/strict';
import {isolatedDatabase} from './lib/seo-content/isolated.js';
import {GATES,hash,identity,topicKey} from './lib/seo-content/core.js';
import {simulate} from './scripts/simulate-seo-content.mjs';
const gates=()=>Object.fromEntries(GATES.map(g=>[g,{status:'PASS',evidence:'Isolated database assertion '+g}]));
function opportunity(i=0,state='SP'){return {query:'Bairro '+i,state,city:'Cidade',neighborhood:'Bairro '+i,intent:'informational',targetCanonical:`/${state.toLowerCase()}/conteudos/bairro-${i}`,scoring:{value:80}};}
async function prepare(store,i=0,state='SP',day='2026-11-07'){
  const run=await store.claim({state,day,quota:5,budget:1000000}),o=opportunity(i,state),reservation=await store.reserve(run,o);
  for(const stage of ['RESEARCHING','DRAFT','VERIFYING'])await store.stage(run,reservation,stage);
  const source={url:'https://www.ibge.gov.br',observedAt:new Date().toISOString(),excerpt:'test source',digest:hash('test source')};
  const content={title:'Teste isolado'},a={id:reservation.id,state,path:o.targetCanonical,topicKey:topicKey(o),status:'APPROVED',content,sources:[source],validations:gates(),validatedHash:hash(content),verifiedAt:new Date().toISOString()};
  return {run,a};
}
test('seven-day actual SQL simulation: 35 SP + 35 ES, duplicate workers, no publication',async()=>{const r=await simulate();assert.equal(r.articles,70);assert.equal(r.published,0);assert.equal(r.reports.length,7);});
test('SQL gates, independent quotas, budget, stale lease fencing, retries, RLS and rollback',async()=>{
  const {db,store}=await isolatedDatabase();
  try{
    const {run,a}=await prepare(store);await store.save(run,a);
    await assert.rejects(db.query("update seo_articles set document=jsonb_set(document,'{content,title}','\"tampered\"') where id=$1",[a.id]),/immutable_revision/);
    await assert.rejects(db.query("update seo_articles set status='PUBLISHED' where id=$1",[a.id]),/publication_disabled/);
    assert.equal(await store.publish(run,a,{autopublish:true}),false,'DB defaults block even with runtime flag');
    await db.exec('update seo_content_settings set autopublish=true');
    for(const g of GATES){
      await db.query("update seo_validation_results set status='UNKNOWN' where article_id=$1 and gate=$2",[a.id,g]);
      assert.equal(await store.publish(run,a,{autopublish:true}),false,g);
      await db.query("update seo_validation_results set status='PASS' where article_id=$1 and gate=$2",[a.id,g]);
    }
    assert.equal(await store.publish(run,{...a,validatedHash:'changed'},{autopublish:true}),false);
    await db.query("update seo_article_sources set excerpt='tampered' where article_id=$1",[a.id]);
    await assert.rejects(store.publish(run,a,{autopublish:true}),/sources_blocked/);
    await db.query("update seo_article_sources set excerpt='test source' where article_id=$1",[a.id]);
    assert.equal(await store.publish(run,a,{autopublish:true}),true);
    assert.equal((await store.published('SP')).length,1);
    await store.rollback(a.id,'isolated rollback verification');assert.equal((await store.published('SP')).length,0);
    assert.equal(await store.rpc('spend',{run,micros:900000}),true);assert.equal(await store.rpc('spend',{run,micros:200000}),false);
    assert.equal(await store.reserve(run,opportunity()),null,'duplicate topic does not consume quota');
    await store.finish(run,'FAILED');const next=await store.claim({state:'SP',day:'2026-11-07',quota:5,budget:1000000});assert.ok(next);assert.notEqual(next.token,run.token);
    await assert.rejects(store.stage(run,{id:a.id},'FAILED'),/stale_run/);
    await store.finish(next,'FAILED');const third=await store.claim({state:'SP',day:'2026-11-07',quota:5,budget:1000000});await store.finish(third,'FAILED');assert.equal(await store.claim({state:'SP',day:'2026-11-07',quota:5,budget:1000000}),null);
    assert.equal(await store.claim({state:'RJ',day:'2026-11-07',quota:5,budget:1000000}),null);
    await db.exec('set role anon');await assert.rejects(db.query('select * from seo_articles'),/permission denied/);await assert.rejects(db.query("select seo_content_command('published','{}')"),/permission denied/);await db.exec('reset role');
    await db.exec('update seo_content_settings set kill_switch=true');assert.equal(await store.claim({state:'ES',day:'2026-11-07',quota:5,budget:1000000}),null);
  }finally{await db.close();}
});
