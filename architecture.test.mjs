import assert from 'node:assert/strict';
import test from 'node:test';
import {offices} from './lib/architecture-data.mjs';
import {editorial} from './lib/architecture-editorial.mjs';
import {serveArchitecture, architectureRoot, architectureSitemap} from './lib/architecture.mjs';

const origin = 'https://www.yincorp.com.br';
const routes = [architectureRoot, ...offices.map(office => architectureRoot + '/' + office.key)];

function request(path, method = 'GET', preview = false) {
  const response = {headers: {}, body: '', statusCode: 0};
  const handled = serveArchitecture({method}, {
    setHeader(name, value) { response.headers[name] = value; },
    status(code) { response.statusCode = code; return this; },
    send(body) { response.body = body; },
    end() {}
  }, path, {preview});
  return {...response, handled};
}

test('architecture pages return unique crawlable metadata and visible breadcrumbs', () => {
  const titles = new Set();
  const descriptions = new Set();
  for (const path of routes) {
    const {body, statusCode, headers} = request(path);
    assert.equal(statusCode, 200);
    assert.match(headers['Content-Type'], /text\/html/);
    assert.equal((body.match(/<h1\b/g) || []).length, 1);
    assert.ok(body.includes(`rel="canonical" href="${origin + path}"`));
    assert.ok(body.includes('name="twitter:card" content="summary_large_image"'));
    assert.ok(body.includes('aria-current="page"'));
    const json = JSON.parse(body.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
    const breadcrumbs = json['@graph'].find(entry => entry['@type'] === 'BreadcrumbList');
    assert.equal(breadcrumbs.itemListElement.at(-1).item, origin + path);
    titles.add(body.match(/<title>(.*?)<\/title>/)[1]);
    descriptions.add(body.match(/name="description" content="([^"]*)"/)[1]);
  }
  assert.equal(titles.size, 11);
  assert.equal(descriptions.size, 11);
});

test('office pages contain all 35 cards and link to all 44 original canonical destinations', () => {
  let cardCount = 0;
  const destinations = new Set();
  for (const office of offices) {
    const {body} = request(architectureRoot + '/' + office.key);
    const profile = editorial[office.key];
    const words = profile.introduction.split(/\s+/).length;
    assert.ok(words >= 80 && words <= 120);
    assert.ok(body.includes(profile.question));
    assert.equal((body.match(/<article class="arch-card /g) || []).length, office.projects.length);
    cardCount += office.projects.length;
    for (const {items} of office.projects) {
      for (const {path} of items) {
        assert.ok(body.includes(`href="${path}" data-project=`), path);
        destinations.add(path);
      }
    }
  }
  assert.equal(cardCount, 35);
  assert.equal(destinations.size, 44);
});

test('architecture sitemap, robots, HEAD and method behavior', () => {
  const sitemap = request(architectureSitemap);
  assert.match(sitemap.headers['Content-Type'], /xml/);
  assert.deepEqual([...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]), routes.map(path => origin + path));
  for (const path of [...routes, architectureSitemap]) {
    const preview = request(path, 'GET', true);
    assert.equal(preview.headers['X-Robots-Tag'], 'noindex, follow');
    assert.equal(preview.headers['Cache-Control'], 'no-store');
    assert.doesNotMatch(preview.body, /googletagmanager|integrations\/analytics/);
    assert.deepEqual(request(path, 'HEAD').body, '');
    assert.equal(request(path, 'POST').statusCode, 405);
    assert.equal(request(path, 'POST').headers.Allow, 'GET, HEAD');
  }
  assert.equal(request(architectureRoot + '/inexistente').handled, false);
});
