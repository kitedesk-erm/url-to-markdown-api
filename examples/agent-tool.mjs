// Agent tool: give any LLM agent a "read this web page" tool.
// The JSON schema below works as-is for OpenAI tools / function calling, Anthropic tool use
// (use `input_schema` instead of `parameters`), Vercel AI SDK, LangChain.js, etc.
//
// usage: ZYLA_API_KEY=... node examples/agent-tool.mjs https://example.com/article
import { extract } from "../js/url-to-markdown.mjs";

export const readWebPageTool = {
  type: "function",
  function: {
    name: "read_web_page",
    description:
      "Fetch a public web page and return its main content as clean Markdown " +
      "(no nav, ads, footers or comments), plus title, author, date and word count.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "Public http(s) URL to read" },
        max_chars: { type: "integer", description: "Cap the output length (token budget)", default: 8000 },
      },
      required: ["url"],
    },
  },
};

/** Call this when the model emits a read_web_page tool call. Returns a string for the tool result. */
export async function handleReadWebPage({ url, max_chars = 8000 }) {
  try {
    const a = await extract(url, { format: "markdown", maxChars: max_chars });
    const head = [`# ${a.title ?? a.url}`, a.byline && `By ${a.byline}`, a.published_time && `Published ${a.published_time}`,
      `Source: ${a.url} · ${a.word_count} words${a.truncated ? " (truncated)" : ""}`].filter(Boolean).join("\n");
    return `${head}\n\n${a.markdown ?? ""}`;
  } catch (e) {
    return `Error reading ${url}: ${e.message}`; // let the model see the error and recover
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.argv[2];
  if (!url) { console.error("usage: node examples/agent-tool.mjs URL"); process.exit(1); }
  console.log(JSON.stringify(readWebPageTool, null, 2));
  console.log("\n--- tool result ---\n" + (await handleReadWebPage({ url, max_chars: 1500 })));
}
