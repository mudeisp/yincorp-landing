import assert from 'node:assert/strict';
import test from 'node:test';
import { approvedVisualModules, visualRelease } from './lib/visual-engine.js';

test('approved modules can render independently of pending modules', () => {
  const lobby = { category: 'lobby', page: 7, original: '/original.webp', asset: '/treated.webp', recipeVersion: '1.1.0', status: 'approved' };
  const other = { ...lobby, category: 'leisure', status: 'review' };
  assert.deepEqual(approvedVisualModules({ assets: [lobby, other] }), { assets: [lobby], commercial: null });
  assert.equal(approvedVisualModules({ assets: [other] }), null);
});

test('preview exposes six approved geometry studies and the verified table', () => {
  const pilot = visualRelease('17933', 'preview');
  assert.equal(pilot.assets.length, 6);
  assert.equal(pilot.assets.some(asset => asset.coverEligible), false);
  assert.equal(pilot.commercial.units, 9);
  assert.equal(visualRelease('17933', 'production'), null);
  assert.equal(visualRelease('18850', 'preview'), null);
});
