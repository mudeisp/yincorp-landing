import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inferenceReadiness} from './lib/seo-content/inference-config.js';
import {startEditorialBridge} from './lib/seo-content/editorial-bridge.js';
import handler from './api/seo-content.js';

test('SEO never falls back to the shared OpenAI credential',async()=>{
  const env={OPENAI_API_KEY:'shared-synthetic-fixture',SEO_CONTENT_AUTOPUBLISH:'false'};
  const result=inferenceReadiness(env);
  assert.equal(result.credentialConfigured,false);
  assert.ok(result.missing.includes('SEO_OPENAI_API_KEY'));
  let calls=0;
  await assert.rejects(startEditorialBridge({env,fetcher:async()=>{calls++;}}),/editorial_credentials_unavailable/);
  assert.equal(calls,0);
  for(const file of ['api/seo-content.js','lib/seo-content/editorial-bridge.js','lib/seo-content/inference-config.js','scripts/run-seo-content-demo.mjs']){
    assert.doesNotMatch(readFileSync(file,'utf8'),/\b(?:env|process\.env)\.OPENAI_API_KEY\b/);
  }
});

test('public SEO requests are unauthorized and Preview rejects every write operation before database access',async()=>{
  const saved={VERCEL_ENV:process.env.VERCEL_ENV,SEO_CONTENT_CRON_SECRET:process.env.SEO_CONTENT_CRON_SECRET};
  try{
    process.env.VERCEL_ENV='preview';process.env.SEO_CONTENT_CRON_SECRET='s'.repeat(32);
    for(const op of ['run','monitor','rollback'])for(const method of ['GET','POST']){
      for(const authenticated of [false,true]){
        const response={setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
        await handler({url:'/?op='+op+'&state=SP',method,headers:authenticated?{authorization:'Bearer '+'s'.repeat(32)}:{}},response);
        assert.equal(response.code,authenticated?503:401);
        assert.equal(response.body.error,authenticated?'preview_writes_disabled':'unauthorized');
      }
    }
  }finally{for(const [key,value] of Object.entries(saved)){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
});

test('legacy generation endpoint cannot bypass the V4 ledger even when engine flags are enabled',async()=>{
  const names=['VERCEL_ENV','SEO_CONTENT_CRON_SECRET','SEO_CONTENT_ENABLED','SEO_CONTENT_KILL_SWITCH'];
  const saved=Object.fromEntries(names.map(name=>[name,process.env[name]])),originalFetch=globalThis.fetch;
  let requests=0;
  try{
    process.env.VERCEL_ENV='production';process.env.SEO_CONTENT_CRON_SECRET='fixture-secret-'.repeat(3);
    process.env.SEO_CONTENT_ENABLED='true';process.env.SEO_CONTENT_KILL_SWITCH='false';
    globalThis.fetch=async()=>{requests++;throw Error('unexpected_network');};
    const response={setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
    await handler({url:'/?op=run&state=SP',method:'POST',headers:{authorization:'Bearer '+process.env.SEO_CONTENT_CRON_SECRET}},response);
    assert.equal(response.code,503);assert.equal(response.body.error,'private_durable_runner_required');assert.equal(requests,0);
  }finally{
    globalThis.fetch=originalFetch;
    for(const [name,value] of Object.entries(saved)){if(value===undefined)delete process.env[name];else process.env[name]=value;}
  }
});
