// Builds data/lexicon.js from the two raw files in sources/.
//
//   sources/英语专业四八级词汇表.txt           headwords, "*"-starred = TEM8-only
//   sources/word-frequency-60000-english.csv   COCA ranks (UTF-8; the original
//                                              GB18030 dump is still accepted)
//
// The txt is a real OCR'd/copied syllabus, not a clean table: some lines lost
// their phonetic brackets, one lost its headword, aliases share a line
// ("adapter, adaptor"). The parser states the rules it applies and fails loudly
// when a count collapses, so a regenerated file cannot silently lose words.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const SOURCE_TXT = resolve(ROOT, 'sources', '英语专业四八级词汇表.txt');
const SOURCE_CSV = resolve(ROOT, 'sources', 'word-frequency-60000-english.csv');
const OUT = resolve(ROOT, 'data', 'lexicon.js');

// Characters a headword may contain. Anything outside this stops the scan:
// "[" (phonetics), IPA letters (mostly U+0250..U+02FF), "(", CJK.
const HEAD_CHAR = /[A-Za-z\u00C0-\u00FF0-9.'\-,/ ]/;
// A part-of-speech tag inside the definition tail, e.g. "v." or "adj.".
const POS_RE = /(?:^|[^A-Za-z])((?:n|v|adj|adv|prep|conj|pron|art|int|num|abbre|aux|vt|vi)\.)(?=\s|[\u4e00-\u9fff]|$)/;
const CJK_RE = /[\u4e00-\u9fff]/;
const POS_ONLY = /^(?:n|v|adj|adv|prep|conj|pron|art|int|num|abbre|aux|vt|vi)\.$/;

/** Strip the phonetics and the leading POS noise; keep the definition. */
function definitionOf(rest) {
  let s = rest.trim();
  if (s.startsWith('[')) {
    const end = s.indexOf(']');
    s = end === -1 ? '' : s.slice(end + 1).trim();
  }
  // Where does the definition actually start? First POS tag, first CJK, or a
  // parenthetical gloss such as "(abbre for Anno Domini)".
  let start = -1;
  const pos = POS_RE.exec(s);
  if (pos) start = pos.index + pos[0].indexOf(pos[1]);
  const cjk = s.search(CJK_RE);
  if (cjk !== -1 && (start === -1 || cjk < start)) start = cjk;
  const paren = s.indexOf('(');
  if (paren !== -1 && (start === -1 || paren < start)) start = paren;
  if (start > 0) s = s.slice(start);
  return s
    .replace(/^[\s/·]+/, '')
    // A second pronunciation slipped into the definition: "[əˈbjuːs]". Brackets
    // holding Chinese are idioms and stay.
    .replace(/\[[^\]\u4e00-\u9fff]{0,48}\]/g, ' ')
    // "(s)" / "(al)" suffix markers left over from a headword.
    .replace(/^\([a-z]{1,2}\)\s*/i, '')
    .replace(/\s+/g, ' ')
    // Source typos: "v. . 1." and "(abbre …)n.".
    .replace(/(\b(?:n|v|adj|adv|prep)\.)\s+\.\s*/g, '$1 ')
    .replace(/\)(?=(?:n|v|adj|adv|prep)\.)/g, ') ')
    .trim();
}

