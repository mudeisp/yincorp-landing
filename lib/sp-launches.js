import {readFileSync} from 'node:fs';
import {normalizeUnit,projectDetails} from '../.portal-shared/details.js';
import {range,imageUrl,slug,positive,html as h} from '../.portal-shared/model.js';
import {renderDevelopment} from '../.portal-shared/render.js';
export const launches=JSON.parse(readFileSync(new URL('./sp-launches.json',import.meta.url)));
const launchRoot=p=>`/${(p.state||'SP').toLowerCase()}/${slug(p.city||'São Paulo')}/empreendimento/`;
export const launchPath=p=>launchRoot(p)+p.slug;
export function launchForPath(path){
 return launches.find(p=>{
  const root=launchRoot(p);
  if(!path.startsWith(root))return false;
  const tail=path.slice(root.length).replace(/\/$/,'');
  return tail===p.slug || new RegExp(`--orulo-${p.id}(?:/tipologia/[0-9a-f-]+)?$`).test(tail);
 })||null;
}
export function rewriteLaunchLinks(body){
 if(typeof body!=='string')return body;
 return body.replace(/https:\/\/www\.yincorp\.com\.br\/[a-z]{2}\/[a-z0-9-]+\/empreendimento\/[a-z0-9-]+--orulo-(\d+)(?:\/tipologia\/[0-9a-f-]+)?|\/[a-z]{2}\/[a-z0-9-]+\/empreendimento\/[a-z0-9-]+--orulo-(\d+)(?:\/tipologia\/[0-9a-f-]+)?/g,(url,a,b)=>{
 const p=launchForPath(a?url.slice('https://www.yincorp.com.br'.length):url);return p?(a?'https://www.yincorp.com.br':'')+launchPath(p):url;
 });
}
export function launchProject(p,rows){
 const inputs=rows.filter(r=>r.source==='novos'&&r.state===(p.state||'SP')&&slug(r.city)===slug(p.city||'São Paulo')&&String(r.building_id||r.external_id?.split(':')[1])===p.id&&(positive(r.area)==null||Number(r.area)>=(p.minArea??(p.state||p.city?0:70))));
 if(!inputs.length)return null;
 const units=[...new Map(inputs.map(r=>[r.id,normalizeUnit({...r,price:r.active&&Number(r.price)>=1?Number(r.price):null,original_price:null,discount_price:null,typology_stock:null})])).values()];
 const first=units[0],photos=[...new Set(units.flatMap(u=>[u.image_url,...[u.images,u.building_images].flatMap(a=>Array.isArray(a)?a.map(i=>typeof i==='string'?i:i?.url||i?.image_url):[])]).map(imageUrl).filter(Boolean))];
 const prices=units.filter(u=>u.active===true).map(u=>u.price).filter(n=>Number(n)>=1);
 const details=projectDetails(units);details.stock=null;
 return {token:`orulo-${p.id}`,path:launchPath(p),name:p.name,city:first.city,state:first.state,neighborhood:first.neighborhood||'',developer:String(first.developer||''),status:String(first.status||''),description:String(first.description||''),units,photos,price:prices.length?Math.min(...prices):null,area:range(units.map(u=>u.area),' m²'),bedrooms:range(units.map(u=>u.bedrooms)),parking:range(units.map(u=>u.parking_spaces)),suites:range(units.map(u=>u.suites)),details,updatedAt:units.map(u=>u.updated_at).filter(Boolean).sort().at(-1),eligibility:'EDITORIAL_LAUNCH'};
}
export function renderLaunch(project,{preview=false,comparison=''}={}){
 const base='https://www.yincorp.com.br';
 let body=renderDevelopment({project,route:{kind:'development',state:project.state,city:slug(project.city),token:project.token},canonical:base+project.path,origin:base,preview});
 const inactive=project.units.filter(u=>u.active!==true).length;
 const notice=inactive
 ?'Apresentação de breve lançamento. As configurações abaixo constam no catálogo, mas estão inativas na fonte. Não representam unidades disponíveis para venda. Consulte o atendimento para confirmar lançamento, preços e disponibilidade.'
 :'Configurações ativas no catálogo integrado. Preços, estágio e disponibilidade precisam de confirmação antes da proposta.';
 const banner=`<aside class="wrap launch-notice" role="note" style="padding:24px 20px;border-block:1px solid #b49a67"><p class="eyebrow">${inactive?'BREVE LANÇAMENTO · DISPONIBILIDADE NÃO CONFIRMADA':'INFORMAÇÕES DO CATÁLOGO'}</p><p>${h(notice)}</p><p>${project.units.length} ${project.units.length===1?'tipologia cadastrada':'tipologias cadastradas'} · ${h(project.area)} · ${h(project.neighborhood)}</p></aside>`;
 body=body.replace(/(<main\b[^>]*>)/,`$1${banner}`);
 if(inactive)body=body.replace('Consulte unidades e disponibilidade.','Configurações de referência. Disponibilidade comercial não confirmada.');
 // These projects have no separately published unit pages. Keep all configurations
 // consolidated here, including old unit routes, with one canonical document.
 body=body.replace(new RegExp(project.path+'/tipologia/[0-9a-f-]+','g'),project.path+'#tipologias');
 return comparison?body.replace('</main>',()=>comparison+'</main>'):body;
}
export function createLaunchHandler({request,renderComparison}){
 return async(req,res,path)=>{
 const p=launchForPath(path);if(!p)return false;
 if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');res.status(405).end();return true;}
 const preview=process.env.VERCEL_ENV==='preview';
 try{
 const project=await readLaunchProject(p,request);
 if(!project){res.setHeader('X-Robots-Tag','noindex, follow');res.status(404).end();return true;}
 const canonical=launchPath(p);
 if(path!==canonical){
 const url=new URL(req.url,'https://www.yincorp.com.br');for(const key of ['portalPath','uf','rest'])url.searchParams.delete(key);
 res.setHeader('Location',canonical+(url.searchParams.size?'?'+url.searchParams:''));res.status(301).end();return true;
 }
 res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Robots-Tag',preview?'noindex, follow':'index, follow');res.setHeader('Cache-Control',preview?'no-store':'public, max-age=0, s-maxage=60, stale-while-revalidate=120');
 res.status(200);if(req.method==='HEAD')res.end();else {
  const comparison=renderComparison?await renderComparison(project).catch(error=>{console.error('LAUNCH_COMPARISON_ERROR',error.message);return ''; }):'';
  res.send(renderLaunch(project,{preview,comparison}));
 }return true;
 }catch(error){console.error('LAUNCH_CATALOG_ERROR',error.message);res.setHeader('X-Robots-Tag','noindex, follow');res.setHeader('Retry-After','60');res.status(503).end();return true;}
 };
}

export async function readLaunchProject(p,request){
 const params=new URLSearchParams({select:'*',external_id:`like.orulo:${p.id}:*`,order:'area.asc',limit:'100'});
 const response=await request((p.inventoryView||'portal_sp_launches')+'?'+params,{signal:AbortSignal.timeout(20000)});
 if(!response.ok||!Array.isArray(response.data))throw Error('launch_inventory_unavailable');
 return launchProject(p,response.data);
}
