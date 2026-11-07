import {randomUUID, randomBytes, createCipheriv, createDecipheriv, createHash, verify} from 'node:crypto';
import pg from 'pg';
import {validateEditorialOutput} from './openai-editorial.js';

// Private seo_engine schema in agente.yincorp. No Data API/public store access.
// One locked project row serializes budgets and calls across processes/machines.
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const scope = 'yincorp-seo/ipiranga-sp/praia-do-canto-es/v1';
const integer = n => Number.isSafeInteger(n) && n >= 0;
const providerErrorCodes=new Set(['editorial_credentials_unavailable','editorial_independent_auditor_required',
  'editorial_pricing_unavailable','editorial_stage_rejected','editorial_call_limit','editorial_budget_exhausted',
  'editorial_provider_unavailable','editorial_response_limit','editorial_incomplete_response','editorial_cost_overrun',
  'editorial_refused','editorial_schema_invalid','editorial_sensitive_response_rejected']);

export function ledgerPool(env = process.env) {
  let url;
  try{url=new URL(env.SEO_CONTENT_LEDGER_DATABASE_URL || 'invalid:');}
  catch{throw Error('private_ledger_configuration_required');}
  const direct=url.hostname==='db.bgggafirdjvxihqselha.supabase.co'&&url.username==='seo_engine_executor';
  const session=url.hostname==='aws-1-us-west-2.pooler.supabase.com'&&url.username==='seo_engine_executor.bgggafirdjvxihqselha';
  // Exact endpoint/tenant pairs only. Never transaction mode or administrative login.
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.username || !url.password ||
      !(direct||session) ||
      !env.SEO_CONTENT_LEDGER_TLS_CA || !/^[a-f0-9]{64}$/i.test(env.SEO_CONTENT_LEDGER_KEY || '') ||
      url.search || url.hash || !['','5432'].includes(url.port) || url.pathname !== '/postgres' ||
      env.SEO_CONTENT_AUTOPUBLISH !== 'false') throw Error('private_ledger_configuration_required');
  return new pg.Pool({connectionString:url.href, ssl:{rejectUnauthorized:true, ca:env.SEO_CONTENT_LEDGER_TLS_CA, servername:url.hostname, minVersion:'TLSv1.2'},
    max:4, connectionTimeoutMillis:10000, application_name:'yincorp-seo-private-ledger'});
}

