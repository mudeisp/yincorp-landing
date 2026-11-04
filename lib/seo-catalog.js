import { createHash } from 'node:crypto';
import { groupDevelopments, geography, slug, html as h, money, positive } from '../.portal-shared/model.js';
import { layout } from '../.portal-shared/render.js';

export const ORIGIN='https://www.yincorp.com.br';
export const MARKETS=['SP','ES'];
export const SITEMAP_SIZE=5000;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const clean=value=>String(value??'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const https=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}};
const digest=value=>createHash('sha256').update(value).digest('hex');
const validDate=value=>Number.isFinite(Date.parse(value))&&Date.parse(value)<=Date.now()?new Date(value).toISOString():null;
// Explicit public projection. Never request raw_data, owner/user, contacts or files.
export const RESALE_SELECT='id,external_id,source,title,city,state,neighborhood,price,area,bedrooms,bathrooms,parking_spaces,image_url,active,updated_at,content_updated_at:raw_data->>provider_updated_at,description:raw_data->>description,operation:raw_data->>operation,property_type:raw_data->>type';
export function resaleCandidate(row){
  const description=clean(row.description),type=clean(row.property_type);
  if(row.active!==true||row.source!=='usados'||!MARKETS.includes(row.state)||row.operation!=='VENDA'||!UUID.test(row.id||'')||!slug(row.city)||!slug(row.neighborhood)||!clean(row.title)||!positive(row.price)||!positive(row.area)||!https(row.image_url)||description.length<200)return null;
  if(/indispon[ií]vel|vendid[oa]|alugad[oa]|reservad[oa]/i.test(clean(row.title)))return null;
  // Avoid publishing supplier contact information embedded in marketing text.
  if(/https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+?55\s*)?\(?\d{2}\)?[\s.-]*9?\d{4}[\s.-]*\d{4}/i.test(description))return null;
  const name=clean(row.title),path=`/${row.state.toLowerCase()}/${slug(row.city)}/imovel/${slug(name)}--${row.id}`;
  return {...row,title:name,description,property_type:type,path,image_url:https(row.image_url),updated_at:validDate(row.content_updated_at)};
}
export function eligibleResales(rows){
  const candidates=rows.map(resaleCandidate).filter(Boolean);
  const counts=new Map();for(const row of candidates){const key=digest(row.description.toLowerCase());counts.set(key,(counts.get(key)||0)+1);}
  // Duplicate marketing descriptions are not a basis for new indexable pages.
  return candidates.filter(row=>counts.get(digest(row.description.toLowerCase()))===1).sort((a,b)=>a.path.localeCompare(b.path));
}
export function resalePlaces(rows){
  const places=new Map();
  for(const row of rows){
    const root=`/${row.state.toLowerCase()}`;
    for(const [path,label,kind] of [[`${root}/imoveis`,row.state,'resale-state'],[`${root}/${slug(row.city)}/imoveis`,row.city,'resale-city'],[`${root}/${slug(row.city)}/imoveis/${slug(row.neighborhood)}`,`${row.neighborhood}, ${row.city}`,'resale-neighborhood']]){
      if(!places.has(path))places.set(path,{path,label,kind,state:row.state,city:kind==='resale-state'?undefined:row.city,rows:[]});
      places.get(path).rows.push(row);
    }
  }
  // A single listing is useful individually; do not manufacture a thin hub for it.
  return [...places.values()].filter(p=>p.rows.length>=3).sort((a,b)=>a.path.localeCompare(b.path));
}
export function portalEntries(rows){
  const groups=groupDevelopments(rows).filter(g=>g.units.some(u=>u.active===true&&u.stock!==0));
  const places=new Map();
  for(const state of new Set(groups.map(g=>g.state))){
    const root=`/${state.toLowerCase()}`;places.set(root,{path:root,kind:'state',state});
    for(const c of geography(groups,state)){
      places.set(`${root}/${c.slug}`,{path:`${root}/${c.slug}`,kind:'city',state,city:c.name});
      for(const n of c.neighborhoods.values())places.set(`${root}/${c.slug}/${n.slug}`,{path:`${root}/${c.slug}/${n.slug}`,kind:'neighborhood',state,city:c.name});
      if(state==='ES'&&c.slug==='vitoria')for(const intent of ['lancamentos','investimento-airbnb'])places.set(`${root}/${c.slug}/${intent}`,{path:`${root}/${c.slug}/${intent}`,kind:'existing-intent',state,city:c.name});
    }
  }
  // Database updated_at can be a synchronization heartbeat. Without a verified
  // content-change timestamp, omit lastmod instead of inventing freshness.
  return [...places.values(),...groups.map(g=>({path:g.path,kind:'development',state:g.state,city:g.city}))];
}
export function sitemapBuckets(developments,resales){
  const entries=[...portalEntries(developments),...resales.map(r=>({path:r.path,kind:'property',state:r.state,city:r.city,lastmod:r.updated_at})),...resalePlaces(resales).map(p=>({path:p.path,kind:p.kind,state:p.state,city:p.city}))];
  const buckets=new Map();
  for(const e of entries){const type=e.kind==='development'?'empreendimentos':e.kind==='property'?'imoveis':'lugares',key=`${e.state.toLowerCase()}/${type}`;if(!buckets.has(key))buckets.set(key,new Map());buckets.get(key).set(e.path,e);}
  const files=new Map();for(const [key,map]of buckets){const sorted=[...map.values()].sort((a,b)=>a.path.localeCompare(b.path));for(let i=0;i<sorted.length;i+=SITEMAP_SIZE)files.set(`/sitemap-seo/${key}-${1+i/SITEMAP_SIZE}.xml`,sorted.slice(i,i+SITEMAP_SIZE));}
  return {entries,files};
}
export const sitemapIndex=files=>`<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...files.keys()].sort().map(path=>`<sitemap><loc>${h(ORIGIN+path)}</loc></sitemap>`).join('')}</sitemapindex>`;
export const urlset=entries=>`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.map(e=>`<url><loc>${h(ORIGIN+e.path)}</loc>${e.lastmod?`<lastmod>${e.lastmod}</lastmod>`:''}</url>`).join('')}</urlset>`;

