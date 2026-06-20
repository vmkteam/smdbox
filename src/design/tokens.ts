/**
 * Design tokens for SMD Box.
 *
 * Neutral surfaces/text/borders come from the Bootstrap 5 theme (the `--bs-*`
 * custom properties, which adapt to light/dark). These tokens capture the
 * project-specific decisions layered on top. Mirrored as CSS variables in
 * `tokens.css` (`--sb-*`).
 */
export const tokens = {
  color: {
    /** Steel palette — sky/emerald/rose accents over slate neutrals. */
    primary: '#0284c7',
    primaryHover: '#0369a1',
    success: '#059669',
    successHover: '#047857',
    danger: '#e11d48',
    dangerHover: '#be123c',
    /** Favorite star accent — the one warm pop. */
    star: '#f59e0b',
  },
  /** Ocean navbar, constant across light/dark. */
  navbar: {
    bg: '#075985',
    fg: '#e0f2fe',
    line: 'rgba(224, 242, 254, 0.32)',
  },
  space: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
  },
  radius: {
    sm: '4px',
    md: '6px',
    pill: '999px',
  },
  fontSize: {
    xs: '11px',
    sm: '12px',
    code: '12.5px',
    body: '13px',
    md: '16px',
    lg: '20px',
  },
  fontFamily: {
    sans: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  },
} as const;

export type Tokens = typeof tokens;
