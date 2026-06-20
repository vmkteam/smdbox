/** SMD/OpenRPC schema fetching and endpoint derivation. */
import { normalizeSchema } from './openrpc';
import type { SmdSchema } from '../types/smd';

/** Fetches a schema document (SMD or OpenRPC) and normalizes it to SmdSchema. */
export async function fetchSmd(url: string, headers?: Record<string, string>): Promise<SmdSchema> {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Schema request failed: ${res.status} ${res.statusText}`);
  }
  return normalizeSchema(await res.json());
}

/**
 * Derives the RPC endpoint from the schema url and target.
 *  - an absolute target (OpenRPC `servers[].url`) is used as-is;
 *  - a trailing `?smd` is stripped (SMD convention);
 *  - otherwise `origin + target` is used.
 */
export function deriveEndpoint(smdUrl: string, target?: string): string {
  if (target && /^https?:\/\//i.test(target)) return target;
  const stripped = smdUrl.replace(/\?smd/, '');
  if (stripped !== smdUrl) return stripped;
  try {
    const u = new URL(smdUrl);
    return `${u.origin}${target ?? ''}`;
  } catch {
    return target ?? smdUrl;
  }
}

/**
 * When smdbox is opened at the zenrpc doc handler (`<base>/doc/`), the schema
 * lives at `<base>/?smd`. Derive that default schema url from the current
 * location, or return '' if the path doesn't look like a doc page.
 */
export function defaultSmdUrlFromLocation(href: string): string {
  try {
    const url = new URL(href);
    const base = url.pathname.match(/^(.*\/)doc\/?$/);
    return base ? `${url.origin}${base[1]}?smd` : '';
  } catch {
    return '';
  }
}
