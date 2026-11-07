import test from 'node:test';
import assert from 'node:assert/strict';
import {inferenceReadiness} from './lib/seo-content/inference-config.js';
import {startEditorialBridge,authenticatedEditorial} from './lib/seo-content/editorial-bridge.js';
import {secureGateway} from './lib/seo-content/providers.js';
import {validateEditorialOutput} from './lib/seo-content/openai-editorial.js';
import {createEditorialAgents} from './lib/seo-content/editorial.js';
import {GATES,hash} from './lib/seo-content/core.js';
const models={research:'fixture-research',write:'fixture-writer',audit:'fixture-auditor'};
const rates=Object.fromEntries(Object.keys(models).map(s=>[s,{input:.1,output:.2}]));
const env={SEO_OPENAI_API_KEY:'synthetic-test-secret-not-a-real-key',SEO_CONTENT_INFERENCE_AUTHORIZED:'true',SEO_CONTENT_APPROVED_BUDGET_MICROS:'1000000',SEO_CONTENT_AUTOPUBLISH:'false',SEO_CONTENT_RESEARCH_MODEL:models.research,SEO_CONTENT_WRITE_MODEL:models.write,SEO_CONTENT_AUDIT_MODEL:models.audit,SEO_CONTENT_MODEL_RATES:JSON.stringify(rates)};
const output={questions:['Fixture question'],comparison:'Fixture comparison',claims:[]};
test('inference preflight reports names only and requires explicit credential, budget, rates and private mode',()=>{
  const blocked=inferenceReadiness({});assert.equal(blocked.status,'BLOCKED');assert.ok(blocked.missing.includes('SEO_OPENAI_API_KEY'));assert.equal(inferenceReadiness(env).status,'READY');
  for(const change of [{SEO_OPENAI_API_KEY:''},{SEO_CONTENT_INFERENCE_AUTHORIZED:'false'},{SEO_CONTENT_APPROVED_BUDGET_MICROS:''},{SEO_CONTENT_AUTOPUBLISH:'true'},{SEO_CONTENT_MODEL_RATES:''},{SEO_CONTENT_AUDIT_MODEL:models.write}])assert.equal(inferenceReadiness({...env,...change}).status,'BLOCKED');
  assert.ok(!JSON.stringify(inferenceReadiness(env)).includes(env.SEO_OPENAI_API_KEY));
  assert.equal(inferenceReadiness({...env,SEO_OPENAI_API_KEY:undefined,SEO_CONTENT_EDITORIAL_URL:'https://authorized.example/editorial',SEO_CONTENT_EDITORIAL_TOKEN:'t'.repeat(32)}).status,'READY');
});
test('strict local JSON validation rejects missing keys, extra fields, wrong types and arbitrary PASS values',()=>{
  assert.deepEqual(validateEditorialOutput('research',output),output);
  for(const bad of [{}, {...output,credential:'secret'}, {...output,questions:'wrong'}, {...output,claims:[{text:'x'}]}])assert.throws(()=>validateEditorialOutput('research',bad),/schema_invalid/);
  const gates=Object.fromEntries(GATES.map(g=>[g,{status:'PASS',evidence:'fixture'}]));gates.editorial.status='APPROVED';assert.throws(()=>validateEditorialOutput('audit',gates),/schema_invalid/);
});
test('HTTP is prohibited except an explicitly enabled exact loopback editorial route',()=>{
  assert.throws(()=>secureGateway('http://127.0.0.1:12345/editorial','token'),/not_configured/);
  assert.throws(()=>secureGateway('http://localhost:12345/editorial','token',{allowIsolatedLoopback:true}),/not_configured/);
  assert.throws(()=>secureGateway('http://127.0.0.1:12345/other','token',{allowIsolatedLoopback:true}),/not_configured/);
});
test('real loopback HTTP contract authenticates, calls the adapter with a mocked provider and returns bound usage receipts',async()=>{
  // Only the transport is real here. Provider is an explicit fixture, never live inference.
  let calls=0;const usage=[];
  const bridge=await startEditorialBridge({env,fetcher:async(_url,opts)=>{calls++;const request=JSON.parse(opts.body);assert.equal(request.store,false);return Response.json({id:'fixture_response_'+calls,model:request.model,status:'completed',usage:{input_tokens:20,output_tokens:10},output:[{content:[{type:'output_text',text:JSON.stringify(output)}]}]});}});
  try{
    const rejected=await fetch(bridge.url,{method:'POST',body:'{}'});assert.equal(rejected.status,401);assert.equal(calls,0);assert.ok(!(await rejected.text()).includes(env.SEO_OPENAI_API_KEY));
    const model=authenticatedEditorial({url:bridge.url,token:bridge.token,models,store:{rpc:async()=>true},runRef:()=>({id:'fixture'}),allowIsolatedLoopback:true,onUsage:u=>usage.push(u)});
    assert.deepEqual(await model('research',{question:'fixture'},'Research JSON'),output);assert.equal(calls,1);assert.equal(usage[0].provider,'openai');assert.equal(usage[0].inputTokens,20);assert.equal(usage[0].responseId,'fixture_response_1');assert.ok(bridge.reserved()>0);
    const invalid=await fetch(bridge.url,{method:'POST',headers:{Authorization:'Bearer '+bridge.token},body:JSON.stringify({stage:'publish'})});assert.equal(invalid.status,502);assert.equal(calls,1);
  }finally{await bridge.close();}
});
test('server budget rejection never calls even a mocked provider and errors never echo secrets',async()=>{
  let calls=0;const bridge=await startEditorialBridge({env:{...env,SEO_CONTENT_APPROVED_BUDGET_MICROS:'1'},fetcher:async()=>{calls++;throw Error(env.SEO_OPENAI_API_KEY);}});
  try{const model=authenticatedEditorial({url:bridge.url,token:bridge.token,models,store:{rpc:async()=>true},runRef:()=>null,allowIsolatedLoopback:true});await assert.rejects(model('research',{},'JSON'),/gateway_unavailable/);assert.equal(calls,0);}finally{await bridge.close();}
});
test('quality PASS without an independent response receipt is downgraded to UNKNOWN',async()=>{
  const agents=createEditorialAgents({model:async()=>Object.fromEntries(GATES.map(g=>[g,{status:'PASS',evidence:'unverified model assertion'}])),checkLinks:async()=>[],requireAuditReceipt:true,writerModel:'writer'});
  const gates=await agents.verify({opportunity:{state:'SP',city:'fixture',targetCanonical:'/sp/conteudos/fixture'},context:{sources:[]},content:{title:'fixture',description:'fixture',introduction:'fixture',sections:[],claims:[]},stock:[],pages:[]});
  assert.equal(gates.originality.status,'UNKNOWN');assert.equal(gates.geography.status,'UNKNOWN');assert.notEqual(gates.editorial.status,'PASS');
});
test('a failed upstream call preserves its reservation, does not retry and returns no upstream secret',async()=>{
  const bridge=await startEditorialBridge({env,fetcher:async()=>{throw Error(env.SEO_OPENAI_API_KEY);}});
  try{
    const response=await fetch(bridge.url,{method:'POST',headers:{Authorization:'Bearer '+bridge.token,'Content-Type':'application/json'},body:JSON.stringify({stage:'research',input:{},instructions:'JSON',maxOutputTokens:4000,maxCostMicros:100000})});
    assert.equal(response.status,502);assert.ok(!(await response.text()).includes(env.SEO_OPENAI_API_KEY));assert.equal(bridge.providerRequests(),1);assert.ok(bridge.reserved()>0);
  }finally{await bridge.close();}
});
test('different requested aliases for the same resolved model do not prove independent audit',async()=>{
  const independent=Object.fromEntries(GATES.map(g=>[g,{status:'PASS',evidence:'fixture inference'}]));
  const content={title:'fixture',description:'fixture',introduction:'fixture',sections:[],claims:[]};
  const input={opportunity:{state:'SP',city:'fixture',targetCanonical:'/sp/conteudos/fixture'},context:{sources:[]},content,stock:[],pages:[]};
  const audit={provider:'openai',stage:'audit',responseId:'fixture_audit',model:'audit-alias',resolvedModel:'same-resolved-model',inputHash:hash(input),outputHash:hash(independent)};
  const writer={resolvedModel:'same-resolved-model',outputHash:hash(content)};
  const agents=createEditorialAgents({model:async()=>independent,checkLinks:async()=>[],requireAuditReceipt:true,auditReceipt:()=>audit,writerReceipt:()=>writer,writerModel:'writer-alias'});
  assert.equal((await agents.verify(input)).originality.status,'UNKNOWN');
  audit.resolvedModel='independent-resolved-model';assert.equal((await agents.verify(input)).originality.status,'PASS');
  audit.inputHash='unbound-input';assert.equal((await agents.verify(input)).originality.status,'UNKNOWN');
});
