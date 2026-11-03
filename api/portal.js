import { createPortalHandler } from '../.portal-shared/router.js';
import { readInventory } from '../.portal-shared/inventory.js';
import { publicConfig } from '../.portal-shared/public-config.js';
import {decorate,INVESTMENT_PATH} from '../lib/intelligence.js';
import {investmentPage} from '../lib/investment-page.js';

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
  canonicalOrigin:'https://www.yincorp.com.br',
  inventory:(state,options={})=>readInventory(state,{request:publicInventoryRequest,configured:()=>true,cacheable:true,...options})
});
export default async function portal(req,res){
  const url=new URL(req.url||'/', 'https://www.yincorp.com.br');
  const path=String(req.query?.portalPath||url.searchParams.get('portalPath')||url.pathname);
  const send=res.send.bind(res);res.send=body=>send(res.statusCode===200?decorate(body,path):body);
  if(path===INVESTMENT_PATH&&['GET','HEAD'].includes(req.method)){
    try{const rows=await readInventory('ES',{mode:'listing',request:publicInventoryRequest,configured:()=>true,cacheable:true});const html=investmentPage(rows,{preview:process.env.VERCEL_ENV==='preview'});res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control',process.env.VERCEL_ENV==='preview'?'no-store':'public, max-age=0, s-maxage=60, stale-while-revalidate=120');res.status(200);return req.method==='HEAD'?res.end():res.send(html)}catch{return handler(req,res)}
  }
  return handler(req,res);
}

