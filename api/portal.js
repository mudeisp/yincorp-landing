import {groupEligibleDevelopments} from '../.portal-shared/model.js';
import {NATIONAL_MARKETS} from '../.portal-shared/eligibility.js';
import { createPortalHandler } from '../.portal-shared/router.js';
import { readInventory } from '../.portal-shared/inventory.js';
import { publicConfig } from '../.portal-shared/public-config.js';
import {decorate,INVESTMENT_PATH} from '../lib/intelligence.js';
import {investmentPage} from '../lib/investment-page.js';
import {createSeoHandler,createResaleReader} from '../lib/seo-catalog.js';
import {withPrivacyFooter} from '../lib/privacy-footer.js';
import {linkNationalEntities} from '../lib/geo-national-entities.js';

async function publicInventoryRequest(path,options={}) {
  const headers={apikey:publicConfig.key,'Content-Type':'application/json'};
  if(options.prefer)headers.Prefer=options.prefer;
  const response=await fetch(`${publicConfig.url}/rest/v1/${path}`,{
    method:options.method || 'GET',
    signal:options.signal,
    headers,
    body:options.body ? JSON.stringify(options.body) : undefined
  });
  const data=await response.json().catch(()=>null);
  const result={ok:response.ok,status:response.status,data};
  if(options.includeContentRange)result.contentRange=response.headers.get('content-range');
  return result;
}
const handler=createPortalHandler({
  nationalEligibility:true,
  canonicalOrigin:'https://www.yincorp.com.br',
  inventory:(state,options={})=>readInventory(state,{request:publicInventoryRequest,configured:()=>true,cacheable:true,nationalEligibility:true,...options})
});
const seo=createSeoHandler({
  inventory:(state,options={})=>readInventory(state,{request:publicInventoryRequest,configured:()=>true,cacheable:true,nationalEligibility:true,...options}),
  resales:createResaleReader(publicInventoryRequest)
});
export default async function portal(req,res){
  const url=new URL(req.url||'/', 'https://www.yincorp.com.br');
  const path=String(req.query?.portalPath||url.searchParams.get('portalPath')||url.pathname);
  const privacySend=res.send.bind(res);res.send=body=>{
    if(res.statusCode===200&&typeof body==='string'&&body.startsWith('<!doctype html>')&&NATIONAL_MARKETS.some(state=>path===`/${state.toLowerCase()}`)){
      body=body.replace('</main>',`<nav class="wrap" aria-label="Estados Yincorp">${NATIONAL_MARKETS.map(state=>`<a href="/${state.toLowerCase()}">${state}</a>`).join(' · ')}</nav></main>`);
    }
    return privacySend(res.statusCode===200?withPrivacyFooter(body):body);
  };
  if(await seo(req,res,path))return;
  const send=res.send.bind(res);res.send=body=>send(res.statusCode===200?linkNationalEntities(decorate(body,path),path):body);
  // Discovery links are HTML, not JS-only navigation. No commercial flow changes.
  if(['GET','HEAD'].includes(req.method)&&/^\/sp(?:\/[^/]+)?$/.test(path)){
    const baseSend=res.send.bind(res);res.send=body=>baseSend(res.statusCode===200&&typeof body==='string'?body.replace('</main>',`<nav class="wrap" aria-label="Catálogo de imóveis"><a href="/${path.split('/')[1]}/imoveis">Explorar imóveis à venda em ${path.split('/')[1].toUpperCase()}</a></nav></main>`):body);
  }
  if(path===INVESTMENT_PATH&&['GET','HEAD'].includes(req.method)){
    try{const rows=await readInventory('ES',{mode:'listing',request:publicInventoryRequest,configured:()=>true,cacheable:true,nationalEligibility:true});const html=investmentPage(groupEligibleDevelopments(rows).flatMap(g=>g.units),{preview:process.env.VERCEL_ENV==='preview'});res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control',process.env.VERCEL_ENV==='preview'?'no-store':'public, max-age=0, s-maxage=60, stale-while-revalidate=120');res.status(200);return req.method==='HEAD'?res.end():res.send(html)}catch{return handler(req,res)}
  }
  return handler(req,res);
}


