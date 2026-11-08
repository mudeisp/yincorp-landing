import test from 'node:test';
import assert from 'node:assert/strict';
import {comparisonCorpus,validCorpus,parseCorpusPage,compareTopics,corpusPath,corpusDigest} from './lib/seo-content/comparison-corpus.js';
import {createEditorialAgents} from './lib/seo-content/editorial.js';
import {GATES,hash} from './lib/seo-content/core.js';
const o={state:'SP',city:'São Paulo',neighborhood:'Ipiranga',intent:'informational',query:'Como é morar no Ipiranga, São Paulo?',targetCanonical:'/sp/conteudos/morar-no-ipiranga'};
const stock=[{state:'SP',city:o.city,neighborhood:o.neighborhood,name:'Synthetic fixture development',path:'/sp/sao-paulo/empreendimento/fixture',checkedAt:new Date().toISOString()}];
const html=(path,title='Synthetic comparison fixture')=>`<html><title>${title}</title><link rel="canonical" href="https://www.yincorp.com.br${path}"><main><h1>${title}</h1><p>${'Synthetic evidence only, never a public article. '.repeat(10)}</p></main></html>`;
const read=async(path,kind)=>({body:kind==='xml'?'<urlset><url><loc>https://www.yincorp.com.br/sp</loc></url></urlset>':html(path)});
test('real corpus contract discovers canonical pages and binds integrity, time and bounded coverage',async()=>{
  const c=await comparisonCorpus({opportunity:o,inventory:stock,read});assert.equal(c.coverage.complete,true);assert.equal(c.pages.length,4);assert.ok(validCorpus(c));
  c.pages[0].title='tampered';assert.equal(validCorpus(c),false);
  const partial=await comparisonCorpus({opportunity:o,inventory:stock,read,maxPages:1});assert.equal(partial.coverage.complete,false);
  const failed=await comparisonCorpus({opportunity:o,inventory:stock,read:async()=>{throw Error('fixture_offline');}});assert.equal(failed.coverage.complete,false);assert.equal(validCorpus(failed),false);
});
test('corpus rejects hostile URLs, redirects in canonicals, noindex, missing headings and stale evidence',()=>{
  for(const url of ['https://evil.example/sp','https://www.yincorp.com.br@evil.example/sp','/sp?secret=x','/sp#fragment','/sp/%2e%2e'])assert.throws(()=>corpusPath(url));
  for(const body of [html('/wrong'),html('/sp').replace('<main>','<meta name="robots" content="noindex"><main>'),'<title>No heading</title>'])assert.throws(()=>parseCorpusPage({path:'/sp',body}));
  const page=parseCorpusPage({path:'/sp',body:html('/sp'),now:Date.now()-7200000});const c={pages:[page],coverage:{expected:1,retrieved:1,complete:true},observedAt:page.observedAt};c.snapshotHash=corpusDigest(c);assert.equal(validCorpus(c),false);
});
test('Portuguese intent and synonym overlap flags semantic review without confusing commercial inventory with an article',()=>{
  const matches=compareTopics(o,[{path:'/sp/conteudos/outro',title:'Como é viver no Ipiranga',intent:'informational'},{path:stock[0].path,title:o.query,intent:'transactional'}]);
  assert.ok(matches.some(p=>p.kind==='SEMANTIC_REVIEW'));
  assert.equal(compareTopics(o,[{path:stock[0].path,title:'Imóveis no Ipiranga',intent:'transactional'}]).length,0);
});
test('strict editorial gate cannot approve a partial or wrong-geography corpus',async()=>{
  const corpus=await comparisonCorpus({opportunity:o,inventory:stock,read});corpus.coverage.complete=false;corpus.snapshotHash=corpusDigest(corpus);
  const fact='Synthetic fixture fact.';const content={title:o.query,description:'Fixture',introduction:'Fixture',sections:[{level:2,heading:'A',text:fact},{level:3,heading:'B',text:fact}],questions:[{question:'A?',answer:'B'}],cta:'Fixture',internalLinks:[{path:'/sp',label:'SP'}],claims:[{text:fact,sourceUrl:'https://example.org/fixture'}]};
  const agents=createEditorialAgents({requireCorpusEvidence:true,model:async()=>Object.fromEntries(GATES.map(g=>[g,{status:'PASS',evidence:'synthetic model fixture'}])),checkLinks:async urls=>urls.map(()=>true)});
  const result=await agents.verify({opportunity:o,content,stock,context:{sources:[{url:'https://example.org/fixture',excerpt:fact,digest:hash(fact),observedAt:new Date().toISOString()}]},pages:corpus.pages,corpus});
  assert.equal(result.cannibalization.status,'UNKNOWN');assert.equal(result.originality.status,'UNKNOWN');
  corpus.coverage.complete=true;corpus.coverage.state='ES';corpus.snapshotHash=corpusDigest(corpus);
  const wrong=await agents.verify({opportunity:o,content,stock,context:{sources:[]},pages:corpus.pages,corpus});assert.equal(wrong.cannibalization.status,'UNKNOWN');
});
