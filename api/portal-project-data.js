import { publicConfig } from '../.portal-shared/public-config.js';

const safeText=value=>typeof value==='string'?value.slice(0,5000):value??null;
const names=list=>Array.isArray(list)?list.map(item=>safeText(item?.name)).filter(Boolean).slice(0,40):[];
const cleanAddress=a=>a&&typeof a==='object'?{street_type:safeText(a.street_type),street:safeText(a.street),number:a.number??null,area:safeText(a.area),city:safeText(a.city),state:safeText(a.state),zip_code:safeText(a.zip_code),latitude:Number.isFinite(Number(a.latitude))?Number(a.latitude):null,longitude:Number.isFinite(Number(a.longitude))?Number(a.longitude):null}:null;
const cleanFloorPlans=list=>Array.isArray(list)?list.slice(0,24).map(p=>({id:safeText(p?.id),type:safeText(p?.type),description:safeText(p?.description)})):[];

export default async function handler(req,res){
  res.setHeader('Cache-Control','public, max-age=0, s-maxage=300, stale-while-revalidate=600');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'method_not_allowed'});}
  const token=String(req.query?.token||'');
  const match=/^orulo-(\d{1,12})$/.exec(token);
  if(!match)return res.status(400).json({error:'invalid_token'});
  const params=new URLSearchParams({select:'raw_data',active:'eq.true',limit:'1'});
  params.set('raw_data->>building_id',`eq.${match[1]}`);
  const response=await fetch(`${publicConfig.url}/rest/v1/properties?${params}`,{headers:{apikey:publicConfig.key},signal:AbortSignal.timeout(10000)});
  const rows=await response.json().catch(()=>null);
  if(!response.ok||!Array.isArray(rows))return res.status(502).json({error:'inventory_unavailable'});
  const raw=rows[0]?.raw_data||{};const b=raw.building||{};const t=raw.typology||{};
  if(!b.id)return res.status(404).json({error:'not_found'});
  return res.status(200).json({
    building:{id:safeText(b.id),name:safeText(b.name),type:safeText(b.type),stage:safeText(b.stage||b.status),stock:b.stock??null,finality:safeText(b.finality),developer:safeText(b.developer),publisher:safeText(b.publisher),description:safeText(b.description),address:cleanAddress(b.address),features:names(b.features||b.building_features),launch_date:safeText(b.launch_date),opening_date:safeText(b.opening_date),total_units:b.total_units??null,number_of_towers:b.number_of_towers??null,number_of_floors:b.number_of_floors??null,apts_per_floor:b.apts_per_floor??null,min_price:b.min_price??null,floor_plans:cleanFloorPlans(b.floor_plans),videos:Array.isArray(b.videos)?b.videos.slice(0,8):[],virtual_tour:safeText(b.virtual_tour),orulo_url:safeText(b.orulo_url),last_updated_pricetable_at:safeText(b.last_updated_pricetable_at)},
    typology:{type:safeText(t.type),stock:t.stock??null,suites:t.suites??null,parking:t.parking??null,bedrooms:t.bedrooms??null,bathrooms:t.bathrooms??null,private_area:t.private_area??null,discount_price:t.discount_price??null,original_price:t.original_price??null,floor_reference:t.floor_reference??null}
  });
}
