const stages=['research','write','audit'];
export function inferenceReadiness(env=process.env){
  const remote=Boolean(env.SEO_CONTENT_EDITORIAL_URL),missing=[];
  if(remote){
    try{const u=new URL(env.SEO_CONTENT_EDITORIAL_URL);if(u.protocol!=='https:'||u.username||u.password)missing.push('valid_SEO_CONTENT_EDITORIAL_URL');}catch{missing.push('valid_SEO_CONTENT_EDITORIAL_URL');}
    if((env.SEO_CONTENT_EDITORIAL_TOKEN||'').length<32)missing.push('SEO_CONTENT_EDITORIAL_TOKEN');
  }else if(!env.SEO_OPENAI_API_KEY?.trim())missing.push('SEO_OPENAI_API_KEY');
  if(env.SEO_CONTENT_INFERENCE_AUTHORIZED!=='true')missing.push('SEO_CONTENT_INFERENCE_AUTHORIZED');
  const budget=Number(env.SEO_CONTENT_APPROVED_BUDGET_MICROS);
  if(!Number.isInteger(budget)||budget<=0||budget>2000000)missing.push('SEO_CONTENT_APPROVED_BUDGET_MICROS');
  if(env.SEO_CONTENT_AUTOPUBLISH!=='false')missing.push('SEO_CONTENT_AUTOPUBLISH=false');
  const models=Object.fromEntries(stages.map(s=>[s,env['SEO_CONTENT_'+s.toUpperCase()+'_MODEL']]));
  for(const s of stages)if(!models[s]?.trim())missing.push('SEO_CONTENT_'+s.toUpperCase()+'_MODEL');
  if(models.write&&models.write===models.audit)missing.push('distinct_audit_model');
  let rates;try{rates=JSON.parse(env.SEO_CONTENT_MODEL_RATES);}catch{}
  if(stages.some(s=>!Number.isFinite(rates?.[s]?.input)||!Number.isFinite(rates?.[s]?.output)||rates[s].input<0||rates[s].output<0))missing.push('SEO_CONTENT_MODEL_RATES');
  return {status:missing.length?'BLOCKED':'READY',mode:remote?'authenticated_https_gateway':'isolated_loopback_bridge',credentialConfigured:remote?(env.SEO_CONTENT_EDITORIAL_TOKEN||'').length>=32:Boolean(env.SEO_OPENAI_API_KEY?.trim()),budgetAuthorized:env.SEO_CONTENT_INFERENCE_AUTHORIZED==='true'&&Number.isInteger(budget)&&budget>0&&budget<=2000000,missing};
}
export function inferenceSettings(env=process.env){
  const readiness=inferenceReadiness(env);if(readiness.status!=='READY')throw Error(readiness.missing.includes('SEO_OPENAI_API_KEY')?'editorial_credentials_unavailable':'editorial_inference_configuration_blocked');
  return {models:Object.fromEntries(stages.map(s=>[s,env['SEO_CONTENT_'+s.toUpperCase()+'_MODEL']])),rates:JSON.parse(env.SEO_CONTENT_MODEL_RATES),approvedBudgetMicros:Number(env.SEO_CONTENT_APPROVED_BUDGET_MICROS)};
}
