import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {DurableLedger,assertLedgerRole} from './lib/seo-content/durable-ledger.js';
import {GATES,ORIGIN,hash} from './lib/seo-content/core.js';
import {corpusDigest} from './lib/seo-content/comparison-corpus.js';
import {runProduction,collectSources} from './lib/seo-content/production.js';
import {publishedArticles,publishArticle,withdrawArticle} from './lib/seo-content/publication.js';
import {safeFailure,inspectStorage,inspectClientTls,ledgerConfigurationIssues} from './lib/seo-content/diagnostics.js';
import {gscSnapshot} from './lib/seo-content/gsc-snapshot.js';
import {createRunner} from './api/seo-content-runner.js';
import {createContentHandler} from './lib/seo-content/render.js';
import {authorizeWeekly,calendar,financialSummary} from './lib/seo-content/weekly-policy.js';
import {WeeklyLedger} from './lib/seo-content/weekly-ledger.js';
import {providerPreflight} from './lib/seo-content/provider-preflight.js';

const when=Date.parse('2026-11-08T12:00:00Z'),stamp=new Date(when).toISOString();
const env={VERCEL_ENV:'production',VERCEL_GIT_COMMIT_SHA:'a'.repeat(40),SEO_CONTENT_VERIFIED_RELEASE_SHA:'a'.repeat(40),SEO_CONTENT_ENABLED:'true',SEO_CONTENT_KILL_SWITCH:'false',SEO_CONTENT_AUTOPUBLISH:'false',SEO_CONTENT_PUBLICATION_AUTHORIZED:'true',SEO_CONTENT_INFERENCE_AUTHORIZED:'true',SEO_OPENAI_API_KEY:'synthetic-only',SEO_CONTENT_APPROVED_BUDGET_MICROS:'600000',SEO_CONTENT_RESEARCH_MODEL:'fixture-research',SEO_CONTENT_WRITE_MODEL:'fixture-writer',SEO_CONTENT_AUDIT_MODEL:'fixture-auditor',SEO_CONTENT_MODEL_RATES:JSON.stringify(Object.fromEntries(['research','write','audit'].map(s=>[s,{input:.1,output:.2}])))};
const passes=()=>Object.fromEntries(GATES.map(g=>[g,{status:'PASS',evidence:'SYNTHETIC isolated proof '+g}]));
const stock=[{state:'SP',city:'São Paulo',neighborhood:'Ipiranga',path:'/sp/sao-paulo/empreendimento/synthetic',name:'Synthetic inventory',checkedAt:stamp}];
const excerpt='A praça consta no inventário municipal.';
const sources=[{url:'https://www.prefeitura.sp.gov.br/cidade',observedAt:stamp,excerpt,digest:hash(excerpt)}];
const content={title:'Como avaliar imóveis no Ipiranga',description:'Critérios de avaliação para imóveis no Ipiranga, São Paulo.',introduction:'Compare as opções do bairro com critérios verificáveis.',sections:[{heading:'Fontes da região',level:2,text:excerpt,claims:[0]},{heading:'Como comparar',level:3,text:'Visite o entorno e confirme a disponibilidade.',claims:[]}],questions:[{question:'O que conferir?',answer:'Confirme as condições no atendimento.'}],internalLinks:[{path:stock[0].path,label:'Inventário'}],cta:'Consulte o catálogo.',claims:[{text:excerpt,sourceUrl:sources[0].url}]};
function corpus(){const p={path:'/sp/sao-paulo',url:ORIGIN+'/sp/sao-paulo',title:'Catálogo de São Paulo',intent:'transactional',text:'SYNTHETIC comparison corpus',observedAt:stamp,verified:true};p.textHash=hash(p.text);const c={pages:[p],coverage:{complete:true,expected:1,retrieved:1,state:'SP',city:'São Paulo',neighborhood:'Ipiranga'},observedAt:stamp};c.snapshotHash=corpusDigest(c);return c;}
async function fixture(){
  const db=new PGlite();await db.exec('CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;');await db.exec(await readFile('supabase/migrations/20261107205526_seo_engine_private_ledger_v4.sql','utf8'));
  const query=(sql,params)=>!params&&sql.includes(';')?db.exec(sql):db.query(sql,params),pool={query,connect:async()=>({query,release(){}})};
  const ledger=new DurableLedger({pool,key:randomBytes(32).toString('hex'),projectId:'proj_synthetic_production'});await ledger.initialize();
  // Test-only official-review substitute; never connects to a remote database.
  await ledger.transaction(s=>{s.reconciliation={status:'RECONCILED',priorSpentMicros:0,evidence:'SYNTHETIC TEST ONLY'};});
  let dispatches=0;
  const options={ledger,env,now:()=>when,inventory:async()=>stock,corpusReader:async()=>corpus(),sourceReader:async()=>sources,checkLinks:async urls=>urls.map(()=>true),snapshotReader:async()=>({provider:'google/searchconsole',retrievedAt:stamp,windowStart:'2026-10-08',windowEnd:'2026-11-05',response:{data:[{query:'imóveis no ipiranga',page:ORIGIN+stock[0].path,impressions:100,clicks:1,ctr:.01,position:8}]}}),editorialFactory:({ledger,runId,article,settings,onUsage})=>async(stage,input,instructions)=>{
    const result=await ledger.call({runId,article,stage,input,instructions,model:settings.models[stage]},async()=>{
      dispatches++;const output=stage==='write'?content:stage==='audit'?passes():{questions:['Como avaliar?'],comparison:'SYNTHETIC',claims:content.claims};
      return {output,receipt:{provider:'openai',responseId:'resp_synthetic_'+stage,resolvedModel:settings.models[stage],model:settings.models[stage],stage,inputHash:hash(input),outputHash:hash(output),estimatedMicros:10,inputTokens:1,outputTokens:1}};
    });onUsage(result.receipt);return result.output;
  }};
  return {db,ledger,pool,options,get dispatches(){return dispatches;}};
}

