// Tiny zero-dependency client for the Article Extractor & URL to Markdown API (Zyla API Hub #14315).
// Works in Node 18+, Deno, Bun, Cloudflare Workers and browsers (anything with global fetch).
// Get a key: https://zylalabs.com/api-marketplace/other/article+extractor+and+url+to+markdown+api/14315

/** Zyla gateway endpoint for "Extract Article" (API 14315, endpoint 35883). Change here only. */
export const ZYLA_ENDPOINT =
  "https://zylalabs.com/api/14315/article+extractor+and+url+to+markdown+api/35883/extract+article";

export class ExtractError extends Error {
  constructor(message, status, body, code) {
    super(message);
    this.name = "ExtractError";
    this.status = status;
    this.body = body;
    /** API error code, e.g. "upstream_blocked", "empty_content", "unsupported_content_type" */
    this.code = code;
  }
}

const env = (k) => (typeof process !== "undefined" && process.env ? process.env[k] : undefined);

/**
 * Extract the main content of a web page as clean Markdown and/or plain text.
 * @param {string} url  Public http(s) URL (scheme optional).
 * @param {{apiKey?:string, format?:"both"|"markdown"|"text", links?:boolean, images?:boolean,
 *          maxChars?:number, endpoint?:string, timeoutMs?:number}} [opts]
 * @returns {Promise<import("./url-to-markdown").Article>}
 */
export async function extract(url, opts = {}) {
  const apiKey = opts.apiKey ?? env("ZYLA_API_KEY");
  if (!apiKey) throw new ExtractError("Missing API key: pass {apiKey} or set ZYLA_API_KEY", 0);
  if (!url) throw new ExtractError("Missing url", 0);
  const q = new URLSearchParams({ url });
  if (opts.format) q.set("format", opts.format);
  if (opts.links !== undefined) q.set("links", String(!!opts.links));
  if (opts.images !== undefined) q.set("images", String(!!opts.images));
  if (opts.maxChars) q.set("max_chars", String(opts.maxChars));
  const endpoint = opts.endpoint ?? env("ZYLA_ENDPOINT") ?? ZYLA_ENDPOINT;
  const res = await fetch(`${endpoint}?${q}`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    signal: AbortSignal.timeout(opts.timeoutMs ?? 30000),
  });
  const raw = await res.text();
  let body;
  try { body = JSON.parse(raw); } catch { body = raw; }
  if (!res.ok) {
    const code = body && typeof body === "object" ? body.error : undefined;
    const msg = [code, body && body.message].filter(Boolean).join(": ") || `HTTP ${res.status}`;
    throw new ExtractError(`extract failed: ${msg}`, res.status, body, code);
  }
  return body;
}

export default extract;
