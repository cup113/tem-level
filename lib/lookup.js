// Word -> syllabus level, definition, and COCA rank.
// Works as a classic browser script (globalThis.TEMLookup) and in Node ESM.

(function (root) {
  const LEVELS = ['TEM4', 'TEM8', 'TEM8+'];

  // Case-insensitive, nothing else: "A. D." is not the word "ad".
  function normalize(word) {
    return String(word == null ? '' : word).trim().toLowerCase().replace(/\s+/g, ' ');
  }

  let wordIndex = null;
  let freqIndex = null;

  function buildIndexes(data) {
    wordIndex = new Map();
    for (const [word, level, def] of data.words) {
      const key = normalize(word);
      if (!wordIndex.has(key)) wordIndex.set(key, { word, level, def });
    }
    freqIndex = new Map();
    for (const [word, rank, total] of data.freq) {
      const key = normalize(word);
      const prev = freqIndex.get(key);
      if (!prev || rank < prev.rank) freqIndex.set(key, { word, rank, total });
    }
  }

  function lookup(word) {
    const data = root.LEXICON;
    if (!data) throw new Error('LEXICON is not loaded');
    if (!wordIndex) buildIndexes(data);

    const key = normalize(word);
    if (!key) return null;
    const entry = wordIndex.get(key) || null;
    const freq = freqIndex.get(key) || null;

    return {
      query: String(word).trim(),
      word: entry ? entry.word : String(word).trim(),
      // Not in the 12.8k-word syllabus means beyond it: TEM8+.
      level: entry ? entry.level : 'TEM8+',
      inSyllabus: Boolean(entry),
      definition: entry ? entry.def : '',
      frequency: freq ? { rank: freq.rank, total: freq.total } : null,
    };
  }

  root.TEMLookup = { lookup, normalize, LEVELS };
})(globalThis);
