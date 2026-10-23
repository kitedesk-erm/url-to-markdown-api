# URL to Markdown API: article extractor and clean text for LLM/RAG

**Turn any article URL into clean Markdown or plain text with a single GET request.** Menus, ads, cookie banners, sidebars, share buttons, "related posts", comments and footers are removed. You get back the main content plus the title, author, publish date, word count and reading time, ready for an LLM prompt, a RAG vector store, an AI agent or a reader view.

This repo holds **tiny zero-dependency clients** (JS/TS using `fetch`, Python using `urllib`) and copy-paste **examples** for the hosted [Article Extractor and URL to Markdown API on Zyla API Hub](https://zylalabs.com/api-marketplace/other/article+extractor+and+url+to+markdown+api/14315).

**[Get an API key and start the 7-day free trial on Zyla](https://zylalabs.com/api-marketplace/other/article+extractor+and+url+to+markdown+api/14315)**

Prefer MCP? See the companion server [`url-to-markdown-mcp`](https://github.com/kitedesk-erm/url-to-markdown-mcp) for Claude Desktop, Cursor and other MCP clients. Install it with `npx -y @kitedesk-erm/url-to-markdown-mcp` ([npm](https://www.npmjs.com/package/@kitedesk-erm/url-to-markdown-mcp), [Official MCP Registry](https://registry.modelcontextprotocol.io/v0/servers?search=io.github.kitedesk-erm/url-to-markdown-mcp)).

---

## What it does

| | |
|---|---|
| **Input** | Any public `http(s)` URL (the scheme is optional) |
| **Output** | JSON with `markdown`, `text`, `title`, `byline`, `published_time`, `site_name`, `lang`, `description`, `image`, `excerpt`, `word_count`, `reading_time_min` and `truncated` |
| **Markdown** | Headings, paragraphs, bold and italic, lists, block quotes, fenced code blocks, and links resolved to absolute URLs. Images are optional. |
| **Controls** | `format=markdown\|text\|both`, `links=true\|false`, `images=true\|false`, `max_chars=N` (to fit a token budget) |
| **Speed** | p50 **~230 ms**, p95 **~650 ms** (see [Latency](#latency)) |
| **Safety** | SSRF guard: localhost, private IP ranges and non-http schemes are rejected, so it's safe to pass user-submitted URLs |

It works on news articles, blog posts, docs pages (MDN, Go, Node), GitHub READMEs, Wikipedia and long essays. Plain-text and Markdown URLs pass through unchanged.

## Quick start (curl)

```bash
curl -G 'https://zylalabs.com/api/14315/article+extractor+and+url+to+markdown+api/35883/extract+article' \
  -H "Authorization: Bearer $ZYLA_API_KEY" \
  --data-urlencode 'url=https://simonwillison.net/2024/Dec/31/llms-in-2024/' \
  -d format=markdown -d max_chars=500
```

### Real sample output

This response was captured from the live API on 2026-10-22 and is unedited (`max_chars=500`, so `truncated` is `true`):

```json
{
  "url": "https://simonwillison.net/2024/Dec/31/llms-in-2024/",
  "title": "Things we learned about LLMs in 2024",
  "byline": "Simon Willison",
  "published_time": null,
  "site_name": "Simon Willison’s Weblog",
  "lang": "en-gb",
  "description": "A lot has happened in the world of Large Language Models over the course of 2024. Here’s a review of things we figured out about the field in the past …",
  "image": "https://static.simonwillison.net/static/2024/arena-dec-2024.jpg",
  "excerpt": "Things we learned about LLMs in 2024\n\n31st December 2024\n\nA lot has happened in the world of Large Language Models over the course of 2024. Here’s a review of things we figured out about the field in the past twelve months, plus my attempt at identifying key themes and pivotal…",
  "word_count": 6076,
  "reading_time_min": 26,
  "truncated": true,
  "markdown": "## Things we learned about LLMs in 2024\n\n31st December 2024\n\nA *lot* has happened in the world of Large Language Models over the course of 2024. Here’s a review of things we figured out about the field in the past twelve months, plus my attempt at identifying key themes and pivotal moments.\n\nThis is a sequel to [my review of 2023](https://simonwillison.net/2023/Dec/31/ai-in-2023/).\n\nIn this article:\n\n#### The GPT-4 barrier was comprehensively broken\n\nIn my December 2023 review I wrote about how ",
  "status": 200,
  "content_type": "text/html; charset=utf-8"
}
```

`status` and `content_type` describe what the target site returned.

## Clients (zero dependencies)

### JavaScript / TypeScript (Node 18+, Deno, Bun, Workers, browsers)

Copy [`js/url-to-markdown.mjs`](js/url-to-markdown.mjs) into your project. The types are in [`js/url-to-markdown.d.ts`](js/url-to-markdown.d.ts).

```js
import { extract } from "./url-to-markdown.mjs";

const article = await extract("https://go.dev/blog/go1.22", {
  // apiKey defaults to process.env.ZYLA_API_KEY
  format: "markdown",
  maxChars: 8000,
});
console.log(article.title, article.word_count);
console.log(article.markdown);
```

### Python (3.8+, standard library only)

Copy [`python/url_to_markdown.py`](python/url_to_markdown.py) into your project.

```python
from url_to_markdown import extract  # reads ZYLA_API_KEY from the environment

a = extract("https://go.dev/blog/go1.22", format="markdown", max_chars=8000)
print(a["title"], a["word_count"])
print(a["markdown"])
```

Or use it from the command line: `ZYLA_API_KEY=... python python/url_to_markdown.py https://go.dev/blog/go1.22 2000`

Both clients raise an `ExtractError` with `.status`, `.code` (for example `upstream_blocked` or `empty_content`) and `.body` when the call fails. See [Errors](#errors).

## Use cases and examples

| Use case | Example |
|---|---|
| **LLM / RAG pipelines**: URL to Markdown to heading-aware chunks to JSONL for your embedder or vector DB | [`examples/rag_ingest.py`](examples/rag_ingest.py) |
| **AI agents**: a `read_web_page` tool (OpenAI / Anthropic / AI SDK JSON schema plus a handler) | [`examples/agent-tool.mjs`](examples/agent-tool.mjs) |
| **Read-later apps**: save any article as Markdown with YAML front matter (Obsidian, Logseq, e-readers) | [`examples/read-later.mjs`](examples/read-later.mjs) |
| **Clean-text scraping**: `format=text` gives boilerplate-free text for NLP, summarization, translation, TTS and search indexing | `extract(url, { format: "text" })` |

```bash
cp .env.example .env   # then put your key in .env (it is git-ignored)
export ZYLA_API_KEY=...   # or load .env your usual way
python examples/rag_ingest.py https://jvns.ca/blog/2024/02/16/popular-git-config-options/ > chunks.jsonl
node examples/agent-tool.mjs https://go.dev/blog/go1.22
node examples/read-later.mjs https://overreacted.io/a-complete-guide-to-useeffect/
```

## Parameters

| Param | Default | Description |
|---|---|---|
| `url` | (required) | Public http(s) URL; the scheme is optional |
| `format` | `both` | `markdown`, `text` or `both` |
| `links` | `true` | Keep `[text](url)` links in the Markdown |
| `images` | `false` | Include `![alt](src)` images in the Markdown |
| `max_chars` | `0` (no limit) | Truncate `markdown` and `text` to N characters; `truncated` is then `true` |

### Errors

Every error is a non-2xx JSON response. Zyla only bills successful (200) calls, so **you aren't charged for blocked or empty pages**.

| HTTP | `error` | Meaning |
|---|---|---|
| `400` | `invalid or missing 'url'`, `url not allowed`, bad `format` | Bad input, or a private or localhost address (including one reached by redirect) |
| `415` | `unsupported_content_type` | The target isn't HTML or text (for example a PDF or an image). A missing content-type is sniffed. |
| `502` | `upstream_blocked` | The site refused or challenged the request: HTTP 401/403/429/451, or a bot-challenge page such as Cloudflare's "Just a moment..." |
| `502` | `empty_content` | The page produced about 0 words of text (rendered client-side, or empty) |
| `502` | `fetch_failed` | The site was unreachable or timed out (10 s) |
| `401` | | Missing or invalid Zyla key (returned by the gateway) |

The 502 bodies look like this:

```json
{
  "error": "upstream_blocked",
  "upstream_status": 403,
  "url": "https://www.g2.com/products/slack/reviews",
  "message": "The target site refused or challenged the request (HTTP 403); no content was extracted. Paywalled, login-only and bot-protected pages cannot be read."
}
```

## Latency

These are 20 real calls on 2026-10-22 to the production extraction backend, each on a different article (Paul Graham essays, Wikipedia, MDN, GitHub READMEs, GNU, Martin Fowler, Simon Willison, Go blog, Node.js docs, Daring Fireball, overreacted and others), measured end to end from a client in the US West (fetch + extraction + response):

| p50 | p95 | max |
|---|---|---|
| **~230 ms** | **~650 ms** | 752 ms |

A repeat pass over the same URLs measured p50 139 ms and p95 497 ms, and a third pass after the 2026-10-22 error-handling update measured p50 211 ms and p95 705 ms. Calls through the Zyla gateway add the gateway's own overhead; Zyla's listing page shows the live average.

## Limits (honest ones)

- **No JavaScript rendering.** Pages that build their content only in the browser (some SPAs) return little text.
- **Paywalls and bot walls.** You get what the site serves publicly. Blocked or challenged requests return `502 upstream_blocked`, and nothing is billed. Some sites (for example `www.python.org`) refuse all cloud/edge traffic. Their canonical mirrors (for example `peps.python.org`) often work.
- **Homepages and index pages** aren't articles, so expect only a few words.
- Responses are capped at about 2 MB of HTML read per page.

## Pricing

Zyla handles keys, billing and quotas: a **7-day free trial**, then monthly plans. See the [Zyla listing](https://zylalabs.com/api-marketplace/other/article+extractor+and+url+to+markdown+api/14315) for current plans. Zyla's `x-zyla-api-calls-monthly-remaining` response header shows how many calls you have left.

## Development

```bash
npm test         # offline: clients against a local mock of the Zyla gateway (no key needed)
npm run test:live  # same tests, but the mock forwards to the live extraction backend
```

The gateway URL lives in a single constant, `ZYLA_ENDPOINT`, in each client. You can override it with the `ZYLA_ENDPOINT` env var.

## License

[MIT](LICENSE)

---
*Keywords: url to markdown api, article extractor api, html to markdown, web page to markdown, clean text for LLM, RAG ingestion, readability api, boilerplate removal, main content extraction, AI agent web reader.*
