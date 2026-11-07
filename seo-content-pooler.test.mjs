import test from 'node:test';
import assert from 'node:assert/strict';
import {ledgerPool} from './lib/seo-content/durable-ledger.js';

const direct='db.bgggafirdjvxihqselha.supabase.co';
const pooler='aws-1-us-west-2.pooler.supabase.com';
const role='seo_engine_executor',tenant=role+'.bgggafirdjvxihqselha';
const env={SEO_CONTENT_AUTOPUBLISH:'false',SEO_CONTENT_LEDGER_TLS_CA:'synthetic-ca',SEO_CONTENT_LEDGER_KEY:'a'.repeat(64)};
const url=(host,user,port=5432)=>`postgresql://${user}:synthetic-only@${host}:${port}/postgres`;
test('only exact direct and session pooler tenant pairs retain verified TLS',async()=>{
  for(const [host,user] of [[direct,role],[pooler,tenant]]){
    const p=ledgerPool({...env,SEO_CONTENT_LEDGER_DATABASE_URL:url(host,user)});
    try{assert.equal(p.options.ssl.rejectUnauthorized,true);assert.equal(p.options.ssl.servername,host);assert.equal(p.options.ssl.minVersion,'TLSv1.2');assert.equal(p.options.ssl.ca,'synthetic-ca');assert.equal(p.options.max,4);}
    finally{await p.end();}
  }
});
test('pooler rejects other projects, administrative logins, transaction port and TLS overrides',()=>{
  for(const uri of [url(pooler,role),url(direct,tenant),url(pooler,'postgres.bgggafirdjvxihqselha'),url(pooler,role+'.otherproject'),url('aws-0-us-west-2.pooler.supabase.com',tenant),url(pooler,tenant,6543),url(pooler+'.attacker.example',tenant),url(pooler,tenant)+'?sslmode=no-verify',url(pooler,tenant)+'#override'])assert.throws(()=>ledgerPool({...env,SEO_CONTENT_LEDGER_DATABASE_URL:uri}),/private_ledger_configuration_required/);
  for(const change of [{SEO_CONTENT_LEDGER_TLS_CA:''},{SEO_CONTENT_LEDGER_KEY:''},{SEO_CONTENT_AUTOPUBLISH:'true'}])assert.throws(()=>ledgerPool({...env,...change,SEO_CONTENT_LEDGER_DATABASE_URL:url(pooler,tenant)}),/private_ledger_configuration_required/);
});
