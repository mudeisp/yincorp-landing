import {createRentalHandler} from '../.portal-shared/rentals.js';
import {publicConfig} from '../.portal-shared/public-config.js';
export default createRentalHandler({canonicalOrigin:'https://www.yincorp.com.br',request:async(path,options={})=>{
  const response=await fetch(`${publicConfig.url}/rest/v1/${path}`,{signal:options.signal,headers:{apikey:publicConfig.key}});
  return {ok:response.ok,data:await response.json().catch(()=>null)};
}});
