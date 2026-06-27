import { useState } from 'react';

/** A collapse/expand set with a toggle: tracks which string keys are "on". */
export function useSetToggle() {
  const [set, setSet] = useState<ReadonlySet<string>>(new Set());
  const toggle = (key: string) =>
    setSet((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  return [set, toggle] as const;
}
