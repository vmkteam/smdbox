import { ChevronDown, ChevronRight } from 'react-bootstrap-icons';

/** Chevron toggle for an inline collapsible row (params table, saved items). */
export function CollapseCaret({
  open,
  onToggle,
  name,
}: {
  open: boolean;
  onToggle: () => void;
  name: string;
}) {
  return (
    <button
      type="button"
      className="sb-params__caret"
      aria-expanded={open}
      aria-label={`${open ? 'Collapse' : 'Expand'} ${name}`}
      onClick={onToggle}
    >
      {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
    </button>
  );
}
