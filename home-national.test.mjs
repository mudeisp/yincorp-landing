import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {NATIONAL_MARKETS} from './.portal-shared/eligibility.js';
import {createPortalHandler} from './.portal-shared/router.js';
const read=p=>readFile(new URL(p,import.meta.url),'utf8');
const origin='https://www.yincorp.com.br';

test('national home is complete crawlable HTML with one H1 and truthful institutional schema',async()=>{
 const html=await read('index.html'),h1=[...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)];
 assert.equal(h1.length,1);assert.equal(h1[0][1].replace(/<[^>]*>/g,''),'Seu próximo imóvel começa com uma escolha inteligente.');
 assert.match(html,/<html lang="pt-BR">/);assert.match(html,/<main id="conteudo">/);
 assert.match(html,/<link rel="canonical" href="https:\/\/www.yincorp.com.br\/">/);
 assert.match(html,/<meta name="robots" content="index,follow">/);
 for(const field of ['title','description','url','image','image:alt'])assert.match(html,new RegExp('property="og:'+field+'"'));
 const schema=JSON.parse(/<script type="application\/ld\+json">\s*([\s\S]*?)<\/script>/.exec(html)[1]);
 assert.deepEqual(schema['@graph'].map(n=>n['@type']),['Organization','WebSite']);
 for(const node of schema['@graph'])assert.equal(node.url,origin+'/');
 assert.doesNotMatch(JSON.stringify(schema),/FAQPage|AggregateRating|Review|SearchAction|telephone|taxID/);
 assert.doesNotMatch(html,/Posicionado na Zona Oeste|<title>Rafael|garantia de rentabilidade/);
});

test('all eight approved markets have direct HTML links and navigation works without JavaScript',async()=>{
 const html=await read('index.html'),block=/<nav class="states"[^>]*>([\s\S]*?)<\/nav>/.exec(html)[1];
 const states=[...block.matchAll(/href="\/([a-z]{2})"/g)].map(m=>m[1].toUpperCase());
 assert.deepEqual([...states].sort(),[...NATIONAL_MARKETS].sort());assert.equal(new Set(states).size,8);
 assert.match(html,/<details class="mobile-menu">[\s\S]*?<summary>Menu<\/summary>/);
 for(const match of html.matchAll(/href="#([^"]+)"/g))assert.ok(html.includes(`id="${match[1]}"`),match[1]);
 assert.match(html,/href="\/alugar"/);assert.match(html,/href="\/politica-de-privacidade"/);
 assert.match(html,/href="https:\/\/app.yincorp.com.br\/\?modo=explorar"/);
 assert.doesNotMatch(html,/<form\b|fetch\(|\/api\/lead|sb_secret_|SUPABASE_SECRET|service_role/);
 const css=await read('home-assets/home.css');assert.match(css,/:focus-visible/);assert.match(css,/prefers-reduced-motion/);assert.match(css,/@media\(min-width:760px\)/);
});

test('root is static 200 and aliases redirect once to the canonical root, not ES',async()=>{
 const config=JSON.parse(await read('vercel.json')),html=await read('index.html');
 assert.ok(!config.redirects.some(r=>r.source==='/'));assert.ok(!config.rewrites.some(r=>['/','/institucional'].includes(r.source)));
 const aliases=['/index.html','/institucional','/institucional/','/institucional/index.html'];
 for(const source of aliases)assert.ok(config.redirects.some(r=>r.source===source&&r.destination==='/'&&r.permanent));
 // HTTP adapter models these exact static/redirect rules; live Vercel is checked separately.
 const server=createServer((req,res)=>{const rule=config.redirects.find(r=>r.source===req.url);if(rule){res.writeHead(308,{location:rule.destination}).end();return;}if(req.url==='/'){res.writeHead(200,{'content-type':'text/html; charset=utf-8'}).end(html);return;}res.writeHead(404).end();});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{const root=await fetch(base+'/',{redirect:'manual'});assert.equal(root.status,200);assert.equal(root.headers.get('location'),null);assert.match(await root.text(),/id="home-title"/);for(const alias of aliases){const r=await fetch(base+alias,{redirect:'manual'});assert.equal(r.status,308);assert.equal(r.headers.get('location'),'/');}}finally{await new Promise(r=>server.close(r));}
});

test('static sitemap includes root once and preserves rentals and campaign entries',async()=>{
 const xml=await read('sitemap-static.xml');
 for(const path of ['/','/alugar','/zona-oeste','/well-perdizes','/villa-pompeia','/welconx-perdizes','/politica-de-privacidade'])assert.equal(xml.split(`<loc>${origin}${path}</loc>`).length-1,1,path);
 assert.doesNotMatch(xml,/<loc>[^<]*(?:institucional|index.html)<\/loc>/);
 const robots=await read('robots.txt');assert.match(robots,/Allow: \//);assert.match(robots,/Disallow: \/api\//);assert.match(robots,/Sitemap: https:\/\/www.yincorp.com.br\/sitemap.xml/);
});

test('portal, rentals, campaign and commercial endpoint rewrites remain intact',async()=>{
 const config=JSON.parse(await read('vercel.json'));
 for(const [source,destination]of [['/alugar','/api/rentals?rentalPath=/alugar'],['/alugar/:rest*','/api/rentals?rentalPath=/alugar/:rest*'],['/sitemap.xml','/api/portal?portalPath=/sitemap.xml'],['/sitemap-seo/:rest*','/api/portal?portalPath=/sitemap-seo/:rest*'],['/api/portal/lead','https://app.yincorp.com.br/api/lead'],['/api/ads','https://app.yincorp.com.br/api/ads'],['/varanda-botanic','/varanda-botanic/index.html']])assert.ok(config.rewrites.some(r=>r.source===source&&r.destination===destination),source);
 for(const state of NATIONAL_MARKETS)assert.ok(config.rewrites.some(r=>r.source.startsWith('/:uf(')&&new RegExp('(?:\\(|\\|)'+state.toLowerCase()+'(?:\\||\\))').test(r.source)));
});

test('existing measurement IDs are retained without new form, pixel or conversion destination',async()=>{
 const html=await read('index.html');for(const id of ['G-2ZDJCLSSDN','AW-18371236623','1847735489548242'])assert.ok(html.includes(id));
 assert.doesNotMatch(html,/gtag\("event",\s*"conversion"|fbq\("track",\s*"Lead"|homepage_whatsapp|localStorage/);
});

for(const state of NATIONAL_MARKETS)test(`${state} SSR remains 200 with its own canonical and preview noindex`,async()=>{
 const row={id:'00000000-0000-4000-8000-000000000001',external_id:'orulo:1:1',building_id:'1',source:'novos',state,city:'Cidade de teste',neighborhood:'Centro',development_name:'Fixture de regressão',active:true,price:500000,area:60,typology_type:'Apartamento',typology_stock:1,status:'Pronto novo',stage:'Pronto novo',image_url:'https://images.example.com/fixture.jpg'};
 for(const preview of [false,true]){const res={headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.code=n;return this},send(body){this.body=body},end(){}};
 await createPortalHandler({nationalEligibility:true,canonicalOrigin:origin,preview,inventory:async()=>[row]})({method:'GET',url:'/'+state.toLowerCase()},res);
 assert.equal(res.code,200);assert.match(res.body,new RegExp('<link rel="canonical" href="'+origin+'/'+state.toLowerCase()+'">'));assert.match(res.body,preview?/content="noindex,follow"/:/content="index,follow"/);}
});
