import { createPortalHandler } from '../.portal-shared/router.js';
import { readInventory } from '../.portal-shared/inventory.js';
import { publicConfig } from '../.portal-shared/public-config.js';

async function publicInventoryRequest(path,options={}) {
  const headers={apikey:publicConfig.key,'Content-Type':'application/json'};
  if(options.prefer)headers.Prefer=options.prefer;
  const response=await fetch(`${publicConfig.url}/rest/v1/${path}`,{
    method:options.method || 'GET',
    signal:options.signal,
    headers,
    body:options.body ? JSON.stringify(options.body) : undefined
  });
  const data=await response.json().catch(()=>null);
  const result={ok:response.ok,status:response.status,data};
  if(options.includeContentRange)result.contentRange=response.headers.get('content-range');
  return result;
}
const handler=createPortalHandler({
  canonicalOrigin:'https://www.yincorp.com.br',
  inventory:(state,options={})=>readInventory(state,{request:publicInventoryRequest,configured:()=>true,cacheable:true,...options})
});
export default handler;