test('production generates, audits, publishes and renders from durable storage without a public SQL store',async()=>{
  const f=await fixture();try{
    const result=await runProduction(f.options);assert.equal(result.status,'PUBLISHED');assert.equal(f.dispatches,3);
    let data=await f.ledger.read();assert.equal(data.reservedMicros,300000);const [run]=Object.values(data.runs);
    const publicData=publishedArticles(data,'SP');assert.equal(publicData.length,1);assert.ok(!JSON.stringify(publicData).includes('SYNTHETIC TEST ONLY'));assert.ok(!JSON.stringify(publicData).includes('resp_synthetic'));
    const response=()=>({statusCode:0,headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},send(v){this.body=v;return this;},end(){}});
    const handler=createContentHandler({store:{published:async state=>publishedArticles(await f.ledger.read(),state)},inventory:async()=>stock,enabled:()=>true,preview:()=>false});
    const page=response();await handler({method:'GET'},page,result.path);assert.equal(page.statusCode,200);assert.match(page.body,/BlogPosting/);assert.match(page.body,/Como avaliar imóveis/);
    const map=response();await handler({method:'GET'},map,'/sitemap-content-sp.xml');assert.match(map.body,new RegExp(result.path));
    assert.equal((await publishArticle(f.ledger,{runId:run.runId,state:'SP',env,now:when})).status,'ALREADY_PUBLISHED');assert.equal(f.dispatches,3);
    await withdrawArticle(f.ledger,{runId:run.runId,state:'SP',reason:'Synthetic withdrawal'});assert.equal(publishedArticles(await f.ledger.read(),'SP').length,0);
    const missing=response();await handler({method:'GET'},missing,result.path);assert.equal(missing.statusCode,404);
  }finally{await f.db.close();}
});

test('release mismatch and unknown historical spend block before any provider call',async()=>{
  const f=await fixture();try{
    await assert.rejects(runProduction({...f.options,env:{...env,SEO_CONTENT_VERIFIED_RELEASE_SHA:'b'.repeat(40)}}),/verified_release_required/);
    await f.ledger.transaction(s=>{s.reconciliation={status:'UNKNOWN'};});await assert.rejects(runProduction(f.options),/consumption_unknown/);assert.equal(f.dispatches,0);
  }finally{await f.db.close();}
});

