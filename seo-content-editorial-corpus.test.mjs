import test from 'node:test';
import assert from 'node:assert/strict';
import {createEditorialAgents} from './lib/seo-content/editorial.js';
import {GATES,hash} from './lib/seo-content/core.js';
import {spawnSync} from 'node:child_process';
const now=new Date().toISOString(),fact='Fonte sintética exclusiva do teste de validação.';
const input={opportunity:{state:'SP',city:'São Paulo',neighborhood:'Ipiranga',topicKey:'fixture',targetCanonical:'/sp/conteudos/fixture'},context:{sources:[{url:'https://example.org/source',excerpt:fact,digest:hash(fact),observedAt:now}]},stock:[{state:'SP',city:'São Paulo',neighborhood:'Ipiranga',path:'/sp/sao-paulo/empreendimento/fixture',checkedAt:now}],content:{title:'Fixture de validação',description:'Fixture',introduction:'Simulação de validação.',sections:[{heading:'Primeira',level:2,text:fact},{heading:'Segunda',level:3,text:fact}],questions:[{question:'Fixture?',answer:'Fixture.'}],cta:'Confira.',internalLinks:[{path:'/sp',label:'SP'}],claims:[{text:fact,sourceUrl:'https://example.org/source'}]}};
const agents=createEditorialAgents({model:async()=>Object.fromEntries(GATES.map(g=>[g,{status:'PASS',evidence:'explicit synthetic model fixture'}])),checkLinks:async urls=>urls.map(()=>true)});
test('missing comparison corpus cannot turn a model assertion into cannibalization or originality PASS',async()=>{
  const gates=await agents.verify({...input,pages:[]});assert.equal(gates.cannibalization.status,'UNKNOWN');assert.equal(gates.originality.status,'UNKNOWN');
  const duplicate=await agents.verify({...input,pages:[{path:input.opportunity.targetCanonical,title:'Different fixture',text:'Fixture'}]});assert.equal(duplicate.cannibalization.status,'FAIL');
});
test('inventory gate rejects the wrong neighborhood even inside the right city and state',async()=>{
  const gates=await agents.verify({...input,pages:[],stock:[{...input.stock[0],neighborhood:'Outro bairro'}]});assert.equal(gates.inventory.status,'FAIL');
});
test('deterministic runner refuses enabled inference or publication before reading inputs',()=>{
  for(const change of [{SEO_CONTENT_INFERENCE_AUTHORIZED:'true',SEO_CONTENT_AUTOPUBLISH:'false'},{SEO_CONTENT_INFERENCE_AUTHORIZED:'false',SEO_CONTENT_AUTOPUBLISH:'true'}]){
    const child=spawnSync(process.execPath,['scripts/run-seo-content-demo.mjs','--inference-v3','--preflight-only','--deterministic-dry-run'],{encoding:'utf8',env:{...process.env,...change,SEO_OPENAI_API_KEY:'synthetic-never-used'}});
    assert.equal(child.status,1);assert.match(child.stderr,/deterministic_dry_run_requires_private_disabled_inference/);
  }
});