function parseSyllabus(text) {
  // Homographs arrive numbered ("affect 1", "affect 2"). Drop the number and
  // merge the senses into one entry under the plain word.
  const rows = new Map();
  let merged = 0;
  let skipped = 0;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('* 表示')) continue;
    const star = line.startsWith('*');
    const body = (star ? line.slice(1) : line).trim();

    let end = 0;
    while (end < body.length && HEAD_CHAR.test(body[end])) end += 1;
    const head = body.slice(0, end).trim().replace(/[/\s]+$/, '');
    // One damaged line begins "v. 1. (日月等)…" with the headword gone.
    if (!head || !/[A-Za-z]/.test(head) || POS_ONLY.test(head) || /^(?:n|v|adj|adv|prep|conj|pron|art)\.\s*\d/.test(head)) {
      skipped += 1;
      continue;
    }
    const def = definitionOf(body.slice(end));
    if (!def) {
      skipped += 1;
      continue;
    }
    const level = star ? 'TEM8' : 'TEM4';
    // "adapter, adaptor" and "a, an" are two spellings of one entry.
    for (const alias of head.split(',')) {
      const word = alias.trim().replace(/\s+\d+$/, '');
      if (!/[A-Za-z]/.test(word)) continue;
      const key = word.toLowerCase();
      const seen = rows.get(key);
      if (!seen) {
        rows.set(key, [word, level, def]);
      } else {
        if (!seen[2].includes(def)) seen[2] += `；${def}`;
        if (level === 'TEM4') seen[1] = 'TEM4';
        merged += 1;
      }
    }
  }
  return { rows: [...rows.values()], skipped, merged };
}

function decodeCsv(buffer) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    // The original file is a GB18030 Excel export; keep accepting it.
    return new TextDecoder('gb18030').decode(buffer);
  }
}

function parseFrequencies(buffer) {
  const text = decodeCsv(buffer);
  const best = new Map();
  let rows = 0;
  for (const line of text.split(/\r?\n/).slice(1)) {
    if (!line.trim()) continue;
    const cells = line.split(',');
    if (cells.length < 4) continue;
    const rank = Number(cells[0]);
    if (!Number.isFinite(rank)) continue;
    // The word column sometimes wraps a lemma in parentheses: "  (abbey)".
    const word = cells[2].trim().replace(/^\((.*)\)$/, '$1').trim();
    if (!word) continue;
    rows += 1;
    const key = word.toLowerCase().replace(/[.'\s-]/g, '');
    const total = Number(cells[3]) || 0;
    const prev = best.get(key);
    if (!prev || rank < prev[0]) best.set(key, [word, rank, total]);
  }
  const list = [...best.values()].sort((a, b) => a[1] - b[1]);
  return { rows, list };
}

const syllabus = parseSyllabus(readFileSync(SOURCE_TXT, 'utf8').replace(/^\uFEFF/, ''));
const freq = parseFrequencies(readFileSync(SOURCE_CSV));

if (syllabus.rows.length < 11_000) {
  throw new Error(`syllabus parse collapsed: ${syllabus.rows.length} entries`);
}
if (freq.list.length < 45_000) {
  throw new Error(`frequency parse collapsed: ${freq.list.length} keys`);
}

// Display order: by level then alphabetically, so the file is diffable.
syllabus.rows.sort((a, b) => (a[1] === b[1] ? a[0].localeCompare(b[0]) : a[1].localeCompare(b[1])));

mkdirSync(dirname(OUT), { recursive: true });
const payload = JSON.stringify({
  built: new Date().toISOString().slice(0, 10),
  words: syllabus.rows,
  freq: freq.list,
});
writeFileSync(OUT, `globalThis.LEXICON = ${payload};\n`, 'utf8');

const tem4 = syllabus.rows.filter((row) => row[1] === 'TEM4').length;
const tem8 = syllabus.rows.length - tem4;
const covered = new Set(freq.list.map((row) => row[0].toLowerCase()));
const missing = syllabus.rows.filter((row) => !covered.has(row[0].toLowerCase())).length;
console.log(`syllabus  ${syllabus.rows.length} entries (TEM4 ${tem4} / TEM8 ${tem8}), ${syllabus.merged} homographs merged, ${syllabus.skipped} lines skipped`);
console.log(`frequency ${freq.list.length} unique lemmas from ${freq.rows} rows, ${missing} syllabus words without a rank`);
console.log(`wrote     ${OUT} (${(Buffer.byteLength(payload) / 1024 / 1024).toFixed(2)} MB)`);