test('a non-PASS audit stays private and scheduled retries do not regenerate the article',async()=>{
  const f=await fixture();try{
    const factory=f.options.editorialFactory;f.options.editorialFactory=args=>{const model=factory(args);return async(...call)=>{const output=await model(...call);return call[0]==='audit'?{...output,editorial:{status:'UNKNOWN',evidence:'SYNTHETIC missing proof'}}:output;};};
    assert.equal((await runProduction(f.options)).status,'NEEDS_REVIEW');assert.equal(f.dispatches,3);
    assert.equal((await runProduction(f.options)).status,'NEEDS_REVIEW');assert.equal(f.dispatches,3);assert.equal(publishedArticles(await f.ledger.read(),'SP').length,0);
  }finally{await f.db.close();}
});

test('role isolation rejects owner-readable public views and column-only commercial grants',async()=>{
  const f=await fixture();try{
    await f.db.exec("CREATE TABLE public.secret_fixture(value text);INSERT INTO public.secret_fixture VALUES ('SYNTHETIC');CREATE VIEW public.secret_view AS SELECT * FROM public.secret_fixture;GRANT SELECT ON public.secret_view TO seo_engine_executor;SET ROLE seo_engine_executor;");
    assert.equal((await f.db.query('SELECT count(*) n FROM public.secret_view')).rows[0].n,1);await assert.rejects(assertLedgerRole(f.pool),/not_isolated/);
    await f.db.exec('RESET ROLE;REVOKE SELECT ON public.secret_view FROM seo_engine_executor;GRANT SELECT(value) ON public.secret_fixture TO seo_engine_executor;SET ROLE seo_engine_executor;');await assert.rejects(assertLedgerRole(f.pool),/not_isolated/);
  }finally{await f.db.close();}
});

test('health decrypts existing checkpoints; wrong keys and identities cannot report integrity PASS',async()=>{
  const f=await fixture();try{
    // Catalog/TLS are mocked; real ciphertext and ledger validation use PGlite.
    const host='aws-1-us-west-2.pooler.supabase.com';
    const stream={encrypted:true,authorized:true,getProtocol:()=> 'TLSv1.3',getCipher:()=>({standardName:'TLS_AES_256_GCM_SHA384'}),getPeerCertificate:()=>({subjectaltname:'DNS:'+host})};
    const client={connection:{stream},connectionParameters:{ssl:{rejectUnauthorized:true,ca:'synthetic'}},release(){},query:(sql,params)=>sql.includes('current_user AS role')?{rows:[{role:'seo_engine_executor',private_storage:true}]}:sql.includes('pg_stat_ssl')?{rows:[{ssl:false,version:null,bits:null}]}:f.pool.query(sql,params)};
    const pool={connect:async()=>client};
    const e={SEO_CONTENT_LEDGER_DATABASE_URL:'postgresql://'+host+'/postgres',SEO_CONTENT_LEDGER_KEY:f.ledger.key.toString('hex'),SEO_CONTENT_OPENAI_PROJECT_ID:f.ledger.projectId};const report=await inspectStorage(pool,e);assert.equal(report.integrity,'PASS');assert.equal(report.clientTls.authorized,true);assert.equal(report.databaseLegTls.ssl,false);
    await assert.rejects(inspectStorage(pool,{...e,SEO_CONTENT_LEDGER_KEY:randomBytes(32).toString('hex')}),/integrity_failure/);
    await assert.rejects(inspectStorage(pool,{...e,SEO_CONTENT_OPENAI_PROJECT_ID:'proj_wrong'}),/identity_mismatch/);
    assert.deepEqual(safeFailure({code:'EAI_AGAIN',message:'password=secret'}),{status:'BLOCKED',stage:'dns',reason:'EAI_AGAIN'});
    assert.ok(!JSON.stringify(safeFailure(Error('postgres://secret'))).includes('secret'));
  }finally{await f.db.close();}
});

test('client TLS rejects untrusted certificates, weak protocols, plaintext, wrong host and disabled verification',()=>{
  const host='aws-1-us-west-2.pooler.supabase.com';
  const stream={encrypted:true,authorized:true,getProtocol:()=> 'TLSv1.3',getCipher:()=>({standardName:'TLS_AES_256_GCM_SHA384'}),getPeerCertificate:()=>({subjectaltname:'DNS:'+host})};
  const client=s=>({connection:{stream:s},connectionParameters:{ssl:{rejectUnauthorized:true,ca:'synthetic'}}});
  assert.equal(inspectClientTls(client(stream),host).hostnameVerified,true);
  for(const changes of [{authorized:false},{encrypted:false},{getProtocol:()=> 'TLSv1.1'},{getCipher:()=>({name:'DES-CBC3-SHA'})}])assert.throws(()=>inspectClientTls(client({...stream,...changes}),host),/tls_required/);
  assert.throws(()=>inspectClientTls(client(stream),'wrong.invalid'),/tls_required/);
  const disabled=client(stream);disabled.connectionParameters.ssl.rejectUnauthorized=false;assert.throws(()=>inspectClientTls(disabled,host),/tls_required/);
});