export class DurableLedger {
  constructor({pool, key, projectId}) {
    if (!/^[a-f0-9]{64}$/i.test(key || '') || !/^proj_[a-zA-Z0-9_-]+$/.test(projectId || '')) throw Error('private_ledger_identity_required');
    this.pool = pool; this.key = Buffer.from(key, 'hex'); this.projectId = projectId;
  }
  seal(value) {
    const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', this.key, iv);
    cipher.setAAD(Buffer.from(scope));
    const body = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64');
  }
  unseal(value) {
    try {
      const bytes = Buffer.from(value, 'base64'), decipher = createDecipheriv('aes-256-gcm', this.key, bytes.subarray(0,12));
      decipher.setAAD(Buffer.from(scope)); decipher.setAuthTag(bytes.subarray(12,28));
      return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8'));
    } catch { throw Error('private_ledger_integrity_failure'); }
  }
  validate(state) {
    let previous=null;
    for(const event of state.history){
      const {hash,...body}=event;
      if(body.previous!==previous||hash!==digest(body))throw Error('private_ledger_history_invalid');
      previous=hash;
    }
    const calls=Object.values(state.calls);
    if(!integer(state.authorizedMicros)||state.authorizedMicros>600000||!integer(state.reservedMicros)||
       state.reservedMicros!==calls.reduce((n,c)=>n+c.reservedMicros,0)||
       state.reservedMicros>state.authorizedMicros||!integer(state.estimatedMicros)||
       state.estimatedMicros!==calls.filter(c=>c.status==='COMPLETE').reduce((n,c)=>n+c.result.receipt.estimatedMicros,0)||
       calls.some(c=>!['UNKNOWN','COMPLETE'].includes(c.status)||!integer(c.reservedMicros)||c.reservedMicros>100000||c.requestHash!==digest(c.request)))throw Error('private_ledger_budget_invalid');
    if(Object.values(state.runs).some(run=>run.autopublish!==false||Object.values(run.publication).some(p=>p!=='NOT_PUBLISHED')))throw Error('private_publication_forbidden');
  }
  async transaction(change) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SET LOCAL synchronous_commit = on; SET LOCAL lock_timeout = '10s'; SET LOCAL statement_timeout = '20s'");
      const row = (await client.query('SELECT * FROM seo_engine.ledger WHERE scope=$1 FOR UPDATE', [scope])).rows[0];
      if (!row) throw Error('private_ledger_not_initialized');
      const state = this.unseal(row.ciphertext);
      if (state.projectId !== this.projectId || state.scope !== scope) throw Error('private_ledger_identity_mismatch');
      this.validate(state);
      const result = await change(state);
      this.validate(state);
      await client.query('UPDATE seo_engine.ledger SET ciphertext=$1, revision=revision+1 WHERE scope=$2', [this.seal(state), scope]);
      await client.query('COMMIT');
      return result;
    } catch (error) { try { await client.query('ROLLBACK'); } catch {} throw error; }
    finally { client.release(); }
  }
  event(state, type, data = {}) {
    const previous = state.history.at(-1)?.hash || null;
    const event = {sequence:state.history.length+1, at:new Date().toISOString(), type, data, previous};
    state.history.push({...event, hash:digest(event)});
  }
  // Explicit provisioning, never automatically creates a fresh budget on missing data.
  async initialize() {
    const state = {scope, projectId:this.projectId, reconciliation:{status:'UNKNOWN'},
      authorizedMicros:0, reservedMicros:0, estimatedMicros:0, runs:{}, calls:{}, history:[]};
    this.event(state, 'INITIALIZED_UNKNOWN');
    await this.pool.query('INSERT INTO seo_engine.ledger(scope,ciphertext) VALUES($1,$2) ON CONFLICT DO NOTHING', [scope,this.seal(state)]);
    return this.read();
  }
  async read() {
    const row=(await this.pool.query('SELECT ciphertext FROM seo_engine.ledger WHERE scope=$1',[scope])).rows[0];
    if(!row)throw Error('private_ledger_not_initialized');
    const state=this.unseal(row.ciphertext);
    if(state.projectId!==this.projectId||state.scope!==scope)throw Error('private_ledger_identity_mismatch');
    this.validate(state);return state;
  }
  async recordReconciliation(evidence) {
    // Evidence must come from an independently verified official export. Aggregate
    // billing alone never resolves an individual UNKNOWN call or authorizes retries.
    if (evidence?.status !== 'UNKNOWN') throw Error('official_reconciliation_not_implemented');
    return this.transaction(state => {
      state.reconciliation = {status:'UNKNOWN', evidence}; this.event(state,'RECONCILIATION_UNKNOWN');
    });
  }
  async reconcileReviewed({statement,evidence,signature}, publicKey=process.env.SEO_CONTENT_RECONCILIATION_REVIEW_PUBLIC_KEY) {
    // Official exports are not signed by OpenAI. A separate authorized reviewer
    // must verify project attribution, pagination, billing lag and the full window,
    // then sign this exact statement. The signing private key never enters Cloud.
    if(!publicKey||!statement||!evidence||!signature)throw Error('private_reconciliation_review_required');
    let valid=false;
    try{valid=verify(null,Buffer.from(JSON.stringify(statement)),publicKey,Buffer.from(signature,'base64'));}catch{}
    const age=Date.now()-Date.parse(statement.reviewedAt);
    if(!valid||!Number.isFinite(age)||age<0||age>86400000||statement.projectId!==this.projectId||
       statement.projectName!=='yincorp-seo'||statement.scope!==scope||statement.evidenceHash!==digest(evidence)||
       statement.completeOfficialWindow!==true||!integer(statement.priorSpentMicros)||
       statement.authorizationMicros!==600000||evidence.project?.id!==this.projectId||evidence.project?.name!=='yincorp-seo'||
       !evidence.usage||!evidence.costs||!statement.windowStart||!statement.windowEnd||
       !(Date.parse(statement.windowStart)<Date.parse(statement.windowEnd)))throw Error('private_reconciliation_review_invalid');
    return this.transaction(state=>{
      if(digest(state)!==statement.snapshotHash)throw Error('private_reconciliation_snapshot_changed');
      if(Object.values(state.calls).some(c=>c.status!=='COMPLETE'))throw Error('private_call_outcome_unknown');
      if(statement.priorSpentMicros+state.reservedMicros>600000)throw Error('private_budget_exhausted');
      state.reconciliation={status:'RECONCILED',priorSpentMicros:statement.priorSpentMicros,statement,evidence,signature};
      for(const run of Object.values(state.runs))run.status='READY_PRIVATE';
      this.event(state,'RECONCILIATION_REVIEWED',{evidenceHash:statement.evidenceHash});
    });
  }
  async recoverResponse(article,stage) {
    // Pure local recovery from a body already committed before the interruption.
    // store:false is preserved; never issue a second Responses request to recover.
    const callKey=article+'/'+stage;
    return this.transaction(state=>{
      const call=state.calls[callKey];if(!call||call.status!=='UNKNOWN'||call.response?.httpStatus!==200)throw Error('private_recovery_evidence_missing');
      let data;try{data=JSON.parse(call.response.body);}catch{throw Error('private_recovery_evidence_invalid');}
      const usage=data.usage, rate=state.runs[call.runId].configuration.rates[stage];
      if(data.status!=='completed'||!data.id||!data.model||!integer(usage?.input_tokens)||!integer(usage?.output_tokens)||usage.output_tokens>4000)throw Error('private_recovery_evidence_invalid');
      const text=data.output?.flatMap(o=>o.content||[]).filter(c=>c.type==='output_text').map(c=>c.text).join('');
      let output;try{output=validateEditorialOutput(stage,JSON.parse(text));}catch{throw Error('private_recovery_evidence_invalid');}
      const estimatedMicros=Math.ceil(usage.input_tokens*rate.input+usage.output_tokens*rate.output);
      if(!integer(estimatedMicros)||estimatedMicros>call.reservedMicros)throw Error('private_receipt_invalid');
      const receipt={provider:'openai',stage,model:call.request.model,resolvedModel:data.model,responseId:data.id,
        inputHash:digest(call.request.input),outputHash:digest(output),inputTokens:usage.input_tokens,outputTokens:usage.output_tokens,
        estimatedMicros,reservedMicros:call.reservedMicros,costKind:'estimated_from_configured_rates'};
      call.result={output,receipt};call.status='COMPLETE';state.estimatedMicros+=estimatedMicros;
      this.event(state,'CALL_RECOVERED_FROM_SAVED_RESPONSE',{callId:call.callId,responseId:data.id});
      return call.result;
    });
  }
  async createRun({runId = randomUUID(), authorizedMicros, gsc, gscRaw=JSON.stringify(gsc), configuration}) {
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(runId) || !integer(authorizedMicros) || authorizedMicros < 1 || authorizedMicros > 600000 || !gsc) throw Error('private_run_invalid');
    if(typeof gscRaw!=='string'||digest(JSON.parse(gscRaw))!==digest(gsc))throw Error('private_gsc_export_mismatch');
    const gscRawHash=createHash('sha256').update(gscRaw).digest('hex');
    return this.transaction(state => {
      const identity = digest({gsc,gscRawHash,configuration,authorizedMicros});
      if (state.runs[runId]) {
        if (state.runs[runId].identity !== identity) throw Error('private_run_identity_conflict');
        return runId;
      }
      // This scope deliberately supports ONE authorization shared by both articles.
      // A fresh run_id cannot reset consumed/reserved budget or deduplication keys.
      if (Object.keys(state.runs).length) throw Error('private_resume_existing_run_required');
      state.authorizedMicros = authorizedMicros;
      state.runs[runId] = {runId, identity, gsc, gscRaw, gscRawHash, gscHash:digest(gsc), configuration,
        status:'BLOCKED',autopublish:false,approval:{SP:'PENDING',ES:'PENDING'},publication:{SP:'NOT_PUBLISHED',ES:'NOT_PUBLISHED'},
        articles:{SP:{id:randomUUID(),status:'NOT_STARTED'}, ES:{id:randomUUID(),status:'NOT_STARTED'}}, checkpoints:{}};
      this.event(state,'RUN_CREATED',{runId,gscHash:digest(gsc),authorizedMicros}); return runId;
    });
  }
  async checkpoint(runId, name, value) {
    return this.transaction(state => {
      const run = state.runs[runId]; if (!run) throw Error('private_run_missing');
      // Inputs/checkpoints are immutable, so a restart cannot silently change the prompt.
      if (Object.hasOwn(run.checkpoints,name) && digest(run.checkpoints[name]) !== digest(value)) throw Error('private_checkpoint_conflict');
      run.checkpoints[name] = value; this.event(state,'CHECKPOINT',{runId,name,digest:digest(value)});
    });
  }
  async article(runId, stateCode, article) {
    if (!['SP','ES'].includes(stateCode) || article.status !== 'NEEDS_REVIEW') throw Error('private_article_invalid');
    return this.transaction(state => {
      const run = state.runs[runId]; if (!run) throw Error('private_run_missing');
      run.articles[stateCode] = article;
      (run.versions??={})[stateCode]??=[];
      if(!run.versions[stateCode].some(v=>digest(v.article)===digest(article)))run.versions[stateCode].push({version:run.versions[stateCode].length+1,article}); this.event(state,'ARTICLE_SAVED',{runId,stateCode,digest:digest(article)});
      run.status=Object.values(run.articles).every(a=>a.status==='NEEDS_REVIEW')?'NEEDS_REVIEW':'CHECKPOINTED';
    });
  }
  async call({runId, article, stage, input, instructions, model, maxCostMicros=100000}, invoke) {
    if (!['SP','ES'].includes(article) || !['research','write','audit'].includes(stage) || !integer(maxCostMicros) || maxCostMicros < 1 || maxCostMicros > 100000) throw Error('private_call_invalid');
    const callKey = article+'/'+stage, request = {input,instructions,model}, requestHash = digest(request);
    const intent = await this.transaction(state => {
      const run = state.runs[runId]; if (!run) throw Error('private_run_missing');
      const existing = state.calls[callKey];
      if (existing) {
        if (existing.requestHash !== requestHash) throw Error('private_call_identity_conflict');
        if (existing.status !== 'COMPLETE') throw Error('private_call_outcome_unknown');
        return {cached:existing.result};
      }
      if (state.reconciliation.status !== 'RECONCILED' || !integer(state.reconciliation.priorSpentMicros)) throw Error('private_consumption_unknown');
      if (Object.values(state.calls).some(call => call.status !== 'COMPLETE')) throw Error('private_call_outcome_unknown');
      if (state.reconciliation.priorSpentMicros + state.reservedMicros + maxCostMicros > state.authorizedMicros) throw Error('private_budget_exhausted');
      state.reservedMicros += maxCostMicros;
      const callId = randomUUID();
      // Commit the UNKNOWN marker BEFORE any transport. A killed process, ambiguous
      // COMMIT or lost HTTP connection can never make this intent eligible again.
      state.calls[callKey] = {callId, runId, requestHash, request, status:'UNKNOWN', reservedMicros:maxCostMicros};
      run.status='RUNNING';run.currentOperation=callKey;
      this.event(state,'CALL_RESERVED_UNKNOWN',{runId,callKey,callId,maxCostMicros,requestHash});
      return {callId};
    });
    if (Object.hasOwn(intent,'cached')) return intent.cached;
    const checkpoint = async response => this.transaction(state => {
      const call = state.calls[callKey];
      if (call?.callId !== intent.callId || call.status !== 'UNKNOWN') throw Error('private_call_identity_conflict');
      call.response = response; this.event(state,'PROVIDER_RESPONSE_SAVED',{callId:intent.callId,digest:digest(response)});
    });
    // Never retry: any error retains UNKNOWN and its full reservation.
    let result;
    try{result=await invoke({callId:intent.callId, checkpoint});}
    catch(error){
      const code=providerErrorCodes.has(error?.message)?error.message:'private_provider_interrupted';
      try{await this.transaction(state=>{
        state.calls[callKey].errorCode=code;this.event(state,'CALL_INTERRUPTED_UNKNOWN',{callId:intent.callId,code});
        state.runs[runId].status='BLOCKED_UNKNOWN';
      });}catch{} // Initial committed UNKNOWN remains authoritative if DB is offline.
      throw Error(code);
    }
    if (!result?.receipt?.responseId || !result.receipt.resolvedModel || result.receipt.stage !== stage || result.receipt.model !== model ||
        result.receipt.inputHash !== digest(input) || result.receipt.outputHash !== digest(result.output) ||
        !integer(result.receipt.inputTokens)||!integer(result.receipt.outputTokens)||result.receipt.outputTokens>4000||
        !integer(result.receipt.estimatedMicros) || result.receipt.estimatedMicros > maxCostMicros) throw Error('private_receipt_invalid');
    await this.transaction(state => {
      const call = state.calls[callKey]; if (call?.callId !== intent.callId || call.status !== 'UNKNOWN') throw Error('private_call_identity_conflict');
      call.result = result; call.status = 'COMPLETE'; state.estimatedMicros += result.receipt.estimatedMicros;
      state.runs[runId].status='CHECKPOINTED';
      this.event(state,'CALL_COMPLETED',{callId:intent.callId,responseId:result.receipt.responseId});
    });
    return result;
  }
}

