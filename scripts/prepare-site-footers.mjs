import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { applySiteFooter } from '../lib/site-footer.js';

const root = process.argv[2] ?? '.';
const ignored = new Set(['node_modules', 'tests', 'fixtures', 'scripts']);
let updated = 0;

async function prepare(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || ignored.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await prepare(path);
    } else if (entry.isFile() && /\.html$/i.test(entry.name)) {
      if (/^google(?:-site-verification|[a-f\d]+\.html)/i.test(entry.name)) continue;
      const html = await readFile(path, 'utf8');
      const output = applySiteFooter(html);
      if (html !== output) {
        await writeFile(path, output);
        updated++;
      }
    }
  }
}

await prepare(root);
console.log(`Rodapé compartilhado aplicado a ${updated} documentos HTML.`);
