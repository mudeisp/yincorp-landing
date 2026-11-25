import assert from 'node:assert/strict';
import test from 'node:test';
import { approvedVisualRelease, visualRelease } from './lib/visual-engine.js';

const categories = ['facade', 'lobby', 'leisure', 'site', 'maquette', 'blueprint', 'editorial', 'xray'];
const complete = {
  status: 'approved',
  commercial: { status: 'verified', unitsUrl: '/commercial/units.json' },
  assets: categories.map(category => ({
    category, original: '/original.webp', asset: '/treated.webp', page: 16,
    promptVersion: '1.0.0', status: 'approved'
  }))
};

test('premium requires a verified table and a complete approved treatment set', () => {
  assert.equal(approvedVisualRelease(complete), true);
  assert.equal(approvedVisualRelease({ ...complete, assets: complete.assets.slice(0, -1) }), false);
  const assets = complete.assets.map(asset => asset.category === 'lobby' ? { ...asset, status: 'review' } : asset);
  assert.equal(approvedVisualRelease({ ...complete, assets }), false);
  assert.equal(approvedVisualRelease({ ...complete, commercial: { status: 'review' } }), false);
});

test('the pilot stays gated during review and outside preview', () => {
  assert.equal(visualRelease('17933', 'preview'), null);
  assert.equal(visualRelease('17933', 'production'), null);
  assert.equal(visualRelease('18850', 'preview'), null);
});