export async function assertLedgerRole(pool){
  const access = (await pool.query(`SELECT current_user AS role,
      EXISTS(SELECT 1 FROM pg_roles r WHERE r.rolname=current_user AND
        (r.rolsuper OR r.rolbypassrls OR r.rolcreaterole OR r.rolcreatedb OR r.rolreplication OR r.rolinherit OR
        EXISTS(SELECT 1 FROM pg_auth_members m WHERE m.member=r.oid))) AS privileged_role,
      (SELECT c.relrowsecurity AND c.relforcerowsecurity AND c.relpersistence='p'
        FROM pg_class c WHERE c.oid='seo_engine.ledger'::regclass) AS private_storage,
      EXISTS(SELECT 1 FROM pg_roles r WHERE r.rolname IN ('anon','authenticated','service_role') AND
        (has_schema_privilege(r.oid,'seo_engine','USAGE') OR has_table_privilege(r.oid,'seo_engine.ledger','SELECT,INSERT,UPDATE,DELETE'))) AS public_schema_access,
      EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname='public' AND c.relkind IN ('r','p') AND
        (has_table_privilege(current_user,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'))) AS commercial_access,
      EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.prosecdef AND p.prorettype NOT IN ('pg_catalog.trigger'::regtype,'pg_catalog.event_trigger'::regtype) AND has_function_privilege(current_user,p.oid,'EXECUTE')) AS public_definer_access`)).rows[0];
  if(access.role!=='seo_engine_executor'||access.privileged_role||!access.private_storage||access.public_schema_access||access.commercial_access||access.public_definer_access)throw Error('private_ledger_role_not_isolated');
}

export async function configuredLedger(env = process.env) {
  const pool = ledgerPool(env);
  try {
    await assertLedgerRole(pool);
    const ledger = new DurableLedger({pool,key:env.SEO_CONTENT_LEDGER_KEY,projectId:env.SEO_CONTENT_OPENAI_PROJECT_ID});
    await ledger.read(); // No auto-provisioning or resetting missing state.
    return {ledger, close:()=>pool.end()};
  } catch { await pool.end(); throw Error('private_ledger_unavailable'); }
}

