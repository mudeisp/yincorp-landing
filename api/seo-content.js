import {timingSafeEqual} from 'node:crypto';
import {config,dayInBrazil} from '../lib/seo-content/core.js';
import {createStore} from '../lib/seo-content/store.js';
import {secureGateway} from '../lib/seo-content/providers.js';
import {renderArticle} from '../lib/seo-content/render.js';
import {monitorState} from '../lib/seo-content/monitor.js';
export function authorized(header,secret){if(!secret||secret.length<32)return false;const expected=Buffer.from('Bearer '+secret),actual=Buffer.from(header||'');return actual.length===expected.length&&timingSafeEqual(actual,expected);}
export const getStore=()=>createStore({url:process.env.SEO_CONTENT_SUPABASE_URL,key:process.env.SEO_CONTENT_SUPABASE_SERVICE_KEY});
export default async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Robots-Tag','noindex, nofollow');res.setHeader('X-Content-Type-Options','nosniff');
  const op=new URL(req.url,'https://www.yincorp.com.br').searchParams.get('op')||'run';
  if(!authorized(req.headers.authorization,op==='preview'?process.env.SEO_CONTENT_PREVIEW_SECRET:(process.env.SEO_CONTENT_CRON_SECRET||process.env.CRON_SECRET)))return res.status(401).json({error:'unauthorized'});
  // Preview must never mutate a remote content database, even with valid authorization.
  if(process.env.VERCEL_ENV==='preview'&&!['preview','report'].includes(op))return res.status(503).json({error:'preview_writes_disabled'});
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
    // V4 generation is private-runner only. The legacy public endpoint has no
    // durable ledger and must not become an alternative paid dispatch path.
    if(op==='run')return res.status(503).json({error:'private_durable_runner_required'});
    const store=getStore(),evidence=process.env.SEO_CONTENT_EVIDENCE_URL?secureGateway(process.env.SEO_CONTENT_EVIDENCE_URL,process.env.SEO_CONTENT_EVIDENCE_TOKEN):null;
    if(op==='monitor'){
      if(!evidence)throw Error('monitor_transport_unavailable');
      return res.status(200).json(await monitorState({state:requestedState,day:dayInBrazil(),store,gateway:evidence}));
    }
  }catch{return res.status(503).json({error:'seo_content_unavailable'});}
}
