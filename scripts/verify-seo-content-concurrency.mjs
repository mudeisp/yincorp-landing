import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {nativeDatabase} from './seo-content-native-db.mjs';
import {GATES,hash,topicKey} from '../lib/seo-content/core.js';
export async function verifyConcurrency(){
  const local=await nativeDatabase(),{pool,store,rpc}=local;
  try{
    await pool.query('update seo_content_settings set enabled=true,kill_switch=false');
    const clients=await Promise.all(Array.from({length:8},()=>pool.connect()));
    let backendPids;
    try{backendPids=(await Promise.all(clients.map(c=>c.query('select pg_backend_pid() pid, pg_sleep(0.15)')))).map(r=>r.rows[0].pid);assert.equal(new Set(backendPids).size,8);}finally{clients.forEach(c=>c.release());}
    const runs={};
    for(const state of ['SP','ES']){
      const attempts=await Promise.all(Array.from({length:20},()=>store.claim({state,day:'2026-11-07',quota:5,budget:1000000})));
      assert.equal(attempts.filter(Boolean).length,1);runs[state]=attempts.find(Boolean);
    }
    const opportunities=state=>Array.from({length:20},(_,i)=>({state,city:'Cidade',neighborhood:'Bairro '+i,query:'Como avaliar bairro '+i,intent:'informational',targetCanonical:`/${state.toLowerCase()}/conteudos/bairro-${i}`,scoring:{value:80}}));
    const reserved={};
    for(const state of ['SP','ES']){
      const topics=opportunities(state);reserved[state]=(await Promise.all(topics.flatMap(o=>[store.reserve(runs[state],o),store.reserve(runs[state],o)]))).filter(Boolean);
      assert.equal(reserved[state].length,5);assert.equal(new Set(reserved[state].map(x=>x.id)).size,5);
    }
    const spending=await Promise.all(Array.from({length:20},()=>rpc('spend',{run:runs.SP,micros:100000})));assert.equal(spending.filter(Boolean).length,10);
    const [writer,reader]=await Promise.all([pool.connect(),pool.connect()]);
    try{
      await writer.query('begin');await writer.query("update seo_state_config set quota=1 where state='SP'");
      assert.equal((await reader.query("select quota from seo_state_config where state='SP'")).rows[0].quota,5,'another backend cannot see uncommitted settings');
      await assert.rejects(reader.query("select quota from seo_state_config where state='SP' for update nowait"),/could not obtain lock/);
    }finally{await writer.query('rollback');writer.release();reader.release();}
    await pool.query("update seo_publication_runs set lease_until=now()-interval '1 second' where id=$1",[runs.SP.id]);
    const reclaimed=await store.claim({state:'SP',day:'2026-11-07',quota:5,budget:1000000});assert.notEqual(reclaimed.token,runs.SP.token);
    await assert.rejects(rpc('spend',{run:runs.SP,micros:1}),/stale_run/);assert.equal(await store.reserve(reclaimed,opportunities('SP')[19]),null,'reclaim never refills quota');await store.finish(reclaimed,'COMPLETE');
    assert.equal(await store.claim({state:'SP',day:'2026-11-07',quota:5,budget:1000000}),null);
    const a=reserved.ES[0],o=(await pool.query('select evidence_payload from seo_opportunities where id=$1',[a.id])).rows[0].evidence_payload;
    for(const stage of ['RESEARCHING','DRAFT','VERIFYING'])await store.stage(runs.ES,a,stage);
    const content={title:'Isolated gate and rollback verification'};
    const article={id:a.id,state:'ES',path:o.targetCanonical,topicKey:topicKey(o),status:'APPROVED',content,validations:Object.fromEntries(GATES.map(g=>[g,{status:'PASS',evidence:'isolated SQL assertion'}])),sources:[{url:'https://www.ibge.gov.br',excerpt:'fixture only',digest:hash('fixture only'),observedAt:new Date().toISOString()}],validatedHash:hash(content),verifiedAt:new Date().toISOString()};
    await store.save(runs.ES,article);assert.equal(await store.publish(runs.ES,article,{autopublish:false}),false);assert.equal(await store.publish(runs.ES,article,{autopublish:true}),false,'DB flag is false');
    await pool.query('update seo_content_settings set autopublish=true');
    for(const gate of GATES)for(const status of ['FAIL','UNKNOWN']){
      await pool.query('update seo_validation_results set status=$1 where article_id=$2 and gate=$3',[status,a.id,gate]);
      assert.equal(await store.publish(runs.ES,article,{autopublish:true}),false);
      await pool.query("update seo_validation_results set status='PASS' where article_id=$1 and gate=$2",[a.id,gate]);
    }
    assert.equal(await store.publish(runs.ES,article,{autopublish:true}),true,'positive publication exists only in the disposable local fixture');
    assert.equal(await store.rollback(a.id,'local fixture rollback'),true);assert.deepEqual(await store.published('ES'),[]);
    await pool.query('update seo_content_settings set autopublish=false,kill_switch=true');
    assert.equal(await store.claim({state:'SP',day:'2026-11-08',quota:5,budget:1000000}),null);
    const c=await pool.connect();
    try{for(const role of ['anon','authenticated']){await c.query('set role '+role);await assert.rejects(c.query('select * from seo_articles'),/permission denied/);await assert.rejects(c.query("select seo_content_command('preview','{}')"),/permission denied/);await c.query('reset role');}}finally{c.release();}
    const counts=(await pool.query('select state,candidates,spent_micros from seo_publication_runs order by state')).rows;
    assert.equal(counts.length,2);assert.ok(counts.every(r=>r.candidates===5));
    const published=Number((await pool.query("select count(*) n from seo_articles where status='PUBLISHED'")).rows[0].n);assert.equal(published,0);
    return {...local.info,backendPids,independentConnections:new Set(backendPids).size,claimRacesPerState:20,reservationCallsPerState:40,counts,publicationAtEnd:published,publicPublication:0,checks:{quotas:'PASS',idempotency:'PASS',concurrentBudget:'PASS',transactionIsolation:'PASS',leaseFencing:'PASS',rls:'PASS',killSwitch:'PASS',failUnknownGates:'PASS',rollback:'PASS',noUnduePublication:'PASS'},fixtureNote:'One positive publish and rollback occurred exclusively in a throwaway local PostgreSQL fixture; no business article or remote DB was published.'};
  }finally{await local.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const r=await verifyConcurrency();await mkdir('docs/evidence/v2',{recursive:true});await writeFile('docs/evidence/v2/postgres-concurrency.json',JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify(r));}
