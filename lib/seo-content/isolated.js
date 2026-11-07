// Test-only PostgreSQL harness. Never imported by production handlers.
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {createStore} from './store.js';
export async function isolatedDatabase(){
  const db=new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  await db.exec(await readFile(new URL('../../supabase/migrations/20261107092850_seo_content_engine_v1.sql',import.meta.url),'utf8'));
  await db.exec('update seo_content_settings set enabled=true,kill_switch=false;');
  const rpc=async(action,payload)=>{
    await db.exec('set role service_role');
    try{return (await db.query('select seo_content_command($1,$2::jsonb) result',[action,JSON.stringify(payload)])).rows[0].result;}
    finally{await db.exec('reset role');}
  };
  const store=createStore({url:'https://isolated.supabase.co',key:'local-test-only',fetcher:async(url,options)=>{
    const {action,payload}=JSON.parse(options.body);
    return new Response(JSON.stringify(await rpc(action,payload)),{status:200});
  }});
  return {db,store,rpc};
}
