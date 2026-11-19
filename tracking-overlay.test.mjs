import test from 'node:test';
import assert from 'node:assert/strict';
import {trackingOverlay} from './scripts/yincorp-tracking-overlay.mjs';

test('portal template loads Yincorp GA4 and not the upstream property',()=>{
 const input='<script src="https://www.googletagmanager.com/gtag/js?id=G-Y2W11SX5VV"></script>';
 const result=trackingOverlay('.portal-shared/render.js',input);
 assert.match(result,/G-2ZDJCLSSDN/);
 assert.doesNotMatch(result,/G-Y2W11SX5VV/);
});
test('analytics dispatches GA4, Ads and the Yincorp Meta PageView exactly once',()=>{
 const input="gtag('config', 'G-Y2W11SX5VV');\nfbq('init', '1552958819302786');\nfbq('track', 'PageView');";
 const result=trackingOverlay('portal-assets/analytics.js',input);
 for(const value of ["G-2ZDJCLSSDN","AW-18371236623","1847735489548242"]) assert.ok(result.includes(value));
 for(const legacy of ["G-Y2W11SX5VV","1552958819302786"]) assert.ok(!result.includes(legacy));
 assert.equal((result.match(/fbq\('track', 'PageView'\)/g)||[]).length,1);
 assert.equal((result.match(/gtag\('config', 'G-2ZDJCLSSDN'\)/g)||[]).length,1);
});
test('changes in upstream source fail closed',()=>{
 assert.throws(()=>trackingOverlay('.portal-shared/render.js','<head></head>'),/upstream_changed/);
 assert.throws(()=>trackingOverlay('portal-assets/analytics.js',"gtag('config', 'G-Y2W11SX5VV');"),/upstream_changed/);
});
