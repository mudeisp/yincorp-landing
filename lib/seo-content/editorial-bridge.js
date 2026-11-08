import {createServer} from 'node:http';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {openaiEditorial,validateEditorialOutput} from './openai-editorial.js';
import {inferenceSettings} from './inference-config.js';
import {editorialModel,secureGateway} from './providers.js';
import {hash} from './core.js';

// Test/local runner only. No Vercel deployment, remote DB or exported API key.
export async function startEditorialBridge({env=process.env,fetcher=fetch}){
  const settings=inferenceSettings(env);if(!env.SEO_OPENAI_API_KEY?.trim())throw Error('editorial_credentials_unavailable');
  const token=randomBytes(32).toString('hex');let reservedMicros=0,busy=false,providerRequests=0;
  const server=createServer(async(req,res)=>{
    res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Robots-Tag','noindex, nofollow');res.setHeader('Content-Type','application/json');
    const send=(code,body)=>{res.statusCode=code;res.end(JSON.stringify(body));};
    const received=Buffer.from(req.headers.authorization||''),expected=Buffer.from('Bearer '+token);
    if(received.length!==expected.length||!timingSafeEqual(received,expected))return send(401,{error:'unauthorized'});
    if(req.method!=='POST'||req.url!=='/editorial')return send(405,{error:'invalid_editorial_request'});
    if(busy)return send(429,{error:'editorial_concurrency_limit'});
    busy=true;
    try{
      let bytes=0;const chunks=[];
      for await(const chunk of req){bytes+=chunk.length;if(bytes>60000)throw Error('editorial_request_limit');chunks.push(chunk);}
      const payload=JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if(!['research','write','audit'].includes(payload.stage)||typeof payload.instructions!=='string'||!payload.input||!Number.isInteger(payload.maxOutputTokens)||payload.maxOutputTokens<1||payload.maxOutputTokens>4000||!Number.isInteger(payload.maxCostMicros)||payload.maxCostMicros<1||payload.maxCostMicros>100000)throw Error('invalid_editorial_request');
      let usage;
      const model=openaiEditorial({apiKey:env.SEO_OPENAI_API_KEY,...settings,maxOutputTokens:payload.maxOutputTokens,maxCallMicros:payload.maxCostMicros,store:{rpc:async(_action,{micros})=>{if(reservedMicros+micros>settings.approvedBudgetMicros)return false;reservedMicros+=micros;return true;}},runRef:()=>null,fetcher:async(...args)=>{providerRequests++;return fetcher(...args);},onUsage:u=>{usage=u;}});
      const output=await model(payload.stage,payload.input,payload.instructions);
      if(!usage)throw Error('editorial_usage_unavailable');
      send(200,{output,costMicros:usage.estimatedMicros,costKind:usage.costKind,usage});
    }catch(error){const safe=new Set(['editorial_request_limit','invalid_editorial_request','editorial_budget_exhausted','editorial_call_limit']);send(502,{error:safe.has(error.message)?error.message:'editorial_inference_failed'});}
    finally{busy=false;}
  });
  server.requestTimeout=15000;server.headersTimeout=10000;
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  return {url:`http://127.0.0.1:${server.address().port}/editorial`,token,reserved:()=>reservedMicros,providerRequests:()=>providerRequests,close:()=>new Promise((resolve,reject)=>{server.close(e=>e?reject(e):resolve());server.closeIdleConnections();})};
}
export function authenticatedEditorial({url,token,store,runRef,models,onUsage=()=>{},allowIsolatedLoopback=false,fetcher=fetch}){
  const call=editorialModel(secureGateway(url,token,{fetcher,allowIsolatedLoopback}),store,runRef);
  return async(stage,input,instructions)=>{
    let receipt,envelope;
    // editorialModel validates the cost envelope and schema before returning.
    const output=await call(stage,input,instructions,(usage,cost)=>{receipt=usage;envelope=cost;});
    validateEditorialOutput(stage,output);
    if(!receipt||receipt.provider!=='openai'||receipt.stage!==stage||receipt.model!==models[stage]||!receipt.resolvedModel||receipt.inputHash!==hash(input)||receipt.outputHash!==hash(output)||!receipt.responseId||receipt.estimatedMicros!==envelope?.costMicros||!Number.isInteger(receipt.inputTokens)||receipt.inputTokens<0||!Number.isInteger(receipt.outputTokens)||receipt.outputTokens<0||receipt.outputTokens>4000)throw Error('editorial_receipt_unavailable');
    onUsage(receipt);return output;
  };
}
