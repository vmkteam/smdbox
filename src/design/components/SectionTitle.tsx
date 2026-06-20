import type { ReactNode } from 'react';

interface SectionTitleProps {
  children: ReactNode;
  /** `section` = small uppercase label; `subsection` = bold sub-heading. */
  level?: 'section' | 'subsection';
}

/** Heading used inside the documentation pane to group content. */
export function SectionTitle({ children, level = 'section' }: SectionTitleProps) {
  return (
    <h6 className={level === 'subsection' ? 'sb-subsection-title' : 'sb-section-title'}>{children}</h6>
  );
}
