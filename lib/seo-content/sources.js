import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';
import {request} from 'node:https';
import {hash} from './core.js';

export function publicAddress(address){
  if(isIP(address)===4){
    const [a,b,c]=address.split('.').map(Number);
    return !(a===0||a===10||a===127||a>=224||a===100&&b>=64&&b<=127||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&(b===168||b===0||b===88&&c===99)||a===198&&(b===18||b===19||b===51&&c===100)||a===203&&b===0&&c===113);
  }
  // Reject mapped, loopback, link-local, ULA, multicast and transition ranges.
  if(isIP(address)===6)return /^[23][0-9a-f]{3}:/i.test(address)&&!/^200[12]:|^3fff:/i.test(address);
  return false;
}
export function sourceUrl(value,allowlist){
  let u;try{u=new URL(value);}catch{throw Error('source_url_rejected');}
  if(u.protocol!=='https:'||u.port&&u.port!=='443'||u.username||u.password||u.hash||u.search||/[%\\]/.test(u.pathname)||isIP(u.hostname)||!allowlist.some(rule=>u.hostname===rule.host&&(rule.pathPrefix.endsWith('/')?u.pathname.startsWith(rule.pathPrefix):u.pathname===rule.pathPrefix)))throw Error('source_url_rejected');
  return u;
}
export async function sourceTarget(value,{allowlist,resolve=lookup}){
  const url=sourceUrl(value,allowlist),answers=await resolve(url.hostname,{all:true,verbatim:true});
  if(!answers.length||answers.some(a=>!publicAddress(a.address)))throw Error('source_dns_rejected');
  return {url,address:answers[0].address,family:answers[0].family};
}
export function pinnedRead(target,{maxBytes=1000000,timeoutMs=15000,requester=request}={}){
  return new Promise((resolve,reject)=>{
    const req=requester(target.url,{method:'GET',agent:false,servername:target.url.hostname,lookup:(_host,options,cb)=>options.all?cb(null,[{address:target.address,family:target.family}]):cb(null,target.address,target.family),headers:{Accept:'text/html, text/plain','Accept-Encoding':'identity','User-Agent':'YincorpEditorialResearch/2.0'}},res=>{
      if(res.statusCode!==200){res.resume();reject(Error(res.statusCode>=300&&res.statusCode<400?'source_redirect_rejected':'source_http_unavailable'));return;}
      if(!/^text\/(html|plain)(?:;|$)/i.test(res.headers['content-type']||'')||res.headers['content-encoding']&&res.headers['content-encoding']!=='identity'){res.resume();reject(Error('source_content_type_rejected'));return;}
      const chunks=[];let bytes=0;
      res.on('data',chunk=>{bytes+=chunk.length;if(bytes>maxBytes)req.destroy(Error('source_size_limit'));else chunks.push(chunk);});
      res.on('error',()=>reject(Error('source_transport_failed')));res.on('end',()=>resolve(Buffer.concat(chunks).toString('utf8')));
    });
    const timer=setTimeout(()=>req.destroy(Error('source_timeout')),timeoutMs);timer.unref();
    req.on('close',()=>clearTimeout(timer));req.on('error',e=>reject(Error(['source_timeout','source_size_limit'].includes(e.message)?e.message:'source_transport_failed')));req.end();
  });
}
export function extractText(html){return html.replace(/<(script|style|nav|footer|header)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();}
export function sourceRetriever({allowlist,resolve=lookup,read=pinnedRead,now=Date.now}){
  return async url=>{
    const target=await sourceTarget(url,{allowlist,resolve}),body=await read(target),excerpt=extractText(body).slice(0,6000);
    if(excerpt.length<200)throw Error('source_content_insufficient');
    return {url:target.url.href,observedAt:new Date(now()).toISOString(),excerpt,digest:hash(excerpt),bodyDigest:hash(body),retrieved:true,transport:'https_dns_pinned',bytes:Buffer.byteLength(body)};
  };
}
export const SOURCE_REGISTRY=Object.freeze({
  'SP/sao-paulo':[{url:'https://www.ibge.gov.br/cidades-e-estados/sp/sao-paulo.html',host:'www.ibge.gov.br',pathPrefix:'/cidades-e-estados/sp/sao-paulo.html'},{url:'https://prefeitura.sp.gov.br/web/ipiranga/w/historico/160',host:'prefeitura.sp.gov.br',pathPrefix:'/web/ipiranga/w/historico/160',neighborhood:'ipiranga'}],
  'ES/vitoria':[{url:'https://www.ibge.gov.br/cidades-e-estados/es/vitoria.html',host:'www.ibge.gov.br',pathPrefix:'/cidades-e-estados/es/vitoria.html'},{url:'https://www.vitoria.es.gov.br/semc/triangulo-das-bermudas-e-rua-viva',host:'www.vitoria.es.gov.br',pathPrefix:'/semc/triangulo-das-bermudas-e-rua-viva',neighborhood:'praia-do-canto'}]
});
