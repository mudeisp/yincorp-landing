import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {nativeDatabase} from './scripts/seo-content-native-db.mjs';
import {DurableLedger,ledgerPool} from './lib/seo-content/durable-ledger.js';
import {writeStorageProbe,readStorageProbe} from './lib/seo-content/storage-probe.js';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';

test('storage logic encrypts a checkpoint and preserves the entire non-probe state',async()=>{
  const db=new PGlite();await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  await db.exec(await readFile('supabase/migrations/20261107205526_seo_engine_private_ledger_v4.sql','utf8'));
  const query=(sql,params)=>!params&&sql.includes(';')?db.exec(sql):db.query(sql,params);
  const pool={query,connect:async()=>({query,release(){}})};
  const ledger=new DurableLedger({pool,key:randomBytes(32).toString('hex'),projectId:'proj_storage_fixture'});
  try{
    await assert.rejects(writeStorageProbe(ledger),/private_ledger_not_initialized/);
    assert.equal(Number((await db.query('select count(*) n from seo_engine.ledger')).rows[0].n),0);
    await ledger.initialize();
    // An UNKNOWN synthetic call with a nonzero reservation must survive unchanged.
    await ledger.transaction(state=>{
      const request={synthetic:true};state.authorizedMicros=600000;state.reservedMicros=100000;
      state.calls['SP/research']={status:'UNKNOWN',reservedMicros:100000,request,requestHash:createHash('sha256').update(JSON.stringify(request)).digest('hex')};
      ledger.event(state,'SYNTHETIC_NONZERO_RESERVATION');
    });
    const before=await ledger.read();const proof=await writeStorageProbe(ledger);
    const after=await ledger.read(),strip=s=>{const {history,storageProbes,...rest}=s;return rest;};
    assert.deepEqual(strip(after),strip(before));assert.equal(after.reconciliation.status,'UNKNOWN');
    assert.deepEqual(after.runs,{});assert.equal(after.reservedMicros,100000);assert.equal(after.calls['SP/research'].status,'UNKNOWN');
    assert.equal((await readStorageProbe(ledger,proof)).status,'PASS');
    await assert.rejects(readStorageProbe(ledger,{...proof,hash:'0'.repeat(64)}),/storage_probe_integrity_failure/);
    await assert.rejects(writeStorageProbe(ledger,proof.id),/storage_probe_already_exists/);
    assert.equal((await readStorageProbe(ledger,proof)).status,'PASS');
  }finally{await db.close();}
});

