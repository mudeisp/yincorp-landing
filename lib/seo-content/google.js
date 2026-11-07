import {ORIGIN,slug,normalize} from './core.js';
const dateOffset=(day,n)=>new Date(Date.parse(day+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
export function searchConsole({accessToken,site='https://www.yincorp.com.br/',fetcher=fetch,inventory,now=Date.now}){
  if(!accessToken||!['https://www.yincorp.com.br/','sc-domain:yincorp.com.br'].includes(site))throw Error('gsc_not_configured');
  return async(state,day)=>{
    const stock=await inventory(state),rows=[];
    // Search Console has reporting lag. Keep a bounded, final-data window.
    for(let offset=0;offset<50000;offset+=25000){
      const r=await fetcher(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`,{method:'POST',redirect:'error',signal:AbortSignal.timeout(20000),headers:{Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},body:JSON.stringify({startDate:dateOffset(day,-9),endDate:dateOffset(day,-3),dimensions:['query','page'],dataState:'final',type:'web',rowLimit:25000,startRow:offset,dimensionFilterGroups:[{filters:[{dimension:'page',operator:'contains',expression:ORIGIN+'/'+state.toLowerCase()+'/'}]}]})});
      if(!r.ok)throw Error('gsc_unavailable');const data=await r.json();if(!Array.isArray(data.rows)&&data.rows!==undefined)throw Error('gsc_invalid_response');
      rows.push(...data.rows||[]);if((data.rows||[]).length<25000)break;if(offset===25000)throw Error('gsc_read_limit');
    }
    return rows.flatMap(row=>{
      const [query,page]=row.keys||[];
      if(typeof query!=='string'||!/^como |^vale a pena |^o que |^quais |^qual |^morar /i.test(normalize(query))||!Number.isFinite(row.impressions)||row.impressions<=0)return [];
      let u;try{u=new URL(page);}catch{return [];}
      if(u.origin!==ORIGIN||u.search||u.hash)return [];
      const places=stock.filter(p=>p.path===u.pathname);
      // A concrete known landing page resolves city/neighborhood; queries alone never do.
      if(places.length!==1)return [];
      const p=places[0];
      return [{state,query,city:p.city,neighborhood:p.neighborhood,intent:/compar|melhor|diferenca/i.test(query)?'comparison':'informational',targetCanonical:`/${state.toLowerCase()}/conteudos/${slug(query)}`,evidence:[{provider:'gsc',url:'https://search.google.com/search-console',page,impressions:row.impressions,clicks:row.clicks,ctr:row.ctr,position:row.position,windowStart:dateOffset(day,-9),windowEnd:dateOffset(day,-3),observedAt:new Date(now()).toISOString()}]}];
    });
  };
}
export async function ga4Report({accessToken,property,day,fetcher=fetch}){
  if(!accessToken||!/^\d+$/.test(property||''))throw Error('ga4_not_configured');
  const response=await fetcher(`https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`,{method:'POST',redirect:'error',signal:AbortSignal.timeout(20000),headers:{Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},body:JSON.stringify({dateRanges:[{startDate:day,endDate:day}],dimensions:[{name:'pagePath'},{name:'sessionDefaultChannelGroup'}],metrics:[{name:'sessions'},{name:'keyEvents'}],dimensionFilter:{filter:{fieldName:'sessionDefaultChannelGroup',stringFilter:{matchType:'EXACT',value:'Organic Search'}}},limit:'10000'})});
  if(!response.ok)throw Error('ga4_unavailable');const data=await response.json();if(Number(data.rowCount||0)>10000)throw Error('ga4_read_limit');return data;
}
