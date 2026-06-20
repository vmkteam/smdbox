import { useEffect } from 'react';

import { useStore } from '../store/store';

const PREFIX = '#/method/';

function parseParams(query: string | undefined): Record<string, unknown> | null {
  if (!query) return null;
  const p = new URLSearchParams(query).get('p');
  if (!p) return null;
  try {
    return JSON.parse(decodeURIComponent(p)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Two-way sync between the selected method and the URL hash
 * (`#/method/<name>`), enabling shareable deep links. A `?p=<json>` query
 * in the hash (produced by Share) pre-fills the form once on load.
 */
export function useMethodHash(enabled: boolean, isValid: (name: string) => boolean): void {
  const selected = useStore((s) => s.selected);
  const selectMethod = useStore((s) => s.selectMethod);
  const prefillRequest = useStore((s) => s.prefillRequest);

  // hash -> store (initial load, back/forward, pasted link)
  useEffect(() => {
    if (!enabled) return;
    const apply = () => {
      if (!location.hash.startsWith(PREFIX)) return;
      const [namePart, queryPart] = location.hash.slice(PREFIX.length).split('?');
      const name = decodeURIComponent(namePart ?? '');
      if (!name || !isValid(name)) return;
      const params = parseParams(queryPart);
      if (params) prefillRequest(name, params);
      else selectMethod(name);
    };
    apply();
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
  }, [enabled, isValid, selectMethod, prefillRequest]);

  // store -> hash
  useEffect(() => {
    if (!enabled || !selected) return;
    const target = `${PREFIX}${encodeURIComponent(selected)}`;
    // Preserve a `?p=` link the user just opened/shared.
    if (location.hash === target || location.hash.startsWith(`${target}?`)) return;
    location.hash = target;
  }, [enabled, selected]);
}
