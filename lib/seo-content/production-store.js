import {configuredLedger} from './durable-ledger.js';
import {publishedArticles} from './publication.js';

export const productionStore={
  async published(state){
    if(!['SP','ES'].includes(state))throw Error('production_state_invalid');
    const connection=await configuredLedger();
    try{return publishedArticles(await connection.ledger.read(),state);}finally{await connection.close();}
  }
};
