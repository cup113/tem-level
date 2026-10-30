// CLI twin of the page, for the cold-build check and the real test.
//   node demo/tem-level/scripts/query.mjs abandon abacus serendipity

import '../lib/lookup.js';
import '../data/lexicon.js';

const { lookup } = globalThis.TEMLookup;
const words = process.argv.slice(2);
if (words.length === 0) {
  console.error('usage: node scripts/query.mjs <word> [word ...]');
  process.exit(2);
}

const rank = (n) => `#${n.toLocaleString('en-US')}`;
for (const word of words) {
  const hit = lookup(word);
  if (!hit) continue;
  const freq = hit.frequency ? `${rank(hit.frequency.rank)} (${hit.frequency.total.toLocaleString('en-US')})` : '—';
  const main = hit.definition.split('||')[0].trim();
  console.log(`${hit.word}  [${hit.level}]  freq ${freq}`);
  console.log(`  ${main || '（考纲未收）'}`);
}
