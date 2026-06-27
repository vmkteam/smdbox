import { create } from 'zustand';

import { writeState } from '../lib/persist';
import type { JsonRpcParams } from '../lib/rpc';

// Soft cap to keep IndexedDB bounded; the old hard limit of 10 is gone.
const HISTORY_LIMIT = 500;

export interface ProjectConfig {
  endpoint: string | null;
  smdUrl: string | null;
  headers: Record<string, string>;
  created: boolean;
}

export interface HistoryItem {
  id: string;
  method: string;
  params: JsonRpcParams;
  response?: unknown;
  error?: { code?: number; message: string } | null;
  status: 'ok' | 'error';
  /** Epoch millis of the call. */
  ts: number;
}

export interface SavedRequest {
  id: string;
  name: string;
  method: string;
  params: JsonRpcParams;
  ts: number;
}

/** A named project configuration (endpoint + schema + headers). */
export interface Environment {
  id: string;
  name: string;
  endpoint: string | null;
  smdUrl: string | null;
  headers: Record<string, string>;
}

export type Theme = 'light' | 'dark';

export interface Prefs {
  theme: Theme;
  favorites: string[];
  /** Navbar color override (hex); '' uses the default ocean. */
  navbarColor: string;
}

/** Slice of the store that is persisted to IndexedDB. */
export interface PersistedState {
  project: ProjectConfig;
  selected: string | null;
  history: HistoryItem[];
  prefs: Prefs;
  saved: SavedRequest[];
  environments: Environment[];
  /** Id of the environment currently applied (null when config is manual). */
  activeEnvironmentId: string | null;
  /** Sidebar namespaces the user has collapsed (default: all expanded). */
  collapsedNamespaces: string[];
  /** Field name -> URL template (with {id}); turns ids in responses into links. */
  idLinks: Record<string, string>;
}

export interface AppState extends PersistedState {
  /** Transient params to seed the next form mount (re-run / shared link). */
  prefill: { method: string; params: JsonRpcParams } | null;
  /** Knowledge-base link; empty unless set via window.smdbox({ docsUrl }). Not persisted. */
  docsUrl: string;
  /** Apply preconfigured values from window.smdbox(options); options win. */
  preconfigure(
    partial: Partial<Pick<ProjectConfig, 'endpoint' | 'smdUrl' | 'headers'>> & {
      docsUrl?: string;
      idLinks?: Record<string, string>;
    },
  ): void;
  createProject(cfg: { endpoint: string; smdUrl: string; headers: Record<string, string> }): void;
  updateSettings(cfg: { endpoint: string; headers: Record<string, string> }): void;
  clearProject(): void;
  selectMethod(name: string | null): void;
  addHistory(item: HistoryItem): void;
  toggleTheme(): void;
  setNavbarColor(color: string): void;
  toggleFavorite(name: string): void;
  /** Select a method and seed its form with the given params. */
  prefillRequest(method: string, params: JsonRpcParams): void;
  clearPrefill(): void;
  saveRequest(name: string, method: string, params: JsonRpcParams): void;
  deleteSaved(id: string): void;
  /**
   * Import a config bundle: connection + favorites + saved + environments +
   * id links + appearance (theme/navbar color), all merged into current state.
   */
  importConfig(cfg: {
    endpoint?: string;
    smdUrl?: string;
    headers?: Record<string, string>;
    favorites?: string[];
    saved?: SavedRequest[];
    environments?: Environment[];
    idLinks?: Record<string, string>;
    navbarColor?: string;
    theme?: Theme;
  }): void;
  /** Save the current project config as a named env (upsert by name) and select it. */
  saveEnvironment(name: string): void;
  applyEnvironment(id: string): void;
  renameEnvironment(id: string, name: string): void;
  deleteEnvironment(id: string): void;
  /** Collapse/expand a sidebar namespace (persisted). */
  toggleNamespace(ns: string): void;
  /** Add or update an id->URL link rule. */
  setIdLink(field: string, urlTemplate: string): void;
  removeIdLink(field: string): void;
  hydrate(state: Partial<PersistedState>): void;
}

const initialProject: ProjectConfig = {
  endpoint: null,
  smdUrl: null,
  headers: {},
  created: false,
};

const initialPrefs: Prefs = { theme: 'light', favorites: [], navbarColor: '' };