test('runner refuses anonymous requests, preview execution and missing configuration before connecting',async()=>{
  let connections=0;const response=()=>({setHeader(){},status(n){this.code=n;return this;},json(body){this.body=body;return this;},end(){}}),secret='s'.repeat(32);
  for(const [request,vars,expected] of [[{method:'GET',headers:{},url:'/'},{CRON_SECRET:secret},401],[{method:'GET',headers:{authorization:'Bearer '+secret},url:'/'},{CRON_SECRET:secret,VERCEL_ENV:'preview'},503],[{method:'GET',headers:{authorization:'Bearer '+secret},url:'/?op=health'},{CRON_SECRET:secret},503]]){
    const r=response();await createRunner({env:vars,connect:()=>{connections++;}})(request,r);assert.equal(r.code,expected);
  }assert.equal(connections,0);
});

test('GSC refresh stays server-side and captures bounded authenticated rows without persisting credentials',async()=>{
  let requests=0;const snapshot=await gscSnapshot({now:when,env:{SEO_CONTENT_GSC_REFRESH_TOKEN:'fixture-refresh',SEO_CONTENT_GSC_CLIENT_ID:'fixture-id',SEO_CONTENT_GSC_CLIENT_SECRET:'fixture-secret'},fetcher:async(url,options)=>{
    requests++;if(url==='https://oauth2.googleapis.com/token'){assert.match(String(options.body),/grant_type=refresh_token/);return Response.json({access_token:'fixture-access'});}
    assert.equal(options.headers.Authorization,'Bearer fixture-access');return Response.json({rows:[]});
  }});assert.equal(requests,3);assert.equal(snapshot.provider,'google/searchconsole');assert.doesNotMatch(JSON.stringify(snapshot),/fixture-(?:refresh|secret|access)/);
});

test('configuration diagnostics distinguish field errors without exposing secret values or making a connection',async()=>{
  const valid={...env,CRON_SECRET:'s'.repeat(32),SEO_CONTENT_LEDGER_DATABASE_URL:'postgresql://seo_engine_executor.bgggafirdjvxihqselha:synthetic-password@aws-1-us-west-2.pooler.supabase.com:5432/postgres',SEO_CONTENT_LEDGER_KEY:'b'.repeat(64),SEO_CONTENT_LEDGER_TLS_CA:'synthetic-ca',SEO_CONTENT_OPENAI_PROJECT_ID:'proj_synthetic'};
  assert.deepEqual(ledgerConfigurationIssues(valid),[]);
  const broken={...valid,SEO_CONTENT_LEDGER_DATABASE_URL:'postgresql://postgres:synthetic-password@aws-1-us-west-2.pooler.supabase.com:6543/wrong?sslmode=require#bad',SEO_CONTENT_OPENAI_PROJECT_ID:'sk-synthetic-private'};
  const expected=['database_url_username','database_url_port','database_url_database','database_url_query_not_allowed','database_url_fragment_not_allowed','openai_project_id_format'];
  assert.deepEqual(ledgerConfigurationIssues(broken),expected);
  assert.doesNotMatch(JSON.stringify(ledgerConfigurationIssues(broken)),/synthetic-password|sk-synthetic-private|sslmode/);
  let connections=0;const res={setHeader(){},status(n){this.code=n;return this;},json(body){this.body=body;return this;}};
  await createRunner({env:broken,connect:()=>{connections++;}})({method:'GET',headers:{authorization:'Bearer '+valid.CRON_SECRET},url:'/?op=health'},res);
  assert.equal(res.code,503);assert.deepEqual(res.body.configurationIssues,expected);assert.equal(connections,0);
  assert.deepEqual(ledgerConfigurationIssues({...valid,SEO_CONTENT_LEDGER_DATABASE_URL:'synthetic-password'}),['database_url_format']);
});

