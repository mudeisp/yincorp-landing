import {DurableLedger,assertLedgerRole} from './durable-ledger.js';
import {checkServerIdentity} from 'node:tls';

// Report only fixed field identifiers, never URL fragments, keys or values.
export function ledgerConfigurationIssues(env=process.env){
  const issues=[];let url;
  try{url=new URL(env.SEO_CONTENT_LEDGER_DATABASE_URL||'');}catch{issues.push('database_url_format');}
  if(url){
    if(!['postgres:','postgresql:'].includes(url.protocol))issues.push('database_url_protocol');
    if(!['db.bgggafirdjvxihqselha.supabase.co','aws-1-us-west-2.pooler.supabase.com'].includes(url.hostname))issues.push('database_url_host');
    const user=url.hostname==='db.bgggafirdjvxihqselha.supabase.co'?'seo_engine_executor':'seo_engine_executor.bgggafirdjvxihqselha';
    if(url.username!==user)issues.push('database_url_username');
    if(!url.password)issues.push('database_url_password_missing');
    if(!['','5432'].includes(url.port))issues.push('database_url_port');
    if(url.pathname!=='/postgres')issues.push('database_url_database');
    if(url.search)issues.push('database_url_query_not_allowed');
    if(url.hash)issues.push('database_url_fragment_not_allowed');
  }
  if(!env.SEO_CONTENT_LEDGER_TLS_CA)issues.push('tls_ca_missing');
  if(!/^[a-f0-9]{64}$/i.test(env.SEO_CONTENT_LEDGER_KEY||''))issues.push('ledger_key_format');
  if(env.SEO_CONTENT_AUTOPUBLISH!=='false')issues.push('legacy_autopublish_must_be_false');
  if(!/^proj_[a-zA-Z0-9_-]+$/.test(env.SEO_CONTENT_OPENAI_PROJECT_ID||''))issues.push('openai_project_id_format');
  return issues;
}

// Never return an upstream message: PostgreSQL errors can contain SQL or secrets.
export function safeFailure(error,stage='configuration'){
  const code=error?.code;
  if(['EAI_AGAIN','ENOTFOUND'].includes(code))return {status:'BLOCKED',stage:'dns',reason:code};
  if(['EACCES','ECONNREFUSED','ETIMEDOUT','ENETUNREACH','EHOSTUNREACH','ECONNRESET'].includes(code))return {status:'BLOCKED',stage:'tcp',reason:code};
  if(['CERT_HAS_EXPIRED','DEPTH_ZERO_SELF_SIGNED_CERT','UNABLE_TO_VERIFY_LEAF_SIGNATURE','SELF_SIGNED_CERT_IN_CHAIN','ERR_TLS_CERT_ALTNAME_INVALID','UNABLE_TO_GET_ISSUER_CERT_LOCALLY'].includes(code))return {status:'BLOCKED',stage:'tls',reason:code};
  if(['28P01','28000'].includes(code))return {status:'BLOCKED',stage:'authentication',reason:code};
  if(code==='42501')return {status:'BLOCKED',stage:'authorization',reason:code};
  const message=error?.message||'';
  return {status:'BLOCKED',stage,reason:/^(?:private_|storage_probe_|production_|editorial_|gsc_|comparison_|corpus_)[a-z_]{1,100}$/.test(message)?message:'operation_unavailable'};
}

export function inspectClientTls(client,host){
  const stream=client.connection?.stream,ssl=client.connectionParameters?.ssl;
  const protocol=stream?.getProtocol?.(),cipher=stream?.getCipher?.();
  if(!stream?.encrypted||stream.authorized!==true||ssl?.rejectUnauthorized!==true||!ssl.ca||
     !['TLSv1.2','TLSv1.3'].includes(protocol)||!/(?:AES[_-]?(?:128|256)|CHACHA20)/.test(cipher?.standardName||cipher?.name||''))throw Error('storage_probe_tls_required');
  try{if(checkServerIdentity(host,stream.getPeerCertificate()))throw Error('mismatch');}catch{throw Error('storage_probe_tls_required');}
  return {protocol,authorized:true,hostnameVerified:true,cipher:cipher.standardName||cipher.name};
}

export async function inspectStorage(pool,env=process.env){
  const client=await pool.connect();
  try{
    const clientTls=inspectClientTls(client,new URL(env.SEO_CONTENT_LEDGER_DATABASE_URL).hostname);
    await assertLedgerRole(client);
    // Through Supavisor this describes pooler -> PostgreSQL, NOT the client's
    // TLSSocket. Keep the observation separate instead of mislabelling it.
    const databaseLegTls=(await client.query('SELECT ssl,version,bits FROM pg_stat_ssl WHERE pid=pg_backend_pid()')).rows[0]||null;
    const ledger=new DurableLedger({pool:client,key:env.SEO_CONTENT_LEDGER_KEY,projectId:env.SEO_CONTENT_OPENAI_PROJECT_ID});
    let initialized=true;
    try{await ledger.read();}catch(error){if(error.message==='private_ledger_not_initialized')initialized=false;else throw error;}
    return {connection:'PASS',roleIsolation:'PASS',tls:clientTls.protocol,clientTls,databaseLegTls,initialized,integrity:initialized?'PASS':'NOT_INITIALIZED',dataApiExposure:'UNKNOWN_REQUIRES_DASHBOARD_CHECK',autopublish:env.SEO_CONTENT_AUTOPUBLISH==='true',inference:env.SEO_CONTENT_INFERENCE_AUTHORIZED==='true'};
  }finally{client.release();}
}
