import {createHash,randomBytes,randomUUID} from 'node:crypto';

const scope='yincorp-seo/ipiranga-sp/praia-do-canto-es/v1';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
// Includes every existing business/financial field, not only known budget counters.
const financialState=state=>{const {history,storageProbes,...rest}=state;return hash(rest);};

// Requires an already initialized, decryptable REAL ledger. Never initialize,
// createRun, reconcile, reserve a call, reset a balance or change its identity.
export async function writeStorageProbe(ledger,id=randomUUID()){
  if(!uuid.test(id))throw Error('storage_probe_id_invalid');
  let record,financialHash,eventHash;
  await ledger.transaction(state=>{
    if(state.storageProbes?.[id])throw Error('storage_probe_already_exists');
    if(Object.keys(state.storageProbes||{}).length>=16)throw Error('storage_probe_limit');
    financialHash=financialState(state);
    const payload={id,kind:'synthetic-storage-only',createdAt:new Date().toISOString(),marker:randomBytes(32).toString('hex')};
    record={payload,hash:hash(payload)};
    (state.storageProbes??={})[id]=record;
    ledger.event(state,'STORAGE_PROBE',{id,hash:record.hash});
    eventHash=state.history.at(-1).hash;
    if(financialState(state)!==financialHash)throw Error('storage_probe_financial_change');
  });
  const row=(await ledger.pool.query('SELECT revision FROM seo_engine.ledger WHERE scope=$1',[scope])).rows[0];
  return {version:1,id,hash:record.hash,eventHash,financialHash,minimumRevision:String(row.revision)};
}

export async function readStorageProbe(ledger,proof){
  if(proof?.version!==1||!uuid.test(proof.id)||!/^\d+$/.test(proof.minimumRevision||'')||
      !['hash','eventHash','financialHash'].every(k=>/^[a-f0-9]{64}$/.test(proof[k]||'')))throw Error('storage_probe_proof_invalid');
  // One snapshot binds ciphertext to its SQL revision. No revision bump on read.
  const row=(await ledger.pool.query('SELECT ciphertext,revision FROM seo_engine.ledger WHERE scope=$1',[scope])).rows[0];
  if(!row)throw Error('private_ledger_not_initialized');
  const state=ledger.unseal(row.ciphertext);ledger.validate(state);
  if(state.scope!==scope||state.projectId!==ledger.projectId)throw Error('private_ledger_identity_mismatch');
  const record=state.storageProbes?.[proof.id];
  if(!record||record.payload.kind!=='synthetic-storage-only'||record.hash!==hash(record.payload)||record.hash!==proof.hash||
      BigInt(row.revision)<BigInt(proof.minimumRevision)||financialState(state)!==proof.financialHash||
      !state.history.some(e=>e.type==='STORAGE_PROBE'&&e.hash===proof.eventHash&&e.data.id===proof.id&&e.data.hash===proof.hash))throw Error('storage_probe_integrity_failure');
  return {status:'PASS',id:proof.id,hash:proof.hash,revision:String(row.revision),financialStateUnchanged:true};
}
