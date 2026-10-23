export declare const ZYLA_ENDPOINT: string;

export interface ExtractOptions {
  /** Zyla API key. Defaults to process.env.ZYLA_API_KEY */
  apiKey?: string;
  /** "both" (default), "markdown" or "text" */
  format?: "both" | "markdown" | "text";
  /** Keep [text](url) links in Markdown (default true) */
  links?: boolean;
  /** Include ![alt](src) images in Markdown (default false) */
  images?: boolean;
  /** Truncate markdown/text to N characters */
  maxChars?: number;
  /** Override the endpoint (testing). Defaults to ZYLA_ENDPOINT */
  endpoint?: string;
  timeoutMs?: number;
}

export interface Article {
  url: string;
  title: string | null;
  byline: string | null;
  published_time: string | null;
  site_name: string | null;
  lang: string | null;
  description: string | null;
  image: string | null;
  excerpt: string | null;
  word_count: number;
  reading_time_min: number;
  truncated: boolean;
  markdown?: string;
  text?: string;
  /** HTTP status the target site returned */
  status: number;
  content_type: string;
}

export declare class ExtractError extends Error {
  status: number;
  body: unknown;
  /** "upstream_blocked" | "empty_content" | "fetch_failed" | "unsupported_content_type" | ... */
  code?: string;
}

export declare function extract(url: string, opts?: ExtractOptions): Promise<Article>;
export default extract;
