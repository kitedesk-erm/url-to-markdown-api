// npm test   (no key needed; uses the local mock gateway)
// npm run test:live   -> end-to-end through the mock gateway to the live worker
import test from "node:test";
import assert from "node:assert/strict";
import { extract, ExtractError, ZYLA_ENDPOINT } from "../js/url-to-markdown.mjs";
import { startMockGateway } from "./mock-gateway.mjs";

const FAKE_KEY = "test-key-not-real";

test("endpoint constant points at Zyla #14315 Extract Article", () => {
  assert.equal(ZYLA_ENDPOINT, "https://zylalabs.com/api/14315/article+extractor+and+url+to+markdown+api/35883/extract+article");
});

test("JS client: sends Bearer key + params, parses JSON", async () => {
  const g = await startMockGateway();
  try {
    const url = process.env.UPSTREAM ? "https://paulgraham.com/hwh.html" : "https://example.com/post";
    const a = await extract(url, { apiKey: FAKE_KEY, endpoint: g.url, format: "markdown", maxChars: 300, links: false });
    assert.equal(g.seen[0].auth, `Bearer ${FAKE_KEY}`);
    assert.deepEqual(g.seen[0].query, { url, format: "markdown", links: "false", max_chars: "300" });
    assert.ok(a.title);
    assert.equal(typeof a.markdown, "string");
    assert.equal(a.text, undefined);
    if (process.env.UPSTREAM) { assert.equal(a.truncated, true); assert.ok(a.markdown.length <= 300); }
  } finally { g.close(); }
});

test("JS client: missing key throws before any request", async () => {
  const saved = process.env.ZYLA_API_KEY; delete process.env.ZYLA_API_KEY;
  await assert.rejects(extract("https://example.com"), ExtractError);
  if (saved !== undefined) process.env.ZYLA_API_KEY = saved;
});

test("JS client: HTTP errors become ExtractError with status", async () => {
  const g = await startMockGateway();
  try {
    await assert.rejects(extract("", { apiKey: FAKE_KEY, endpoint: g.url }), /Missing url/);
    const r = await fetch(g.url + "?url=x"); // no auth header
    assert.equal(r.status, 401);
  } finally { g.close(); }
});

test("JS client: 502 upstream_blocked surfaces code + message (not billed)", async () => {
  const g = await startMockGateway({ upstream: "" });
  try {
    await assert.rejects(extract("https://blocked.example/a", { apiKey: FAKE_KEY, endpoint: g.url }),
      (e) => e instanceof ExtractError && e.status === 502 && e.code === "upstream_blocked" && /refused or challenged/.test(e.message));
  } finally { g.close(); }
});

test("Python client: same contract via urllib", async () => {
  const g = await startMockGateway({ upstream: "" });
  try {
    const code = `
import sys, json; sys.path.insert(0, "python")
from url_to_markdown import extract, ExtractError, ZYLA_ENDPOINT
assert ZYLA_ENDPOINT.endswith("/14315/article+extractor+and+url+to+markdown+api/35883/extract+article")
a = extract("https://example.com/post", api_key="${FAKE_KEY}", endpoint="${g.url}", format="text", max_chars=200)
print(json.dumps({"title": a["title"], "has_text": "text" in a, "has_md": "markdown" in a}))
try:
    extract("https://blocked.example/a", api_key="${FAKE_KEY}", endpoint="${g.url}")
    raise SystemExit("expected ExtractError")
except ExtractError as e:
    assert e.status == 502 and e.code == "upstream_blocked" and "refused or challenged" in str(e), (e.status, e.code, str(e))
`;
    const out = await new Promise((res, rej) => {
      import("node:child_process").then(({ execFile }) =>
        execFile("python3", ["-c", code], { env: { PATH: process.env.PATH } }, (err, so, se) => err ? rej(new Error(se || err.message)) : res(so)));
    });
    const [line] = out.trim().split("\n");
    const j = JSON.parse(line);
    assert.ok(j.title); assert.equal(j.has_text, true); assert.equal(j.has_md, false);
    assert.equal(g.seen[0].auth, `Bearer ${FAKE_KEY}`);
    assert.equal(g.seen[0].query.max_chars, "200");
  } finally { g.close(); }
});
