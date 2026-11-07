import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';
import {randomBytes} from 'node:crypto';
import {createServer} from 'node:net';
import {mkdir,mkdtemp,readFile,readdir} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {createCommandStore} from '../lib/seo-content/store.js';

export async function nativeDatabase(){
  const root=resolve('.seo-test');await mkdir(root,{recursive:true});
  const databaseDir=await mkdtemp(root+sep+'postgres-');
  if(!databaseDir.startsWith(root+sep))throw Error('unsafe_local_database_path');
  const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
  const password=randomBytes(24).toString('hex');
  const server=new EmbeddedPostgres({databaseDir,port,user:'postgres',password,persistent:true,autoRehydrateSymlinks:true,postgresFlags:['-h','127.0.0.1','-c','max_connections=40'],initdbFlags:['--encoding=UTF8','--locale=C'],onLog:()=>{},onError:()=>{}});
  let pool;
  try{
    await server.initialise();await server.start();
    pool=new pg.Pool({host:'127.0.0.1',port,user:'postgres',password,database:'postgres',max:12,connectionTimeoutMillis:5000});
    await pool.query('create role anon; create role authenticated; create role service_role bypassrls;');
    const migrationDir=new URL('../supabase/migrations/',import.meta.url);
    for(const file of (await readdir(migrationDir)).filter(f=>f.endsWith('.sql')).sort())await pool.query(await readFile(new URL(file,migrationDir),'utf8'));
    const rpc=async(action,payload={})=>{
      const client=await pool.connect();
      try{await client.query('begin');await client.query("set local role service_role; set local statement_timeout='15s'; set local lock_timeout='10s'");const r=await client.query('select seo_content_command($1,$2::jsonb) result',[action,JSON.stringify(payload)]);await client.query('commit');return r.rows[0].result;}
      catch(e){await client.query('rollback');throw e;}finally{client.release();}
    };
    return {get pool(){return pool;},store:createCommandStore(rpc),rpc,info:{transport:'TCP loopback only',implementation:'native PostgreSQL, separate backend connections',version:(await pool.query('select version() version')).rows[0].version},
      restart:async()=>{await pool.end();await server.stop();await server.start();pool=new pg.Pool({host:'127.0.0.1',port,user:'postgres',password,database:'postgres',max:12,connectionTimeoutMillis:5000});},
      close:async()=>{await pool.end();await server.stop();}};
  }catch(e){if(pool)await pool.end();try{await server.stop();}catch{}throw e;}
}
