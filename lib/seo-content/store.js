import {identity,topicKey} from './core.js';
export function createStore({url,key,fetcher=fetch}){
  if(!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url||'')||!key)throw Error('seo_store_not_configured');
  const rpc=async(action,payload={})=>{
    const response=await fetcher(url+'/rest/v1/rpc/seo_content_command',{method:'POST',signal:AbortSignal.timeout(20000),headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({action,payload})});
    if(!response.ok)throw Error('seo_store_unavailable');return response.json();
  };
  return createCommandStore(rpc);
}
export function createCommandStore(rpc){
  return {
    claim:payload=>rpc('claim',payload),
    reserve:(run,opportunity)=>rpc('reserve',{run,opportunity:{...opportunity,identityKey:identity(opportunity),topicKey:topicKey(opportunity)}}),
    stage:(run,reservation,status,errorCode)=>rpc('stage',{run,id:reservation.id,status,errorCode}),
    save:(run,article)=>rpc('save',{run,article}),
    publish:(run,article,cfg)=>rpc('publish',{run,id:article.id,revision:article.validatedHash,autopublish:cfg.autopublish}),
    finish:(run,status,errorCode)=>rpc('finish',{run,status,errorCode}),
    existing:state=>rpc('existing',{state}),
    published:state=>rpc('published',{state}),
    preview:id=>rpc('preview',{id}),
    rollback:(id,reason)=>rpc('rollback',{id,reason}),
    report:(state,day)=>rpc('report',{state,day}),
    monitor:metrics=>rpc('monitor',{metrics}),
    rpc
  };
}
