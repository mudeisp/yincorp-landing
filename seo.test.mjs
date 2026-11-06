import test from 'node:test';
import assert from 'node:assert/strict';
import {eligibleResales,resaleCandidate,resalePlaces,portalEntries,sitemapBuckets,urlset,sitemapIndex,createResaleReader,createSeoHandler,RESALE_SELECT,SITEMAP_SIZE} from './lib/seo-catalog.js';
import {auditSeo} from './scripts/audit-seo.mjs';
const id=n=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const row=(n,extra={})=>({id:id(n),external_id:`nonstop:${n}`,source:'usados',title:`Apartamento ${n} em Pinheiros`,state:'SP',city:'São Paulo',neighborhood:'Pinheiros',active:true,operation:'VENDA',price:600000,area:70,image_url:'https://images.example.com/1.jpg',description:`Descrição específica do imóvel ${n}. `+'Ambientes bem descritos com características informadas no inventário. '.repeat(4),updated_at:'2026-11-04T10:00:00Z',...extra});
function response(){return {statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},send(body){this.body=body;return this;},end(){this.ended=true;return this;}};}
const groups=[{id:id(99),external_id:'orulo:123:1',building_id:'123',source:'novos',state:'ES',city:'Vitória',neighborhood:'Jardim Camburi',development_name:'Projeto real',active:true,price:500000,area:60,typology_stock:1,status:'Pronto novo',stage:'Pronto novo',image_url:'https://images.example.com/development.jpg',updated_at:'2026-11-04T10:00:00Z'}];
test('eligibility rejects empty, inactive, unavailable or non-sale rows and unsafe content',()=>{
  assert.ok(resaleCandidate(row(1)));
  assert.equal(resaleCandidate(row(1,{title:'Apartamento Indisponível em Perdizes'})),null);
  for(const extra of [{active:false},{source:'novos'},{operation:'LOCACAO'},{area:0},{price:null},{description:'Curta'},{city:''},{image_url:'javascript:alert(1)'},{description:row(1).description+' Ligue (11) 99999-1234'},{description:row(1).description+' test@example.com'}])assert.equal(resaleCandidate(row(1,extra)),null);
  assert.doesNotMatch(RESALE_SELECT,/(?:^|,)raw_data(?:,|$)|user|owner|phone|email|contact/);
});
test('duplicates and thin neighborhood hubs do not create indexable pages',()=>{
  assert.equal(eligibleResales([row(1),row(2,{description:row(1).description}),row(3)]).length,1);
  assert.equal(resalePlaces(eligibleResales([row(1),row(2)] )).length,0);
  assert.equal(resalePlaces(eligibleResales([row(1),row(2),row(3)] )).length,3);
});
test('sitemaps keep existing paths, exclude zero stock and do not fabricate lastmod',()=>{
  const existing=portalEntries(groups);assert.ok(existing.some(e=>e.kind==='development'));assert.ok(existing.some(e=>e.kind==='neighborhood'));
  assert.equal(portalEntries([{...groups[0],typology_stock:0}]).length,0);
  assert.doesNotMatch(urlset(existing),/lastmod/);
  const valid=resaleCandidate(row(1,{content_updated_at:'2026-09-01T12:00:00Z'}));
  assert.equal(valid.updated_at,'2026-09-01T12:00:00.000Z');
  assert.equal(resaleCandidate(row(2,{content_updated_at:'2099-01-01'})).updated_at,null);
});
test('large sitemap buckets partition deterministically and index only URL sets',()=>{
  const rows=Array.from({length:SITEMAP_SIZE+1},(_,i)=>({...row(i+1),path:`/sp/sao-paulo/imovel/apartamento--${id(i+1)}`}));
  const {files}=sitemapBuckets(groups,rows);assert.equal(files.get('/sitemap-seo/sp/imoveis-1.xml').length,SITEMAP_SIZE);assert.equal(files.get('/sitemap-seo/sp/imoveis-2.xml').length,1);
  assert.match(sitemapIndex(files),/<sitemapindex/);for(const entries of files.values())assert.match(urlset(entries),/<urlset/);
});
test('reader paginates, coalesces reads, caches and fails closed on incomplete source',async()=>{
  let calls=0;const read=createResaleReader(async path=>{calls++;const p=new URL(path,'https://example.com');return {ok:true,data:p.searchParams.get('offset')==='0'?Array.from({length:500},(_,i)=>row(i+1)):[row(501)]};});
  const [a,b]=await Promise.all([read(),read()]);assert.equal(a,b);assert.equal(a.length,501);await read();assert.equal(calls,2);
  const fail=createResaleReader(async()=>({ok:false,data:null}));await assert.rejects(fail(),/unavailable/);await assert.rejects(fail(),/unavailable/);
  const cap=createResaleReader(async()=>({ok:true,data:Array.from({length:500},(_,i)=>row(i+1))}));await assert.rejects(cap(),/incomplete/);
});
test('SSR property has canonical, unique data and schema without exposing raw supplier payload',async()=>{
  const rows=eligibleResales([row(1),row(2),row(3)]),handler=createSeoHandler({inventory:async()=>groups,resales:async()=>rows});
  const r=response();await handler({method:'GET',url:rows[0].path},r,rows[0].path);
  assert.equal(r.statusCode,200);assert.match(r.body,/<h1>/);assert.ok(r.body.includes(`rel="canonical" href="https://www.yincorp.com.br${rows[0].path}"`));assert.ok(r.body.includes(rows[0].description));
  const schema=JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(r.body)[1]);assert.ok(schema['@graph'].some(x=>x['@type']==='RealEstateListing'));assert.doesNotMatch(r.body,/usenonstop\.com|raw_data|<form/);
  const p=response();await createSeoHandler({preview:true,inventory:async()=>groups,resales:async()=>rows})({method:'GET',url:rows[0].path},p,rows[0].path);assert.match(p.body,/noindex,follow/);assert.doesNotMatch(p.body,/googletagmanager/);
});
test('pagination, redirects, errors and HEAD preserve correct HTTP and indexing semantics',async()=>{
  const rows=eligibleResales(Array.from({length:20},(_,i)=>row(i+1))),handler=createSeoHandler({inventory:async()=>groups,resales:async()=>rows});
  const r=response();await handler({method:'GET',url:'/sp/imoveis?pagina=2'},r,'/sp/imoveis');assert.match(r.body,/canonical" href="https:\/\/www.yincorp.com.br\/sp\/imoveis\?pagina=2/);assert.match(r.body,/Anterior/);
  assert.match(r.body,/href="\/sp\/sao-paulo\/imoveis"/);
  for(const page of ['0','03','100','oops']){const bad=response();await handler({method:'GET',url:'/sp/imoveis?pagina='+page},bad,'/sp/imoveis');assert.equal(bad.statusCode,404);assert.match(bad.headers['X-Robots-Tag'],/noindex/);}
  const filter=response();await handler({method:'GET',url:'/sp/imoveis?quartos=2'},filter,'/sp/imoveis');assert.match(filter.body,/noindex,follow/);
  const rewritten=response();await handler({method:'GET',url:'/api/portal?portalPath=%2Fsp%2Fimoveis&uf=sp&rest=imoveis'},rewritten,'/sp/imoveis');assert.match(rewritten.body,/content="index,follow"/);
  const rewrittenFilter=response();await handler({method:'GET',url:'/api/portal?portalPath=%2Fsp%2Fimoveis&uf=sp&rest=imoveis&quartos=2'},rewrittenFilter,'/sp/imoveis');assert.match(rewrittenFilter.body,/content="noindex,follow"/);
  const moved=response(),wrong=rows[0].path.replace('apartamento-','outro-');await handler({method:'GET',url:wrong+'?gclid=abc'},moved,wrong);assert.equal(moved.statusCode,308);assert.equal(moved.headers.Location,rows[0].path+'?gclid=abc');
  const head=response();await handler({method:'HEAD',url:'/sitemap.xml'},head,'/sitemap.xml');assert.equal(head.statusCode,200);assert.equal(head.body,undefined);
  const missing=response();await handler({method:'GET',url:'/sitemap-seo/es/imoveis-1.xml'},missing,'/sitemap-seo/es/imoveis-1.xml');assert.equal(missing.statusCode,404);
  const failed=response();await createSeoHandler({inventory:async()=>{throw Error('offline');},resales:async()=>[]})({method:'GET',url:'/sitemap.xml'},failed,'/sitemap.xml');assert.equal(failed.statusCode,503);assert.equal(failed.headers['Retry-After'],'60');
});
test('original commercial routes pass through untouched and writes never read inventory',async()=>{
  let calls=0;const handler=createSeoHandler({inventory:async()=>{calls++;return [];},resales:async()=>{calls++;return [];}});
  assert.equal(await handler({method:'GET',url:'/es/vitoria'},response(),'/es/vitoria'),false);assert.equal(calls,0);
  const r=response();await handler({method:'POST',url:'/sp/imoveis'},r,'/sp/imoveis');assert.equal(r.statusCode,405);assert.equal(calls,0);
});
test('coverage monitor distinguishes technical eligibility from Google indexing',async()=>{
  const report=await auditSeo({origin:'https://www.yincorp.com.br',request:async url=>{
    if(url.endsWith('/sitemap.xml'))return new Response('<sitemapindex><sitemap><loc>https://www.yincorp.com.br/child.xml</loc></sitemap></sitemapindex>');
    if(url.endsWith('/child.xml'))return new Response('<urlset><url><loc>https://www.yincorp.com.br/sp</loc></url></urlset>');
    return new Response('<title>São Paulo</title><link rel="canonical" href="https://www.yincorp.com.br/sp"><h1>São Paulo</h1>');
  }});assert.equal(report.sitemapUrlCount,1);assert.equal(report.failures.length,0);assert.equal(report.googleIndexState.indexed,null);
  const failed=await auditSeo({request:async()=>new Response('offline',{status:503})});assert.equal(failed.failures.length,1);assert.equal(failed.sitemapUrlCount,0);
});
