/** Renders a JSON-RPC call as a copy-pasteable curl command. */
import { jsonHeaders } from './rpc';

function shellQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

/** Builds a `curl` command for the given request. */
export function toCurl(endpoint: string, headers: Record<string, string>, body: unknown): string {
  const lines = [`curl -X POST ${shellQuote(endpoint)}`];
  for (const [key, value] of Object.entries(jsonHeaders(headers))) {
    lines.push(`  -H ${shellQuote(`${key}: ${value}`)}`);
  }
  lines.push(`  -d ${shellQuote(JSON.stringify(body))}`);
  return lines.join(' \\\n');
}

/** Result of parsing a curl command. */
export interface ParsedCurl {
  url?: string;
  headers: Record<string, string>;
  /** Parsed JSON request body (undefined when absent or not JSON). */
  body?: unknown;
}

/** Extracts a JSON-RPC `params` object from a parsed request body, or null. */
export function rpcParams(body: unknown): Record<string, unknown> | null {
  const params = (body as { params?: unknown } | null | undefined)?.params;
  if (params && typeof params === 'object' && !Array.isArray(params)) {
    return params as Record<string, unknown>;
  }
  return null;
}

/** Splits a shell command into tokens, honoring quotes and line continuations. */
function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let cur = '';
  let started = false;
  let i = 0;
  while (i < input.length) {
    const c = input[i];
    if (c === undefined) break;
    // Line continuation: backslash followed by (CR)LF.
    if (c === '\\' && (input[i + 1] === '\n' || input[i + 1] === '\r')) {
      i += input[i + 1] === '\r' && input[i + 2] === '\n' ? 3 : 2;
      continue;
    }
    // ANSI-C / locale quoting: drop the leading $ before a quote ($'…', $"…").
    if (c === '$' && (input[i + 1] === "'" || input[i + 1] === '"')) {
      i += 1;
      continue;
    }
    if (c === "'") {
      started = true;
      i += 1;
      while (i < input.length && input[i] !== "'") cur += input[i++];
      i += 1; // closing quote
      continue;
    }
    if (c === '"') {
      started = true;
      i += 1;
      while (i < input.length && input[i] !== '"') {
        if (input[i] === '\\' && i + 1 < input.length) {
          cur += input[i + 1];
          i += 2;
        } else {
          cur += input[i++];
        }
      }
      i += 1; // closing quote
      continue;
    }
    if (/\s/.test(c)) {
      if (started) {
        tokens.push(cur);
        cur = '';
        started = false;
      }
      i += 1;
      continue;
    }
    started = true;
    cur += c;
    i += 1;
  }
  if (started) tokens.push(cur);
  return tokens;
}

// Flags that consume the next token but that we don't otherwise use.
const SKIP_VALUE_FLAGS = new Set([
  '-u', '--user', '-A', '--user-agent', '-e', '--referer', '-b', '--cookie',
  '-o', '--output', '-T', '--upload-file', '--connect-timeout', '--max-time', '-m',
]);
const DATA_FLAGS = new Set(['-d', '--data', '--data-raw', '--data-binary', '--data-ascii', '--data-urlencode']);

/**
 * Parses a `curl` command into its URL, headers and JSON body. Returns null
 * when the text is not a curl command or carries nothing usable.
 */
export function fromCurl(text: string): ParsedCurl | null {
  if (!/^\s*curl\b/.test(text)) return null;
  const tokens = tokenize(text.trim());
  const headers: Record<string, string> = {};
  let url: string | undefined;
  let rawBody: string | undefined;

  for (let i = 1; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === undefined) continue;
    if (t === '-X' || t === '--request') {
      i += 1; // method is implied by the JSON-RPC body
      continue;
    }
    if (t === '-H' || t === '--header') {
      const h = tokens[++i] ?? '';
      const idx = h.indexOf(':');
      if (idx > 0) headers[h.slice(0, idx).trim()] = h.slice(idx + 1).trim();
      continue;
    }
    if (DATA_FLAGS.has(t)) {
      rawBody = tokens[++i];
      continue;
    }
    if (t === '--url') {
      url = tokens[++i];
      continue;
    }
    if (SKIP_VALUE_FLAGS.has(t)) {
      i += 1;
      continue;
    }
    if (t.startsWith('-')) continue; // valueless or unknown flag
    if (!url) url = t; // first bare token is the URL
  }

  let body: unknown;
  if (rawBody !== undefined) {
    try {
      body = JSON.parse(rawBody);
    } catch {
      body = undefined;
    }
  }
  if (url === undefined && body === undefined) return null;
  return { url, headers, body };
}
