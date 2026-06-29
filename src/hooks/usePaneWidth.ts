import { useCallback, useState } from 'react';

const PREFIX = 'smdbox:pane:';

function load(key: string): number | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw !== null) {
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0) return n;
    }
  } catch {
    // localStorage unavailable (private mode / quota) — fall back to the CSS default.
  }
  return null;
}

function persist(key: string, width: number): void {
  try {
    localStorage.setItem(PREFIX + key, String(Math.round(width)));
  } catch {
    // Ignore quota / availability errors — resizing still works in-session.
  }
}

function clear(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // Ignore — nothing persisted to remove.
  }
}

export type PaneWidth = [
  /** Pixel width set by the user, or null while the CSS default applies. */
  width: number | null,
  /** Set (and persist) the pixel width. */
  setWidth: (px: number) => void,
  /** Clear (and persist) back to the CSS default. */
  reset: () => void,
];

/**
 * A draggable pane's width in pixels, persisted to localStorage under `key`.
 * Returns `null` until the user resizes, so a CSS fallback width can apply
 * (and stay responsive) out of the box.
 */
export function usePaneWidth(key: string): PaneWidth {
  const [width, setWidth] = useState<number | null>(() => load(key));

  const set = useCallback(
    (px: number) => {
      setWidth(px);
      persist(key, px);
    },
    [key],
  );

  const reset = useCallback(() => {
    setWidth(null);
    clear(key);
  }, [key]);

  return [width, set, reset];
}
