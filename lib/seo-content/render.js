import {html as h} from '../../.portal-shared/model.js';
import {layout} from '../../.portal-shared/render.js';
import {ORIGIN,allPass,canonicalPath} from './core.js';
export const visible=a=>a?.status==='PUBLISHED'&&allPass(a.validations)&&canonicalPath(a.path,a.state);
export const renderContentSitemap=(articles,{preview=false}={})=>`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${preview?'':articles.map(a=>`<url><loc>${h(ORIGIN+a.path)}</loc><lastmod>${h(a.publishedAt)}</lastmod></url>`).join('')}</urlset>`;
export function renderArticle(a,{preview=false,stock=[]}={}){
  const c=a.content,root='/'+a.state.toLowerCase(),hub=root+'/conteudos';
  const body=`<article class="wrap"><h1>${h(c.title)}</h1><p>${h(c.introduction)}</p>${c.sections.map(s=>`<h${s.level}>${h(s.heading)}</h${s.level}><p>${h(s.text)}</p>`).join('')}<h2>Perguntas frequentes</h2>${c.questions.map(q=>`<h3>${h(q.question)}</h3><p>${h(q.answer)}</p>`).join('')}<nav aria-label="Explore a região">${c.internalLinks.filter(l=>l.path===root||stock.some(p=>p.path===l.path)).map(l=>`<a href="${h(l.path)}">${h(l.label)}</a>`).join(' · ')}</nav><aside><h2>Imóveis na região</h2><p>${h(c.cta)}</p>${stock.length?stock.slice(0,3).map(p=>`<p><a href="${h(p.path)}">${h(p.name)}</a></p>`).join(''):'<p>Consulte a Yincorp para verificar a oferta atual na região.</p>'}</aside><h2>Fontes</h2><ul>${(a.sources||[]).map(s=>`<li><a rel="noopener noreferrer" href="${h(s.url)}">${h(new URL(s.url).hostname)}</a> · consultada em ${h(s.observedAt)}</li>`).join('')}</ul></article>`;
  return layout({title:c.title,description:c.description,canonical:ORIGIN+a.path,body,origin:ORIGIN,preview,noindex:preview,data:{state:a.state,kind:'article'},breadcrumbs:[{name:a.state,path:root},{name:'Conteúdos',path:hub},{name:c.title,path:a.path}],schema:preview?[]:[{'@type':'BlogPosting',headline:c.title,description:c.description,datePublished:a.publishedAt,dateModified:a.publishedAt,mainEntityOfPage:ORIGIN+a.path,author:{'@type':'Organization',name:'Yincorp'},publisher:{'@type':'Organization',name:'Yincorp'},citation:(a.sources||[]).map(s=>s.url)}]});
}
export function createContentHandler({store,inventory,enabled=()=>process.env.SEO_CONTENT_ENABLED==='true',preview=()=>process.env.VERCEL_ENV==='preview'}){
  return async(req,res,path)=>{
    const route=/^\/(sp|es)\/conteudos(?:\/([a-z0-9]+(?:-[a-z0-9]+)*))?$/.exec(path),map=/^\/sitemap-content-(sp|es)\.xml$/.exec(path);
    if(!route&&!map)return false;
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');
    const send=(code,body,type='text/html; charset=utf-8')=>{res.setHeader('Content-Type',type);res.status(code);req.method==='HEAD'?res.end():res.send(body);return true;};
    if(!['GET','HEAD'].includes(req.method))return send(405,'Method not allowed','text/plain');
    if(!enabled())return send(404,'Não encontrado','text/plain');
    if(preview())res.setHeader('X-Robots-Tag','noindex, nofollow');
    try{
      const state=(route?.[1]||map[1]).toUpperCase(),articles=(await store.published(state)).filter(visible);
      if(map){res.setHeader('Content-Type','application/xml');return send(200,renderContentSitemap(articles,{preview:preview()}),'application/xml; charset=utf-8');}
      if(!route[2])return send(200,layout({title:`Conteúdos imobiliários — ${state} | Yincorp`,description:`Guias imobiliários de ${state}, com fontes e inventário real.`,canonical:ORIGIN+path,origin:ORIGIN,preview:preview(),noindex:!articles.length,body:`<section class="wrap"><h1>Conteúdos de ${state}</h1>${articles.map(a=>`<p><a href="${h(a.path)}">${h(a.content.title)}</a></p>`).join('')}</section>`,data:{state,kind:'articles'}}));
      const article=articles.find(a=>a.path===path);if(!article)return send(404,'Não encontrado','text/plain');
      const stock=(await inventory(state)).filter(p=>article.content.internalLinks.some(l=>l.path===p.path));
      if(preview())res.setHeader('X-Robots-Tag','noindex, nofollow');
      return send(200,renderArticle(article,{stock,preview:preview()}));
    }catch{return send(503,'Conteúdo temporariamente indisponível','text/plain');}
  };
}
