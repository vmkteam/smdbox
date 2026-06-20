import type { ReactNode } from 'react';

interface CodeChipProps {
  children: ReactNode;
  /** `name` = a filled chip (identifiers); `type` = plain monospace (types). */
  variant?: 'name' | 'type';
}

/** Monospace inline token for identifiers and type labels. */
export function CodeChip({ children, variant = 'name' }: CodeChipProps) {
  return <code className={variant === 'type' ? 'sb-type' : 'sb-param-name'}>{children}</code>;
}
