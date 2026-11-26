import {launchForPath,launchPath,readLaunchProject,rewriteLaunchLinks} from './sp-launches.js';
import {groupEligibleDevelopments as groupDevelopments,parseRoute,slug,positive,html,json,money as formatMoney} from '../.portal-shared/model.js';
import {readInventory} from '../.portal-shared/inventory.js';
import {publicConfig} from '../.portal-shared/public-config.js';
import {investmentCandidates} from '../.portal-shared/investment.js';
import {NATIONAL_MARKETS} from '../.portal-shared/eligibility.js';
export const INVESTMENT_PATH='/es/vitoria/investimento-airbnb';
export const RELEASE='2026-11-26.launch-comparison-coverage';
export function saleRoute(path){
  if(typeof path!=='string'||path.length>500||!/^\/[a-z]{2}\/[a-z0-9-]+\/empreendimento\/[a-z0-9-]+(?:\/tipologia\/[a-f0-9-]{36})?\/?$/.test(path))return null;
  const launch=launchForPath(path);
  const route=launch&&path.replace(/\/$/,'')===launchPath(launch)?{kind:'development',state:launch.state||'SP',city:slug(launch.city||'São Paulo'),token:'orulo-'+launch.id}:parseRoute(path);
  return route&&NATIONAL_MARKETS.includes(route.state)&&['development','unit'].includes(route.kind)?route:null;
}
export function decorate(html,path){
  if(typeof html!=='string'||!(path===INVESTMENT_PATH||saleRoute(path)||/^\/alugar\/imovel\/[a-f0-9-]{36}$/.test(path)))return html;
  return html.replace('</head>',`<link rel="stylesheet" href="/portal-assets/intelligence.css?v=${RELEASE}"><script src="/portal-assets/intelligence.js?v=${RELEASE}" data-markets="${NATIONAL_MARKETS.map(state=>state.toLowerCase()).join(',')}" defer></script></head>`);
}
export async function request(path,options={}){
  const response=await fetch(`${publicConfig.url}/rest/v1/${path}`,{method:options.method||'GET',signal:options.signal||AbortSignal.timeout(18000),headers:{apikey:publicConfig.key,...(options.prefer?{Prefer:options.prefer}:{})}});
  return {ok:response.ok,status:response.status,data:await response.json().catch(()=>null),contentRange:response.headers.get('content-range')};
}
const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null;
const usage=(name,type='')=>/\bnr\b|nao residencial|não residencial|comercial|loja|sala comercial/i.test(name+' '+type)?'nonresidential':/lote|terreno/i.test(name+' '+type)?'land':'residential';
const available=u=>u.stock!==0;
function saleItem(g,u){return {id:u.id,name:g.name,path:g.path+`/tipologia/${u.id}`,projectPath:g.path,city:g.city,state:g.state,neighborhood:g.neighborhood,price:u.price,area:positive(u.area),bedrooms:finite(u.bedrooms),parking:finite(u.parking_spaces),suites:finite(u.suites),type:u.unitType||'Configuração do catálogo',reference:u.reference||'',image:g.photos[0]||'',status:g.status||'',delivery:g.details?.delivery?.label||null,updatedAt:g.updatedAt||null,usage:usage(g.name,u.unitType)};}
export function investmentSelection(groups){return investmentCandidates(groups).flatMap(g=>{const units=g.units.filter(u=>positive(u.price)&&available(u)&&usage(g.name,u.unitType)==='residential').sort((a,b)=>a.price-b.price||String(a.id).localeCompare(String(b.id)));return units.length?[saleItem(g,units[0])]:[]})}
export function chooseSales(groups,route){
  const baseGroup=groups.find(g=>g.token===route.token&&slug(g.city)===route.city&&g.state===route.state);if(!baseGroup)return null;
  const units=baseGroup.units.filter(u=>positive(u.price)&&available(u)).sort((a,b)=>a.price-b.price||String(a.id).localeCompare(String(b.id)));
  const baseUnit=route.unitId?units.find(u=>u.id===route.unitId):units[0];if(!baseUnit)return null;
  const base=saleItem(baseGroup,baseUnit),candidates=[];
  for(const g of groups){if(g.token===baseGroup.token||g.city!==base.city||g.state!==base.state)continue;
    const eligible=g.units.filter(u=>positive(u.price)&&available(u)&&Math.abs(u.price/base.price-1)<=.25&&usage(g.name,u.unitType)===base.usage);
    eligible.sort((a,b)=>Math.abs(a.price/base.price-1)-Math.abs(b.price/base.price-1)||String(a.id).localeCompare(String(b.id)));
    if(!eligible.length)continue;const item=saleItem(g,eligible[0]);
    const score=(slug(item.neighborhood)===slug(base.neighborhood)?0:1)+Math.abs(item.price/base.price-1)+((item.bedrooms!==null&&base.bedrooms!==null)?Math.abs(item.bedrooms-base.bedrooms)*.08:0);
    candidates.push({item,score});
  }
  candidates.sort((a,b)=>a.score-b.score||a.item.path.localeCompare(b.item.path));return {base,items:candidates.slice(0,6).map(c=>c.item)};
}
const south=new Set(['jabaquara','vila-guarani-z-sul','saude','chacara-inglesa','vila-mariana','paraiso','moema','indianopolis','campo-belo','brooklin-paulista','brooklin-novo','cidade-moncoes','vila-olimpia','itaim-bibi','santo-amaro','vila-andrade','jardim-ampliacao','jardim-marajoara','jardim-prudencia','vila-congonhas','vila-cordeiro','vila-cruzeiro','jardim-fonte-do-morumbi','jardim-panorama']);
const rentalFields='id,title,development_name,city,state,neighborhood,rent_price,condo_fee,property_tax,area,bedrooms,bathrooms,parking_spaces,image_url,active';
function rentItem(r){const price=positive(r.rent_price),condo=finite(r.condo_fee);return {id:r.id,name:r.development_name||r.title||'Imóvel para alugar',path:`/alugar/imovel/${r.id}`,city:r.city,state:r.state,neighborhood:r.neighborhood,price,condo,tax:finite(r.property_tax),subtotal:price&&condo!==null?price+condo:null,area:positive(r.area),bedrooms:finite(r.bedrooms),bathrooms:finite(r.bathrooms),parking:finite(r.parking_spaces),image:/^https:\/\//.test(r.image_url||'')?r.image_url:'',type:'Locação residencial'};}
export function chooseRentals(rows,baseRow){
  const base=rentItem(baseRow),zone=base.state==='SP'&&slug(base.city)==='sao-paulo'&&south.has(slug(base.neighborhood));
  const items=rows.filter(r=>r.active===true&&r.id!==base.id&&r.city===base.city&&r.state===base.state&&positive(r.rent_price)&&Math.abs(r.rent_price/base.price-1)<=.2&&(!zone||south.has(slug(r.neighborhood)))).map(r=>rentItem(r)).map(item=>({item,score:(slug(item.neighborhood)===slug(base.neighborhood)?0:.25)+Math.abs(item.price/base.price-1)+((item.bedrooms!==null&&base.bedrooms!==null)?Math.abs(item.bedrooms-base.bedrooms)*.12:0)})).sort((a,b)=>a.score-b.score||a.item.path.localeCompare(b.item.path)).slice(0,6).map(c=>c.item);
  return {base,items};
}
export async function compare(path,{read=opts=>readInventory(opts.state,{...opts,request,configured:()=>true,cacheable:true,nationalEligibility:true}),query=request}={}){
  const launch=launchForPath(path);
  if(launch&&path.replace(/\/$/,'')===launchPath(launch)){
    const project=await readLaunchProject(launch,query);
    return project?compareLaunch(project,{read}):null;
  }
  let result,kind;
  if(path===INVESTMENT_PATH){
    const selected=investmentSelection(groupDevelopments(await read({state:'ES',mode:'listing'})));
    if(!selected.length)return null;
    const detailed=groupDevelopments(await read({state:'ES',mode:'project',ids:selected.map(i=>i.id)}));
    const items=investmentSelection(detailed);if(!items.length)return null;
    return {base:items[0],items:items.slice(1),kind:'investment',release:RELEASE,checkedAt:new Date().toISOString(),criteria:'Seleção exploratória em Vitória: até seis projetos com studio, loft ou apartamento de até 60 m² e no máximo um dormitório. Uma configuração por projeto, ordenada pelo menor preço informado. Não há ranking de retorno nem autorização de locação curta verificada.'};
  }
  const rental=/^\/alugar\/imovel\/([a-f0-9-]{36})$/.exec(path);
  if(rental){kind='rent';const baseQuery=new URLSearchParams({select:rentalFields,id:'eq.'+rental[1],active:'eq.true',rent_price:'gt.0',limit:'1'});const first=await query('rental_properties?'+baseQuery);if(!first.ok||!Array.isArray(first.data))throw Error('inventory_unavailable');const base=first.data[0];if(!base)return null;
    const params=new URLSearchParams({select:rentalFields,active:'eq.true',state:'eq.'+base.state,city:'eq.'+base.city,and:`(rent_price.gte.${Number(base.rent_price)*.8},rent_price.lte.${Number(base.rent_price)*1.2})`,order:'id.asc',limit:'1000'});const candidates=await query('rental_properties?'+params);if(!candidates.ok||!Array.isArray(candidates.data)||candidates.data.length===1000)throw Error('inventory_unavailable');result=chooseRentals(candidates.data,base);
  }else{kind='sale';const route=saleRoute(path);if(!route)return null;
    const groups=groupDevelopments(await read({state:route.state,mode:'listing'}));result=chooseSales(groups,route);if(!result)return null;
    // Hydrate only the selected configuration IDs. Price and area always share one ID.
    const selected=[result.base,...result.items];const detailed=groupDevelopments(await read({state:route.state,mode:'project',ids:selected.map(i=>i.id)}));
    const hydrate=item=>{const g=detailed.find(g=>g.units.some(u=>u.id===item.id));const u=g?.units.find(u=>u.id===item.id);return g&&u&&positive(u.price)&&available(u)?saleItem(g,u):null};
    const base=hydrate(result.base);if(!base)return null;result={base,items:result.items.map(hydrate).filter(i=>i&&Math.abs(i.price/base.price-1)<=.25&&i.usage===base.usage)};
  }
  if(kind==='sale')result=JSON.parse(rewriteLaunchLinks(JSON.stringify(result)));
  return {...result,kind,release:RELEASE,checkedAt:new Date().toISOString(),criteria:kind==='rent'?'Mesmo município; aluguel até ±20%; bairro e quartos priorizados. Zona Sul mantida quando identificada.':'Mesmo município e uso; preço até ±25%; bairro e quartos priorizados. Tipologias podem diferir.'};
}


const launchCriteria='Mesmo bairro primeiro. A seleção considera as metragens publicadas, dormitórios e preço quando disponível. As opções fora do bairro são identificadas e ficam a até 4 km do projeto ou da referência geográfica do bairro. Cada opção tem configuração ativa e página no portal.';
const defaultRead=opts=>readInventory(opts.state,{...opts,request,configured:()=>true,cacheable:true,nationalEligibility:true});
const distance=(a,b)=>{
  if(!a||!b)return null;
  const radians=Math.PI/180;
  const dlat=(b.lat-a.lat)*radians,dlng=(b.lng-a.lng)*radians;
  const h=Math.sin(dlat/2)**2+Math.cos(a.lat*radians)*Math.cos(b.lat*radians)*Math.sin(dlng/2)**2;
  return 12742*Math.asin(Math.min(1,Math.sqrt(h)));
};
const sameNeighborhood=(a,b)=>Boolean(slug(a.neighborhood))&&slug(a.neighborhood)===slug(b.neighborhood);

export async function compareLaunch(project,{read=defaultRead}={}){
  const baseUnit=[...project.units].sort((a,b)=>Number(b.active===true)-Number(a.active===true)|| (positive(a.area)??Infinity)-(positive(b.area)??Infinity))[0];
  if(!baseUnit)return null;
  const referenceUnits=project.units.filter(u=>u.active===true&&positive(u.area));
  const references=referenceUnits.length?referenceUnits:project.units.filter(u=>positive(u.area));
  const profile=(name,type='')=>/casa|sobrado|townhouse/i.test(type)?'house':/apartamento|garden|cobertura|studio|flat|duplex/i.test(type)?'apartment':usage(name,type);
  const baseProfile=profile(project.name,baseUnit.unitType);
  const base={...saleItem(project,baseUnit),path:project.path,price:positive(baseUnit.price),type:baseUnit.unitType||'Breve lançamento'};
  const localGroups=groups=>groups.filter(g=>g.token!==project.token&&g.state===project.state&&slug(g.city)===slug(project.city));
  const gap=(a,b)=>a&&b?Math.abs(a/b-1):null;
  function rank(groups,hydrated){
    const points=localGroups(groups).filter(g=>sameNeighborhood(g,project)&&g.details?.coordinates).map(g=>g.details.coordinates);
    const origin=project.details?.coordinates||(points.length?{lat:points.reduce((a,p)=>a+p.lat,0)/points.length,lng:points.reduce((a,p)=>a+p.lng,0)/points.length}:null);
    return localGroups(groups).flatMap(g=>{
      const same=sameNeighborhood(g,project);
      const km=distance(origin,g.details?.coordinates);
      if(!same&&hydrated&&(km==null||km>4))return [];
      const variants=g.units.flatMap(u=>{
        if(u.active!==true||!available(u)||!positive(u.price)||usage(g.name,u.unitType)!==base.usage)return [];
        const item=saleItem(g,u);
        if(!saleRoute(item.projectPath)||!item.image)return [];
        if(!item.area)return [];
        const itemProfile=profile(g.name,u.unitType);
        if(itemProfile!==baseProfile&&[itemProfile,baseProfile].every(value=>value!=='residential'))return [];
        return references.flatMap(ref=>{
          const areaGap=gap(item.area,positive(ref.area));
          const rooms=item.bedrooms!=null&&finite(ref.bedrooms)!=null?Math.abs(item.bedrooms-finite(ref.bedrooms)):null;
          const priceGap=gap(item.price,positive(ref.price)||positive(project.price));
          if(areaGap>.45||rooms>2)return [];
          const relaxed=areaGap>.3||rooms>1||priceGap>.3;
          return [{item:{...item,sameNeighborhood:same},score:[same?0:1,Number(relaxed),areaGap,rooms??2,priceGap??.31,u.stock>0?0:1,km??Infinity]}];
        });
      });
      return variants.sort(compareRank).slice(0,1);
    }).sort(compareRank);
  }
  function compareRank(a,b){
    for(let i=0;i<a.score.length;i++)if(a.score[i]!==b.score[i])return a.score[i]-b.score[i];
    return a.item.projectPath.localeCompare(b.item.projectPath);
  }
  const listing=rank(groupDevelopments(await read({state:project.state,mode:'listing'})),false);
  const choices=listing.slice(0,60);
  const detailed=choices.length?rank(groupDevelopments(await read({state:project.state,mode:'project',ids:choices.map(entry=>entry.item.id)})),true):[];
  const items=detailed.map(({item})=>item).slice(0,6);
  return JSON.parse(rewriteLaunchLinks(JSON.stringify({base,items,kind:'launch',release:RELEASE,criteria:launchCriteria})));
}

export async function renderLaunchComparison(project,options){
  const result=await compareLaunch(project,options);
  if(!result)return '';
  const {items}=result;
  const title='Conheça outras possibilidades na região';
  const description='Compare outros empreendimentos selecionados por localização, metragem e perfil. Cada opção indica se fica no mesmo bairro ou no entorno.';
  const cards=items.map(item=>{
    const specs=[item.area!=null?item.area.toLocaleString('pt-BR')+' m²':'',item.bedrooms!=null?item.bedrooms+' dorm.':'',item.parking!=null?item.parking+' vaga(s)':''].filter(Boolean).join(' · ');
    const picture=item.image?`<img src="${html(item.image)}" alt="${html('Imagem de divulgação de '+item.name)}" loading="lazy" decoding="async">`:'';
    return `<li class="ynti-gallery-item ynti-gallery-item--visit"><div><div class="ynti-photo">${picture}</div><div class="ynti-option-label"><small class="ynti-option-location">${html(`${item.sameNeighborhood?'Mesmo bairro':'Bairro próximo'} · ${item.neighborhood}`)}</small><h3>${html(item.name)}</h3><span class="ynti-option-price">${html(formatMoney(item.price))}</span><span class="ynti-option-specs">${html(specs)}</span><span>${html(item.status)}</span></div></div><a class="ynti-link ynti-visit-project" href="${html(item.projectPath)}">Visite esse site</a></li>`;
  }).join('');
  return `<section id="yincorp-intelligence" class="ynti ynti-premium ynti-guided ynti-launch ynti-active" aria-labelledby="ynti-launch-title"><div class="ynti-head"><div><small>✳ YINCORP INTELLIGENCE</small><h2 id="ynti-launch-title">${title}</h2><p>${description}</p></div><span class="ynti-live" hidden></span></div><div class="ynti-content">${cards?`<ul class="ynti-gallery">${cards}</ul>`:'<p>Nenhuma alternativa compatível foi encontrada neste recorte.</p>'}</div><script id="ynti-launch-data" type="application/json">${json(result)}</script></section>`;
}
