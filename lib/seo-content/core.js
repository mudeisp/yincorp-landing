import {createHash} from 'node:crypto';

export const ORIGIN='https://www.yincorp.com.br';
export const GATES=Object.freeze(['sources','facts','originality','cannibalization','geography','inventory','links','editorial','security','canonical','sitemap','tests']);
export const normalize=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export const slug=s=>normalize(s).replace(/ /g,'-');
export const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const errorCode=e=>/^[a-z][a-z0-9_]{0,63}$/.test(e?.message||'')?e.message:'external_failure';
export const identity=o=>hash([normalize(o.query),o.intent,o.state,normalize(o.city),normalize(o.neighborhood),o.targetCanonical]);
export const topicKey=o=>hash([o.state,normalize(o.city),normalize(o.neighborhood),o.intent]);
export const dayInBrazil=(date=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
export function config(env=process.env){
  const integer=(name,fallback,max)=>{const n=Number(env[name]??fallback);if(!Number.isInteger(n)||n<0||n>max)throw Error('invalid_'+name);return n;};
  return {enabled:env.SEO_CONTENT_ENABLED==='true',autopublish:env.SEO_CONTENT_AUTOPUBLISH==='true',kill:env.SEO_CONTENT_KILL_SWITCH!=='false',quotas:{SP:integer('SEO_CONTENT_QUOTA_SP',5,5),ES:integer('SEO_CONTENT_QUOTA_ES',5,5)},maxCostMicros:integer('SEO_CONTENT_MAX_COST_MICROS',1000000,10000000),maxAttempts:3,maxRuntimeMs:180000};
}
export function fresh(date,now,maxAge=7*86400000){const t=Date.parse(date);return Number.isFinite(t)&&t<=now&&now-t<=maxAge;}
export function canonicalPath(path,state){return typeof path==='string'&&new RegExp(`^/${state.toLowerCase()}/conteudos/[a-z0-9]+(?:-[a-z0-9]+)*$`).test(path)&&path.length<=220;}
export function score(o,inventory,existing,now=Date.now()){
  const evidence=o.evidence||[];
  const verified=evidence.filter(e=>['gsc','ads','ga4','events'].includes(e.provider)&&Number.isFinite(e.impressions)&&e.impressions>0&&fresh(e.observedAt,now)&&/^https:\/\//.test(e.url||''));
  const stock=inventory.filter(p=>p.state===o.state&&normalize(p.city)===normalize(o.city)&&(!o.neighborhood||normalize(p.neighborhood)===normalize(o.neighborhood)));
  const collision=existing.some(p=>p.topicKey===topicKey(o)||p.path===o.targetCanonical||normalize(p.title)===normalize(o.query));
  if(!['SP','ES'].includes(o.state)||!o.city||!['informational','comparison'].includes(o.intent)||!verified.length||!stock.length||collision||!canonicalPath(o.targetCanonical,o.state))return {value:0,reason:collision?'cannibalization':'insufficient_evidence',stock};
  // GSC impressions are observed visibility, never total keyword search volume.
  const demand=Math.min(30,Math.log2(1+Math.max(...verified.map(e=>e.impressions)))*3+Math.max(...verified.map(e=>Number.isFinite(e.ctr)&&e.ctr<.03&&e.position>=4&&e.position<=20?5:0)));
  const commercial=Math.min(15,verified.reduce((n,e)=>n+(Number.isFinite(e.conversions)?Math.max(0,e.conversions):0),0)*3);
  return {value:Math.round(demand+commercial+20+Math.min(15,stock.length*3)+10+10),reason:'evidenced',stock};
}
export const allPass=results=>GATES.every(g=>results?.[g]?.status==='PASS'&&typeof results[g].evidence==='string'&&results[g].evidence.length>0);
export function canPublish(article,cfg,now=Date.now()){
  return cfg.enabled&&!cfg.kill&&cfg.autopublish&&article.status==='APPROVED'&&allPass(article.validations)&&article.validatedHash===hash(article.content)&&fresh(article.verifiedAt,now,3600000);
}
export async function retry(read,{attempts=3}={}){
  for(let i=0;i<attempts;i++){try{return await read();}catch(e){if(i===attempts-1||e.retryable===false)throw e;}}
}

// Injected ports keep credentials and provider-specific authorization on the server.
// No generation occurs without observed demand; no quota is filled with invented topics.
export async function runState({state,day,store,discover,research,write,verify,inventory,existing,cfg,now=Date.now}){
  if(!cfg.enabled||cfg.kill||!Object.hasOwn(cfg.quotas,state))return {state,status:'DISABLED'};
  const run=await store.claim({state,day,quota:cfg.quotas[state],budget:cfg.maxCostMicros});
  if(!run)return {state,status:'ALREADY_CLAIMED'};
  const start=now();let processed=0;
  try{
    const stock=await retry(()=>inventory(state)),pages=await existing(state);
    const opportunities=await retry(()=>discover(state,day));
    const ranked=opportunities.filter(o=>o.state===state).map(o=>({...o,state,topicKey:topicKey(o),scoring:score({...o,state},stock,pages,now())})).filter(o=>o.scoring.value>=60).sort((a,b)=>b.scoring.value-a.scoring.value||identity(a).localeCompare(identity(b)));
    for(const opportunity of ranked){
      if(processed>=cfg.quotas[state]||now()-start>cfg.maxRuntimeMs-90000)break;
      const reservation=await store.reserve(run,opportunity);
      if(!reservation)continue;
      processed++;
      try{
        await store.stage(run,reservation,'RESEARCHING');
        const context=await research(opportunity,opportunity.scoring.stock);
        await store.stage(run,reservation,'DRAFT');
        const content=await write(opportunity,context);
        await store.stage(run,reservation,'VERIFYING');
        const validations=await verify({opportunity,context,content,stock:opportunity.scoring.stock,pages});
        const article={id:reservation.id,state,path:opportunity.targetCanonical,topicKey:topicKey(opportunity),status:allPass(validations)?'APPROVED':'NEEDS_REVIEW',content,validations,validatedHash:hash(content),verifiedAt:new Date(now()).toISOString(),sources:context.sources||[]};
        await store.save(run,article);
        // Store rechecks revision, all gates, config, freshness and kill switch atomically.
        if(canPublish(article,cfg,now()))await store.publish(run,article,cfg);
      }catch(error){await store.stage(run,reservation,'FAILED',errorCode(error));}
    }
    await store.finish(run,'COMPLETE');return {state,status:'COMPLETE',processed};
  }catch(error){await store.finish(run,'FAILED',errorCode(error));return {state,status:'FAILED',processed};}
}
