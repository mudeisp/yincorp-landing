import {groupEligibleDevelopments,positive,slug} from '../.portal-shared/model.js';
import {readInventory} from '../.portal-shared/inventory.js';
import {request} from '../lib/intelligence.js';
export default async function handler(req,res){
res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');
if(req.method!=='GET')return res.status(405).json({error:'method_not_allowed'});
try{
const groups=groupEligibleDevelopments(await readInventory('SP',{state:'SP',mode:'listing',request,configured:()=>true,cacheable:true,nationalEligibility:true}));
const refPrice=1705325, refArea=88.83;
const candidates=groups.filter(g=>slug(g.city)==='sao-paulo'&&!/mandarim.*legend/i.test(g.name)).flatMap(g=>{
const units=g.units.filter(u=>positive(u.price)&&positive(u.area)&&u.stock!==0&&Math.abs(u.price/refPrice-1)<=.25&&!/comercial|loja|terreno|lote/i.test(g.name+' '+(u.unitType||'')));
if(!units.length)return [];
units.sort((a,b)=>Math.abs(a.price/refPrice-1)-Math.abs(b.price/refPrice-1));
const u=units[0];const item={id:u.id,name:g.name,path:g.path,city:g.city,neighborhood:g.neighborhood,price:u.price,area:u.area,bedrooms:u.bedrooms??null,parking:u.parking_spaces??null,image:g.photos?.[0]||'',status:g.status||'',delivery:g.details?.delivery?.label||null};
const score=(/brooklin|campo belo|vila cordeiro|cidade moncoes/i.test(g.neighborhood||'')?0:.3)+Math.abs(u.price/refPrice-1)+Math.abs(u.area-refArea)/refArea*.15;
return [{item,score}];
}).sort((a,b)=>a.score-b.score||a.item.name.localeCompare(b.item.name)).slice(0,6).map(x=>x.item);
res.setHeader('Cache-Control','public,max-age=0,s-maxage=60');return res.status(200).json({base:{name:'Mandarim The Legend',price:refPrice,area:refArea,neighborhood:'Brooklin',city:'São Paulo'},items:candidates,criteria:'Comparação exploratória baseada na unidade de referência Mandarim 7º andar, final 5, 88,83 m² e preço histórico de outubro de 2026. Alternativas de São Paulo com preço informado até ±25%, priorizando bairros próximos. Valores atuais sujeitos a confirmação.'});
}catch(e){return res.status(503).json({error:'inventory_unavailable'})}
}