test('storage-only checkpoint survives another process without creating a run or reconciling a balance',{timeout:120000},async()=>{
  // Synthetic loopback DB only. Never uses any supplied remote connection string.
  const local=await nativeDatabase(),key=randomBytes(32).toString('hex'),projectId='proj_storage_fixture';
  let ledger=new DurableLedger({pool:local.pool,key,projectId});
  try{
    await assert.rejects(writeStorageProbe(ledger),/private_ledger_not_initialized/);
    assert.equal(Number((await local.pool.query('select count(*) n from seo_engine.ledger')).rows[0].n),0);
    await ledger.initialize(); // Fixture identity, never done against a remote DB by this test.
    const before=await ledger.read();const proof=await writeStorageProbe(ledger);
    const after=await ledger.read();const strip=s=>{const {history,storageProbes,...rest}=s;return rest;};
    assert.deepEqual(strip(after),strip(before));assert.deepEqual(after.runs,{});assert.deepEqual(after.calls,{});
    assert.equal(after.reconciliation.status,'UNKNOWN');
    const revision=(await local.pool.query('select revision from seo_engine.ledger')).rows[0].revision;
    await local.restart(); // All writer connections and the native server are closed first.
    ledger=new DurableLedger({pool:local.pool,key,projectId});
    const child=spawnSync(process.execPath,['--input-type=module','-e',`
      import pg from 'pg';
      import {DurableLedger} from './lib/seo-content/durable-ledger.js';
      import {readStorageProbe} from './lib/seo-content/storage-probe.js';
      const pool=new pg.Pool(JSON.parse(process.env.TEST_DB_OPTIONS));
      try{console.log(JSON.stringify(await readStorageProbe(new DurableLedger({pool,key:process.env.TEST_STORAGE_KEY,projectId:'proj_storage_fixture'}),JSON.parse(process.env.TEST_PROOF))));}finally{await pool.end();}
    `],{encoding:'utf8',timeout:20000,env:{...process.env,
      // pg-pool intentionally makes options.password non-enumerable. Explicitly
      // pass only this synthetic loopback fixture's parameters to the child.
      TEST_DB_OPTIONS:JSON.stringify({host:'127.0.0.1',port:local.pool.options.port,user:'postgres',password:local.pool.options.password,database:'postgres'}),
      TEST_STORAGE_KEY:key,TEST_PROOF:JSON.stringify(proof)}});
    assert.equal(child.status,0,'synthetic child reader must succeed');
    assert.equal(JSON.parse(child.stdout).status,'PASS');
    assert.equal((await local.pool.query('select revision from seo_engine.ledger')).rows[0].revision,revision);
    await assert.rejects(readStorageProbe(ledger,{...proof,hash:'0'.repeat(64)}),/storage_probe_integrity_failure/);
    await assert.rejects(readStorageProbe(ledger,{...proof,minimumRevision:String(BigInt(revision)+1n)}),/storage_probe_integrity_failure/);
    await assert.rejects(writeStorageProbe(ledger,proof.id),/storage_probe_already_exists/);
    const cipher=(await local.pool.query('select ciphertext from seo_engine.ledger')).rows[0].ciphertext;
    assert.ok(!cipher.includes(after.storageProbes[proof.id].payload.marker));
    const client=await local.pool.connect();
    try{await client.query('set role seo_engine_executor');await assert.rejects(client.query('select * from public.seo_content_settings'),/permission denied/);}
    finally{await client.query('reset role');client.release();}
    // A storage test did not consume the scope's one permitted run.
    await ledger.createRun({authorizedMicros:600000,gsc:{synthetic:true},configuration:{synthetic:true}});
    assert.equal(Object.keys((await ledger.read()).runs).length,1);
    await assert.rejects(readStorageProbe(ledger,proof),/storage_probe_integrity_failure/);
  }finally{await local.close();}
});

test('storage CLI refuses enabled inference and pool configuration never downgrades TLS',async()=>{
  const child=spawnSync(process.execPath,['scripts/seo-content-storage.mjs','check'],{encoding:'utf8',env:{...process.env,SEO_CONTENT_AUTOPUBLISH:'false',SEO_CONTENT_INFERENCE_AUTHORIZED:'true'}});
  assert.equal(child.status,1);assert.match(child.stderr,/storage_probe_requires_inference_disabled/);
  const env={SEO_CONTENT_AUTOPUBLISH:'false',SEO_CONTENT_LEDGER_DATABASE_URL:'postgresql://seo_engine_executor:synthetic@db.bgggafirdjvxihqselha.supabase.co:5432/postgres',SEO_CONTENT_LEDGER_TLS_CA:'synthetic-ca',SEO_CONTENT_LEDGER_KEY:'a'.repeat(64)};
  const pool=ledgerPool(env);
  try{assert.equal(pool.options.ssl.rejectUnauthorized,true);assert.equal(pool.options.ssl.ca,'synthetic-ca');}
  finally{await pool.end();}
  for(const url of ['postgresql://postgres:synthetic@db.bgggafirdjvxihqselha.supabase.co/postgres',env.SEO_CONTENT_LEDGER_DATABASE_URL+'?sslmode=no-verify'])assert.throws(()=>ledgerPool({...env,SEO_CONTENT_LEDGER_DATABASE_URL:url}),/private_ledger_configuration_required/);
});

