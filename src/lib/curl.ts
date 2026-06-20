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
