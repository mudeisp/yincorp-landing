import {ORIGIN,hash,canonicalPath} from './core.js';
import {renderArticle,renderContentSitemap} from './render.js';
import {validateEditorialOutput} from './openai-editorial.js';

// Execute the real renderer privately, before publication. This proves the
// content-bound projection, not that an unpublished URL already exists online.
export async function publicationEvidence({opportunity,content,context,stock,release,checkLinks,now}){
  if(release?.status!=='PASS'||!canonicalPath(opportunity.targetCanonical,opportunity.state))return null;
  try{
    validateEditorialOutput('write',content);
    const article={state:opportunity.state,path:opportunity.targetCanonical,content,sources:context.sources,publishedAt:new Date(now).toISOString()};
    const html=renderArticle(article,{stock}),xml=renderContentSitemap([article]),contentHash=hash(content);
    const safe=!/<[^>]*>|javascript:|data:|\b(?:R\$|m²)\s*\d/i.test(JSON.stringify(content));
    const allowed=new Set(stock.map(p=>p.path));allowed.add('/'+opportunity.state.toLowerCase());
    let links={status:'FAIL',evidence:'Link fora do inventário ou pilar autorizado'};
    if(content.internalLinks.length&&content.internalLinks.every(l=>allowed.has(l.path))){try{const results=await checkLinks(content.internalLinks.map(l=>ORIGIN+l.path));links=results.length===content.internalLinks.length&&results.every(x=>x===true)?{status:'PASS',evidence:'GET público verificou links canônicos e indexáveis em '+new Date(now).toISOString()}:{status:'FAIL',evidence:'Link indisponível, não indexável ou não canônico'};}catch{links={status:'UNKNOWN',evidence:'Falha ao consultar links públicos'};}}
    return {contentHash,release,canonical:{status:html.includes(`<link rel="canonical" href="${ORIGIN+article.path}">`)?'PASS':'FAIL',evidence:'Renderer real executado em memória; canonical vinculado ao conteúdo '+contentHash},sitemap:{status:xml.includes('<loc>'+ORIGIN+article.path+'</loc>')?'PASS':'FAIL',evidence:'Renderer real de sitemap inclui o caminho quando o artigo é aprovado e publicado; projeção privada '+hash(xml)},security:{status:safe?'PASS':'FAIL',evidence:'Schema estrito e renderização escapada verificados; HTML '+hash(html)},links};
  }catch{return null;}
}
