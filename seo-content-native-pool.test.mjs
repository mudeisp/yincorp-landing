import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeTestPool} from './scripts/seo-content-native-db.mjs';
test('native test pool handles shutdown errors without an unhandled credential-bearing Client dump',async()=>{
  const pool=nativeTestPool({host:'127.0.0.1',port:1});const ending=pool.end();
  pool.emit('error',Error('synthetic-sensitive-material'));
  await ending;await pool.end();
});
test('unexpected idle backend errors fail the fixture with a sanitized message',async()=>{
  const pool=nativeTestPool({host:'127.0.0.1',port:1});pool.emit('error',Error('synthetic-sensitive-material'));
  await assert.rejects(pool.end(),e=>e.message==='native_database_connection_interrupted'&&!e.message.includes('synthetic-sensitive-material'));
});
