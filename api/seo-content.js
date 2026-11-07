import {timingSafeEqual} from 'node:crypto';
import {config,dayInBrazil,runState} from '../lib/seo-content/core.js';
import {createStore} from '../lib/seo-content/store.js';
import {secureGateway,evidenceProvider,editorialModel,sourceResearch,checkPublicLinks} from '../lib/seo-content/providers.js';
import {createEditorialAgents} from '../lib/seo-content/editorial.js';
import {contentInventory} from '../lib/seo-content/inventory.js';
import {renderArticle} from '../lib/seo-content/render.js';
import {monitorState} from '../lib/seo-content/monitor.js';
import {searchConsole} from '../lib/seo-content/google.js';
export function authorized(header,secret){if(!secret||secret.length<32)return false;const expected=Buffer.from('Bearer '+secret),actual=Buffer.from(header||'');return actual.length===expected.length&&timingSafeEqual(actual,expected);}
export const getStore=()=>createStore({url:process.env.SEO_CONTENT_SUPABASE_URL,key:process.env.SEO_CONTENT_SUPABASE_SERVICE_KEY});
export default async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Robots-Tag','noindex, nofollow');res.setHeader('X-Content-Type-Options','nosniff');
  const op=new URL(req.url,'https://www.yincorp.com.br').searchParams.get('op')||'run';
  if(!authorized(req.headers.authorization,op==='preview'?process.env.SEO_CONTENT_PREVIEW_SECRET:(process.env.SEO_CONTENT_CRON_SECRET||process.env.CRON_SECRET)))return res.status(401).json({error:'unauthorized'});
  if(op==='preview'){
    if(req.method!=='GET')return res.status(405).end();
    const id=new URL(req.url,'https://www.yincorp.com.br').searchParams.get('id');if(!/^[0-9a-f-]{36}$/.test(id||''))return res.status(400).end();
    try{const article=await getStore().preview(id);if(!article)return res.status(404).end();res.setHeader('Content-Type','text/html; charset=utf-8');return res.status(200).send(renderArticle(article,{preview:true}));}catch{return res.status(503).json({error:'preview_unavailable'});}
  }
  if(op==='report'&&req.method==='GET'){
    const params=new URL(req.url,'https://www.yincorp.com.br').searchParams,state=params.get('state'),day=params.get('day')||dayInBrazil();
    if(!['SP','ES'].includes(state)||!/^\d{4}-\d{2}-\d{2}$/.test(day))return res.status(400).end();
    try{return res.status(200).json(await getStore().report(state,day));}catch{return res.status(503).json({error:'report_unavailable'});}
  }
  if(op==='rollback'&&req.method==='POST'){
    if(!/^[a-f0-9-]{36}$/.test(req.body?.id||'')||typeof req.body.reason!=='string'||req.body.reason.length<5||req.body.reason.length>500)return res.status(400).end();
    try{return res.status(200).json({rolledBack:await getStore().rollback(req.body.id,req.body.reason)});}catch{return res.status(503).json({error:'rollback_unavailable'});}
  }
  if(!['run','monitor'].includes(op)||!['GET','POST'].includes(req.method))return res.status(405).end();
  const requestedState=new URL(req.url,'https://www.yincorp.com.br').searchParams.get('state');
  if(!['SP','ES'].includes(requestedState))return res.status(400).json({error:'state_required'});
  try{
    const cfg=config();if(!cfg.enabled||cfg.kill)return res.status(200).json({status:'DISABLED'});
    const store=getStore(),evidence=secureGateway(process.env.SEO_CONTENT_EVIDENCE_URL,process.env.SEO_CONTENT_EVIDENCE_TOKEN);
    if(op==='monitor')return res.status(200).json(await monitorState({state:requestedState,day:dayInBrazil(),store,gateway:evidence}));
    const editorial=secureGateway(process.env.SEO_CONTENT_EDITORIAL_URL,process.env.SEO_CONTENT_EDITORIAL_TOKEN);
    const results=[];
    // Serial states bound concurrency and keep the per-invocation budget predictable.
    for(const state of [requestedState]){
      let activeRun;const wrapped={...store,claim:async p=>{activeRun=await store.claim(p);return activeRun;}};
      const model=editorialModel(editorial,store,()=>activeRun),agents=createEditorialAgents({model,checkLinks:checkPublicLinks,releaseEvidence:()=>/^[a-f0-9]{40}$/.test(process.env.SEO_CONTENT_VERIFIED_RELEASE_SHA||'')&&process.env.SEO_CONTENT_VERIFIED_RELEASE_SHA===process.env.VERCEL_GIT_COMMIT_SHA?{status:'PASS',evidence:'CI verified release '+process.env.SEO_CONTENT_VERIFIED_RELEASE_SHA}:null});
      const supplemental=evidenceProvider(evidence);
      const gsc=process.env.SEO_CONTENT_GSC_ACCESS_TOKEN?searchConsole({accessToken:process.env.SEO_CONTENT_GSC_ACCESS_TOKEN,site:process.env.SEO_CONTENT_GSC_SITE,inventory:contentInventory}):null;
      const discover=async(s,d)=>{
        const sources=await Promise.allSettled([supplemental(s,d),...gsc?[gsc(s,d)]:[]]);
        if(sources.every(r=>r.status==='rejected'))throw Error('all_evidence_unavailable');
        return sources.flatMap(r=>r.status==='fulfilled'?r.value:[]);
      };
      results.push(await runState({state,day:dayInBrazil(),store:wrapped,discover,research:sourceResearch(evidence,model),write:agents.write,verify:agents.verify,inventory:contentInventory,existing:s=>store.existing(s),cfg}));
    }
    return res.status(200).json({results});
  }catch{return res.status(503).json({error:'seo_content_unavailable'});}
}
