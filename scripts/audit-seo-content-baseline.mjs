import {mkdir,writeFile} from 'node:fs/promises';
import {publicConfig} from '../.portal-shared/public-config.js';
const origin='https://www.yincorp.com.br',results=[];
for(const path of ['/robots.txt','/sitemap.xml','/sp','/es']){
  try{
    const response=await fetch(origin+path,{redirect:'manual',signal:AbortSignal.timeout(20000)}),text=await response.text();
    results.push({path,status:response.status,location:response.headers.get('location'),canonical:/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/.exec(text)?.[1]||null,robots:response.headers.get('x-robots-tag'),sitemaps:path.includes('sitemap')?[...text.matchAll(/<loc>([^<]+)<\/loc>/g)].slice(0,100).map(m=>m[1]):undefined,body:path==='/robots.txt'?text:undefined});
  }catch{results.push({path,status:null,error:'network_unavailable'});}
}
const inventory=[];
for(const state of ['SP','ES']){
  try{
    const r=await fetch(publicConfig.url+'/rest/v1/portal_development_index?'+new URLSearchParams({select:'id,state,city,neighborhood,building_id',state:'eq.'+state,active:'eq.true',limit:'1'}),{headers:{apikey:publicConfig.key,Prefer:'count=exact'},signal:AbortSignal.timeout(20000)});
    const data=await r.json();inventory.push({state,status:r.status,contentRange:r.headers.get('content-range'),sample:r.ok?data:undefined});
  }catch{inventory.push({state,status:null,error:'network_unavailable'});}
}
await mkdir('docs/evidence',{recursive:true});await writeFile('docs/evidence/seo-content-baseline.json',JSON.stringify({observedAt:new Date().toISOString(),readOnly:true,results,inventory},null,2)+'\n');
console.log(JSON.stringify({results:results.map(({path,status})=>({path,status})),inventory:inventory.map(({state,status,contentRange})=>({state,status,contentRange}))}));
