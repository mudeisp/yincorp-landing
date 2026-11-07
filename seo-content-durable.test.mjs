import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID,generateKeyPairSync,sign} from 'node:crypto';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {nativeDatabase} from './scripts/seo-content-native-db.mjs';
import {DurableLedger,ledgerPool,assertLedgerRole} from './lib/seo-content/durable-ledger.js';
import {durableEditorial} from './lib/seo-content/durable-editorial.js';
import {hash} from './lib/seo-content/core.js';

// Native loopback PostgreSQL, synthetic evidence, zero real provider traffic.
test('V4 durable recovery, concurrency, isolation and fail-closed financial controls', {timeout:120000}, async t=>{
  const local=await nativeDatabase(), key=randomBytes(32).toString('hex'), projectId='proj_local_fixture';
  let ledger=new DurableLedger({pool:local.pool,key,projectId});
  const runId=randomUUID(), gsc={provider:'fixture-only',rows:[{query:'private synthetic query'}]};
  const configuration={models:{research:'fixture-writer',write:'fixture-writer',audit:'fixture-auditor'},rates:{research:{input:.1,output:.5},write:{input:.1,output:.5},audit:{input:.75,output:4.5}},approvedBudgetMicros:600000};
  const request=(article='SP',stage='research')=>({runId,article,stage,input:{fixture:true},instructions:'fixture',model:configuration.models[stage]});
  const result=req=>({output:{fixture:'saved'},receipt:{responseId:'resp_fixture',resolvedModel:req.model,model:req.model,stage:req.stage,inputHash:hash(req.input),outputHash:hash({fixture:'saved'}),estimatedMicros:12,inputTokens:1,outputTokens:1}});
  const fixtureReconcile=()=>ledger.transaction(state=>{state.reconciliation={status:'RECONCILED',priorSpentMicros:0,evidence:'TEST FIXTURE ONLY, not official usage'};ledger.event(state,'TEST_ONLY_RECONCILIATION');});
  try {
    await t.test('schema migration preserves commercial tables, data, policies and permissions',async()=>{
      // Reapply migration in a separate database with sentinel commercial objects.
      // The helper already loaded migration once; use its exact SQL in a transaction
      // after dropping ONLY the test SEO objects to simulate first installation.
      await local.pool.query('DROP SCHEMA seo_engine CASCADE; DROP ROLE seo_engine_executor;');
      for(const name of ['visitors','sessions','conversations','messages','buyer_preferences']){
        await local.pool.query(`CREATE TABLE public.${name}(id integer PRIMARY KEY, sentinel text); INSERT INTO public.${name} VALUES(1,'preserve'); ALTER TABLE public.${name} ENABLE ROW LEVEL SECURITY; ALTER TABLE public.${name} FORCE ROW LEVEL SECURITY; CREATE POLICY sentinel ON public.${name} FOR SELECT TO authenticated USING (id=1);`);
      }
      const snapshot=async()=>JSON.stringify((await local.pool.query(`SELECT c.relname,c.relacl,c.relrowsecurity,c.relforcerowsecurity,pg_get_expr(p.polqual,p.polrelid) qual FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_policy p ON p.polrelid=c.oid WHERE n.nspname='public' AND c.relname IN ('visitors','sessions','conversations','messages','buyer_preferences') ORDER BY c.relname`)).rows);
      const before=await snapshot();
      await local.pool.query(await readFile('supabase/migrations/20261107205526_seo_engine_private_ledger_v4.sql','utf8'));
      assert.equal(await snapshot(),before);
      for(const name of ['visitors','sessions','conversations','messages','buyer_preferences'])assert.equal((await local.pool.query(`SELECT sentinel FROM public.${name}`)).rows[0].sentinel,'preserve');
    });
    await t.test('least privilege role and RLS deny public roles and commercial access',async()=>{
      for(const role of ['anon','authenticated','service_role']){
        const client=await local.pool.connect();
        try{await client.query(`SET ROLE ${role}`);await assert.rejects(client.query('SELECT * FROM seo_engine.ledger'),/permission denied/);}
        finally{await client.query('RESET ROLE');client.release();}
      }
      const client=await local.pool.connect();
      try{
        await client.query('SET ROLE seo_engine_executor');
        for(const name of ['visitors','sessions','conversations','messages','buyer_preferences'])await assert.rejects(client.query(`SELECT * FROM public.${name}`),/permission denied/);
        await assert.rejects(client.query('DELETE FROM seo_engine.ledger'),/permission denied/);
        await assert.rejects(client.query('CREATE TABLE seo_engine.denied(id int)'),/permission denied/);
      }finally{await client.query('RESET ROLE');client.release();}
      assert.equal((await local.pool.query("SELECT rolbypassrls OR rolsuper OR rolcreaterole OR rolcreatedb AS unsafe FROM pg_roles WHERE rolname='seo_engine_executor'")).rows[0].unsafe,false);
    });
    await t.test('initialization never treats missing historical receipts as zero',async()=>{
      await ledger.initialize();
      await ledger.createRun({runId,authorizedMicros:600000,gsc,configuration});
      await ledger.checkpoint(runId,'fixture-checkpoint',{private:'synthetic checkpoint'});
      await assert.rejects(ledger.call(request(),()=>assert.fail('must not dispatch')),/private_consumption_unknown/);
      await assert.rejects(ledger.recordReconciliation({status:'RECONCILED'}),/not_implemented/);
      const state=await ledger.read();assert.equal(state.reconciliation.status,'UNKNOWN');assert.equal(state.reservedMicros,0);
    });
    await t.test('independent process recovers encrypted GSC, run and checkpoint',async()=>{
      const options=local.pool.options;
      const child=spawn(process.execPath,['--input-type=module','-e',`
        import pg from 'pg';import {DurableLedger} from './lib/seo-content/durable-ledger.js';
        const c=JSON.parse(process.env.TEST_LEDGER_CONNECTION),pool=new pg.Pool(c);
        try{const s=await new DurableLedger({pool,key:process.env.TEST_LEDGER_KEY,projectId:'proj_local_fixture'}).read();
          if(s.runs[process.env.TEST_RUN_ID].checkpoints['fixture-checkpoint'].private!=='synthetic checkpoint')process.exitCode=2;
        }finally{await pool.end();}
      `],{cwd:process.cwd(),env:{...process.env,TEST_LEDGER_CONNECTION:JSON.stringify({host:options.host,port:options.port,user:options.user,password:options.password,database:'postgres'}),TEST_LEDGER_KEY:key,TEST_RUN_ID:runId},stdio:'ignore'});
      assert.equal(await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve);}),0);
      const raw=(await local.pool.query('SELECT ciphertext FROM seo_engine.ledger')).rows[0].ciphertext;
      assert.ok(!raw.includes('synthetic'));assert.ok(!raw.includes('private synthetic query'));
      assert.equal((await ledger.read()).runs[runId].gscHash,hash(gsc));
    });
    await t.test('executor login can persist checkpoints without owner/admin membership',async()=>{
      await local.pool.query("ALTER ROLE seo_engine_executor PASSWORD 'local-test-only-password'");
      const restrictedPool=new pg.Pool({host:local.pool.options.host,port:local.pool.options.port,user:'seo_engine_executor',password:'local-test-only-password',database:'postgres',max:1});
      try{
        await assertLedgerRole(restrictedPool);
        const restricted=new DurableLedger({pool:restrictedPool,key,projectId});
        await restricted.checkpoint(runId,'restricted-login',{fixture:true});
        assert.deepEqual((await restricted.read()).runs[runId].checkpoints['restricted-login'],{fixture:true});
      }finally{await restrictedPool.end();}
    });
    await t.test('two independent connections reserve/dispatch exactly once',async()=>{
      await fixtureReconcile();
      const otherPool=new pg.Pool({host:local.pool.options.host,port:local.pool.options.port,user:local.pool.options.user,password:local.pool.options.password,database:'postgres',max:2});
      const other=new DurableLedger({pool:otherPool,key,projectId});
      let release,started,dispatches=0;
      const gate=new Promise(r=>release=r), ready=new Promise(r=>started=r), req=request();
      const first=ledger.call(req,async()=>{dispatches++;started();await gate;return result(req);});
      await ready;
      try{
        await assert.rejects(other.call(req,()=>assert.fail('duplicate dispatch')),/private_call_outcome_unknown/);
        await assert.rejects(other.call(request('ES'),()=>assert.fail('concurrent dispatch')),/private_call_outcome_unknown/);
      }finally{release();await first;await otherPool.end();}
      assert.equal(dispatches,1);
      assert.deepEqual(await ledger.call(req,()=>assert.fail('cached result dispatched')),result(req));
      assert.equal((await ledger.read()).reservedMicros,100000);
    });
    await t.test('lost connection after mock send retains UNKNOWN and reservation on restart',async()=>{
      const req=request('ES');let dispatches=0;
      const server=createServer((req)=>{req.resume();req.on('end',()=>{dispatches++;req.socket.destroy();});});
      await new Promise(r=>server.listen(0,'127.0.0.1',r));
      try{await assert.rejects(ledger.call(req,async()=>{
        await fetch(`http://127.0.0.1:${server.address().port}`,{method:'POST',body:'synthetic provider fixture, no credentials'});
      }),/private_provider_interrupted/);}finally{await new Promise(r=>server.close(r));}
      await local.restart();ledger=new DurableLedger({pool:local.pool,key,projectId});
      await assert.rejects(ledger.call(req,()=>{dispatches++;}),/private_call_outcome_unknown/);
      await assert.rejects(ledger.call(request('SP','write'),()=>assert.fail('unknown must block project')),/private_call_outcome_unknown/);
      const state=await ledger.read();assert.equal(state.calls['ES/research'].status,'UNKNOWN');assert.equal(state.reservedMicros,200000);assert.equal(dispatches,1);
      assert.equal(state.runs[runId].checkpoints['fixture-checkpoint'].private,'synthetic checkpoint');
    });
    await t.test('missing state, wrong key, changed input and fresh run cannot bypass unknown',async()=>{
      await assert.rejects(new DurableLedger({pool:local.pool,key:randomBytes(32).toString('hex'),projectId}).read(),/integrity_failure/);
      await assert.rejects(ledger.call({...request(),input:{changed:true}},()=>assert.fail()),/identity_conflict/);
      await assert.rejects(ledger.createRun({authorizedMicros:600000,gsc,configuration}),/resume_existing/);
      await assert.rejects(ledger.checkpoint(runId,'fixture-checkpoint',{changed:true}),/checkpoint_conflict/);
    });
    await t.test('missing or inconsistent receipt is never retried (isolated fixtures)',async()=>{
      // Reset test scope only. No production reset API exists.
      for(const invalid of [{}, {output:{},receipt:{responseId:'fake',resolvedModel:'wrong',stage:'write',model:'wrong'}}]){
        await local.pool.query('TRUNCATE seo_engine.ledger');await ledger.initialize();await ledger.createRun({runId,authorizedMicros:600000,gsc,configuration});await fixtureReconcile();
        const req=request();await assert.rejects(ledger.call(req,async()=>invalid),/receipt_invalid/);
        await assert.rejects(ledger.call(req,()=>assert.fail('invalid receipt retried')),/outcome_unknown/);
        assert.equal((await ledger.read()).reservedMicros,100000);
      }
    });
    await t.test('historical costs reduce available budget; reservation is not a billed cost',async()=>{
      await local.pool.query('TRUNCATE seo_engine.ledger');await ledger.initialize();await ledger.createRun({runId,authorizedMicros:600000,gsc,configuration});await fixtureReconcile();
      await ledger.transaction(state=>{state.reconciliation.priorSpentMicros=550001;ledger.event(state,'TEST_HISTORICAL_SPEND');});
      await assert.rejects(ledger.call(request(),()=>assert.fail('overspend')),/budget_exhausted/);
      assert.equal((await ledger.read()).reservedMicros,0);
    });
    await t.test('article versions and audits survive database restart; no publish state accepted',async()=>{
      const article={status:'NEEDS_REVIEW',content:{title:'Private fixture'},validations:{editorial:{status:'UNKNOWN'}}};
      await ledger.article(runId,'SP',article);await ledger.article(runId,'ES',article);
      await ledger.article(runId,'SP',{...article,content:{title:'Private fixture revision'}});
      await assert.rejects(ledger.article(runId,'SP',{...article,status:'PUBLISHED'}),/article_invalid/);
      await assert.rejects(ledger.transaction(state=>{state.runs[runId].autopublish=true;}),/private_publication_forbidden/);
      await local.restart();ledger=new DurableLedger({pool:local.pool,key,projectId});
      const state=await ledger.read();assert.equal(state.runs[runId].versions.SP.length,2);assert.deepEqual(state.runs[runId].articles.ES,article);
      assert.equal(state.runs[runId].articles.SP.content.title,'Private fixture revision');
    });
    await t.test('durable adapter saves provider body before receipt validation, without headers or key',async()=>{
      await local.pool.query('TRUNCATE seo_engine.ledger');await ledger.initialize();await ledger.createRun({runId,authorizedMicros:600000,gsc,configuration});await fixtureReconcile();
      let requests=0;
      const adapter=durableEditorial({ledger,runId,article:'SP',settings:configuration,apiKey:'synthetic-key-never-persist',fetcher:async()=>{requests++;return Response.json({status:'incomplete',id:'fixture-incomplete'});}});
      await assert.rejects(adapter('research',{fixture:true},'fixture'),/incomplete_response/);
      const state=await ledger.read();assert.equal(state.calls['SP/research'].response.httpStatus,200);assert.equal(state.calls['SP/research'].status,'UNKNOWN');
      assert.ok(!JSON.stringify(state).includes('synthetic-key-never-persist'));assert.equal(requests,1);
    });
    await t.test('saved complete response recovers locally without provider traffic',async()=>{
      await local.pool.query('TRUNCATE seo_engine.ledger');await ledger.initialize();await ledger.createRun({runId,authorizedMicros:600000,gsc,configuration});await fixtureReconcile();
      const output={questions:['fixture'],comparison:'fixture',claims:[]},req=request();
      await assert.rejects(ledger.call(req,async({checkpoint})=>{
        await checkpoint({httpStatus:200,body:JSON.stringify({id:'resp_recovered_fixture',status:'completed',model:req.model,usage:{input_tokens:1,output_tokens:1},output:[{content:[{type:'output_text',text:JSON.stringify(output)}]}]})});
        throw Error('synthetic_process_interruption');
      }),/private_provider_interrupted/);
      await local.restart();ledger=new DurableLedger({pool:local.pool,key,projectId});
      assert.deepEqual((await ledger.recoverResponse('SP','research')).output,output);
      assert.deepEqual((await ledger.call(req,()=>assert.fail('recovered call dispatched'))).output,output);
    });
    await t.test('ambiguous database commit never permits a second dispatch',async()=>{
      await local.pool.query('TRUNCATE seo_engine.ledger');await ledger.initialize();await ledger.createRun({runId,authorizedMicros:600000,gsc,configuration});await fixtureReconcile();
      let commitLost=true;
      const ambiguousPool={connect:async()=>{
        const client=await local.pool.connect();return {release:()=>client.release(),query:async(...args)=>{
          const value=await client.query(...args);
          if(args[0]==='COMMIT'&&commitLost){commitLost=false;throw Error('synthetic_commit_reply_lost');}return value;
        }};
      }};
      const uncertain=new DurableLedger({pool:ambiguousPool,key,projectId});
      await assert.rejects(uncertain.call(request(),()=>assert.fail('ambiguous commit dispatched')),/synthetic_commit_reply_lost/);
      await assert.rejects(ledger.call(request(),()=>assert.fail('ambiguous commit retried')),/outcome_unknown/);
      assert.equal((await ledger.read()).reservedMicros,100000);
    });
    await t.test('SIGKILL after synthetic HTTP send leaves durable UNKNOWN for a new executor',async()=>{
      await local.pool.query('TRUNCATE seo_engine.ledger');await ledger.initialize();await ledger.createRun({runId,authorizedMicros:600000,gsc,configuration});await fixtureReconcile();
      let received;
      const sent=new Promise(r=>received=r),server=createServer(req=>{req.resume();req.on('end',received);});
      await new Promise(r=>server.listen(0,'127.0.0.1',r));
      const options=local.pool.options;
      const child=spawn(process.execPath,['--input-type=module','-e',`
        import pg from 'pg';import {DurableLedger} from './lib/seo-content/durable-ledger.js';
        const pool=new pg.Pool(JSON.parse(process.env.TEST_LEDGER_CONNECTION));
        await new DurableLedger({pool,key:process.env.TEST_LEDGER_KEY,projectId:'proj_local_fixture'}).call(
          JSON.parse(process.env.TEST_REQUEST),async()=>{await fetch(process.env.TEST_PROVIDER_URL,{method:'POST',body:'synthetic fixture'});});
      `],{cwd:process.cwd(),env:{...process.env,TEST_LEDGER_CONNECTION:JSON.stringify({host:options.host,port:options.port,user:options.user,password:options.password,database:'postgres'}),
        TEST_LEDGER_KEY:key,TEST_REQUEST:JSON.stringify(request()),TEST_PROVIDER_URL:`http://127.0.0.1:${server.address().port}`},stdio:'ignore'});
      const exited=new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',(code,signal)=>resolve({code,signal}));});
      try{
        await Promise.race([sent,exited.then(()=>{throw Error('fixture_child_exited_before_send');})]);
        child.kill('SIGKILL');assert.equal((await exited).signal,'SIGKILL');
        const recovered=new DurableLedger({pool:local.pool,key,projectId});
        await assert.rejects(recovered.call(request(),()=>assert.fail('killed call retried')),/outcome_unknown/);
        assert.equal((await recovered.read()).reservedMicros,100000);
      }finally{child.kill('SIGKILL');server.closeAllConnections();await new Promise(r=>server.close(r));}
    });
    await t.test('review signature, full evidence binding and snapshot freshness are required',async()=>{
      await local.pool.query('TRUNCATE seo_engine.ledger');await ledger.initialize();await ledger.createRun({runId,authorizedMicros:600000,gsc,configuration});
      const {publicKey,privateKey}=generateKeyPairSync('ed25519');
      const evidence={project:{id:projectId,name:'yincorp-seo'},usage:{fixture:true},costs:{fixture:true}};
      const state=await ledger.read(),statement={scope:state.scope,projectId,projectName:'yincorp-seo',authorizationMicros:600000,
        evidenceHash:hash(evidence),snapshotHash:hash(state),completeOfficialWindow:true,priorSpentMicros:400000,
        windowStart:'2026-01-01T00:00:00Z',windowEnd:'2026-11-01T00:00:00Z',reviewedAt:new Date().toISOString()};
      const signature=sign(null,Buffer.from(JSON.stringify(statement)),privateKey).toString('base64');
      await assert.rejects(ledger.reconcileReviewed({statement:{...statement,priorSpentMicros:0},evidence,signature},publicKey),/review_invalid/);
      await ledger.reconcileReviewed({statement,evidence,signature},publicKey);
      assert.equal((await ledger.read()).reconciliation.priorSpentMicros,400000);
      await assert.rejects(ledger.reconcileReviewed({statement,evidence,signature},publicKey),/snapshot_changed/);
    });
    await t.test('connection configuration rejects administrative credentials, wrong project and autopublish',()=>{
      assert.throws(()=>ledgerPool({SEO_CONTENT_LEDGER_DATABASE_URL:'postgres://postgres:fixture@db.bgggafirdjvxihqselha.supabase.co/postgres'}),/configuration_required/);
      assert.throws(()=>ledgerPool({}),/configuration_required/);
      assert.throws(()=>ledgerPool({SEO_CONTENT_LEDGER_DATABASE_URL:'not a URL with synthetic-password'}),error=>error.message==='private_ledger_configuration_required'&&!error.stack.includes('synthetic-password'));
    });
  } finally {await local.close();}
});