test('weekly authorization preserves unknown history, budgets survive month rollover and unknown calls block future cycles',async()=>{
  const f=await fixture();let clock=when;
  try{
    await f.ledger.transaction(d=>{d.reconciliation={status:'UNKNOWN'};});
    await authorizeWeekly(f.ledger,{now:Date.parse('2026-10-31T12:00:00Z')});assert.equal((await f.ledger.read()).reconciliation.status,'UNKNOWN');
    const weekly=new WeeklyLedger(f.ledger,()=>clock);
    const execute=async(state,weekIndex,fail=false)=>{
      const runId=await weekly.createJob({state,gsc:{},configuration:{},opportunity:{targetCanonical:`/${state.toLowerCase()}/conteudos/test-${weekIndex}`}});
      for(const stage of ['research','write','audit']){
        const input={weekIndex,state,stage};
        const call=()=>weekly.call({runId,article:state,stage,input,instructions:'fixture',model:'fixture'},async()=>{
          if(fail)throw Error('editorial_provider_unavailable');
          const output={fixture:true};return {output,receipt:{responseId:'synthetic',resolvedModel:'fixture',model:'fixture',stage,inputHash:hash(input),outputHash:hash(output),estimatedMicros:1,inputTokens:1,outputTokens:1}};
        });
        if(fail){await assert.rejects(call(),/provider_unavailable/);return;}
        await call();await call(); // Cached receipts never reserve again.
      }
    };
    // Five distinct November weeks exhaust the independent monthly ceiling.
    for(let i=0;i<5;i++){clock=Date.parse(['2026-11-01','2026-11-03','2026-11-10','2026-11-17','2026-11-24'][i]+'T12:00:00Z');await execute('SP',i);await execute('ES',i);}
    assert.equal(financialSummary(await f.ledger.read(),clock).monthlyReservedMicros,3000000);
    clock=Date.parse('2026-11-30T12:00:00Z');await assert.rejects(execute('SP',5),/budget_exhausted/);
    clock=Date.parse('2026-12-01T12:00:00Z');await execute('SP',5);await execute('ES',5);
    assert.equal(financialSummary(await f.ledger.read(),clock).weeklyReservedMicros,600000);
    assert.equal(financialSummary(await f.ledger.read(),clock).monthlyReservedMicros,600000);
    clock=Date.parse('2026-12-08T12:00:00Z');await execute('SP',6,true);
    clock=Date.parse('2026-12-15T12:00:00Z');await assert.rejects(execute('ES',7),/outcome_unknown/);
    assert.equal(financialSummary(await f.ledger.read(),clock).unknownCalls,1);
    assert.equal((await authorizeWeekly(f.ledger,{now:clock})).status,'ALREADY_AUTHORIZED');
  }finally{await f.db.close();}
});

