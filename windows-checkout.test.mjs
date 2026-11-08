import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

test('tracked paths support Windows and verification payload remains byte-identical',async()=>{
  const paths=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
  for(const path of paths)for(const segment of path.split('/')){
    assert.ok(!/[<>:"\\|?*\x00-\x1f]/.test(segment),`Windows-incompatible path: ${path}`);
    assert.ok(!/[. ]$/.test(segment),`Windows trailing character: ${path}`);
    assert.ok(!/^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(segment),`Windows reserved path: ${path}`);
  }
  const payload=await readFile('100leads/google-site-verification-legacy.html');
  const blobHash=createHash('sha1').update(Buffer.from(`blob ${payload.length}\0`)).update(payload).digest('hex');
  assert.equal(blobHash,'7394f6547865969cdfcb8e7a7508357672540ff7');
});

test('legacy verification URL is rewritten internally, without changing other routes',async()=>{
  const config=JSON.parse(await readFile('vercel.json','utf8'));
  const rule=config.rewrites.find(r=>r.destination==='/100leads/google-site-verification-legacy.html');
  assert.equal(rule.source,'/100leads/:legacy(google-site-verification[^/]*googlec52bf83be63f0cdb\\.html)');
  // The named parameter has a bounded custom regexp, no arbitrary destination.
  const pattern=new RegExp('^/100leads/'+rule.source.split(':legacy(')[1].slice(0,-1)+'$');
  for(const separator of [': ',':%20','%3A%20','%3a%20'])assert.ok(pattern.test('/100leads/google-site-verification'+separator+'googlec52bf83be63f0cdb.html'));
  for(const path of ['/sp','/100leads','/100leads/google-site-verification/evil/googlec52bf83be63f0cdb.html'])assert.equal(pattern.test(path),false);
  const before=JSON.parse(await readFile('docs/evidence/windows-checkout/previous-vercel.json','utf8'));
  assert.deepEqual({...config,rewrites:config.rewrites.filter(r=>r!==rule)},before);
});