export function createResaleReader(request,{now=Date.now}={}){
  let cached,pending,expires=0;
  return async()=>{
    if(cached&&expires>now())return cached;
    if(pending)return pending;
    pending=(async()=>{
      const rows=[];let complete=false;
      for(let offset=0;offset<20000;offset+=500){
        const params=new URLSearchParams({select:RESALE_SELECT,source:'eq.usados',active:'eq.true',state:'in.(SP,ES)',order:'id.asc',limit:'500',offset:String(offset)});
        const r=await request(`properties?${params}`,{method:'GET',signal:AbortSignal.timeout(20000)});
        if(!r.ok||!Array.isArray(r.data))throw new Error('resale_inventory_unavailable');
        rows.push(...r.data);if(r.data.length<500){complete=true;break;}
      }
      if(!complete)throw new Error('resale_inventory_incomplete');
      const result=eligibleResales(rows);cached=result;expires=now()+60000;return result;
    })().finally(()=>{pending=null;});
    return pending;
  };
}
const appLink='https://app.yincorp.com.br/?modo=explorar';
function cards(rows){return rows.map(r=>`<article><h2><a href="${h(r.path)}">${h(r.title)}</a></h2><p>${h(r.neighborhood)}, ${h(r.city)}/${r.state}</p><p>${h(r.area)} m² · ${h(money(r.price))}</p><a href="${h(r.path)}">Conhecer este imóvel</a></article>`).join('');}
export function renderResaleListing(place,page,places,preview){
  const start=(page-1)*18,items=place.rows.slice(start,start+18),pages=Math.ceil(place.rows.length/18),canonical=ORIGIN+place.path+(page>1?`?pagina=${page}`:'');
  const title=`Imóveis à venda em ${place.label}${page>1?` — página ${page}`:''} | Yincorp`;
  const links=places.filter(p=>place.kind==='resale-state'
    ? p.kind==='resale-city'&&p.state===place.state
    : p.path!==place.path&&p.path.startsWith(place.path+'/')).slice(0,100);
  const body=`<section class="wrap"><p>IMÓVEIS À VENDA · ${h(place.state)}</p><h1>Imóveis à venda em ${h(place.label)}</h1><p>${place.rows.length} imóveis com descrição, preço e metragem informados no catálogo. Confira os detalhes e confirme a disponibilidade com a Yincorp.</p><nav aria-label="Explorar localidades">${links.map(p=>`<a href="${h(p.path)}">${h(p.label)} (${p.rows.length})</a> `).join('')}</nav>${cards(items)}<nav aria-label="Paginação">${page>1?`<a href="${h(place.path+(page>2?'?pagina='+(page-1):''))}">← Anterior</a>`:''} <span>Página ${page} de ${pages}</span> ${page<pages?`<a href="${h(place.path)}?pagina=${page+1}">Próxima →</a>`:''}</nav><p><a href="/${place.state.toLowerCase()}">Ver empreendimentos em ${place.state}</a></p></section>`;
  return layout({title,description:`Compare ${place.rows.length} imóveis à venda em ${place.label}: preços anunciados, áreas e características de cada imóvel no catálogo Yincorp.`,canonical,origin:ORIGIN,preview,body,data:{state:place.state,kind:'resale_catalog'},schema:[{'@type':'ItemList',numberOfItems:place.rows.length,itemListElement:items.map((r,i)=>({'@type':'ListItem',position:start+i+1,url:ORIGIN+r.path,name:r.title}))}]});
}
export function renderResale(row,rows,places,preview){
  const canonical=ORIGIN+row.path,cityPath=`/${row.state.toLowerCase()}/${slug(row.city)}/imoveis`,districtPath=cityPath+'/'+slug(row.neighborhood);
  const related=rows.filter(r=>r.id!==row.id&&r.state===row.state&&r.city===row.city&&r.neighborhood===row.neighborhood).slice(0,3);
  const title=`${row.title} à venda — ${row.area} m² em ${row.city} | Yincorp`;
  const description=`${row.title}, ${row.neighborhood}, ${row.city}/${row.state}. ${row.area} m²${row.bedrooms!=null?`, ${row.bedrooms} dormitórios`:''}. Preço anunciado: ${money(row.price)}. Consulte disponibilidade.`;
  const body=`<section class="wrap"><p>${h(row.neighborhood)} · ${h(row.city)}/${row.state}</p><h1>${h(row.title)} à venda em ${h(row.city)}</h1><img src="${h(row.image_url)}" alt="${h(row.title)} em ${h(row.neighborhood)}" style="max-width:100%;height:auto" fetchpriority="high"><h2>Características deste imóvel</h2><dl><dt>Área informada</dt><dd>${h(row.area)} m²</dd><dt>Preço anunciado</dt><dd>${h(money(row.price))}</dd>${[['Dormitórios',row.bedrooms],['Banheiros',row.bathrooms],['Vagas',row.parking_spaces]].filter(([,v])=>v!==null&&v!==undefined).map(([k,v])=>`<dt>${k}</dt><dd>${h(v)}</dd>`).join('')}</dl><h2>Sobre este imóvel</h2><p>${h(row.description)}</p><p>Preço e disponibilidade sujeitos à confirmação. Referência Yincorp: ${h(row.external_id||row.id)}.</p><h2>Consulte este imóvel com a Yincorp</h2><p>Continue na aplicação Yincorp para consultar atendimento e disponibilidade. Informe a referência acima.</p><a class="button primary" href="${appLink}">Abrir aplicação Yincorp ↗</a><nav aria-label="Imóveis na região">${places.some(p=>p.path===districtPath)?`<a href="${h(districtPath)}">Imóveis em ${h(row.neighborhood)}</a> `:''}${places.some(p=>p.path===cityPath)?`<a href="${h(cityPath)}">Imóveis em ${h(row.city)}</a>`:''}</nav>${related.length?'<h2>Outros imóveis neste bairro</h2>'+cards(related):''}</section>`;
  // No new form, lead destination, tracking contract or supplier contact is introduced.
  const item={'@type':/apartamento/i.test(row.title)?'Apartment':/casa/i.test(row.title)?'House':'Place','@id':canonical+'#imovel',name:row.title,url:canonical,image:row.image_url,description:row.description,address:{'@type':'PostalAddress',addressLocality:row.city,addressRegion:row.state,addressCountry:'BR'},additionalProperty:[{'@type':'PropertyValue',name:'Área informada',value:Number(row.area),unitText:'m²'}]};
  return layout({title,description,canonical,origin:ORIGIN,preview,body,breadcrumbs:[{name:row.state,path:`/${row.state.toLowerCase()}`},{name:row.title,path:row.path}],schema:[item,{'@type':'RealEstateListing','@id':canonical+'#anuncio',url:canonical,name:title,dateModified:row.updated_at||undefined,about:{'@id':item['@id']},offers:{'@type':'Offer',price:Number(row.price),priceCurrency:'BRL',url:canonical}}],data:{state:row.state,kind:'resale_property'}});
}
export function createSeoHandler({inventory,resales,preview=false}={}){
  return async(req,res,path)=>{
    const sitemap=path==='/sitemap.xml'||path==='/sitemap-portal.xml'||/^\/sitemap-seo\/(sp|es)\/(lugares|empreendimentos|imoveis)-[1-9]\d*\.xml$/.test(path);
    const property=/^\/(sp|es)\/[^/]+\/imovel\/[^/]+--([a-f0-9-]{36})\/?$/.exec(path);
    const listing=/^\/(sp|es)(?:\/[^/]+)?\/imoveis(?:\/[^/]+)?\/?$/.test(path);
    if(!sitemap&&!property&&!listing)return false;
    const isPreview=preview||process.env.VERCEL_ENV==='preview';
    const send=(status,body,type='text/html; charset=utf-8')=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Robots-Tag',isPreview||status!==200?'noindex, follow':'all');res.setHeader('Content-Type',type);res.setHeader('Cache-Control',status===200&&!isPreview?'public, max-age=0, s-maxage=60, stale-while-revalidate=120':'no-store');res.status(status);req.method==='HEAD'?res.end():res.send(body);return true;};
    if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');return send(405,'Method not allowed','text/plain');}
    try{
      const rows=await resales();
      if(sitemap){
        const all=(await Promise.all(MARKETS.map(state=>inventory(state,{mode:'listing'})))).flat(),{entries,files}=sitemapBuckets(all,rows);
        if(path==='/sitemap.xml')return send(200,sitemapIndex(new Map([['/sitemap-static.xml',[]],...files])),'application/xml; charset=utf-8');
        // Backward-compatible URL set, never nest a sitemap index inside another.
        if(path==='/sitemap-portal.xml'){
          if(entries.length>50000)throw new Error('legacy_sitemap_limit_use_primary_index');
          return send(200,urlset(entries),'application/xml; charset=utf-8');
        }
        const child=files.get(path);return child?send(200,urlset(child),'application/xml; charset=utf-8'):send(404,'Sitemap não encontrado','text/plain');
      }
      const places=resalePlaces(rows),params=new URL(req.url||path,ORIGIN).searchParams;params.delete('portalPath');
      if(property){const row=rows.find(r=>r.id===property[2]&&r.state.toLowerCase()===property[1]&&slug(r.city)===path.split('/')[2]);if(!row)return send(404,'Imóvel não encontrado','text/plain');if(path!==row.path){res.setHeader('Location',row.path+(params.size?'?'+params:''));res.status(308).end();return true;}return send(200,renderResale(row,rows,places,isPreview));}
      const place=places.find(p=>p.path===path.replace(/\/$/,''));const pageText=params.get('pagina')||'1',page=/^[1-9]\d{0,5}$/.test(pageText)?Number(pageText):0;
      if(!place||!page||page>Math.ceil(place.rows.length/18))return send(404,'Página não encontrada','text/plain');
      if(path!==place.path){res.setHeader('Location',place.path+(params.size?'?'+params:''));res.status(308).end();return true;}
      // Unknown filter combinations must not become artificial landing pages.
      const body=renderResaleListing(place,page,places,isPreview);
      return send(200,[...params.keys()].some(k=>k!=='pagina'&&!/^(utm_|gclid$|gbraid$|wbraid$)/.test(k))?body.replace('content="index,follow"','content="noindex,follow"'):body);
    }catch(error){console.error('SEO_CATALOG_UNAVAILABLE',error?.message||'unknown');res.setHeader('Retry-After','60');return send(503,'Catálogo temporariamente indisponível','text/plain');}
  };
}
