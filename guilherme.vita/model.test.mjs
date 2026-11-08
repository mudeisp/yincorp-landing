import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
import{stages,nominalSum,resolveUnit,selectedURL}from'./model.mjs';
const ps=JSON.parse(readFileSync(new URL('./projects.json',import.meta.url)));
test('financial rows preserve the source totals within printed rounding',()=>{
 assert.deepEqual(ps.map(p=>p.units.length),[94,16,37,30]);
 for(const p of ps){assert.equal(new Set(p.units.map(u=>u.id)).size,p.units.length);for(const u of p.units){assert(u.area>0&&u.total>0);assert(stages(p.key,u).every(s=>Number.isFinite(s[3])&&s[3]>0));assert(Math.abs(u.total-nominalSum(p.key,u))<=({arizona:0,haus:0,brooklin:10,mandarim:5}[p.key]),`${p.key}/${u.id}`);}}
});
test('sharing restores all four choices and rejects unknown identifiers',()=>{const chosen=Object.fromEntries(ps.map(p=>[p.key,p.units.at(-1)]));const url=new URL(selectedURL(ps,chosen));assert.equal(url.pathname,'/guilherme.vita');for(const p of ps){assert.equal(resolveUnit(p,url.searchParams.get(p.key)).id,chosen[p.key].id);assert.equal(resolveUnit(p,'invalid').id,p.units[0].id);}});
test('residential group ranges and area boundaries are retained',()=>{assert(ps.find(p=>p.key==='haus').units.every(u=>u.floorsLabel&&!u.floor));const a=ps[0].units;assert(a.every(u=>Math.abs(u.area-u.privateArea-2.85)<0.001));assert(ps[2].units.some(u=>u.area===186&&u.floor===5));assert(ps[2].units.some(u=>u.area===167&&u.floor===5));});
