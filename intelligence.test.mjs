import test from 'node:test';import assert from 'node:assert/strict';
import {chooseSales,chooseRentals,decorate,compare} from './lib/intelligence.js';import endpoint from './api/intelligence.js';
import {investmentPage} from './lib/investment-page.js';
const unit=(id,price,area,bedrooms=2)=>({id,price,area,bedrooms,parking_spaces:1,stock:2,unitType:'Apartamento',active:true,state:'SP',city:'São Paulo'});
const group=(token,name,units,neighborhood='Brooklin')=>({token,name,units,path:'/sp/sao-paulo/empreendimento/'+name.toLowerCase()+'--'+token,city:'São Paulo',state:'SP',neighborhood,photos:[],details:{}});
test('sale compares one actual unit at a time, same city/use and within 25%',()=>{const groups=[group('orulo-1','Base',[unit('a',2000000,100)]),group('orulo-2','Related',[unit('b',800000,50),unit('c',2100000,120)]),group('orulo-3','Commercial NR',[unit('d',2000000,200)]),{...group('orulo-4','Othercity',[unit('e',2000000,200)]),city:'Santos'}];const result=chooseSales(groups,{state:'SP',city:'sao-paulo',token:'orulo-1'});assert.equal(result.items.length,1);assert.equal(result.items[0].id,'c');assert.equal(result.items[0].price,2100000);assert.equal(result.items[0].area,120)});
test('explicit unit controls budget; sold-out configurations do not appear',()=>{const g=group('orulo-1','Base',[unit('a',1000000,70),unit('b',2000000,120)]);const unavailable=group('orulo-2','Sold',[{...unit('c',2000000,100),stock:0}]);assert.equal(chooseSales([g,unavailable],{state:'SP',city:'sao-paulo',token:'orulo-1',unitId:'b'}).base.price,2000000);assert.equal(chooseSales([g,unavailable],{state:'SP',city:'sao-paulo',token:'orulo-1'}).items.length,0)});
const rent=(id,price,condo,neighborhood='Jabaquara')=>({id,rent_price:price,condo_fee:condo,property_tax:3980,active:true,city:'São Paulo',state:'SP',neighborhood,bedrooms:2});
test('rental zone, budget and charges remain separate; missing condo is not zero',()=>{const base=rent('a',2600,865);const result=chooseRentals([rent('b',2900,555,'Jardim Marajoara'),rent('c',2700,null),rent('d',2700,100,'Casa Verde'),rent('e',4000,0)],base);assert.equal(result.items.length,2);assert.equal(result.items.find(i=>i.id==='b').subtotal,3455);assert.equal(result.items.find(i=>i.id==='b').tax,3980);assert.equal(result.items.find(i=>i.id==='c').subtotal,null)});
test('decorator only adds assets to sale/rental property LPs, never catalogs or unrelated pages',()=>{const html='<html><head></head><body>Original LP</body></html>';for(const p of ['/es/vitoria/empreendimento/a--orulo-1','/sp/sao-paulo/empreendimento/b--orulo-2','/alugar/imovel/188f539c-a45b-4e46-9136-aefb22e67e40']){const out=decorate(html,p);assert.match(out,/intelligence.js/);assert.match(out,/<body>Original LP<\/body>/)}for(const p of ['/es','/sp','/alugar','/institucional'])assert.equal(decorate(html,p),html)});
test('rental comparison queries only active public fields and does not load raw contacts',async()=>{const paths=[];const base=rent('188f539c-a45b-4e46-9136-aefb22e67e40',2600,865);const result=await compare('/alugar/imovel/'+base.id,{query:async p=>{paths.push(p);return {ok:true,data:paths.length===1?[base]:[rent('x',2700,600)]}}});assert.equal(result.kind,'rent');assert.equal(paths.length,2);assert.ok(paths.every(p=>p.includes('active=eq.true')));assert.ok(paths.every(p=>!p.includes('raw_data')))});
test('endpoint rejects non-GET and invalid routes before inventory access',async()=>{const res={headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.code=n;return this},json(v){this.body=v;return this}};await endpoint({method:'POST',url:'/'},res);assert.equal(res.code,405);await endpoint({method:'GET',url:'/?path=https://attacker.test'},res);assert.equal(res.code,400)});
const fixtureId=id=>`00000000-0000-4000-8000-${String(id.charCodeAt(0)).padStart(12,'0')}`;
const compact=(id,building_id,price,area=30,extra={})=>({id:fixtureId(id),source:'novos',status:'Pronto novo',stage:'Pronto novo',typology_stock:2,image_url:'https://example.com/real.jpg',building_id,price,area,bedrooms:1,parking_spaces:0,typology_type:'Studio',typology_reference:'101',active:true,state:'ES',city:'Vitória',neighborhood:'Mata da Praia',development_name:'Projeto '+building_id,...extra});
test('investment page removes tools, preserves selection anchor and links exact configurations',()=>{const html=investmentPage([compact('a','1',600000),compact('b','2',700000)]);assert.match(html,/id="selecao"/);assert.match(html,/id="investment-motor-anchor"/);assert.match(html,new RegExp('/tipologia/'+fixtureId('a')));assert.match(html,/investment-story/);assert.doesNotMatch(html,/<form|id="simulador"|id="comparador"|id="perfil-investidor"|Abrir simulador|Simular com/)});
test('investment engine excludes sold, larger or noncompact configurations and hydrates selected IDs only',async()=>{const rows=[compact('a','1',600000),compact('b','2',700000),compact('c','3',550000,75),compact('d','4',500000,30,{typology_stock:0}),compact('e','5',400000,30,{typology_type:'Sala comercial'})];const calls=[];const result=await compare('/es/vitoria/investimento-airbnb',{read:async opts=>{calls.push(opts);return opts.mode==='listing'?rows:rows.filter(r=>opts.ids.includes(r.id))}});assert.equal(result.kind,'investment');assert.equal(result.base.id,fixtureId('a'));assert.deepEqual(result.items.map(i=>i.id),[fixtureId('b')]);assert.equal(calls.length,2);assert.deepEqual(calls[1].ids,[fixtureId('a'),fixtureId('b')]);assert.match(decorate('<head></head>','/es/vitoria/investimento-airbnb'),/intelligence.js/)});

test('sales returns six eligible distinct projects in stable order',()=>{
 const base=group('orulo-1','Base',[unit('base',1000000,80)]);
 const alternatives=Array.from({length:8},(_,i)=>group('orulo-'+(i+2),'Projeto '+i,[unit('u'+i,1010000+i*10000,81+i),unit('out'+i,500000,40)]));
 const route={state:'SP',city:'sao-paulo',token:base.token};
 const result=chooseSales([base,...alternatives.reverse()],route);
 assert.deepEqual(result.items.map(item=>item.id),['u0','u1','u2','u3','u4','u5']);
 assert.equal(new Set(result.items.map(item=>item.projectPath)).size,6);
 assert.ok(result.items.every(item=>item.projectPath!==result.base.projectPath));
 assert.equal(result.items[5].area,86);
 assert.equal(result.items[5].price,1060000);
});
test('rental returns up to six eligible distinct listings',()=>{
 const base=rent('base',2500,400);
 const rows=Array.from({length:8},(_,i)=>rent('unit-'+i,2500+i*10,400));
 const result=chooseRentals([base,...rows,rent('too-expensive',3001,0)],base);
 assert.deepEqual(result.items.map(item=>item.id),rows.slice(0,6).map(item=>item.id));
 assert.deepEqual(chooseRentals([base],base).items,[]);
});
