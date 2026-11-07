import {fresh} from './core.js';
export async function monitorState({state,day,store,gateway,now=Date.now}){
  const articles=await store.published(state);
  const data=await gateway({operation:'monitor',state,day,articles:articles.map(a=>({id:a.id,path:a.path})),providers:['gsc','ga4','events','index_inspection'],readOnly:true});
  if(!Array.isArray(data.metrics)||data.metrics.length>1000)throw Error('invalid_metrics_contract');
  let recorded=0;
  for(const metric of data.metrics){
    if(metric.state!==state||metric.day!==day||!articles.some(a=>a.id===metric.articleId)||!fresh(metric.observedAt,now())||!['gsc','ga4','events','index_inspection'].includes(metric.provider))throw Error('invalid_metric_scope');
    const values=metric.values||{};
    for(const [k,v] of Object.entries(values))if(!['impressions','clicks','ctr','position','organicSessions','leads','conversions','indexed'].includes(k)||v!==null&&typeof v!=='boolean'&&(!Number.isFinite(v)||v<0))throw Error('invalid_metric_value');
    // Null means unavailable; never convert absent indexing or conversions to zero.
    await store.monitor(metric);recorded++;
  }
  return {recorded,report:await store.report(state,day)};
}
