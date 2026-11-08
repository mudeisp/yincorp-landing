import test from 'node:test';
import assert from 'node:assert/strict';
import {GATES,config,score,hash,topicKey,identity,canPublish,retry} from './lib/seo-content/core.js';
import {createEditorialAgents} from './lib/seo-content/editorial.js';
import {secureGateway,evidenceProvider,sourceResearch,checkPublicLinks} from './lib/seo-content/providers.js';
import {createContentHandler,renderArticle} from './lib/seo-content/render.js';
import {authorized} from './api/seo-content.js';
const now=Date.parse('2026-11-07T12:00:00Z');
export const passes=()=>Object.fromEntries(GATES.map(g=>[g,{status:'PASS',evidence:'isolated fixture proof: '+g}]));
export function opportunity(state='SP',i=0,date=now){return {state,query:`Como morar no bairro ${i}?`,city:state==='SP'?'São Paulo':'Vitória',neighborhood:'Bairro '+i,intent:'informational',targetCanonical:`/${state.toLowerCase()}/conteudos/morar-bairro-${i}`,evidence:[{provider:'gsc',impressions:100,clicks:2,ctr:.02,position:12,url:'https://search.google.com/search-console',observedAt:new Date(date).toISOString()}]};}
export function stock(o,date=now){return [{id:'real-id',state:o.state,city:o.city,neighborhood:o.neighborhood,path:`/${o.state.toLowerCase()}/cidade/empreendimento/real`,name:'Imóvel do inventário',checkedAt:new Date(date).toISOString()}];}
export function article(o=opportunity(),date=now){const excerpt='O bairro tem uma praça municipal.';return {state:o.state,path:o.targetCanonical,topicKey:topicKey(o),status:'APPROVED',verifiedAt:new Date(date).toISOString(),validations:passes(),sources:[{url:'https://www.ibge.gov.br/cidades-e-estados',observedAt:new Date(date).toISOString(),excerpt,digest:hash(excerpt),retrieved:true}],content:{title:'Como morar no bairro',description:'Um guia com informações verificadas sobre a região e imóveis do catálogo.',introduction:'Conheça os critérios para escolher um imóvel.',sections:[{level:2,heading:'Localização',text:excerpt},{level:3,heading:'Comparação',text:'Compare as condições de cada unidade antes de decidir.'}],questions:[{question:'O que visitar?',answer:'Verifique a praça durante sua visita.'}],internalLinks:[{path:stock(o)[0].path,label:'Conheça os imóveis'}],cta:'Veja o catálogo e confirme a disponibilidade.',claims:[{text:excerpt,sourceUrl:'https://www.ibge.gov.br/cidades-e-estados'}]}};}
const cfg={enabled:true,kill:false,autopublish:true};
test('safe defaults, quotas and credential authorization',()=>{
  assert.equal(config({}).autopublish,false);assert.equal(config({}).kill,true);assert.deepEqual(config({}).quotas,{SP:5,ES:5});
  assert.throws(()=>config({SEO_CONTENT_QUOTA_SP:'6'}));assert.throws(()=>config({SEO_CONTENT_QUOTA_ES:'NaN'}));
  assert.equal(authorized('Bearer ',''),false);assert.equal(authorized('Bearer '+'x'.repeat(32),'x'.repeat(32)),true);assert.equal(authorized('Bearer wrong','x'.repeat(32)),false);
});
test('score requires real observed demand, inventory and geographic relevance; rejects cannibalization',()=>{
  const o=opportunity();assert.ok(score(o,stock(o),[],now).value>=60);
  assert.equal(score({...o,evidence:[]},stock(o),[],now).value,0);
  assert.equal(score(o,[],[],now).value,0);assert.equal(score({...o,state:'RJ'},stock(o),[],now).value,0);
  assert.equal(score(o,stock(o),[{topicKey:topicKey(o)}],now).value,0);
  assert.equal(score({...o,intent:'commercial'},stock(o),[],now).value,0);
  assert.equal(identity(o),identity({...o,query:'  CÓMO morar no bairro 0? '}));
  assert.notEqual(identity(o),identity({...o,state:'ES'}));
});
test('every missing, FAIL or UNKNOWN gate blocks; revisions, freshness and switches block',()=>{
  const a=article();a.validatedHash=hash(a.content);assert.equal(canPublish(a,cfg,now),true);
  for(const g of GATES)for(const status of ['FAIL','UNKNOWN',undefined]){const b=structuredClone(a);b.validations[g].status=status;assert.equal(canPublish(b,cfg,now),false,g);}
  for(const change of [{autopublish:false},{enabled:false},{kill:true}])assert.equal(canPublish(a,{...cfg,...change},now),false);
  a.content.title='Changed';assert.equal(canPublish(a,cfg,now),false);a.validatedHash=hash(a.content);assert.equal(canPublish(a,cfg,now+3600001),false);
});
test('editorial checks independently reject fabricated facts, source tampering and unsafe links',async()=>{
  const o=opportunity(),a=article(o),agents=createEditorialAgents({model:async()=>passes(),checkLinks:async x=>x.map(()=>true),now:()=>now,releaseEvidence:()=>({status:'PASS',evidence:'isolated CI proof'})});
  const input={opportunity:{...o,topicKey:topicKey(o)},content:a.content,context:{sources:a.sources},stock:stock(o),pages:[{path:'/sp/conteudos/outro-fixture',topicKey:'other-fixture',title:'Outra pauta sintética',text:'Comparação sintética independente para testar a verificação de corpus.'}]};
  assert.ok(Object.values(await agents.verify(input)).every(v=>v.status==='PASS'));
  const tampered=structuredClone(input);tampered.context.sources[0].excerpt='inventado';assert.equal((await agents.verify(tampered)).sources.status,'FAIL');
  const invented=structuredClone(input);invented.content.claims[0].text='Preço sobe 20%';assert.equal((await agents.verify(invented)).facts.status,'FAIL');
  const unsafe=structuredClone(input);unsafe.content.internalLinks[0].path='https://evil.test';assert.equal((await agents.verify(unsafe)).links.status,'FAIL');
  const offline=createEditorialAgents({model:async()=>passes(),checkLinks:async()=>{throw Error('offline')},now:()=>now});assert.equal((await offline.verify(input)).links.status,'UNKNOWN');
});
test('external failures, bounded retries, evidence contracts and no credentials in error text',async()=>{
  let calls=0;await assert.rejects(retry(async()=>{calls++;throw Error('offline')}));assert.equal(calls,3);
  assert.throws(()=>secureGateway('http://localhost','secret'));
  const gateway=secureGateway('https://approved.example','secret',{fetcher:async()=>new Response('secret',{status:500})});await assert.rejects(gateway({}),/gateway_unavailable/);
  await assert.rejects(evidenceProvider(async()=>({opportunities:'invented'}))('SP','2026-11-07'));
  await assert.rejects(sourceResearch(async()=>({sources:[{url:'http://127.0.0.1'}]}),async()=>({})) (opportunity(),[]));
  assert.deepEqual(await checkPublicLinks(['https://evil.test']),[false]);
});
function response(){return {statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},send(b){this.body=b;return this;},end(){return this;}};}
test('SSR canonical, schemas, escaped content, private preview and sitemap publication filtering',async()=>{
  const a=article();a.status='PUBLISHED';a.publishedAt=new Date(now).toISOString();a.content.title='<script>alert(1)</script>';
  const html=renderArticle(a,{stock:stock(opportunity())});assert.ok(html.includes('rel="canonical" href="https://www.yincorp.com.br/sp/conteudos/morar-bairro-0"'));assert.ok(html.includes('BlogPosting'));assert.ok(html.includes('BreadcrumbList'));assert.ok(!html.includes('<h1><script>'));
  const privateHtml=renderArticle(a,{preview:true});assert.ok(privateHtml.includes('noindex'));assert.ok(!privateHtml.includes('googletagmanager'));
  const handler=createContentHandler({enabled:()=>true,store:{published:async()=>[a,{...a,path:'/sp/conteudos/draft',status:'DRAFT'}]},inventory:async()=>stock(opportunity()),preview:()=>false});
  let res=response();await handler({method:'GET'},res,'/sitemap-content-sp.xml');assert.ok(res.body.includes(a.path));assert.ok(!res.body.includes('/draft'));assert.equal(res.headers['Cache-Control'],'no-store');
  res=response();await handler({method:'GET'},res,'/sp/conteudos/draft');assert.equal(res.statusCode,404);
  const disabled=createContentHandler({enabled:()=>false});res=response();await disabled({method:'GET'},res,a.path);assert.equal(res.statusCode,404);
});
