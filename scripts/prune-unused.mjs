// Na het bouwen: verwijder bestanden in dist/_astro waar geen enkele pagina naar verwijst.
// Astro kopieert de originele foto's mee, ook al gebruikt de site alleen de verkleinde versies.
import { readdirSync, readFileSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
const assets = join(dist, '_astro');

const texts = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(html|js|css)$/.test(name)) texts.push(readFileSync(p, 'utf8'));
  }
})(dist);
const all = texts.join('\n');

let removed = 0;
let bytes = 0;
for (const name of readdirSync(assets)) {
  if (/\.(js|css)$/.test(name) || all.includes(name)) continue;
  const p = join(assets, name);
  bytes += statSync(p).size;
  unlinkSync(p);
  removed++;
}
console.log(`Ongebruikte bestanden verwijderd: ${removed} (${(bytes / 1e6).toFixed(1)} MB)`);
