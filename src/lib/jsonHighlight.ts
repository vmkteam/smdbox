/**
 * Tiny, dependency-free JSON syntax highlighter.
 *
 * Returns an HTML string of token `<span>`s. XSS-safe: the input is
 * HTML-escaped before any markup is added, so values can be rendered via
 * `dangerouslySetInnerHTML` without risk.
 */
const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };

function escapeHtml(text: string): string {
  return text.replace(/[&<>]/g, (ch) => ESCAPES[ch] ?? ch);
}

// Strings (optionally a key when followed by a colon), booleans, null, numbers.
const TOKEN =
  /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|\b(?:true|false)\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

function tokenClass(match: string): string {
  if (match.startsWith('"')) {
    return match.trimEnd().endsWith(':') ? 'sb-tok-key' : 'sb-tok-str';
  }
  if (match === 'true' || match === 'false') return 'sb-tok-bool';
  if (match === 'null') return 'sb-tok-null';
  return 'sb-tok-num';
}

export function highlightJson(json: string): string {
  return escapeHtml(json).replace(
    TOKEN,
    (match) => `<span class="${tokenClass(match)}">${match}</span>`,
  );
}
