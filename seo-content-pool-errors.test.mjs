import test from 'node:test';
import assert from 'node:assert/strict';
import {Socket} from 'node:net';
import {ledgerPool} from './lib/seo-content/durable-ledger.js';
test('idle ledger pool errors never dump credentials and block subsequent operations before network dispatch',async()=>{
  const pool=ledgerPool({SEO_CONTENT_AUTOPUBLISH:'false',SEO_CONTENT_LEDGER_DATABASE_URL:'postgresql://seo_engine_executor:synthetic-only@db.bgggafirdjvxihqselha.supabase.co/postgres',SEO_CONTENT_LEDGER_TLS_CA:'fixture-ca',SEO_CONTENT_LEDGER_KEY:'a'.repeat(64)});
  const original=Socket.prototype.connect;let connections=0;
  Socket.prototype.connect=function(){connections++;throw Error('network_prohibited_in_fixture');};
  try{
    assert.doesNotThrow(()=>pool.emit('error',Error('synthetic-sensitive-material'),{password:'synthetic-only'}));
    await assert.rejects(pool.query('select 1'),e=>e.message==='private_ledger_connection_interrupted');
    await assert.rejects(pool.connect(),e=>e.message==='private_ledger_connection_interrupted');
    await new Promise(resolve=>pool.connect(error=>{assert.equal(error.message,'private_ledger_connection_interrupted');resolve();}));
    assert.equal(connections,0);
  }finally{Socket.prototype.connect=original;await pool.end();}
});
