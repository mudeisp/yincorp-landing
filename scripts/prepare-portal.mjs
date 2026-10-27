import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve,dirname,sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const manifest=JSON.parse(await readFile(resolve(root,'portal-source.json'),'utf8'));
if(manifest.repository!=='mudeisp/ynteligencia' || !/^[0-9a-f]{40}$/.test(manifest.commit))throw new Error('Invalid portal source pin');
await Promise.all(manifest.files.map(async file=>{
  if(!/^(portal\/|assets\/|icon-192\.png$)/.test(file.source) || file.source.includes('..') || !/^(\.portal-shared|portal-assets)\/[a-z0-9.-]+\.(js|css|png|source)$/.test(file.destination))throw new Error('Invalid shared file path');
  const target=resolve(root,file.destination);
  if(!target.startsWith(root+sep))throw new Error('Destination outside checkout');
  const response=await fetch(`https://raw.githubusercontent.com/${manifest.repository}/${manifest.commit}/${file.source}`,{signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw new Error(`Shared source unavailable: ${file.source}`);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw new Error(`Shared source integrity mismatch: ${file.source}`);
  await mkdir(dirname(target),{recursive:true});await writeFile(target,bytes);
}));
// Only configuration already shipped publicly in the existing browser app.
const legacy=await readFile(resolve(root,'.portal-shared/public-config.source'),'utf8');
const url=/const SUPABASE_URL\s*=\s*"([^"]+)"/.exec(legacy)?.[1];
const key=/const SUPABASE_PUBLISHABLE_KEY\s*=\s*"([^"]+)"/.exec(legacy)?.[1];
if(!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url || '') || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key || ''))throw new Error('Public inventory configuration unavailable');
await writeFile(resolve(root,'.portal-shared/public-config.js'),`export const publicConfig=${JSON.stringify({url,key})};\n`);
console.log(`Portal source verified: ${manifest.repository}@${manifest.commit}. No database or API was copied.`);