export const useStore = create<AppState>((set) => ({
  project: initialProject,
  selected: null,
  history: [],
  prefs: initialPrefs,
  saved: [],
  environments: [],
  activeEnvironmentId: null,
  collapsedNamespaces: [],
  idLinks: {},
  prefill: null,
  docsUrl: '',

  preconfigure: ({ docsUrl, idLinks, ...rest }) =>
    set((s) => ({
      project: { ...s.project, ...rest },
      docsUrl: docsUrl ?? s.docsUrl,
      idLinks: idLinks ? { ...s.idLinks, ...idLinks } : s.idLinks,
    })),

  createProject: ({ endpoint, smdUrl, headers }) =>
    set((s) => ({
      project: { ...s.project, endpoint, smdUrl, headers, created: true },
      activeEnvironmentId: null,
    })),

  updateSettings: ({ endpoint, headers }) =>
    set((s) => {
      const project = { ...s.project, endpoint, headers };
      // Keep the active environment selected and in sync: editing settings
      // updates that env in place instead of silently detaching from it.
      const environments = s.activeEnvironmentId
        ? s.environments.map((e) =>
            e.id === s.activeEnvironmentId
              ? { ...e, endpoint, headers, smdUrl: project.smdUrl }
              : e,
          )
        : s.environments;
      return { project, environments };
    }),

  clearProject: () => set({ project: initialProject, selected: null, activeEnvironmentId: null }),

  selectMethod: (name) => set({ selected: name }),

  addHistory: (item) => set((s) => ({ history: [...s.history, item].slice(-HISTORY_LIMIT) })),

  prefillRequest: (method, params) => set({ selected: method, prefill: { method, params } }),

  clearPrefill: () => set({ prefill: null }),

  saveRequest: (name, method, params) =>
    set((s) => ({
      saved: [...s.saved, { id: crypto.randomUUID(), name, method, params, ts: Date.now() }],
    })),

  deleteSaved: (id) => set((s) => ({ saved: s.saved.filter((r) => r.id !== id) })),

  importConfig: (cfg) =>
    set((s) => {
      const mergeById = <T extends { id: string }>(cur: T[], inc?: T[]): T[] => {
        if (!inc?.length) return cur;
        const seen = new Set(cur.map((x) => x.id));
        return [...cur, ...inc.filter((x) => !seen.has(x.id))];
      };
      return {
        project: {
          ...s.project,
          endpoint: cfg.endpoint ?? s.project.endpoint,
          smdUrl: cfg.smdUrl ?? s.project.smdUrl,
          headers: cfg.headers ?? s.project.headers,
          created: true,
        },
        selected: null,
        activeEnvironmentId: null,
        prefs: {
          ...s.prefs,
          favorites: Array.from(new Set([...s.prefs.favorites, ...(cfg.favorites ?? [])])),
          navbarColor: cfg.navbarColor ?? s.prefs.navbarColor,
          theme: cfg.theme ?? s.prefs.theme,
        },
        saved: mergeById(s.saved, cfg.saved),
        environments: mergeById(s.environments, cfg.environments),
        idLinks: cfg.idLinks ? { ...s.idLinks, ...cfg.idLinks } : s.idLinks,
      };
    }),

  saveEnvironment: (name) =>
    set((s) => {
      const trimmed = name.trim();
      const snapshot = {
        endpoint: s.project.endpoint,
        smdUrl: s.project.smdUrl,
        headers: s.project.headers,
      };
      // Saving under an existing name updates that env (no duplicate); select it either way.
      const existing = s.environments.find((e) => e.name === trimmed);
      if (existing) {
        return {
          environments: s.environments.map((e) => (e.id === existing.id ? { ...e, ...snapshot } : e)),
          activeEnvironmentId: existing.id,
        };
      }
      const id = crypto.randomUUID();
      return {
        environments: [...s.environments, { id, name: trimmed, ...snapshot }],
        activeEnvironmentId: id,
      };
    }),

  applyEnvironment: (id) =>
    set((s) => {
      const env = s.environments.find((e) => e.id === id);
      if (!env) return {};
      return {
        project: { endpoint: env.endpoint, smdUrl: env.smdUrl, headers: env.headers, created: true },
        selected: null,
        activeEnvironmentId: id,
      };
    }),

  renameEnvironment: (id, name) =>
    set((s) => ({
      environments: s.environments.map((e) => (e.id === id ? { ...e, name } : e)),
    })),

  deleteEnvironment: (id) =>
    set((s) => ({
      environments: s.environments.filter((e) => e.id !== id),
      activeEnvironmentId: s.activeEnvironmentId === id ? null : s.activeEnvironmentId,
    })),

  toggleNamespace: (ns) =>
    set((s) => ({
      collapsedNamespaces: s.collapsedNamespaces.includes(ns)
        ? s.collapsedNamespaces.filter((n) => n !== ns)
        : [...s.collapsedNamespaces, ns],
    })),

  setIdLink: (field, urlTemplate) =>
    set((s) => ({ idLinks: { ...s.idLinks, [field]: urlTemplate } })),

  removeIdLink: (field) =>
    set((s) => {
      const next = { ...s.idLinks };
      delete next[field];
      return { idLinks: next };
    }),

  toggleTheme: () =>
    set((s) => ({ prefs: { ...s.prefs, theme: s.prefs.theme === 'dark' ? 'light' : 'dark' } })),

  setNavbarColor: (color) => set((s) => ({ prefs: { ...s.prefs, navbarColor: color } })),

  toggleFavorite: (name) =>
    set((s) => ({
      prefs: {
        ...s.prefs,
        favorites: s.prefs.favorites.includes(name)
          ? s.prefs.favorites.filter((f) => f !== name)
          : [...s.prefs.favorites, name],
      },
    })),

  hydrate: (state) =>
    set((s) => ({
      project: { ...s.project, ...(state.project ?? {}) },
      selected: state.selected ?? s.selected,
      history: state.history ?? s.history,
      prefs: { ...s.prefs, ...(state.prefs ?? {}) },
      saved: state.saved ?? s.saved,
      environments: state.environments ?? s.environments,
      activeEnvironmentId: state.activeEnvironmentId ?? s.activeEnvironmentId,
      collapsedNamespaces: state.collapsedNamespaces ?? s.collapsedNamespaces,
      idLinks: state.idLinks ?? s.idLinks,
    })),
}));

let persisting = false;
const PERSIST_DEBOUNCE_MS = 200;

/** Subscribes the store to IndexedDB persistence (idempotent, debounced). */
export function startPersistence(): void {
  if (persisting) return;
  persisting = true;
  let scheduled = false;
  useStore.subscribe(() => {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      const {
        project,
        selected,
        history,
        prefs,
        saved,
        environments,
        activeEnvironmentId,
        collapsedNamespaces,
        idLinks,
      } = useStore.getState();
      void writeState({
        project,
        selected,
        history,
        prefs,
        saved,
        environments,
        activeEnvironmentId,
        collapsedNamespaces,
        idLinks,
      } satisfies PersistedState);
    }, PERSIST_DEBOUNCE_MS);
  });
}
