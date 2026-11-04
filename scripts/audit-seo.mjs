import {writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
const urls=xml=>[...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map(m=>m[1].replace(/&amp;/g,'&'));
const attribute=(tag,name)=>new RegExp(`\\b${name}=["']([^"']*)["']`,'i').exec(tag)?.[1]??null;
export async function auditSeo({origin='https://www.yincorp.com.br',sample=40,request=fetch}={}){
  const base=new URL(origin);if(!['http:','https:'].includes(base.protocol)||base.username||base.password)throw Error('invalid_origin');
  const inventory=new Set(),sitemaps=[],failures=[],seen=new Set();
  async function visit(url,depth=0){
    if(depth>3||seen.size>=100)throw Error('sitemap_read_limit');
    if(seen.has(url))return;seen.add(url);
    const u=new URL(url);if(u.origin!==base.origin)throw Error('sitemap_outside_origin');
    const response=await request(url,{redirect:'manual',signal:AbortSignal.timeout(30000)});
    const xml=await response.text();sitemaps.push({url,status:response.status});
    if(response.status!==200)throw Error(`sitemap_http_${response.status}`);
    const found=urls(xml);if(!/<(?:sitemapindex|urlset)\b/.test(xml))throw Error('invalid_sitemap_xml');
    if(/<sitemapindex\b/.test(xml)){for(const next of found)await visit(next,depth+1);}
    else for(const next of found){const n=new URL(next);if(n.origin!==base.origin)failures.push({url:next,error:'noncanonical_origin'});else inventory.add(next);}
  }
  try{await visit(base.origin+'/sitemap.xml');}catch(error){failures.push({error:error.message});}
  const all=[...inventory].sort(),samples=[];
  // Stratify by market and path type so SP volume does not hide ES.
  const buckets=new Map();for(const u of all){const p=new URL(u).pathname,key=p.split('/')[1]+':'+(p.includes('/empreendimento/')?'development':p.includes('/imovel/')?'property':'place');if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(u);}
  const pool=[...buckets.values()];for(let i=0;samples.length<sample&&pool.some(b=>b.length);i++){for(const b of pool){if(b.length&&samples.length<sample)samples.push(b.shift());}}
  const checked=[];
  for(let i=0;i<samples.length;i+=4)await Promise.all(samples.slice(i,i+4).map(async url=>{
    try{
      const r=await request(url,{redirect:'manual',signal:AbortSignal.timeout(30000)}),body=await r.text();
      const tags=body.match(/<meta\b[^>]*>|<link\b[^>]*>/gi)||[];
      const canonical=tags.filter(t=>attribute(t,'rel')==='canonical').map(t=>attribute(t,'href'));
      const robots=tags.filter(t=>['robots','googlebot'].includes(attribute(t,'name')?.toLowerCase())).map(t=>attribute(t,'content')).join(' ');
      const xrobots=r.headers.get('x-robots-tag')||'';
      const issues=[];if(r.status!==200)issues.push('http_'+r.status);if(/noindex/i.test(robots+' '+xrobots))issues.push('noindex');if(canonical.length!==1||canonical[0]!==url)issues.push('canonical_mismatch');if(!/<h1\b/i.test(body))issues.push('missing_h1');if(!/<title>\s*[^<]+/i.test(body))issues.push('missing_title');
      const item={url,status:r.status,canonical,robots,xrobots,issues};checked.push(item);if(issues.length)failures.push(item);
    }catch(error){const item={url,error:error.message};checked.push(item);failures.push(item);}
  }));
  return {checkedAt:new Date().toISOString(),origin:base.origin,sitemapUrlCount:inventory.size,sitemaps,checked,failures,googleIndexState:{discovered:null,crawled:null,indexed:null,reason:'Requires authenticated Search Console data; sitemap presence is not indexing.'}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const args=process.argv.slice(2),get=(key,fallback)=>{const i=args.indexOf(key);return i<0?fallback:args[i+1];};
  const sample=Number(get('--sample','40'));if(!Number.isInteger(sample)||sample<1||sample>500)throw Error('invalid_sample');
  const result=await auditSeo({origin:get('--origin','https://www.yincorp.com.br'),sample}),output=resolve(get('--out','seo-audit.json'));
  await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({sitemapUrls:result.sitemapUrlCount,sample:result.checked.length,failures:result.failures.length,output}));if(result.failures.length)process.exitCode=1;
}
