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
    ['fitness-proposta.webp','implantacao-proposta.webp']);
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

test('Lindenberg displays the exact official plan and maps its thumbnail to unit 32', async () => {
  const { renderLindenbergPreview } = await import('./lib/lindenberg-preview.js');
  const oldEnv = process.env.VERCEL_ENV;
  process.env.VERCEL_ENV = 'preview';
  try {
    const markup = renderLindenbergPreview('<main><section id="arquitetura" class="art-architecture"></section><section class="art-plans" id="plantas"></section></main>');
    const match = markup.match(/<script type="application\/json" id="lindenberg-plan-catalog">(.*?)<\/script>/);
    const { unitPlanIds, plans } = JSON.parse(match[1]);
    const src = plans[unitPlanIds['32']].src;
    assert.match(markup, /<img src="\/visual-engine\/17933\/planta-191-book-p16.jpg"/);
    assert.doesNotMatch(markup, /maquette-a\.webp/);
    assert.equal(createHash('sha256').update(readFileSync(new URL('.' + src, import.meta.url))).digest('hex'),
      '1303de21bd388cf8f601ec01d7dc246134d81a6de19b2c6e89bd072d83d2bed3');
  } finally {
    if (oldEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = oldEnv;
  }
});
