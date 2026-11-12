import { readdir, readFile, writeFile, rm, mkdir } from "node:fs/promises";
import { resolve, basename } from "node:path";

const root = process.cwd();
const pageDir = resolve(root, "renata.bonilha");
const encodedDir = resolve(pageDir, "._encoded");
const outputDir = resolve(pageDir, "pdfs");
const names = await readdir(encodedDir);
const groups = new Map();

for (const name of names) {
  const match = /^(.*\.pdf)\.(\d{3})\.txt$/.exec(name);
  if (!match || basename(match[1]) !== match[1]) throw new Error(`Unexpected encoded file: ${name}`);
  const [, pdfName, partNumber] = match;
  const group = groups.get(pdfName) ?? [];
  group.push({ partNumber: Number(partNumber), path: resolve(encodedDir, name) });
  groups.set(pdfName, group);
}

await mkdir(outputDir, { recursive: true });
for (const [pdfName, parts] of groups) {
  parts.sort((a, b) => a.partNumber - b.partNumber);
  const base64 = (await Promise.all(parts.map(({ path }) => readFile(path, "utf8")))).join("");
  await writeFile(resolve(outputDir, pdfName), Buffer.from(base64, "base64"));
}

await rm(encodedDir, { recursive: true, force: true });
console.log(`Materialized ${groups.size} Renata comparison PDFs.`);
