import {groupDevelopments,parseRoute,slug,positive} from '../.portal-shared/model.js';
import {readInventory} from '../.portal-shared/inventory.js';
import {publicConfig} from '../.portal-shared/public-config.js';
import {investmentCandidates} from '../.portal-shared/investment.js';
export const INVESTMENT_PATH='/es/vitoria/investimento-airbnb';
export const RELEASE='2026-11-03.2';
export function decorate(html,path){
  if(typeof html!=='string'||!(path===INVESTMENT_PATH||(/^\/(es|sp)\/[^/]+\/empreendimento\//.test(path))||/^\/alugar\/imovel\/[a-f0-9-]{36}$/.test(path)))return html;
  return html.replace('</head>',`<link rel="stylesheet" href="/portal-assets/intelligence.css?v=${RELEASE}"><script src="/portal-assets/intelligence.js?v=${RELEASE}" defer></script></head>`);
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
  candidates.sort((a,b)=>a.score-b.score||a.item.path.localeCompare(b.item.path));return {base,items:candidates.slice(0,3).map(c=>c.item)};
}
const south=new Set(['jabaquara','vila-guarani-z-sul','saude','chacara-inglesa','vila-mariana','paraiso','moema','indianopolis','campo-belo','brooklin-paulista','brooklin-novo','cidade-moncoes','vila-olimpia','itaim-bibi','santo-amaro','vila-andrade','jardim-ampliacao','jardim-marajoara','jardim-prudencia','vila-congonhas','vila-cordeiro','vila-cruzeiro','jardim-fonte-do-morumbi','jardim-panorama']);
const rentalFields='id,title,development_name,city,state,neighborhood,rent_price,condo_fee,property_tax,area,bedrooms,bathrooms,parking_spaces,image_url,active';
function rentItem(r){const price=positive(r.rent_price),condo=finite(r.condo_fee);return {id:r.id,name:r.development_name||r.title||'Imóvel para alugar',path:`/alugar/imovel/${r.id}`,city:r.city,state:r.state,neighborhood:r.neighborhood,price,condo,tax:finite(r.property_tax),subtotal:price&&condo!==null?price+condo:null,area:positive(r.area),bedrooms:finite(r.bedrooms),bathrooms:finite(r.bathrooms),parking:finite(r.parking_spaces),image:/^https:\/\//.test(r.image_url||'')?r.image_url:'',type:'Locação residencial'};}
export function chooseRentals(rows,baseRow){
  const base=rentItem(baseRow),zone=base.state==='SP'&&slug(base.city)==='sao-paulo'&&south.has(slug(base.neighborhood));
  const items=rows.filter(r=>r.active===true&&r.id!==base.id&&r.city===base.city&&r.state===base.state&&positive(r.rent_price)&&Math.abs(r.rent_price/base.price-1)<=.2&&(!zone||south.has(slug(r.neighborhood)))).map(r=>rentItem(r)).map(item=>({item,score:(slug(item.neighborhood)===slug(base.neighborhood)?0:.25)+Math.abs(item.price/base.price-1)+((item.bedrooms!==null&&base.bedrooms!==null)?Math.abs(item.bedrooms-base.bedrooms)*.12:0)})).sort((a,b)=>a.score-b.score||a.item.path.localeCompare(b.item.path)).slice(0,3).map(c=>c.item);
  return {base,items};
}
export async function compare(path,{read=opts=>readInventory(opts.state,{...opts,request,configured:()=>true,cacheable:true}),query=request}={}){
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
  }else{kind='sale';const route=parseRoute(path);if(!route||!['ES','SP'].includes(route.state)||!['development','unit'].includes(route.kind))return null;
    const groups=groupDevelopments(await read({state:route.state,mode:'listing'}));result=chooseSales(groups,route);if(!result)return null;
    // Hydrate only the selected configuration IDs. Price and area always share one ID.
    const selected=[result.base,...result.items];const detailed=groupDevelopments(await read({state:route.state,mode:'project',ids:selected.map(i=>i.id)}));
    const hydrate=item=>{const g=detailed.find(g=>g.units.some(u=>u.id===item.id));const u=g?.units.find(u=>u.id===item.id);return g&&u&&positive(u.price)&&available(u)?saleItem(g,u):null};
    const base=hydrate(result.base);if(!base)return null;result={base,items:result.items.map(hydrate).filter(i=>i&&Math.abs(i.price/base.price-1)<=.25&&i.usage===base.usage)};
  }
  return {...result,kind,release:RELEASE,checkedAt:new Date().toISOString(),criteria:kind==='rent'?'Mesmo município; aluguel até ±20%; bairro e quartos priorizados. Zona Sul mantida quando identificada.':'Mesmo município e uso; preço até ±25%; bairro e quartos priorizados. Tipologias podem diferir.'};
}
