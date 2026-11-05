import {createRentalHandler} from '../.portal-shared/rentals.js';
import {publicConfig} from '../.portal-shared/public-config.js';
import {decorate} from '../lib/intelligence.js';
import {withPrivacyFooter} from '../lib/privacy-footer.js';
const handler=createRentalHandler({canonicalOrigin:'https://www.yincorp.com.br',request:async(path,options={})=>{
  const response=await fetch(`${publicConfig.url}/rest/v1/${path}`,{signal:options.signal,headers:{apikey:publicConfig.key}});
  return {ok:response.ok,data:await response.json().catch(()=>null)};
}});
export default function rentals(req,res){const url=new URL(req.url||'/', 'https://www.yincorp.com.br');const path=String(req.query?.rentalPath||url.searchParams.get('rentalPath')||url.pathname);const send=res.send.bind(res);res.send=body=>send(res.statusCode===200?withPrivacyFooter(decorate(body,path)):body);return handler(req,res)}

