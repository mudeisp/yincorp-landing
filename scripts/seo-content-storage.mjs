import {readFile,open} from 'node:fs/promises';
import {DurableLedger,ledgerPool,assertLedgerRole} from '../lib/seo-content/durable-ledger.js';
import {writeStorageProbe,readStorageProbe} from '../lib/seo-content/storage-probe.js';

let pool;
try{
  if(process.env.SEO_CONTENT_AUTOPUBLISH!=='false'||process.env.SEO_CONTENT_INFERENCE_AUTHORIZED!=='false')throw Error('storage_probe_requires_inference_disabled');
  const [command,file]=process.argv.slice(2);
  if(!['check','write','read'].includes(command))throw Error('storage_probe_command_invalid');
  if(command!=='check'&&(!file||!/^\.seo-test\/[a-zA-Z0-9_-]+\.json$/.test(file)))throw Error('storage_probe_private_file_required');
  pool=ledgerPool();await assertLedgerRole(pool);
  const tls=(await pool.query('SELECT ssl,version,bits FROM pg_stat_ssl WHERE pid=pg_backend_pid()')).rows[0];
  if(!tls?.ssl||!['TLSv1.2','TLSv1.3'].includes(tls.version)||tls.bits<128)throw Error('storage_probe_tls_required');
  // pg's TLS stream verifies the chain and the hostname via rejectUnauthorized:true.
  if(command==='check'){
    const initialized=Number((await pool.query('SELECT count(*) n FROM seo_engine.ledger')).rows[0].n)===1;
    console.log(JSON.stringify({connection:'PASS',roleIsolation:'PASS',tls:tls.version,initialized,dataApiExposure:'UNKNOWN_REQUIRES_DASHBOARD_CHECK',autopublish:false,inference:false}));
  }else{
    const ledger=new DurableLedger({pool,key:process.env.SEO_CONTENT_LEDGER_KEY,projectId:process.env.SEO_CONTENT_OPENAI_PROJECT_ID});
    if(command==='write'){
      // Refuse an existing/unwritable destination before mutating even probe metadata.
      const handle=await open(file,'wx',0o600);
      try{
        const proof=await writeStorageProbe(ledger);
        // No key, ciphertext, marker, financial state or commercial content in this proof.
        await handle.writeFile(JSON.stringify(proof,null,2)+'\n');await handle.sync();
        console.log(JSON.stringify({checkpoint:'WRITTEN',proofFile:file,...await readStorageProbe(ledger,proof)}));
      }finally{await handle.close();}
    }else console.log(JSON.stringify(await readStorageProbe(ledger,JSON.parse(await readFile(file,'utf8')))));
  }
}catch(error){
  const safe=new Set(['storage_probe_requires_inference_disabled','storage_probe_command_invalid','storage_probe_private_file_required','private_ledger_configuration_required','private_ledger_identity_required','private_ledger_not_initialized','storage_probe_already_exists','storage_probe_limit','storage_probe_proof_invalid','storage_probe_integrity_failure','private_ledger_integrity_failure','storage_probe_tls_required','private_ledger_role_not_isolated']);
  console.error(JSON.stringify({status:'BLOCKED',reason:safe.has(error.message)?error.message:'storage_connection_or_checkpoint_unavailable'}));process.exitCode=1;
}finally{if(pool)await pool.end();}
