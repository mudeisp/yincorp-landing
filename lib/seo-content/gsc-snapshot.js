import {ORIGIN,dayInBrazil} from './core.js';

const offset=(day,n)=>new Date(Date.parse(day+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
// Server-to-server refresh only. No interactive login or token in logs/artifacts.
export async function gscSnapshot({env=process.env,fetcher=fetch,now=Date.now()}={}){
  let token=env.SEO_CONTENT_GSC_ACCESS_TOKEN;
  if(env.SEO_CONTENT_GSC_REFRESH_TOKEN){
    if(!env.SEO_CONTENT_GSC_CLIENT_ID||!env.SEO_CONTENT_GSC_CLIENT_SECRET)throw Error('gsc_refresh_configuration_required');
    const response=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',redirect:'error',signal:AbortSignal.timeout(20000),headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',refresh_token:env.SEO_CONTENT_GSC_REFRESH_TOKEN,client_id:env.SEO_CONTENT_GSC_CLIENT_ID,client_secret:env.SEO_CONTENT_GSC_CLIENT_SECRET})});
    if(!response.ok)throw Error('gsc_refresh_unavailable');
    const data=await response.json();if(typeof data.access_token!=='string'||!data.access_token)throw Error('gsc_refresh_unavailable');token=data.access_token;
  }
  if(!token)throw Error('gsc_credentials_required');
  const day=dayInBrazil(new Date(now)),windowStart=offset(day,-30),windowEnd=offset(day,-3),rows=[];
  for(const state of ['sp','es'])for(let startRow=0;startRow<50000;startRow+=25000){
    const response=await fetcher('https://www.googleapis.com/webmasters/v3/sites/'+encodeURIComponent(ORIGIN+'/')+'/searchAnalytics/query',{method:'POST',redirect:'error',signal:AbortSignal.timeout(20000),headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({startDate:windowStart,endDate:windowEnd,dimensions:['query','page'],dataState:'final',type:'web',rowLimit:25000,startRow,dimensionFilterGroups:[{filters:[{dimension:'page',operator:'contains',expression:ORIGIN+'/'+state+'/'}]}]})});
    if(!response.ok)throw Error('gsc_read_unavailable');const data=await response.json();
    if(data.rows!==undefined&&!Array.isArray(data.rows))throw Error('gsc_response_invalid');
    const page=data.rows||[];if(page.length>25000)throw Error('gsc_response_invalid');
    rows.push(...page.map(r=>({query:r.keys?.[0],page:r.keys?.[1],clicks:r.clicks,impressions:r.impressions,ctr:r.ctr,position:r.position})));
    if(page.length<25000)break;if(startRow===25000)throw Error('gsc_read_limit');
  }
  return {provider:'google/searchconsole',account:ORIGIN+'/',retrievedAt:new Date(now).toISOString(),windowStart,windowEnd,response:{status:'done',data:rows}};
}
