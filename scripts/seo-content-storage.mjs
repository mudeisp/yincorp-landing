import {readFile,open} from 'node:fs/promises';
import {DurableLedger,ledgerPool} from '../lib/seo-content/durable-ledger.js';
import {writeStorageProbe,readStorageProbe} from '../lib/seo-content/storage-probe.js';
import {inspectStorage,safeFailure} from '../lib/seo-content/diagnostics.js';

let pool;
try{
  if(process.env.SEO_CONTENT_AUTOPUBLISH!=='false'||process.env.SEO_CONTENT_INFERENCE_AUTHORIZED!=='false')throw Error('storage_probe_requires_inference_disabled');
  const [command,file]=process.argv.slice(2);
  if(!['check','write','read'].includes(command))throw Error('storage_probe_command_invalid');
  if(command!=='check'&&(!file||!/^\.seo-test\/[a-zA-Z0-9_-]+\.json$/.test(file)))throw Error('storage_probe_private_file_required');
  pool=ledgerPool();const storage=await inspectStorage(pool);
  if(command==='check'){
    console.log(JSON.stringify(storage));
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
  console.error(JSON.stringify(safeFailure(error,'storage')));process.exitCode=1;
}finally{if(pool)await pool.end();}
