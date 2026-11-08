import {ORIGIN,hash,normalize,slug,fresh} from './core.js';
import {sourceTarget,pinnedRead,extractText} from './sources.js';

const attr=(tag,name)=>new RegExp(`\\b${name}=["']([^"']*)["']`,'i').exec(tag)?.[1]||'';
const locs=xml=>[...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map(m=>m[1].replace(/&amp;/g,'&'));
export function corpusPath(value){
  if(typeof value!=='string'||/[%\\]/.test(value))throw Error('corpus_url_rejected');
  const u=new URL(value,ORIGIN);
  if(u.origin!==ORIGIN||u.username||u.password||u.search||u.hash||/[%\\]/.test(u.pathname))throw Error('corpus_url_rejected');
  return u.pathname;
}
async function readPublic(path,kind){
  path=corpusPath(path);let headers;
  const target=await sourceTarget(ORIGIN+path,{allowlist:[{host:'www.yincorp.com.br',pathPrefix:path}]});
  const body=await pinnedRead(target,{maxBytes:2000000,timeoutMs:12000,onHeaders:h=>{headers=h;},
    ...kind==='xml'?{contentTypes:/^(?:application\/xml|text\/(?:xml|plain))(?:;|$)/i}:{}});
  return {body,headers};
}
export function parseCorpusPage({path,body,headers={},metadata={},now=Date.now()}){
  path=corpusPath(path);const tags=body.match(/<(?:meta|link)\b[^>]*>/gi)||[];
  const canonicals=tags.filter(t=>attr(t,'rel')==='canonical').map(t=>attr(t,'href'));
  if(canonicals.length!==1||canonicals[0]!==ORIGIN+path)throw Error('corpus_canonical_mismatch');
  if(/noindex/i.test(headers['x-robots-tag']||'')||tags.some(t=>['robots','googlebot'].includes(attr(t,'name').toLowerCase())&&/noindex/i.test(attr(t,'content'))))throw Error('corpus_noindex');
  const title=extractText(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(body)?.[1]||'');
  const headings=[...body.matchAll(/<h([123])\b[^>]*>([\s\S]*?)<\/h\1>/gi)].map(m=>({level:Number(m[1]),text:extractText(m[2])})).slice(0,20);
  if(!title||!headings.some(h=>h.level===1))throw Error('corpus_missing_heading');
  const intent=/\/(?:empreendimento|imovel|empreendimentos)\//.test(path)?'transactional':/\/(?:conteudos|blog|guias)\//.test(path)||/\b(como|morar|viver|guia|comparar|avaliar)\b/.test(normalize(title))?'informational':'transactional';
  const fullText=extractText(/<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(body)?.[1]||body),text=fullText.slice(0,40000);
  if(text.length<200)throw Error('corpus_insufficient_text');
  return {path,url:ORIGIN+path,title,text,headings,intent,textTruncated:fullText.length>40000,city:metadata.city||null,neighborhood:metadata.neighborhood||null,development:metadata.name||null,
    observedAt:new Date(now).toISOString(),bodyHash:hash(body),textHash:hash(text),verified:true};
}
export const corpusDigest=c=>hash({pages:c.pages,coverage:c.coverage,observedAt:c.observedAt});
export function validCorpus(c,now=Date.now()){
  return Boolean(c?.coverage&&typeof c.coverage.complete==='boolean'&&Number.isInteger(c.coverage.expected)&&c?.pages?.length&&c.coverage.retrieved===c.pages.length&&c.coverage.expected>=c.pages.length&&c.snapshotHash===corpusDigest(c)&&fresh(c.observedAt,now,3600000)&&c.pages.every(p=>p.verified&&p.textHash===hash(p.text)&&fresh(p.observedAt,now,3600000)&&p.url===ORIGIN+p.path));
}
const terms=text=>new Set(normalize(text).split(' ').filter(w=>!['como','e','o','a','os','as','no','na','nos','nas','de','do','da','em','para','um','uma','yincorp','simulacao'].includes(w)).map(w=>({viver:'morar',residir:'morar',moradia:'morar',apartamentos:'imoveis',apartamento:'imoveis',imovel:'imoveis'}[w]||w)));
export function compareTopics(opportunity,pages){
  const geography=new Set([...normalize(opportunity.city).split(' '),opportunity.state?.toLowerCase()]);
  const topical=text=>new Set([...terms(text)].filter(w=>!geography.has(w)));
  const wanted=topical(opportunity.query);
  return pages.flatMap(p=>{
    if(p.path===opportunity.targetCanonical||normalize(p.title)===normalize(opportunity.query))return [{path:p.path,title:p.title,kind:'EXACT',score:1}];
    if(p.intent!=='informational')return [];
    const other=topical(p.title),union=new Set([...wanted,...other]),score=union.size?[...wanted].filter(t=>other.has(t)).length/union.size:0;
    return score>=.7?[{path:p.path,title:p.title,kind:'SEMANTIC_REVIEW',score}]:[];
  }).sort((a,b)=>b.score-a.score||a.path.localeCompare(b.path));
}

// Published sitemap + exact inventory/GSC geography. Bounded, public GET only.
// Completeness is explicit and scoped, never inferred from an empty/failed read.
export async function comparisonCorpus({opportunity,inventory,gscRows=[],read=readPublic,maxPages=96,maxSitemaps=20,now=Date.now()}){
  if(!['SP','ES'].includes(opportunity.state)||!Number.isInteger(maxPages)||maxPages<1||maxPages>200)throw Error('corpus_configuration_invalid');
  const state=opportunity.state.toLowerCase(),city=slug(opportunity.city),neighborhood=slug(opportunity.neighborhood);
  const failures=[],sitemaps=[],urls=new Set(),queue=['/sitemap.xml'],seen=new Set();
  while(queue.length){
    const path=queue.shift();if(seen.has(path))continue;if(seen.size>=maxSitemaps){failures.push({path,code:'corpus_sitemap_limit'});break;}seen.add(path);
    try{
      const {body}=await read(path,'xml');if(!/<(?:sitemapindex|urlset)\b/.test(body))throw Error('corpus_sitemap_invalid');
      const found=locs(body).map(corpusPath);sitemaps.push({path,hash:hash(body),urls:found.length});
      if(/<sitemapindex\b/.test(body))queue.push(...found.filter(p=>p==='/sitemap-static.xml'||p.startsWith('/sitemap-seo/'+state+'/')||p.includes('content-'+state)));
      else for(const p of found)if(p==='/'+state||p.startsWith('/'+state+'/'))urls.add(p);
    }catch(e){failures.push({path,code:/^[a-z_]+$/.test(e.message)?e.message:'corpus_read_failed'});}
  }
  const stock=inventory.filter(p=>p.state===opportunity.state&&slug(p.city)===city&&slug(p.neighborhood)===neighborhood);
  const candidates=new Set(['/'+state,'/'+state+'/'+city,'/'+state+'/'+city+'/'+neighborhood,...stock.map(p=>p.path)]);
  for(const path of urls)if(/\/(?:conteudos|blog|guias)\//.test(path))candidates.add(path);
  for(const row of gscRows)if(slug(row.query||'').includes(neighborhood))try{const p=corpusPath(row.page);if(p.startsWith('/'+state+'/'))candidates.add(p);}catch{}
  const expected=[...candidates].sort(),selected=expected.slice(0,maxPages),pages=[];
  if(expected.length>maxPages)failures.push({code:'corpus_page_limit',expected:expected.length,limit:maxPages});
  for(let i=0;i<selected.length;i+=4)await Promise.all(selected.slice(i,i+4).map(async path=>{
    try{const response=await read(path,'html');const metadata=stock.find(p=>p.path===path)||(path==='/'+state+'/'+city+'/'+neighborhood?{city:opportunity.city,neighborhood:opportunity.neighborhood}:path==='/'+state+'/'+city?{city:opportunity.city}:{});pages.push(parseCorpusPage({path,...response,metadata,now}));}
    catch(e){failures.push({path,code:/^[a-z_]+$/.test(e.message)?e.message:'corpus_read_failed'});}
  }));
  pages.sort((a,b)=>a.path.localeCompare(b.path));failures.sort((a,b)=>(a.path||a.code).localeCompare(b.path||b.code));
  const corpus={pages,coverage:{scope:'public_sitemap_and_target_inventory',state:opportunity.state,city:opportunity.city,neighborhood:opportunity.neighborhood,expected:expected.length,retrieved:pages.length,sitemaps,failures,complete:sitemaps.length>0&&stock.length>0&&pages.length===expected.length&&!failures.length&&!pages.some(p=>p.intent==='informational'&&p.textTruncated)},observedAt:new Date(now).toISOString()};
  corpus.snapshotHash=corpusDigest(corpus);return corpus;
}
