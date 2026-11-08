import test from 'node:test';
import assert from 'node:assert/strict';
import {searchConsole,ga4Report} from './lib/seo-content/google.js';
import {monitorState} from './lib/seo-content/monitor.js';
import {editorialModel} from './lib/seo-content/providers.js';
test('GSC reads final query/page evidence and derives geography only from exact inventory canonical',async()=>{
  let request;
  const discover=searchConsole({accessToken:'fixture',inventory:async()=>[{state:'ES',city:'Vitória',neighborhood:'Praia do Canto',path:'/es/vitoria/empreendimento/real'}],now:()=>Date.parse('2026-11-07T12:00:00Z'),fetcher:async(url,options)=>{request={url,...options};return Response.json({rows:[{keys:['Como é morar na Praia do Canto?','https://www.yincorp.com.br/es/vitoria/empreendimento/real'],impressions:70,clicks:2,ctr:2/70,position:10},{keys:['Como morar aqui?','https://www.yincorp.com.br/sp/inventada'],impressions:100}]});}});
  const result=await discover('ES','2026-11-07');assert.equal(result.length,1);assert.equal(result[0].city,'Vitória');assert.equal(result[0].evidence[0].impressions,70);assert.equal(result[0].evidence[0].position,10);
  const body=JSON.parse(request.body);assert.equal(body.endDate,'2026-11-04');assert.equal(body.startDate,'2026-10-29');assert.equal(body.dataState,'final');assert.ok(request.url.startsWith('https://www.googleapis.com/'));
  const offline=searchConsole({accessToken:'fixture',inventory:async()=>[],fetcher:async()=>new Response('',{status:403})});await assert.rejects(offline('ES','2026-11-07'),/gsc_unavailable/);
});
test('GA4 request is reporting only and bounds pagination',async()=>{
  let sent;
  await ga4Report({accessToken:'fixture',property:'123',day:'2026-11-06',fetcher:async(url,opts)=>{sent={url,opts};return Response.json({rowCount:0});}});
  assert.ok(sent.url.endsWith('/properties/123:runReport'));assert.equal(JSON.parse(sent.opts.body).metrics[0].name,'sessions');
  await assert.rejects(ga4Report({accessToken:'fixture',property:'123',day:'2026-11-06',fetcher:async()=>Response.json({rowCount:10001})}),/ga4_read_limit/);
});
test('monitor preserves missing measurements and rejects cross-state attribution',async()=>{
  const metrics=[];const store={published:async()=>[{id:'a',path:'/es/conteudos/test'}],monitor:async m=>metrics.push(m),report:async()=>({state:'ES',refreshDue:[]})};
  const m={articleId:'a',state:'ES',day:'2026-11-06',provider:'gsc',observedAt:new Date().toISOString(),values:{impressions:20,clicks:1,ctr:.05,indexed:null}};
  const result=await monitorState({state:'ES',day:m.day,store,gateway:async()=>({metrics:[m]})});assert.equal(result.recorded,1);assert.equal(metrics[0].values.indexed,null);
  await assert.rejects(monitorState({state:'SP',day:m.day,store,gateway:async()=>({metrics:[m]})}),/invalid_metric_scope/);
});
test('editorial spend is reserved before the model and a rejected budget makes no external call',async()=>{
  let external=0;const model=editorialModel(async()=>{external++;return {output:{title:'test'},costMicros:90000};},{rpc:async()=>false},()=>({id:'fixture'}));await assert.rejects(model('write',{},''),/budget_exhausted/);assert.equal(external,0);
});
