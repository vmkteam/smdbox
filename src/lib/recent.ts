/** Derives the list of recently used methods from call history. */
import type { HistoryItem } from '../store/store';

/**
 * Returns up to `limit` distinct method names, most-recent first,
 * keeping only those present in `available`.
 */
export function recentMethodNames(
  history: HistoryItem[],
  available: Set<string>,
  limit: number,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (let i = history.length - 1; i >= 0 && out.length < limit; i -= 1) {
    const name = history[i]?.method;
    if (!name || seen.has(name) || !available.has(name)) continue;
    seen.add(name);
    out.push(name);
  }
  return out;
}