test('weekly runner publishes once per state, observes local schedule and preserves a new topic next week',async()=>{
  const f=await fixture();let clock=when;
  try{
    await authorizeWeekly(f.ledger,{now:clock});
    const options={...f.options,env:{...env,SEO_CONTENT_SCHEDULE_MODE:'weekly-v1'},now:()=>clock,
      inventory:async state=>[{...stock[0],state,city:state==='SP'?'São Paulo':'Vitória',neighborhood:state==='SP'?'Ipiranga':'Praia do Canto',path:state==='SP'?stock[0].path:'/es/synthetic',checkedAt:new Date(clock).toISOString()}],
      snapshotReader:async()=>({provider:'windsor/searchconsole',retrievedAt:new Date(clock).toISOString(),windowStart:'2026-10-08',windowEnd:'2026-11-05',response:{data:['SP','ES'].map(state=>({query:'imóveis',page:ORIGIN+(state==='SP'?stock[0].path:'/es/synthetic'),impressions:100,clicks:1,ctr:.01,position:8}))}}),
      sourceReader:async()=>[{...sources[0],observedAt:new Date(clock).toISOString()},{...sources[0],url:ORIGIN+'/sp',observedAt:new Date(clock).toISOString()}],
      corpusReader:async({opportunity})=>{const c=corpus();c.observedAt=new Date(clock).toISOString();c.coverage={...c.coverage,state:opportunity.state,city:opportunity.city,neighborhood:opportunity.neighborhood};c.pages[0].observedAt=c.observedAt;c.snapshotHash=corpusDigest(c);return c;}};
    clock=Date.parse('2026-11-09T12:00:00Z');assert.equal((await runProduction(options)).status,'WAITING_NEXT_SLOT');assert.equal(f.dispatches,0);
    clock=Date.parse('2026-11-10T11:59:00Z');assert.equal((await runProduction(options)).status,'WAITING_NEXT_SLOT');
    clock=Date.parse('2026-11-10T12:00:00Z');assert.equal((await runProduction(options)).status,'PUBLISHED');assert.equal(f.dispatches,3);
    assert.equal((await runProduction(options)).status,'WAITING_NEXT_SLOT');assert.equal(f.dispatches,3);
    // Fixture ES content references SP inventory: it must remain private.
    clock=Date.parse('2026-11-12T12:00:00Z');assert.equal((await runProduction(options)).status,'NEEDS_REVIEW');assert.equal(f.dispatches,6);
    assert.equal((await runProduction(options)).status,'WAITING_NEXT_SLOT');assert.equal(f.dispatches,6);
    clock=Date.parse('2026-11-17T12:00:00Z');const next=await runProduction(options);assert.ok(['PUBLISHED','NEEDS_REVIEW'].includes(next.status));
    const runs=Object.values((await f.ledger.read()).runs);assert.equal(runs.length,3);assert.equal(new Set(runs.map(r=>r.opportunity.targetCanonical)).size,3);
    assert.equal(publishedArticles(await f.ledger.read(),'SP').length>=1,true);
    assert.equal(calendar(Date.parse('2026-11-10T02:00:00Z')).weekday,0);
  }finally{await f.db.close();}
});

test('provider preflight validates project without inference and Windsor rejects stale data and redacts URLs',async()=>{
  const secret='synthetic-private-key',requests=[];
  const configured={...env,SEO_CONTENT_OPENAI_PROJECT_ID:'proj_synthetic',SEO_CONTENT_WINDSOR_API_KEY:secret};
  const fetcher=async(url,options)=>{
    requests.push(String(url));
    if(String(url).includes('openai.com')){assert.equal(options.headers['OpenAI-Project'],'proj_synthetic');return new Response(JSON.stringify({data:Object.values({r:env.SEO_CONTENT_RESEARCH_MODEL,w:env.SEO_CONTENT_WRITE_MODEL,a:env.SEO_CONTENT_AUDIT_MODEL}).map(id=>({id}))}));}
    const u=new URL(url);assert.deepEqual(JSON.parse(u.searchParams.get('filter'))[0].slice(0,2),['page','contains']);const state=u.searchParams.get('filter').includes('/sp/')?'sp':'es';
    return new Response(JSON.stringify({data:[{query:'imóveis',page:ORIGIN+'/'+state+'/synthetic',impressions:100,clicks:1,ctr:.01,position:8,data_fetched_at:stamp}]}));
  };
  const result=await providerPreflight({env:configured,fetcher,now:when});assert.equal(result.status,'READY');assert.equal(result.gsc.rows,2);assert.doesNotMatch(JSON.stringify(result),new RegExp(secret));assert.equal(requests.length,3);
  await assert.rejects(gscSnapshot({env:configured,now:when,fetcher:async()=>{throw Error('https://provider?api_key='+secret);}}),e=>!e.message.includes(secret)&&e.message==='gsc_windsor_unavailable');
  await assert.rejects(gscSnapshot({env:configured,now:when+8*86400000,fetcher}),/gsc_windsor_invalid/);
});

test('a blocked IBGE source preserves verified municipal and inventory sources, never substitutes unverified evidence',async()=>{
  const retrieve=()=>async url=>{if(url.includes('ibge.gov.br'))throw Error('source_http_unavailable');return {url,excerpt,observedAt:stamp,digest:hash(excerpt)};};
  const result=await collectSources({state:'SP',city:'São Paulo'},stock,{retrieve});assert.equal(result.length,2);assert.ok(result.some(s=>s.url.startsWith('https://prefeitura.sp.gov.br/')));assert.ok(result.some(s=>s.url.startsWith(ORIGIN)));
  await assert.rejects(collectSources({state:'SP',city:'São Paulo'},stock,{retrieve:()=>async url=>{if(!url.startsWith(ORIGIN))throw Error('source_http_unavailable');return {url};}}),/independent_sources_required/);
});
