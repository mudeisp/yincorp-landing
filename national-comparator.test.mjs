import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {compare,decorate,saleRoute} from './lib/intelligence.js';
import handler from './api/intelligence.js';
import {NATIONAL_MARKETS} from './.portal-shared/eligibility.js';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const row=(state,n,extra={})=>({id:id(n),external_id:`orulo:${n}:1`,building_id:String(n),source:'novos',active:true,state,city:'Cidade Real',neighborhood:'Centro',development_name:`Projeto ${n}`,status:'Pronto novo',stage:'Pronto novo',typology_type:'Apartamento',price:1000000,area:60,bedrooms:2,typology_stock:1,image_url:'https://example.com/real.jpg',...extra});
const path=(uf,n=1)=>`/${uf.toLowerCase()}/cidade-real/empreendimento/projeto-${n}--orulo-${n}`;
const response=()=>({headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(body){this.body=body;return this;}});

for(const state of NATIONAL_MARKETS)test(`comparison, decoration and endpoint work in ${state} without cross-state reads`,async()=>{
 const other=state==='SP'?'ES':'SP',rows=[row(state,1),row(state,2,{price:1100000,area:82}),row(other,3),row(state,4,{city:'Outra Cidade'}),row(state,5,{typology_type:'Sala comercial'}),row(state,6,{price:1300000})];
 const calls=[];const result=await compare(path(state),{read:async opts=>{calls.push(opts);assert.equal(opts.state,state);return opts.mode==='listing'?rows:rows.filter(r=>opts.ids.includes(r.id));}});
 assert.equal(result.kind,'sale');assert.equal(result.base.id,id(1));assert.deepEqual(result.items.map(x=>[x.id,x.price,x.area]),[[id(2),1100000,82]]);
 assert.equal(calls.length,2);assert.deepEqual(calls[1].ids,[id(1),id(2)]);
 const html=decorate('<head></head><body>Existing media</body>',path(state));assert.match(html,/intelligence.js/);assert.ok(html.includes(`data-markets="${NATIONAL_MARKETS.map(s=>s.toLowerCase()).join(',')}"`));
 const previous=globalThis.fetch,requests=[];
 globalThis.fetch=async url=>{const u=new URL(url);requests.push(u);assert.equal(u.searchParams.get('state'),`eq.${state}`);const selected=u.pathname.endsWith('/properties')?rows.filter(r=>[id(1),id(2)].includes(r.id)):rows;return new Response(JSON.stringify(selected),{status:200});};
 try{const res=response();await handler({method:'GET',url:'/api/intelligence?'+new URLSearchParams({path:path(state)})},res);assert.equal(res.code,200);assert.equal(res.body.base.state,state);assert.deepEqual(res.body.items.map(i=>i.state),[state]);assert.equal(requests.length,2);assert.match(res.headers['Cache-Control'],/s-maxage=60/);}finally{globalThis.fetch=previous;}
});

test('no alternatives is a valid empty result; missing base stays not found',async()=>{
 const base=row('RS',1),read=async()=>[base];const result=await compare(path('RS'),{read});assert.deepEqual(result.items,[]);assert.equal(result.base.id,id(1));assert.equal(await compare(path('RS',99),{read}),null);
});
test('hydration retains exact unit identity and rechecks price and availability',async()=>{
 const listing=[row('SC',1),row('SC',2,{price:1100000})];
 const read=async opts=>opts.mode==='listing'?listing:[row('SC',1,{price:1000000,area:61}),row('SC',2,{price:1400000,area:89})];
 const result=await compare(path('SC'),{read});assert.equal(result.base.area,61);assert.deepEqual(result.items,[]);
 assert.equal(await compare(path('SC'),{read:async opts=>opts.mode==='listing'?listing:[row('SC',1,{typology_stock:0})]}),null);
});
test('invalid, unsupported and hostile URLs fail before inventory access',async()=>{
 const invalid=['https://attacker.test/rs/x/empreendimento/a--orulo-1','//rs/x/empreendimento/a--orulo-1','/mg/x/empreendimento/a--orulo-1','/rs','/rs/x/empreendimento/no-id','/rs/x/empreendimento/a--orulo-1/extra','/rs/x/empreendimento/a--orulo-1?foo=bar','/rs/x/empreendimento/a--orulo-1#hash','/rs/../empreendimento/a--orulo-1','/rs/x/empreendimento/a%2F--orulo-1'];
 const previous=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('unexpected access');};
 try{for(const p of invalid){assert.equal(saleRoute(p),null);assert.equal(decorate('<head></head>',p),'<head></head>');assert.equal(await compare(p,{read:async()=>{calls++;return [];}}),null);const res=response();await handler({method:'GET',url:'/?'+new URLSearchParams({path:p})},res);assert.equal(res.code,400);}assert.equal(calls,0);}finally{globalThis.fetch=previous;}
 assert.equal(saleRoute(path('PE')+'/tipologia/'+id(1)).kind,'unit');
});
test('videos, photos, floor plans and virtual tours are preserved byte for byte',()=>{
 const body='<body><video controls src="/film.mp4"></video><img src="/photo.jpg"><a data-plan-image="/plan.jpg">Planta</a><iframe src="https://example.com/tour"></iframe></body>';
 for(const state of NATIONAL_MARKETS){const html=decorate('<head></head>'+body,path(state));assert.equal(html.slice(html.indexOf('<body>')),body);assert.equal((html.match(/intelligence.js/g)||[]).length,1);}
});
test('existing browser UI accepts national links from the shared server allowlist and blocks external links',()=>{
 const code=readFileSync(new URL('./portal-assets/intelligence.js',import.meta.url),'utf8');
 const guard=code.slice(code.indexOf('const markets='),code.indexOf('const path=location.pathname'));
 const context={document:{currentScript:{dataset:{markets:NATIONAL_MARKETS.map(s=>s.toLowerCase()).join(',')}}}};
 vm.runInNewContext(guard+';globalThis.accept=safePath',context);
 for(const state of NATIONAL_MARKETS){assert.ok(context.accept(path(state)));assert.ok(context.accept(path(state)+'/tipologia/'+id(1)));}
 for(const invalid of ['https://attacker.test/a','javascript:alert(1)',path('MG'),'//rs/x/empreendimento/a','/rs/../empreendimento/a'])assert.equal(context.accept(invalid),false);
 assert.ok(context.accept('/alugar/imovel/'+id(1)));assert.ok(context.accept('/es/vitoria/investimento-airbnb'));
 assert.match(code,/Não encontramos alternativas compatíveis/);
});
