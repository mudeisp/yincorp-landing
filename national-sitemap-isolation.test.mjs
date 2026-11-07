import test from 'node:test';
import assert from 'node:assert/strict';
import {createSeoHandler} from './lib/seo-catalog.js';

const response=()=>({headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},send(body){this.body=body;return this;},end(){return this;}});
const row={id:'00000000-0000-4000-8000-000000000001',external_id:'orulo:100:1',building_id:'100',source:'novos',active:true,state:'RJ',city:'Rio de Janeiro',neighborhood:'Centro',development_name:'Projeto Real',status:'Pronto novo',stage:'Pronto novo',price:500000,area:80,typology_stock:1,image_url:'https://example.com/real.jpg'};

test('national child remains available when resale reader fails',async()=>{
 let resaleCalls=0;
 const handler=createSeoHandler({preview:false,inventory:async state=>state==='RJ'?[row]:[],resales:async()=>{resaleCalls++;throw Error('resale_inventory_unavailable');}});
 const res=response();
 await handler({method:'GET',url:'/sitemap-seo/rj/empreendimentos-1.xml'},res,'/sitemap-seo/rj/empreendimentos-1.xml');
 assert.equal(res.statusCode,200);
 assert.match(res.body,/orulo-100/);
 assert.equal(resaleCalls,0);
});
