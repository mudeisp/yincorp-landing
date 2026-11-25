import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { approvedVisualModules, visualRelease } from './lib/visual-engine.js';

test('publication requires both independent approvals', () => {
  const study = { category: 'lobby', page: 7, original: '/original.webp', asset: '/treated.webp', recipeVersion: '1.1.0', status: 'approved' };
  assert.equal(approvedVisualModules({ assets: [study] }), null);
  const technicalApproval = {status: 'verified'};
  assert.equal(approvedVisualModules({ assets: [{...study, technicalApproval}] }), null);
  assert.equal(approvedVisualModules({ assets: [{...study, technicalApproval, artisticApproval: {status:'rejected'}}] }), null);
  assert.equal(approvedVisualModules({ assets: [{...study, technicalApproval, artisticApproval: {status:'approved'}}] }).assets.length, 1);
});

test('preview uses only frozen user-approved visuals and preserves both commercial tables', () => {
  const pilot = visualRelease('17933', 'preview');
  assert.deepEqual(pilot.assets.map(a => a.asset.split('/').at(-1)),
    ['fitness-proposta.webp','implantacao-proposta.webp','maquette-a.webp']);
  for (const asset of pilot.assets) {
    const bytes = readFileSync(new URL('.' + asset.asset, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256);
  }
  assert.equal(pilot.commercial.units, 9);
  assert.equal(visualRelease('17933', 'production'), null);
  assert.equal(visualRelease('18850', 'production'), null);
  const replica = visualRelease('18850', 'preview');
  assert.equal(replica.assets.length, 0);
  assert.equal(replica.commercial.units, 2);
});
