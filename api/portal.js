import {enrichCommercialPresentation} from '../lib/commercial-presentation.js';
import {groupEligibleDevelopments,html as h} from '../.portal-shared/model.js';
import {NATIONAL_MARKETS} from '../.portal-shared/eligibility.js';
import { createPortalHandler } from '../.portal-shared/router.js';
import { readInventory } from '../.portal-shared/inventory.js';
import { publicConfig } from '../.portal-shared/public-config.js';
import {decorate,INVESTMENT_PATH} from '../lib/intelligence.js';
import {investmentPage} from '../lib/investment-page.js';
import {createSeoHandler,createResaleReader} from '../lib/seo-catalog.js';
import {withPrivacyFooter} from '../lib/privacy-footer.js';
import {linkNationalEntities} from '../lib/geo-national-entities.js';
import {createContentHandler,visible} from '../lib/seo-content/render.js';
import {contentInventory} from '../lib/seo-content/inventory.js';
import {getStore} from './seo-content.js';
import {productionStore} from '../lib/seo-content/production-store.js';
const published=state=>process.env.SEO_CONTENT_STORAGE==='private-ledger'?productionStore.published(state):getStore().published(state);
const content=createContentHandler({store:{published},inventory:contentInventory});


const MANDARIM_PATH='/sp/sao-paulo/empreendimento/mandarim-the-legend--orulo-46939';
function enrichMandarim(body){
  if(typeof body!=='string'||!body.startsWith('<!doctype html>')||!body.includes('</main>'))return body;
  const root='/mandarim-the-legend/';
  const figures=[
    ['fachada.webp','Perspectiva da fachada · book p. 7'],
    ['skydeck.webp','Skydeck · book p. 8'],
    ['piscina.webp','Piscina · book p. 14'],
    ['wellness.webp','Área wellness · book p. 17'],
    ['planta-114.webp','Planta ilustrativa · book p. 36'],
    ['planta-88.webp','Planta ilustrativa · book p. 38']
  ];
  const titles=['Uma presença singular.','Novas perspectivas.','O tempo ganha espaço.','Um novo ritmo.','Desenhado para viver.','Escolhas que fazem sentido.'];
  const gallery=figures.map(([file,caption],i)=>'<section class="mexp-chapter'+(i>=4?' mexp-wide':'')+'" aria-label="'+caption+'">'
    +'<div class="mexp-visual"><img src="'+root+file+'" alt="'+caption+'" loading="'+(i===0?'eager':'lazy')+'" decoding="async"></div>'
    +'<div class="mexp-copy"><p class="mexp-eyebrow">0'+(i+1)+' / '+caption.split(' · ')[0]+'</p><h3 class="mexp-type">'+titles[i]+'</h3><p class="mexp-type">'+caption+'</p></div>'
    +'</section>').join('');
  const section='<section id="mandarim-book" class="mexp" aria-labelledby="mandarim-book-title">'
    +'<div class="mexp-intro"><p class="mexp-eyebrow">Yincorp / Apresentação arquitetônica · Cyrela</p>'
    +'<h2 id="mandarim-book-title" class="mexp-type">Mandarim The Legend</h2>'
    +'<p class="mexp-type">Um empreendimento para descobrir em cada detalhe. Av. Morumbi, 7.395 · Brooklin · São Paulo.</p>'
    +'<a class="mexp-skip" href="#mandarim-finance">Consultar unidades e valores ↓</a></div>'
    +'<div class="mexp-gallery">'+gallery+'</div>'
    +'<div class="mexp-finance-wrap"><section id="mandarim-finance" class="mf" aria-labelledby="mandarim-finance-title">'
    +'<h3 id="mandarim-finance-title" class="mexp-type">Encontre sua unidade.</h3>'
    +'<p>Selecione andar e final para visualizar preço, entrada, parcelas e saldo da tabela de outubro de 2026.</p>'
    +'<label for="mandarim-unit" style="display:block;font-weight:600;margin:16px 0 6px">Unidade da tabela histórica</label>'
    +'<select id="mandarim-unit" style="display:block;width:100%;max-width:650px;padding:12px;border:1px solid #bbb;border-radius:6px;background:white"><option>Carregando tabela…</option></select>'
    +'<div id="mandarim-breakdown" aria-live="polite" style="overflow-x:auto;margin-top:18px">Carregando valores históricos…</div>'
    +'</section><p class="mexp-disclaimer">As 30 combinações são registros documentais de outubro de 2026, não estoque disponível. Preços, parcelas e condições exigem confirmação. A entrega prevista na tabela era outubro de 2027; as plantas são ilustrativas e variam por unidade.</p></div>'
    +'</section>';
  // The existing Órulo listing stays on its canonical URL. Insert before its first
  // content section rather than after the listing, and do not replace its contact UI.
  const main=/<main\b[^>]*>/i.exec(body);
  if(!main)return body;
  const insertion=main.index+main[0].length;
  const script='<link rel="stylesheet" href="/mandarim-the-legend/finance-portal.css"><script type="module" src="/mandarim-the-legend/finance-portal.mjs"></script><link rel="stylesheet" href="/mandarim-the-legend/scroll-story.css"><script type="module" src="/mandarim-the-legend/scroll-story.mjs"></script>';
  return body.slice(0,insertion)+section+body.slice(insertion).replace('</body>',script+'</body>');
}

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
    // The /sp state landing page uses a fixed, verified Órulo hero; other
    // listings, search results, property pages and media are untouched.
    if(path==='/sp'&&res.statusCode===200&&typeof body==='string'&&body.startsWith('<!doctype html>')){
      const hero='<figure class="hero-photograph">';
      const start=body.indexOf(hero);
      const end=start<0?-1:body.indexOf('</figure>',start);
      if(end>start){
        const image='https://static.orulo.com.br/images/properties/large/xyg3f7pmhaewwcp8ycxqludbi68i.jpg';
        const link='/sp/sao-paulo/empreendimento/horacio-lafer-autoria--orulo-82914';
        const replacement=hero+'<a href="'+link+'" aria-label="Conhecer o Horácio Lafer Autoria no Itaim Bibi"><img src="'+image+'" alt="Horácio Lafer Autoria — empreendimento no Itaim Bibi, São Paulo" width="1600" height="1000" loading="eager" fetchpriority="high" decoding="async"></a><figcaption>Horácio Lafer Autoria · Itaim Bibi · <a href="'+link+'">Conhecer empreendimento ↗</a> · imagem do catálogo Órulo</figcaption></figure>';
        body=body.slice(0,start)+replacement+body.slice(end+'</figure>'.length);
      }
    }
    if(res.statusCode===200&&typeof body==='string'&&body.startsWith('<!doctype html>')&&NATIONAL_MARKETS.some(state=>path===`/${state.toLowerCase()}`)){
      body=body.replace('</main>',`<nav class="wrap" aria-label="Estados Yincorp">${NATIONAL_MARKETS.map(state=>`<a href="/${state.toLowerCase()}">${state}</a>`).join(' · ')}</nav></main>`);
    }
    return privacySend(res.statusCode===200?withPrivacyFooter(body):body);
  };
  if(await content(req,res,path))return;
  if(process.env.SEO_CONTENT_ENABLED==='true'&&['GET','HEAD'].includes(req.method)&&/^\/(sp|es)(?:\/|$)/.test(path)){
    const state=path.split('/')[1].toUpperCase();
    try{
      const articles=(await published(state)).filter(visible),root=path===`/${state.toLowerCase()}`;
      const related=articles.filter(a=>a.content.internalLinks?.some(l=>l.path===path)).slice(0,3);
      if(articles.length&&(root||related.length)){
        const baseSend=res.send.bind(res);res.send=body=>baseSend(res.statusCode===200&&typeof body==='string'?body.replace('</main>',`<nav class="wrap" aria-label="Guias da região">${root?`<a href="/${state.toLowerCase()}/conteudos">Conteúdos de ${state}</a>`:related.map(a=>`<a href="${h(a.path)}">${h(a.content.title)}</a>`).join(' · ')}</nav></main>`):body);
      }
    }catch{/* Optional editorial links never take the existing commercial portal offline. */}
  }
  if(process.env.SEO_CONTENT_ENABLED==='true'&&['GET','HEAD'].includes(req.method)&&path==='/sitemap.xml'){
    const sitemapSend=res.send.bind(res);res.send=body=>sitemapSend(res.statusCode===200&&typeof body==='string'?body.replace('</sitemapindex>','<sitemap><loc>https://www.yincorp.com.br/sitemap-content-sp.xml</loc></sitemap><sitemap><loc>https://www.yincorp.com.br/sitemap-content-es.xml</loc></sitemap></sitemapindex>'):body);
  }
  if(await seo(req,res,path))return;
  const send=res.send.bind(res);res.send=body=>send(res.statusCode===200?(path===MANDARIM_PATH?enrichMandarim(linkNationalEntities(decorate(body,path),path)):enrichCommercialPresentation(linkNationalEntities(decorate(body,path),path),path)):body);
  // Discovery links are HTML, not JS-only navigation. No commercial flow changes.
  if(['GET','HEAD'].includes(req.method)&&/^\/sp(?:\/[^/]+)?$/.test(path)){
    const baseSend=res.send.bind(res);res.send=body=>baseSend(res.statusCode===200&&typeof body==='string'?body.replace('</main>',`<nav class="wrap" aria-label="Catálogo de imóveis"><a href="/${path.split('/')[1]}/imoveis">Explorar imóveis à venda em ${path.split('/')[1].toUpperCase()}</a></nav></main>`):body);
  }
  if(path===INVESTMENT_PATH&&['GET','HEAD'].includes(req.method)){
    try{const rows=await readInventory('ES',{mode:'listing',request:publicInventoryRequest,configured:()=>true,cacheable:true,nationalEligibility:true});const html=investmentPage(groupEligibleDevelopments(rows).flatMap(g=>g.units),{preview:process.env.VERCEL_ENV==='preview'});res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control',process.env.VERCEL_ENV==='preview'?'no-store':'public, max-age=0, s-maxage=60, stale-while-revalidate=120');res.status(200);return req.method==='HEAD'?res.end():res.send(html)}catch{return handler(req,res)}
  }
  return handler(req,res);
}



