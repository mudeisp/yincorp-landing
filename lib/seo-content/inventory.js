import {readInventory} from '../../.portal-shared/inventory.js';
import {groupEligibleDevelopments} from '../../.portal-shared/model.js';
import {publicConfig} from '../../.portal-shared/public-config.js';
import {createResaleReader} from '../seo-catalog.js';

export async function publicRequest(path,options={}){
  const r=await fetch(publicConfig.url+'/rest/v1/'+path,{signal:options.signal||AbortSignal.timeout(20000),headers:{apikey:publicConfig.key,...options.prefer?{Prefer:options.prefer}:{}}});
  return {ok:r.ok,status:r.status,data:await r.json().catch(()=>null),contentRange:r.headers.get('content-range')};
}
const resales=createResaleReader(publicRequest);
export async function contentInventory(state){
  const rows=await readInventory(state,{mode:'listing',request:publicRequest,configured:()=>true,nationalEligibility:true,cacheable:false});
  const checkedAt=new Date().toISOString();
  return [...groupEligibleDevelopments(rows).map(g=>({id:g.token,state:g.state,city:g.city,neighborhood:g.neighborhood,path:g.path,name:g.name,checkedAt})),...(await resales()).filter(r=>r.state===state).map(r=>({id:r.id,state:r.state,city:r.city,neighborhood:r.neighborhood,path:r.path,name:r.title,checkedAt}))];
}
