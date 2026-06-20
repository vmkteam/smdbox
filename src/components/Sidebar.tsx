import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Form } from 'react-bootstrap';
import { ChevronDown, ChevronRight, Star, StarFill } from 'react-bootstrap-icons';

import { recentMethodNames } from '../lib/recent';
import { useStore } from '../store/store';
import type { SmdService } from '../types/smd';

const RECENT_LIMIT = 8;

interface Grouped {
  namespaces: Record<string, Record<string, SmdService>>;
  others: Record<string, SmdService>;
}

/** Splits services into `namespace.method` groups and top-level methods. */
function groupServices(services: Record<string, SmdService>): Grouped {
  const namespaces: Record<string, Record<string, SmdService>> = {};
  const others: Record<string, SmdService> = {};
  for (const [key, service] of Object.entries(services)) {
    const parts = key.split('.');
    if (parts.length === 2) {
      const [ns, method] = parts as [string, string];
      (namespaces[ns] ??= {})[method] = service;
    } else {
      others[key] = service;
    }
  }
  return { namespaces, others };
}

/** Keeps methods matching the search by name, namespace or description. */
function filterMethods(
  methods: Record<string, SmdService>,
  search: string,
  namespace = '',
): Record<string, SmdService> {
  if (namespace && namespace.toLowerCase().includes(search)) return methods;
  const out: Record<string, SmdService> = {};
  for (const [key, service] of Object.entries(methods)) {
    const combined = [namespace, key].filter(Boolean).join('.').toLowerCase();
    const description = (service.description ?? '').toLowerCase();
    if (combined.includes(search) || description.includes(search)) out[key] = service;
  }
  return out;
}

function MethodLink({ label, fullName }: { label: string; fullName: string }) {
  const selected = useStore((s) => s.selected);
  const selectMethod = useStore((s) => s.selectMethod);
  const isFavorite = useStore((s) => s.prefs.favorites.includes(fullName));
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const isSelected = selected === fullName;
  return (
    <li className={isSelected ? 'active' : ''}>
      <button
        type="button"
        className="sb-sidebar__star"
        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        aria-pressed={isFavorite}
        onClick={() => toggleFavorite(fullName)}
      >
        {isFavorite ? <StarFill /> : <Star />}
      </button>
      <a
        className="sb-sidebar__link"
        href={`#/method/${encodeURIComponent(fullName)}`}
        aria-current={isSelected ? 'true' : undefined}
        onClick={(e) => {
          e.preventDefault();
          selectMethod(fullName);
        }}
      >
        {label}
      </a>
    </li>
  );
}

function Group({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="sb-sidebar__namespace">
      {title && <div className="h6 sb-sidebar__ns-title">{title}</div>}
      <ul className="nav nav-pills flex-column">{children}</ul>
    </div>
  );
}

/** Searchable, keyboard-navigable list of methods with favorites & recents. */
export function Sidebar({ services }: { services: Record<string, SmdService> }) {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const favorites = useStore((s) => s.prefs.favorites);
  const history = useStore((s) => s.history);
  const grouped = useMemo(() => groupServices(services), [services]);
  const needle = search.toLowerCase();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const available = useMemo(() => new Set(Object.keys(services)), [services]);
  const favoriteNames = useMemo(
    () => favorites.filter((f) => available.has(f)),
    [favorites, available],
  );
  const recentNames = useMemo(
    () => recentMethodNames(history, available, RECENT_LIMIT).filter((n) => !favoriteNames.includes(n)),
    [history, available, favoriteNames],
  );
  const otherKeys = useMemo(
    () => Object.keys(filterMethods(grouped.others, needle)),
    [grouped.others, needle],
  );
  const hasMatches = useMemo(
    () =>
      otherKeys.length > 0 ||
      Object.entries(grouped.namespaces).some(
        ([ns, methods]) => Object.keys(filterMethods(methods, needle, ns)).length > 0,
      ),
    [grouped.namespaces, otherKeys, needle],
  );

  const toggleCollapse = (ns: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(ns)) next.delete(ns);
      else next.add(ns);
      return next;
    });

  // Arrow-key navigation: from the search box into the list and across methods.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const links = Array.from(listRef.current?.querySelectorAll<HTMLAnchorElement>('.sb-sidebar__link') ?? []);
    if (!links.length) return;
    const idx = links.indexOf(document.activeElement as HTMLAnchorElement);

    if (idx === -1) {
      // Focus is in the search box (or elsewhere): Down jumps to the first method.
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        links[0]?.focus();
      }
      return;
    }

    e.preventDefault();
    if (e.key === 'ArrowUp' && idx === 0) {
      inputRef.current?.focus(); // back to search from the first method
      return;
    }
    const next = e.key === 'ArrowDown' ? Math.min(idx + 1, links.length - 1) : idx - 1;
    links[next]?.focus();
  };

  const searching = needle.length > 0;

  return (
    <nav className="sb-sidebar" aria-label="Methods" ref={listRef} onKeyDown={onKeyDown}>
      <div className="sb-sidebar__search">
        <Form.Control
          ref={inputRef}
          type="text"
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or description"
          aria-label="Methods search"
        />
      </div>

      {!searching && favoriteNames.length > 0 && (
        <Group title="★ Favorites">
          {favoriteNames.map((name) => (
            <MethodLink key={name} label={name} fullName={name} />
          ))}
        </Group>
      )}

      {!searching && recentNames.length > 0 && (
        <Group title="Recent">
          {recentNames.map((name) => (
            <MethodLink key={name} label={name} fullName={name} />
          ))}
        </Group>
      )}

      {Object.entries(grouped.namespaces).map(([ns, methods]) => {
        const filtered = filterMethods(methods, needle, ns);
        const keys = Object.keys(filtered);
        if (!keys.length) return null;
        const isCollapsed = !searching && collapsed.has(ns);
        return (
          <div className="sb-sidebar__namespace" key={ns}>
            <button
              type="button"
              className="h6 sb-sidebar__ns-title sb-sidebar__ns-toggle"
              aria-expanded={!isCollapsed}
              onClick={() => toggleCollapse(ns)}
            >
              <span className="sb-sidebar__caret">
                {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              </span>{' '}
              {ns}
            </button>
            {!isCollapsed && (
              <ul className="nav nav-pills flex-column">
                {keys.map((method) => (
                  <MethodLink key={method} label={method} fullName={`${ns}.${method}`} />
                ))}
              </ul>
            )}
          </div>
        );
      })}

      {otherKeys.length > 0 && (
        <Group>
          {otherKeys.map((method) => (
            <MethodLink key={method} label={method} fullName={method} />
          ))}
        </Group>
      )}

      {!hasMatches && <div className="sb-sidebar__empty">No methods found</div>}
    </nav>
  );
}
