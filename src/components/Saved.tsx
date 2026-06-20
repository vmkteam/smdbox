import { Badge, Button } from 'react-bootstrap';
import { Trash } from 'react-bootstrap-icons';

import { useStore } from '../store/store';

/** Saved requests: load a stored request into the form, or delete it. */
export function Saved({ onClose }: { onClose?: () => void }) {
  const saved = useStore((s) => s.saved);
  const deleteSaved = useStore((s) => s.deleteSaved);
  const prefillRequest = useStore((s) => s.prefillRequest);

  if (saved.length === 0) {
    return <p className="sb-muted mb-0">No saved requests yet. Use “Save” in the method form.</p>;
  }

  return (
    <ul className="sb-saved">
      {[...saved].reverse().map((req) => (
        <li key={req.id} className="sb-saved__item">
          <button
            type="button"
            className="sb-saved__load"
            onClick={() => {
              prefillRequest(req.method, req.params);
              onClose?.();
            }}
          >
            <span className="sb-saved__name">{req.name}</span>
            <Badge bg="secondary" className="ms-2">
              {req.method}
            </Badge>
          </button>
          <Button
            size="sm"
            variant="outline-danger"
            onClick={() => deleteSaved(req.id)}
            aria-label="Delete saved request"
            title="Delete"
          >
            <Trash />
          </Button>
        </li>
      ))}
    </ul>
  );
}
