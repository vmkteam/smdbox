import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';

import { App } from './app/App';
import { queryClient } from './data/queries';
import { readState } from './lib/persist';
import { startPersistence, useStore, type PersistedState } from './store/store';

import 'bootstrap/dist/css/bootstrap.min.css';
import './design/tokens.css';
import './styles/main.css';

/**
 * Public initialization options. This is the stable integration contract:
 * consumers (e.g. vmkteam/zenrpc) call `window.smdbox(options)`.
 */
export interface SmdboxOptions {
  /** RPC endpoint URL the methods are called against. */
  endpoint?: string;
  /** URL of the SMD schema (usually `${endpoint}?smd`). */
  smdUrl?: string;
  /** Headers added to every request smdbox makes. */
  headers?: Record<string, string>;
  /** CSS selector of the element smdbox mounts into. */
  selector?: string;
  /** Knowledge-base link shown on the setup screen (defaults to the smdbox repo). */
  docsUrl?: string;
}

const DEFAULT_SELECTOR = '#smdbox-root';

/** Mounts smdbox into the element matching `options.selector`. */
async function init(options: SmdboxOptions = {}): Promise<void> {
  const selector = options.selector ?? DEFAULT_SELECTOR;
  const container = document.querySelector(selector);
  if (!container) {
    console.error(`smdbox: mount target "${selector}" not found`);
    return;
  }

  // Restore persisted project/history, then apply preconfigured options (they win).
  const persisted = await readState<PersistedState>().catch(() => null);
  if (persisted) useStore.getState().hydrate(persisted);

  const pre: Partial<{
    smdUrl: string;
    endpoint: string;
    headers: Record<string, string>;
    docsUrl: string;
  }> = {};
  if (options.smdUrl) pre.smdUrl = options.smdUrl;
  if (options.endpoint) pre.endpoint = options.endpoint;
  if (options.headers && Object.keys(options.headers).length) pre.headers = options.headers;
  if (options.docsUrl) pre.docsUrl = options.docsUrl;
  if (Object.keys(pre).length) useStore.getState().preconfigure(pre);

  startPersistence();

  createRoot(container).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>,
  );
}

declare global {
  interface Window {
    smdbox?: (options?: SmdboxOptions) => void;
  }
}

// Expose the public contract.
window.smdbox = init;

// Backward compatibility: auto-init when the legacy mount node is present.
const legacyRoot = '#json-rpc-root';
if (document.querySelector(legacyRoot)) {
  void init({ selector: legacyRoot });
}

export default init;
