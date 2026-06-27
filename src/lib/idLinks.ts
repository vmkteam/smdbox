/** Turns id values in responses into links via field-name -> URL-template rules. */

function build(template: string, raw: string): string {
  const encoded = encodeURIComponent(raw);
  if (template.includes('{id}')) return template.replace(/\{id\}/g, encoded);
  if (template.includes('{value}')) return template.replace(/\{value\}/g, encoded);
  return template + encoded;
}

/** Lowercases rule keys once so `idLinkUrl` can match case-insensitively cheaply. */
export function lowerRuleKeys(rules: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, template] of Object.entries(rules)) out[key.toLowerCase()] = template;
  return out;
}

/**
 * Builds the URL for a leaf value given its key path (leaf-first, as react-json-tree
 * provides it), or null when no rule matches or the value is not a usable scalar.
 *
 * `lowerRules` must already be keyed by lowercased field name (see `lowerRuleKeys`);
 * it is matched case-insensitively. A rule matches either the leaf key directly
 * (e.g. `movieId`), or — when the leaf is a bare `id` — the parent entity key plus
 * `Id` (e.g. `movie.id` or `movies[].id` → `movieId`). The template may use
 * `{id}`/`{value}`; with no placeholder the value is appended.
 */
export function idLinkUrl(
  keyPath: ReadonlyArray<string | number>,
  value: unknown,
  lowerRules: Record<string, string>,
): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const raw = String(value);
  if (raw === '') return null;

  const leaf = String(keyPath[0] ?? '');
  const candidates = [leaf];
  // A bare `id` inside a `movie`/`show`/... object is that entity's primary key.
  if (leaf.toLowerCase() === 'id') {
    const parent = keyPath.slice(1).find((k) => typeof k === 'string');
    if (typeof parent === 'string' && parent) {
      candidates.push(`${parent}Id`);
      const singular = parent.replace(/s$/i, '');
      if (singular && singular !== parent) candidates.push(`${singular}Id`);
    }
  }

  for (const field of candidates) {
    const template = lowerRules[field.toLowerCase()];
    if (template) return build(template, raw);
  }
  return null;
}
