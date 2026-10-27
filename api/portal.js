import { createPortalHandler } from '../.portal-shared/router.js';
import { readInventory } from '../.portal-shared/inventory.js';
import { publicConfig } from '../.portal-shared/public-config.js';

async function publicInventoryRequest(path,options={}) {
  const response=await fetch(`${publicConfig.url}/rest/v1/${path}`,{signal:options.signal,headers:{apikey:publicConfig.key}});
  const data=await response.json().catch(()=>null);
  return {ok:response.ok,status:response.status,data};
}
const handler=createPortalHandler({canonicalOrigin:'https://www.yincorp.com.br',inventory:state=>readInventory(state,{request:publicInventoryRequest,configured:()=>true,cacheable:true})});
export default handler;
