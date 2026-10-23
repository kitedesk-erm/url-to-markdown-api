"""RAG ingest: URLs -> clean Markdown -> heading-aware chunks -> JSONL ready for embeddings.

usage: ZYLA_API_KEY=... python examples/rag_ingest.py URL [URL ...] > chunks.jsonl
Feed chunks.jsonl to your embedder / vector DB (pgvector, Chroma, Qdrant, Pinecone, ...).
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "python"))
from url_to_markdown import extract, ExtractError  # noqa: E402

MAX_CHARS_PER_CHUNK = 1500


def chunk_markdown(md, limit=MAX_CHARS_PER_CHUNK):
    """Split on headings first, then on paragraphs, keeping each chunk under `limit` chars."""
    sections = re.split(r"\n(?=#{1,6} )", md)
    chunks = []
    for sec in sections:
        heading = sec.split("\n", 1)[0] if sec.startswith("#") else ""
        buf = ""
        for para in sec.split("\n\n"):
            if buf and len(buf) + len(para) + 2 > limit:
                chunks.append((heading, buf.strip()))
                buf = (heading + "\n\n" if heading else "")
            buf += para + "\n\n"
        if buf.strip():
            chunks.append((heading, buf.strip()))
    return chunks


def main(urls):
    for url in urls:
        try:
            doc = extract(url, format="markdown", links=False)
        except ExtractError as e:
            print("skip %s: %s" % (url, e), file=sys.stderr)
            continue
        for i, (heading, body) in enumerate(chunk_markdown(doc.get("markdown", ""))):
            print(json.dumps({
                "id": "%s#%d" % (doc["url"], i),
                "source": doc["url"],
                "title": doc.get("title"),
                "byline": doc.get("byline"),
                "published_time": doc.get("published_time"),
                "section": heading.lstrip("# ") or None,
                "text": body,
            }, ensure_ascii=False))
        print("ok %s: %d words" % (url, doc.get("word_count", 0)), file=sys.stderr)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1:])
