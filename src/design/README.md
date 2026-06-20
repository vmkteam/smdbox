# SMD Box — design system

The discoverable design layer for SMD Box: **tokens** + **presentational
components**. Intended for reuse and for Claude Design `/design-sync`
(it reads the tokens and React components here directly).

## Tokens

- `tokens.ts` — typed `tokens` object (colors, spacing, radius, font sizes, font families).
- `tokens.css` — the same values as CSS custom properties (`--sb-*`), imported once in `main.tsx`.

The palette is **"Steel"**: a sky-blue primary over slate neutrals, with an
ocean (sky-800) navbar. `tokens.css` overrides the **Bootstrap 5** theme
(`--bs-*`) neutrals/accents for both light and dark (`data-bs-theme`), so the
whole UI is recolored from one place. The `--sb-*` tokens add the SMD Box
specifics on top (accent hovers, navbar, star, spacing/radius/type scale).

## Components

Pure, presentational, no store/data access:

- `CodeChip` — monospace inline token for identifiers (`name`) and types (`type`).
- `SectionTitle` — `section` (uppercase label) / `subsection` (bold sub-heading).
- `RequiredMark` — required-parameter indicator (icon + a11y label).

Import from the barrel:

```ts
import { tokens, CodeChip, SectionTitle, RequiredMark } from '@/design';
```

## Notes for /design-sync

Run from the repo root:

```bash
claude
/design-sync
```

It will read `src/design/tokens.ts` and the components above. Application
components under `src/components/` are intentionally **not** part of the design
system — they are wired to the store/data layer.
