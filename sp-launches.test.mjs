import test from 'node:test';import assert from 'node:assert/strict';
import {launches,launchPath,launchForPath,launchProject,renderLaunch,rewriteLaunchLinks,createLaunchHandler} from './lib/sp-launches.js';
const p=launches[0], row={id:'11111111-1111-4111-8111-111111111111',external_id:`orulo:${p.id}:1`,source:'novos',state:'SP',city:'São Paulo',neighborhood:'Moema',development_name:p.name,active:false,area:585,price:.01,original_price:.1,bedrooms:4};
test('exact 20 unique deterministic clean routes; old project and unit URLs resolve',()=>{
 assert.equal(launches.length,20);assert.equal(new Set(launches.map(launchPath)).size,20);
 for(const p of launches){assert.equal(launchForPath(launchPath(p)),p);assert.equal(launchForPath(launchPath(p)+'--orulo-'+p.id),p);assert.equal(launchForPath(launchPath(p)+'--orulo-'+p.id+'/tipologia/'+row.id),p);assert.doesNotMatch(launchPath(p),/orulo|--|\d{5}$/);}
 assert.equal(launchForPath('/es/vitoria/empreendimento/anything--orulo-81314'),null);
});
test('inactive/symbolic prices never leak and source flags are preserved',()=>{
 const g=launchProject(p,[row,{...row,id:'two',area:69},{...row,id:'wrong',external_id:'orulo:99999:1'}]);
 assert.equal(g.units.length,1);assert.equal(g.units[0].active,false);assert.equal(g.price,null);assert.equal(g.units[0].original_price,null);
 const html=renderLaunch(g);assert.match(html,/Não representam unidades disponíveis para venda/);assert.match(html,/585 m²/);assert.match(html,/yi-travertino-page/);assert.match(html,/index,follow/);assert.match(html,/portal-lead/);assert.match(html,/G-2ZDJCLSSDN/);assert.doesNotMatch(html,/0,01|0,10|tipologia\//);
 const schema=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);assert.ok(schema['@graph'].every(n=>!n.offers));
});
test('active commercial prices retained; symbolic and inactive prices discarded',()=>{
 assert.equal(launchProject(p,[{...row,active:true,price:2500000}]).price,2500000);
 assert.equal(launchProject(p,[{...row,active:true,price:.1}]).price,null);
 assert.equal(launchProject(p,[{...row,price:2500000}]).price,null);
});
test('rewrites only authorized internal links and sitemap URLs',()=>{
 const old='/sp/sao-paulo/empreendimento/test--orulo-'+p.id;
 assert.equal(rewriteLaunchLinks(old),launchPath(p));assert.equal(rewriteLaunchLinks('https://www.yincorp.com.br'+old),'https://www.yincorp.com.br'+launchPath(p));
 assert.equal(rewriteLaunchLinks('/sp/sao-paulo/empreendimento/test--orulo-12345'),'/sp/sao-paulo/empreendimento/test--orulo-12345');
});
const res=()=>({headers:{},statusCode:200,setHeader(k,v){this.headers[k]=v},status(s){this.statusCode=s;return this},send(b){this.body=b},end(){}});
test('live resolver fails closed and redirects only after destination data exists',async()=>{
 for(const data of [[],[row]]){
 const response=res(),handler=createLaunchHandler({request:async()=>({ok:true,data})});
 await handler({method:'GET',url:'/old?utm_source=test&uf=sp&rest=internal&portalPath=internal'},response,launchPath(p)+'--orulo-'+p.id);
 assert.equal(response.statusCode,data.length?301:404);if(data.length)assert.equal(response.headers.Location,launchPath(p)+'?utm_source=test');
 }
 const response=res();await createLaunchHandler({request:async()=>({ok:false})})({method:'GET',url:launchPath(p)},response,launchPath(p));assert.equal(response.statusCode,503);
});
test('clean URLs keep comparator routing and canonical result links',async()=>{
 const {saleRoute,decorate}=await import('./lib/intelligence.js');
 for(const p of launches){assert.equal(saleRoute(launchPath(p)).token,'orulo-'+p.id);assert.match(decorate('<head></head>',launchPath(p)),/intelligence.js/);}
});
