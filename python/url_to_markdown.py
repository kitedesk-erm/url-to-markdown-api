"""Tiny zero-dependency Python client for the Article Extractor & URL to Markdown API
(Zyla API Hub #14315). Standard library only (urllib). Python 3.8+.

Get a key + 7-day trial:
https://zylalabs.com/api-marketplace/other/article+extractor+and+url+to+markdown+api/14315
"""
import json
import os
import urllib.error
import urllib.parse
import urllib.request

# Zyla gateway endpoint for "Extract Article" (API 14315, endpoint 35883). Change here only.
ZYLA_ENDPOINT = (
    "https://zylalabs.com/api/14315/article+extractor+and+url+to+markdown+api/35883/extract+article"
)


class ExtractError(Exception):
    def __init__(self, message, status=0, body=None, code=None):
        super().__init__(message)
        self.status = status
        self.body = body
        self.code = code  # e.g. "upstream_blocked", "empty_content", "unsupported_content_type"


def extract(url, api_key=None, format=None, links=None, images=None, max_chars=None,
            endpoint=None, timeout=30):
    """Return the page's main content as a dict with markdown/text + metadata."""
    api_key = api_key or os.environ.get("ZYLA_API_KEY")
    if not api_key:
        raise ExtractError("Missing API key: pass api_key= or set ZYLA_API_KEY")
    if not url:
        raise ExtractError("Missing url")
    q = {"url": url}
    if format:
        q["format"] = format
    if links is not None:
        q["links"] = "true" if links else "false"
    if images is not None:
        q["images"] = "true" if images else "false"
    if max_chars:
        q["max_chars"] = str(int(max_chars))
    endpoint = endpoint or os.environ.get("ZYLA_ENDPOINT") or ZYLA_ENDPOINT
    req = urllib.request.Request(
        endpoint + "?" + urllib.parse.urlencode(q),
        headers={"Authorization": "Bearer " + api_key, "Accept": "application/json",
                 "User-Agent": "url-to-markdown-api-python/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", "replace")
        try:
            body = json.loads(raw)
        except ValueError:
            body = raw
        code = body.get("error") if isinstance(body, dict) else None
        msg = ": ".join(x for x in (code, body.get("message") if isinstance(body, dict) else None) if x)
        raise ExtractError("extract failed: %s" % (msg or "HTTP %d" % e.code), e.code, body, code)


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        sys.exit("usage: ZYLA_API_KEY=... python url_to_markdown.py URL [max_chars]")
    out = extract(sys.argv[1], format="markdown",
                  max_chars=int(sys.argv[2]) if len(sys.argv) > 2 else None)
    print("# " + (out.get("title") or out["url"]) + "\n")
    print(out.get("markdown", ""))
