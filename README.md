# SMD Box

SMD Box is a web UI for human-readable JSON-RPC schemas (SMD or OpenRPC): it
loads a schema from a remote URL, lets you browse methods, call them live, and
inspect results. The schema format is auto-detected.
It ships as a single self-contained bundle (`dist/app.js` + `dist/app.css`) and
is typically embedded via [vmkteam/zenrpc](https://github.com/vmkteam/zenrpc).

> **v2** — rewritten on Vite + React 19 + TypeScript, with a "Steel" design
> system (Bootstrap 5 neutrals + sky/emerald/rose/amber accents, light/dark).

## Features

- **Schemas** — load SMD or OpenRPC by URL; the format is auto-detected. Add custom request headers, pick a host-provided preset, or import a config to skip setup.
- **Browse** — searchable method sidebar (sticky search) with favorites, recent calls, collapsible namespaces (persisted) and keyboard navigation.
- **Docs** — one flat parameter table with nested types expanded inline (collapsible), a type badge and required mark per field, enum values, output type and error codes.
- **Try it out** — an auto-generated form with type-based placeholders, or a raw JSON editor with syntax highlighting; paste a `curl` command to build the request; submit with Cmd/Ctrl+Enter.
- **Calls** — live JSON-RPC requests with cancel and timeout; response timing and size.
- **Response** — interactive collapsible tree and highlighted raw view, full-text filter, line wrap, fullscreen, copy, download, in-place edit (for mocks), and clickable links for id fields (configurable). Save responses for later.
- **Errors** — full JSON-RPC error (code, message, data) shown in the same result panel.
- **Reuse** — export a request as curl, share a deep link with parameters, save / reorder / rename requests, and re-run them from history.
- **Environments** — save named configuration snapshots (endpoint / schema / headers) you can rename and switch between; the navbar recolors per environment (DEV/PROD presets or a custom color) so they are easy to tell apart.
- **Config** — import/export the whole setup (connection, favorites, saved requests & responses, environments, id-link rules, theme & colors) as JSON.
- **Comfort** — light/dark theme (Steel palette), responsive layout (the toolbar collapses to icons on narrow screens), state persisted to IndexedDB, reduced-motion friendly, optional knowledge-base link.

## Integration

The integration contract is unchanged — load the bundle and initialize:

```html
<link href="https://vmkteam.github.io/smdbox/app.css" rel="stylesheet" />
<div id="smdbox-root"></div>
<script src="https://vmkteam.github.io/smdbox/app.js"></script>
<script>
  window.smdbox({
    selector: '#smdbox-root',     // mount node (default: #smdbox-root)
    smdUrl: '/rpc/?smd',          // SMD or OpenRPC schema url
    endpoint: '/rpc/',            // RPC endpoint (derived from the schema if omitted)
    headers: {},                  // headers added to every request
    docsUrl: '',                  // optional knowledge-base link on the setup screen
    idLinks: {                    // turn id values in responses into links ({id} placeholder)
      productId: 'https://example.com/product/{id}',
    },
    presets: [                    // one-click connections offered on the setup screen
      { name: 'Prod', smdUrl: 'https://api.example.com/rpc/?smd' },
    ],
  });
</script>
```

For backward compatibility, a bare `<div id="json-rpc-root"></div>` triggers
auto-initialization without any explicit call — the bundle is self-contained,
so no extra CSS framework is needed on the host page.

## Distribution

- **GitHub Pages** (`https://vmkteam.github.io/smdbox/`) — the v2 bundle, built
  and published by CI (`.github/workflows/pages.yml`). Use this for new embeds.
- **jsDelivr `@latest`** (`cdn.jsdelivr.net/gh/vmkteam/smdbox@latest/dist/…`) —
  serves the committed `dist/`, kept as the **legacy** bundle so existing embeds
  keep working. `dist/` is therefore frozen and not rebuilt on every change.

## Development

Requires Node ≥ 20.

```bash
npm install
npm run dev          # Vite dev server (see index.html)
npm run build        # type-check + build the single bundle into build/
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint
npm run test         # Vitest unit tests
npm run test:e2e     # Playwright smoke test (records a video)
```

> `npm run build` writes to `build/` (gitignored); the committed `dist/` is the
> frozen legacy bundle and is never touched by the build. CI publishes Pages
> from `build/`.

## Layout

- `src/lib/` — framework-agnostic core (SMD→JSON Schema, OpenRPC→SMD, JSON-RPC transport, JSON highlight/filter, persistence)
- `src/types/smd.ts` — the SMD contract (mirrors zenrpc `smd/model.go`)
- `src/store/` — Zustand store (persisted to IndexedDB)
- `src/data/` — TanStack Query: SMD loading and RPC calls
- `src/components/`, `src/app/` — React UI
- `src/design/` — design system: tokens (Steel palette) + presentational components
- `pages/` — the minimal embed page published to GitHub Pages
- `e2e/` — Playwright demo pages and smoke tests
