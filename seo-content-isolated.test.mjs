import test from 'node:test';
import assert from 'node:assert/strict';
import {Socket} from 'node:net';
import {isolatedDatabase} from './lib/seo-content/isolated.js';
import {readFileSync} from 'node:fs';
import {readOnlyPreflightFetch} from './lib/seo-content/preflight.js';

test('preflight blocks paid Responses and remote RPC writes before dispatch, including Request objects',async()=>{
  let calls=0;const read=readOnlyPreflightFetch(async()=>{calls++;return Response.json([]);});
  for(const url of ['https://api.openai.com/v1/responses','https://fixture.supabase.co/rest/v1/rpc/seo_content_command']){
    for(const method of ['POST','PUT','PATCH','DELETE']){
      assert.throws(()=>read(url,{method}),/preflight_remote_write_forbidden/);
      assert.throws(()=>read(new Request(url,{method})),/preflight_remote_write_forbidden/);
    }
  }
  assert.equal(calls,0);await read('https://fixture.supabase.co/rest/v1/properties');assert.equal(calls,1);
});

test('runner persistence works with every network connection denied and remote DB variables present',async()=>{
  const originalFetch=globalThis.fetch,connect=Socket.prototype.connect;
  const names=['DATABASE_URL','SEO_CONTENT_SUPABASE_URL','SEO_CONTENT_SUPABASE_SERVICE_KEY'];
  const saved=Object.fromEntries(names.map(k=>[k,process.env[k]]));
  let connections=0,isolated;
  globalThis.fetch=async()=>{connections++;throw Error('network_denied');};
  Socket.prototype.connect=function(){connections++;throw Error('network_denied');};
  try{
    process.env.DATABASE_URL='postgres://fixture.invalid/production';
    process.env.SEO_CONTENT_SUPABASE_URL='https://fixture.supabase.co';
    process.env.SEO_CONTENT_SUPABASE_SERVICE_KEY='synthetic-never-send';
    isolated=await isolatedDatabase();
    const run=await isolated.store.claim({state:'SP',day:'2026-11-07',quota:1,budget:1000000});
    assert.ok(run);
    await isolated.store.finish(run,'COMPLETE');
    assert.ok(await isolated.store.report('SP','2026-11-07'));
    assert.equal(Number((await isolated.db.query("select count(*) n from seo_articles where status='PUBLISHED'")).rows[0].n),0);
    assert.equal(connections,0);
    const runner=readFileSync('scripts/run-seo-content-demo.mjs','utf8');
    assert.doesNotMatch(runner,/createStore\(|process\.env\.(?:DATABASE_URL|SEO_CONTENT_SUPABASE_URL|SEO_CONTENT_SUPABASE_SERVICE_KEY)/);
  }finally{
    await isolated?.db.close();globalThis.fetch=originalFetch;Socket.prototype.connect=connect;
    for(const [key,value] of Object.entries(saved)){if(value===undefined)delete process.env[key];else process.env[key]=value;}
  }
});
