import { useState } from 'react';

/** Copy-to-clipboard with a transient "copied" flag. */
export function useClipboard(resetMs = 1500) {
  const [copied, setCopied] = useState(false);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), resetMs);
    } catch {
      // clipboard unavailable (e.g. insecure context) — ignore
    }
  };

  return { copied, copy };
}
