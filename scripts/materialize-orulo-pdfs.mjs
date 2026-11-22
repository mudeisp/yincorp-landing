import { createHash } from 'node:crypto';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const outputDirectory = 'commercial/orulo';
const partsDirectory = join(outputDirectory, '._parts');
const books = {
  "casa-mar-book-orulo.pdf": {
    "parts": 5,
    "sha256": "5b66dfaf453dcab8a0621f6fb88706783baa392b3f11cdc4a54c61ecc33460c5"
  },
  "eden-park-by-dror-book-orulo.pdf": {
    "parts": 4,
    "sha256": "04337a4cd29087691437ae2dc9609e23bd34c084cf2d36826970bc66605cdce5"
  },
  "escape-brooklin-book-orulo.pdf": {
    "parts": 9,
    "sha256": "4c2d6f923352a0a9a918b22fb75ac21c7996a175aeabc6ba88a5b070085b5d73"
  },
  "haus-mitre-edition-ny-book-orulo.pdf": {
    "parts": 4,
    "sha256": "e474628062a5dd26c29f76c670f25225f7475eef201827b7901eb21013e86e6d"
  },
  "j329-itaim-book-orulo.pdf": {
    "parts": 4,
    "sha256": "f278d89e09d5780579403466900c313cb092c7eb3889893821fc7a38dda5e38c"
  }
};

for (const [name, { parts, sha256 }] of Object.entries(books)) {
  const buffers = [];
  for (let index = 0; index < parts; index++) {
    const part = String(index).padStart(3, '0');
    buffers.push(await readFile(join(partsDirectory, `${name}.${part}`)));
  }
  const pdf = Buffer.concat(buffers);
  if (createHash('sha256').update(pdf).digest('hex') !== sha256) {
    throw new Error(`Arquivo comercial incompleto: ${name}`);
  }
  await writeFile(join(outputDirectory, name), pdf);
}
await rm(partsDirectory, { recursive: true });
