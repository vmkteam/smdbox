import { CheckLg } from 'react-bootstrap-icons';

/** Indicates a required parameter (icon + accessible label). */
export function RequiredMark() {
  return <CheckLg className="sb-required" title="required" aria-label="required" />;
}
