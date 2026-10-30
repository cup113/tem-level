// Renders one card per lookup, newest first. Classic script: no build, no server.
(function () {
  const MAX_CARDS = 25;
  const api = globalThis.TEMLookup;
  const data = globalThis.LEXICON;

  const form = document.getElementById('search');
  const input = document.getElementById('word');
  const results = document.getElementById('results');
  const empty = document.getElementById('empty');
  const notice = document.getElementById('notice');

  if (!data || !api) {
    empty.replaceChildren(note('数据未生成：先运行 node scripts/build-data.mjs，再刷新页面。'));
    return;
  }

  const cards = new Map(); // normalized query -> card, so a repeat moves to the top

  function note(text) {
    const p = document.createElement('p');
    p.className = 'error';
    p.textContent = text;
    return p;
  }

  // Rank bands, colour only: ≤5,000 deep, ≤15,000 mid, rarer pale.
  function band(rank) {
    if (rank <= 5000) return 'f1';
    return rank <= 15000 ? 'f2' : 'f3';
  }

  function meta(hit) {
    const row = document.createElement('p');
    row.className = 'meta';
    if (!hit.frequency) {
      const none = document.createElement('span');
      none.textContent = '词频表未收';
      row.appendChild(none);
      return row;
    }
    const rankLine = document.createElement('span');
    rankLine.append('COCA 排名 ');
    const rankValue = document.createElement('b');
    rankValue.className = `rank ${band(hit.frequency.rank)}`;
    rankValue.textContent = hit.frequency.rank.toLocaleString('en-US');
    rankLine.appendChild(rankValue);
    const total = document.createElement('span');
    total.textContent = `出现 ${hit.frequency.total.toLocaleString('en-US')} 次`;
    row.append(rankLine, total);
    return row;
  }

  function render(hit) {
    const card = document.createElement('article');
    card.className = 'card';

    const head = document.createElement('div');
    head.className = 'head';
    const word = document.createElement('h2');
    word.className = 'word';
    word.textContent = hit.word;
    const badge = document.createElement('span');
    badge.className = `badge ${hit.level === 'TEM4' ? 'lv4' : hit.level === 'TEM8' ? 'lv8' : 'lv8p'}`;
    badge.textContent = hit.level;
    head.append(word, badge);

    const def = document.createElement('p');
    def.className = 'def';
    if (hit.definition) {
      def.textContent = hit.definition;
    } else {
      def.classList.add('empty');
      def.textContent = hit.frequency ? '考纲未收，无释义' : '考纲与词频表均未收此词';
    }

    card.append(head, def);
    if (hit.definition || hit.frequency) card.appendChild(meta(hit));
    return card;
  }

  function addExpander(card, def) {
    if (def.scrollHeight <= def.clientHeight + 2) return;
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'more';
    toggle.textContent = '展开';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.addEventListener('click', () => {
      const open = def.classList.toggle('expanded');
      toggle.textContent = open ? '收起' : '展开';
      toggle.setAttribute('aria-expanded', String(open));
    });
    card.insertBefore(toggle, card.querySelector('.meta'));
  }

  function say(text) {
    notice.textContent = text;
    notice.hidden = !text;
  }

  function search(raw) {
    const hit = api.lookup(raw);
    if (!hit) return;
    if (!/[A-Za-z]/.test(hit.query)) {
      say('请输入英文单词。');
      return;
    }
    say('');

    const key = hit.query.toLowerCase().replace(/\s+/g, ' ');
    const previous = cards.get(key);
    if (previous) {
      previous.remove();
      cards.delete(key);
    }

    const card = render(hit);
    results.prepend(card);
    cards.set(key, card);
    empty.hidden = true;

    // Drop the oldest cards, and their entries, once the feed gets long.
    while (results.children.length > MAX_CARDS) {
      const oldest = results.lastElementChild;
      for (const [k, v] of cards) if (v === oldest) cards.delete(k);
      oldest.remove();
    }

    // Clamp detection needs the card in the document.
    requestAnimationFrame(() => addExpander(card, card.querySelector('.def')));

    input.value = hit.query;
    input.select();
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const word = input.value.trim();
    if (word) search(word);
  });

  input.addEventListener('input', () => {
    if (!notice.hidden) say('');
  });

  document.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      search(chip.dataset.word);
      input.focus();
    });
  });

  input.focus();
})();
