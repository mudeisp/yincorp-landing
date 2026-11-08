import {gscSnapshot} from './gsc-snapshot.js';

// No inference or key retrieval. Check provider/project association and model access.
export async function providerPreflight({env=process.env,fetcher=fetch,now=Date.now()}={}){
  if(!env.SEO_OPENAI_API_KEY||!env.SEO_CONTENT_OPENAI_PROJECT_ID)throw Error('editorial_credentials_unavailable');
  try{
    const response=await fetcher('https://api.openai.com/v1/models',{redirect:'error',signal:AbortSignal.timeout(20000),headers:{Authorization:'Bearer '+env.SEO_OPENAI_API_KEY,'OpenAI-Project':env.SEO_CONTENT_OPENAI_PROJECT_ID}});
    if(!response.ok)return {status:'BLOCKED',openai:'AUTH_OR_PROJECT_REJECTED',httpStatus:response.status};
    const body=await response.json(),available=new Set((body.data||[]).map(m=>m.id));
    const missing=['RESEARCH','WRITE','AUDIT'].filter(s=>!available.has(env['SEO_CONTENT_'+s+'_MODEL']));
    if(missing.length)return {status:'BLOCKED',openai:'MODEL_ACCESS_MISSING',stages:missing};
  }catch{throw Error('editorial_preflight_unavailable');}
  let gsc;try{gsc=await gscSnapshot({env,fetcher,now});}catch(error){return {status:'BLOCKED',openai:'PROJECT_AND_MODELS_VERIFIED',gsc:{status:'BLOCKED',reason:/^gsc_[a-z_]{1,80}$/.test(error?.message||'')?error.message:'gsc_read_unavailable',...(error?.windsorHints?{diagnostic:error.windsorHints}:{})}};}
  return {status:'READY',openai:'PROJECT_AND_MODELS_VERIFIED',gsc:{provider:gsc.provider,rows:gsc.response.data.length,windowStart:gsc.windowStart,windowEnd:gsc.windowEnd,retrievedAt:gsc.retrievedAt}};
}
