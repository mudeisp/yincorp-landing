import {ORIGIN,dayInBrazil} from './core.js';

const offset=(day,n)=>new Date(Date.parse(day+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
// Server-to-server refresh only. No interactive login or token in logs/artifacts.
export async function gscSnapshot({env=process.env,fetcher=fetch,now=Date.now()}={}){
  if(env.SEO_CONTENT_WINDSOR_API_KEY)return windsorSnapshot({env,fetcher,now});
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

export async function windsorSnapshot({env,fetcher=fetch,now=Date.now()}){
  const day=dayInBrazil(new Date(now)),windowStart=offset(day,-30),windowEnd=offset(day,-3),rows=[];
  try{
    for(const state of ['sp','es']){
      const url=new URL('https://connectors.windsor.ai/searchconsole');
      for(const [key,value] of Object.entries({api_key:env.SEO_CONTENT_WINDSOR_API_KEY,date_from:windowStart,date_to:windowEnd,fields:'query,page,impressions,clicks,ctr,position,data_fetched_at',select_accounts:ORIGIN+'/',_max_rows:'5000',filter:JSON.stringify([['page','contains',ORIGIN+'/'+state+'/']])}))url.searchParams.set(key,value);
      const response=await fetcher(url,{redirect:'error',signal:AbortSignal.timeout(60000)});
      if(!response.ok)throw Error('gsc_windsor_'+({400:'request_rejected',401:'authentication',403:'forbidden',404:'connector_missing',429:'rate_limited'}[response.status]||'provider_error'));
      const text=await response.text();if(text.length>4000000)throw Error('gsc_windsor_limit');
      const data=JSON.parse(text);
      if(!Array.isArray(data.data)||data.data.length>=5000)throw Error('gsc_windsor_incomplete');
      for(const row of data.data){
        if(typeof row.query!=='string'||typeof row.page!=='string'||!row.page.startsWith(ORIGIN+'/'+state+'/')||!Number.isFinite(row.impressions)||row.impressions<0||!Number.isFinite(Date.parse(row.data_fetched_at))||Date.parse(row.data_fetched_at)>now||now-Date.parse(row.data_fetched_at)>7*86400000)throw Error('gsc_windsor_invalid');
        rows.push({query:row.query,page:row.page,impressions:row.impressions,clicks:row.clicks,ctr:row.ctr,position:row.position,data_fetched_at:new Date(row.data_fetched_at).toISOString()});
      }
    }
    if(!rows.length)throw Error('gsc_windsor_empty');
    return {provider:'windsor/searchconsole',account:ORIGIN+'/',retrievedAt:new Date(Math.min(...rows.map(r=>Date.parse(r.data_fetched_at)))).toISOString(),windowStart,windowEnd,response:{status:'done',data:rows}};
  }catch(error){
    if(error?.name==='TimeoutError'||error?.name==='AbortError')throw Error('gsc_windsor_timeout');
    if(['EAI_AGAIN','ENOTFOUND'].includes(error?.cause?.code))throw Error('gsc_windsor_dns');
    throw Error(/^gsc_windsor_[a-z_]+$/.test(error?.message||'')?error.message:'gsc_windsor_unavailable');
  }
}
