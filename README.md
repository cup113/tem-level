# TEM 词级查询

输入一个英文单词，输出它的考纲级别（TEM4 / TEM8 / TEM8+）、释义（若有）和 COCA 词频
（若有）。静态页面，没有框架、没有接口请求；官方镜像在 GHCR，有 Docker 就能部署。

![docker](https://github.com/cup113/tem-level/actions/workflows/docker.yml/badge.svg)
![GHCR](https://img.shields.io/badge/ghcr.io-cup113%2Ftem--level-2496ed)

## 用 Docker 部署

```bash
docker run -d --name tem-level -p 8080:80 ghcr.io/cup113/tem-level:latest
```

打开 <http://localhost:8080>。仓库里的 [compose.yaml](compose.yaml) 做同一件事：

```bash
docker compose up -d
```

镜像由 GitHub Actions 在每次推送到 `main` 时构建：两段式 Dockerfile 先用 Node 解析
`sources/` 里的原始材料，再由 nginx 提供静态页。tag 有 `latest`、`sha-xxxx`，打 `v*`
标签时还会推送语义化版本。

## 本地运行

在仓库根目录：

```powershell
node scripts/build-data.mjs   # 解析 sources/，写出 data/lexicon.js（约 2.1 MB）
node scripts/verify.mjs       # 9 个查询断言 + 数据完整性检查

start index.html              # 或直接双击；脚本都是 classic script，file:// 可用
```

命令行版做同一件事，不依赖浏览器：

```powershell
node scripts/query.mjs abandon abacus serendipity
```

## 规则

| 输出 | 判定 | 释义 | 词频 |
| --- | --- | --- | --- |
| **TEM4** | 词表内、未标 `*`（四级基础词） | 词表释义 | COCA 排名 |
| **TEM8** | 词表内、标 `*`（八级独有词） | 词表释义 | COCA 排名 |
| **TEM8+** | 词表中没有 | 无 | 有则显示 |
| — | 两个表都没有 | 无 | 无 |

词表 12,693 条（TEM4 8,704 / TEM8 3,989），词频表 53,795 个词条，其中 498 个词表词
没有排名。匹配只做大小写不敏感的精确匹配：`A. D.` 不会借到 `ad` 的词频，`an` 也不会
借到 `a` 的。排名数字按 ≤5,000 / 5,001–15,000 / >15,000 三档用同一蓝色的深浅标出，
出现次数保持不加粗。

## 数据

两份原始材料在 [sources/](sources/)，来源与再分发限制见 [NOTICE.md](NOTICE.md)：
Apache-2.0 只覆盖代码。

- `英语专业四八级词汇表.txt`：词头、音标、词性、中文释义与搭配；行首 `*` 表示八级独有。
- `word-frequency-60000-english.csv`：六万词条的 COCA 风格词频表（排名、词性、词、
  总量、口语/小说/杂志/报纸/学术）。

`data/` 是生成物，已 gitignore；换机器或改了解析规则后重新 build 即可。

## 目录

| 路径 | 作用 |
| --- | --- |
| [index.html](index.html) | 页面骨架：搜索框、结果区、空状态、级别说明 |
| [app.js](app.js) | 渲染卡片、去重、历史上限 25 条、长释义折叠 |
| [styles.css](styles.css) | 360px 起、跟随系统的明暗两套配色 |
| [lib/lookup.js](lib/lookup.js) | 查询本身：级别、释义、词频；浏览器与 Node 共用 |
| [scripts/build-data.mjs](scripts/build-data.mjs) | 解析原始材料，写出 `data/lexicon.js` |
| [scripts/query.mjs](scripts/query.mjs) | 命令行查询 |
| [scripts/verify.mjs](scripts/verify.mjs) | 数据断言 |
| [sources/](sources/) | 两份原始材料（见 NOTICE.md） |
| [rounds/](rounds/) | 两次设计决策的候选：结果区形状（选中 `a-card.html`）、排名颜色（选中 `rank-a-depth.html`） |
| [Dockerfile](Dockerfile) | Node 构建 + nginx 运行的两段镜像 |
| [nginx.conf](nginx.conf) | gzip、缓存与基础安全头 |
| [compose.yaml](compose.yaml) | 一条 `docker compose up -d` |
| [.github/workflows/docker.yml](.github/workflows/docker.yml) | 构建并推送 `ghcr.io/cup113/tem-level` |

## 解析时处理了什么

原始词表不是干净的表。`build-data.mjs` 显式处理这些情况，并在条数异常时直接报错退出，
避免悄悄丢词：

- 音标缺方括号、夹在释义中间（`[əˈbjuːs]`）——剥掉；
- 同形异义编号（`affect 1`、`affect 2`）——去掉编号，释义用 `；` 合并；
- 一行两个拼写（`adapter, adaptor`）——拆成两条，各自可查；
- 词频表词列带前导空格，部分词条是 `(abbey)` 这种带括号的 lemma——去括号后再入索引；
- 一行丢了词头（`v. 1. (日月等)…`）——跳过，构建日志会写明跳过了几行。

## 已知限制

- 释义是原表文本，个别条目仍带原书的 OCR 噪声（例如 `prop.` 应为 `pron.`）；
- 同形异义合并后是一条长释义，没有按词性分栏；
- 词频只给排名和语料出现次数，没有换算成每百万词；
- 排名三档只用同一蓝色的明度区分，弱光或低对比屏幕上 8,382 与 24,935 差别很小；
- 60k 表之外的词只能显示“未收”，不会估算词频；
- 没有历史持久化，刷新即清空。

## License

代码以 [Apache-2.0](LICENSE) 发布。`sources/` 中的两份数据不属于该授权范围，其权利与
再分发条件见 [NOTICE.md](NOTICE.md)。
