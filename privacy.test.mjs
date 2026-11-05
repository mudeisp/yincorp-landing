import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {withPrivacyFooter,PRIVACY_PATH} from './lib/privacy-footer.js';
const read=p=>readFile(new URL(p,import.meta.url),'utf8');
test('footer decoration preserves non-HTML and commercial scripts and remains idempotent',()=>{
 const html='<html><main>Imóvel e preço</main><footer><nav>Comprar</nav></footer><script>window.commercialTracking=true</script></html>';
 const decorated=withPrivacyFooter(html);
 assert.ok(decorated.includes('<main>Imóvel e preço</main>'));
 assert.ok(decorated.includes('<script>window.commercialTracking=true</script>'));
 assert.equal(withPrivacyFooter(decorated),decorated);
 assert.equal((decorated.match(/href="\/politica-de-privacidade"/g)||[]).length,1);
 for(const body of [null,{ok:true},'<urlset></urlset>','<main>Sem rodapé</main>'])assert.equal(withPrivacyFooter(body),body);
 assert.equal(withPrivacyFooter('<footer><a href="/politica-de-privacidade.html">Privacidade</a></footer>'),`<footer><a href="${PRIVACY_PATH}">Privacidade</a></footer>`);
});
test('canonical policy is public static HTML with no tracking tags and valid internal navigation',async()=>{
 const html=await read('politica-de-privacidade/index.html');
 assert.match(html,/<html lang="pt-BR">/);
 assert.match(html,/<link rel="canonical" href="https:\/\/www.yincorp.com.br\/politica-de-privacidade">/);
 assert.doesNotMatch(html,/<script|googletagmanager|fbevents|fbq\(|gtag\(/i);
 for(const anchor of [...html.matchAll(/href="#([^"]+)"/g)])assert.ok(html.includes(`id="${anchor[1]}"`),anchor[1]);
 const config=JSON.parse(await read('vercel.json'));
 assert.ok(config.rewrites.some(r=>r.source===PRIVACY_PATH&&r.destination==='/politica-de-privacidade/index.html'));
 assert.ok(config.redirects.some(r=>r.source==='/politica-de-privacidade.html'&&r.destination===PRIVACY_PATH&&r.permanent));
 assert.ok((await read('sitemap-static.xml')).includes(`https://www.yincorp.com.br${PRIVACY_PATH}`));
});
