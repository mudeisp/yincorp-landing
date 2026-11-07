import test from 'node:test';
import assert from 'node:assert/strict';
import {linkNationalEntities} from './lib/geo-national-entities.js';
const origin='https://www.yincorp.com.br';
function page(graph){
 return '<!doctype html><html><head><script type="application/ld+json">'+JSON.stringify({'@context':'https://schema.org','@graph':graph})+'</script></head><body></body></html>';
}
function graph(html){return JSON.parse(html.match(/<script type="application\/ld\+json">([^<]*)<\/script>/)[1])['@graph']}
for(const state of ['sp','es','rj','rs','sc','pr','pb','pe']){
 test('regional state '+state+' connects WebPage to national entities',()=>{
  const input=page([{'@type':'WebPage','@id':origin+'/'+state+'#webpage'},{'@type':'BreadcrumbList',itemListElement:[]}]);
  const result=graph(linkNationalEntities(input,'/'+state));
  assert.deepEqual(result[0].isPartOf,{'@id':origin+'/#website'});
  assert.deepEqual(result[0].publisher,{'@id':origin+'/#organization'});
  assert.equal(result[1]['@type'],'BreadcrumbList');
 });
}
test('city and development routes connect without altering existing nodes',()=>{
 const input=page([{'@type':'WebPage',name:'Imóveis'},{'@type':'ApartmentComplex',name:'Edifício'}]);
 const result=graph(linkNationalEntities(input,'/es/vitoria/empreendimento/exemplo'));
 assert.equal(result[0].isPartOf['@id'],origin+'/#website');
 assert.equal(result[1].name,'Edifício');
});
test('preserves explicit page relationships',()=>{
 const input=page([{'@type':'WebPage',isPartOf:{'@id':'https://example.org/existing'},publisher:{'@id':'https://example.org/publisher'}}]);
 assert.equal(linkNationalEntities(input,'/sp'),input);
});
test('does not alter home, rent, APIs, or unknown states',()=>{
 const input=page([{'@type':'WebPage'}]);
 for(const path of ['/','/alugar','/api/portal','/mg'])assert.equal(linkNationalEntities(input,path),input);
});
test('invalid JSON and non-WebPage graphs remain unchanged',()=>{
 const invalid='<html><script type="application/ld+json">{broken</script></html>';
 assert.equal(linkNationalEntities(invalid,'/es'),invalid);
 const input=page([{'@type':'BreadcrumbList'}]);
 assert.equal(linkNationalEntities(input,'/es'),input);
});
test('repeat processing is idempotent',()=>{
 const input=page([{'@type':'WebPage'}]);
 const first=linkNationalEntities(input,'/sp');
 assert.equal(linkNationalEntities(first,'/sp'),first);
});
