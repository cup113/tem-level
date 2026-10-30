# Data notice

The **code** in this repository is licensed under Apache-2.0; see [LICENSE](LICENSE).

The two files in `sources/` are the raw material this demo was built from. Their
provenance is not documented in this repository, and they remain the property of
their original compilers:

- `英语专业四八级词汇表.txt` — the TEM4/TEM8 syllabus word list; a leading `*`
  marks an entry as TEM8-only.
- `word-frequency-60000-english.csv` — a 60,000-lemma frequency list with COCA-style
  columns (rank, POS, word, total, spoken, fiction, magazine, newspaper, academic).
  Converted from the original GB18030 export to UTF-8; the build script still
  accepts the original encoding.

They are included so the page and the Docker image stay reproducible. Do not assume
the data may be reused or redistributed beyond this demonstration: if you fork the
project, check your own rights to these lists, or replace `sources/` with lists you
are allowed to publish. The Apache-2.0 grant applies to the code only.
