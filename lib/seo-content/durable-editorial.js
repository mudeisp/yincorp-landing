import {openaiEditorial} from './openai-editorial.js';

// Bypass neither validation nor receipts. Save raw Responses body before parsing;
// no headers, Authorization or environment values enter the ledger.
export function durableEditorial({ledger,runId,article,settings,apiKey,fetcher=fetch,onUsage=()=>{}}) {
  return async(stage,input,instructions) => {
    const result = await ledger.call({runId,article,stage,input,instructions,model:settings.models[stage]}, async({checkpoint}) => {
      let receipt;
      const model = openaiEditorial({apiKey,...settings,runRef:()=>runId,
        store:{rpc:async(action)=>action==='spend'},
        fetcher:async(...args)=>{
          const response = await fetcher(...args);
          const body = await response.text();
          if (body.length > 250000) throw Error('editorial_response_limit');
          if(apiKey && body.includes(apiKey))throw Error('editorial_sensitive_response_rejected');
          // Provider errors can echo key fragments; retain status only in that case.
          await checkpoint(response.ok?{httpStatus:response.status,body}:{httpStatus:response.status});
          return new Response(body,{status:response.status});
        }, onUsage:value=>{receipt=value;}});
      const output = await model(stage,input,instructions);
      return {output,receipt};
    });
    onUsage(result.receipt); return result.output;
  };
}
