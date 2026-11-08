import {DurableLedger,assertLedgerRole} from './durable-ledger.js';

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

export async function inspectStorage(pool,env=process.env){
  await assertLedgerRole(pool);
  const tls=(await pool.query('SELECT ssl,version,bits FROM pg_stat_ssl WHERE pid=pg_backend_pid()')).rows[0];
  if(!tls?.ssl||!['TLSv1.2','TLSv1.3'].includes(tls.version)||tls.bits<128)throw Error('storage_probe_tls_required');
  const ledger=new DurableLedger({pool,key:env.SEO_CONTENT_LEDGER_KEY,projectId:env.SEO_CONTENT_OPENAI_PROJECT_ID});
  let initialized=true;
  try{await ledger.read();}catch(error){if(error.message==='private_ledger_not_initialized')initialized=false;else throw error;}
  return {connection:'PASS',roleIsolation:'PASS',tls:tls.version,initialized,integrity:initialized?'PASS':'NOT_INITIALIZED',dataApiExposure:'UNKNOWN_REQUIRES_DASHBOARD_CHECK',autopublish:env.SEO_CONTENT_AUTOPUBLISH==='true',inference:env.SEO_CONTENT_INFERENCE_AUTHORIZED==='true'};
}
