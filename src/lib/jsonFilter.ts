/** Prunes a JSON value to the branches matching a query (key or value). */

function prune(data: unknown, q: string): unknown {
  if (Array.isArray(data)) {
    const kept = data.map((item) => prune(item, q)).filter((item) => item !== undefined);
    return kept.length ? kept : undefined;
  }
  if (data && typeof data === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (key.toLowerCase().includes(q)) {
        out[key] = value; // key matches -> keep the whole subtree for context
        continue;
      }
      const result = prune(value, q);
      if (result !== undefined) out[key] = result;
    }
    return Object.keys(out).length ? out : undefined;
  }
  return String(data).toLowerCase().includes(q) ? data : undefined;
}

/**
 * Returns the subset of `data` whose keys or primitive values match `query`
 * (case-insensitive). Returns the input unchanged for an empty query, or
 * `undefined` when nothing matches.
 */
export function filterJson(data: unknown, query: string): unknown {
  const q = query.trim().toLowerCase();
  if (!q) return data;
  return prune(data, q);
}
