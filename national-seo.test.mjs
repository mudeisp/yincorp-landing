import test from 'node:test';
import assert from 'node:assert/strict';
import {createSeoHandler,portalEntries} from './lib/seo-catalog.js';
import {NATIONAL_MARKETS} from './.portal-shared/eligibility.js';
const row=(state,more={})=>({id:'00000000-0000-4000-8000-000000000001',external_id:'orulo:100:1',building_id:'100',source:'novos',active:true,state,city:'Cidade Real',neighborhood:'Centro',development_name:'Projeto Real',status:'Pronto novo',stage:'Pronto novo',price:500000,area:80,typology_stock:1,image_url:'https://example.com/real.jpg',...more});
const response=()=>({headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},send(body){this.body=body;return this;},end(){return this;}});
test('national sitemap uses eight eligible markets, omits used and catalog-only, preserves SP/ES paths',async()=>{
 let calls=0,clock=0;const handler=createSeoHandler({now:()=>clock,preview:true,inventory:async state=>{calls++;const n=NATIONAL_MARKETS.indexOf(state);return [row(state,{building_id:String(1000+n)}),row(state,{building_id:String(2000+n),id:'00000000-0000-4000-8000-000000000002',status:'Usado'}),row(state,{building_id:String(3000+n),id:'00000000-0000-4000-8000-000000000003',image_url:''})];},resales:async()=>[]});
 const get=async path=>{const res=response();await handler({method:'GET',url:path},res,path);return res;};
 const [index,rs]=await Promise.all([get('/sitemap.xml'),get('/sitemap-seo/rs/empreendimentos-1.xml')]);
 assert.equal(calls,9);assert.equal(index.statusCode,200);assert.equal(rs.statusCode,200);
 for(const state of NATIONAL_MARKETS)assert.ok(index.body.includes(`/sitemap-seo/${state.toLowerCase()}/empreendimentos-1.xml`));
 assert.match(rs.body,/orulo-1002/);assert.doesNotMatch(rs.body,/orulo-2002|orulo-3002|lastmod/);assert.equal(rs.headers['X-Robots-Tag'],'noindex, follow');
 assert.equal((await get('/sitemap-seo/rs/empreendimentos-2.xml')).statusCode,404);assert.equal(calls,10);
 clock=60001;await get('/sitemap.xml');assert.equal(calls,18);
});
test('empty and rejected localities do not create sitemap hubs',()=>{
 for(const change of [{active:false},{status:'Usado'},{price:0},{typology_stock:null}])assert.equal(portalEntries([row('RS',change)]).length,0);
 assert.ok(portalEntries([row('SP')]).some(e=>e.path==='/sp/cidade-real/centro'));
});
