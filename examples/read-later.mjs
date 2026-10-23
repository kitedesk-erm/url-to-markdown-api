// Read-later: save any article as a clean Markdown file with YAML front matter
// (drops straight into Obsidian, Logseq, a static site, or an e-reader pipeline).
//
// usage: ZYLA_API_KEY=... node examples/read-later.mjs URL [outDir=saved]
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { extract } from "../js/url-to-markdown.mjs";

const [url, outDir = "saved"] = process.argv.slice(2);
if (!url) { console.error("usage: node examples/read-later.mjs URL [outDir]"); process.exit(1); }

const a = await extract(url, { format: "markdown", images: true });
const slug = (a.title || new URL(a.url).pathname).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "article";
const yaml = (v) => JSON.stringify(v ?? null);
const doc = `---
title: ${yaml(a.title)}
author: ${yaml(a.byline)}
published: ${yaml(a.published_time)}
site: ${yaml(a.site_name)}
source: ${yaml(a.url)}
image: ${yaml(a.image)}
words: ${a.word_count}
reading_time_min: ${a.reading_time_min}
saved: ${yaml(new Date().toISOString())}
---

# ${a.title ?? a.url}

${a.markdown ?? ""}
`;
await mkdir(outDir, { recursive: true });
const file = join(outDir, `${slug}.md`);
await writeFile(file, doc);
console.log(`saved ${file} (${a.word_count} words, ${a.reading_time_min} min read)`);
