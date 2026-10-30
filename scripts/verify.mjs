// Assertions over the generated lexicon: the facts the page depends on.
//   node demo/tem-level/scripts/verify.mjs
import '../lib/lookup.js';
import '../data/lexicon.js';

const { lookup } = globalThis.TEMLookup;
const data = globalThis.LEXICON;
const failures = [];

function check(label, condition, detail) {
  if (!condition) failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
}

check('lexicon is loaded', Boolean(data && data.words && data.freq));
check('syllabus size', data.words.length >= 12_000, `${data.words.length} entries`);
check('frequency size', data.freq.length >= 50_000, `${data.freq.length} lemmas`);

const cases = [
  // word, level, definition fragment, rank
  ['abandon', 'TEM4', '抛弃', 2195],
  ['abacus', 'TEM8', '算盘', 34578],
  ['serendipity', 'TEM8+', '', 24935],
  ['algorithm', 'TEM8+', '', 8382],
  ['the', 'TEM4', 'art.', 1],
  ['ABACUS', 'TEM8', '算盘', 34578],
  ['an', 'TEM4', 'art.', null],          // the frequency list only has "a"
  ['A. D.', 'TEM4', 'Anno Domini', null], // must not borrow "ad"'s rank
  ['zzzzqx', 'TEM8+', '', null],
];

for (const [word, level, fragment, rank] of cases) {
  const hit = lookup(word);
  check(`${word}: found`, Boolean(hit));
  if (!hit) continue;
  check(`${word}: level ${level}`, hit.level === level, hit.level);
  if (fragment) check(`${word}: definition contains ${fragment}`, hit.definition.includes(fragment));
  const actual = hit.frequency ? hit.frequency.rank : null;
  check(`${word}: rank ${rank}`, actual === rank, String(actual));
}

check('no empty definitions', data.words.every(([, , def]) => def.trim().length > 0));
check('no numbered headwords', data.words.every(([word]) => !/\s\d+$/.test(word)));

if (failures.length) {
  console.error(`verify: ${failures.length} failed`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`verify: ok — ${cases.length} lookups, ${data.words.length} entries, ${data.freq.length} lemmas`);
