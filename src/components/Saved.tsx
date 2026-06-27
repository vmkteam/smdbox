import { Badge, Button, Tab, Tabs } from 'react-bootstrap';
import { ArrowDown, ArrowUp, Pencil, Trash } from 'react-bootstrap-icons';

import { useSetToggle } from '../hooks/useSetToggle';
import { useStore } from '../store/store';
import { CollapseCaret } from './CollapseCaret';
import { JsonViewer } from './JsonViewer';

/** Saved requests (load/reorder/rename) and saved responses (view/rename). */
export function Saved({ onClose }: { onClose?: () => void }) {
  const saved = useStore((s) => s.saved);
  const deleteSaved = useStore((s) => s.deleteSaved);
  const renameSaved = useStore((s) => s.renameSaved);
  const moveSaved = useStore((s) => s.moveSaved);
  const prefillRequest = useStore((s) => s.prefillRequest);
  const savedResponses = useStore((s) => s.savedResponses);
  const deleteSavedResponse = useStore((s) => s.deleteSavedResponse);
  const renameSavedResponse = useStore((s) => s.renameSavedResponse);

  const [openReq, toggleReq] = useSetToggle();
  const [openResp, toggleResp] = useSetToggle();

  const rename = (current: string, apply: (name: string) => void) => {
    const name = window.prompt('Rename:', current)?.trim();
    if (name) apply(name);
  };

  return (
    <Tabs defaultActiveKey="requests" className="mb-3">
      <Tab eventKey="requests" title={`Requests${saved.length ? ` (${saved.length})` : ''}`}>
        {saved.length === 0 ? (
          <p className="sb-muted mb-0">No saved requests yet. Use “Save” in the method form.</p>
        ) : (
          <ul className="sb-saved">
            {saved.map((req, i) => {
              const open = openReq.has(req.id);
              return (
                <li key={req.id} className="sb-saved__row">
                  <div className="sb-saved__item">
                    <CollapseCaret open={open} onToggle={() => toggleReq(req.id)} name="params" />
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
                    <div className="sb-saved__actions">
                      <Button
                        size="sm"
                        variant="outline-secondary"
                        onClick={() => moveSaved(req.id, -1)}
                        disabled={i === 0}
                        aria-label="Move up"
                        title="Move up"
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-secondary"
                        onClick={() => moveSaved(req.id, 1)}
                        disabled={i === saved.length - 1}
                        aria-label="Move down"
                        title="Move down"
                      >
                        <ArrowDown />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-secondary"
                        onClick={() => rename(req.name, (n) => renameSaved(req.id, n))}
                        aria-label="Rename"
                        title="Rename"
                      >
                        <Pencil />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={() => deleteSaved(req.id)}
                        aria-label="Delete saved request"
                        title="Delete"
                      >
                        <Trash />
                      </Button>
                    </div>
                  </div>
                  {open && <pre className="sb-saved__preview">{JSON.stringify(req.params, null, 2)}</pre>}
                </li>
              );
            })}
          </ul>
        )}
      </Tab>

      <Tab
        eventKey="responses"
        title={`Responses${savedResponses.length ? ` (${savedResponses.length})` : ''}`}
      >
        {savedResponses.length === 0 ? (
          <p className="sb-muted mb-0">No saved responses yet. Use “Save” on a response.</p>
        ) : (
          <ul className="sb-saved">
            {savedResponses.map((resp) => {
              const open = openResp.has(resp.id);
              return (
                <li key={resp.id} className="sb-saved__row">
                  <div className="sb-saved__item">
                    <CollapseCaret open={open} onToggle={() => toggleResp(resp.id)} name="response" />
                    <button type="button" className="sb-saved__load" onClick={() => toggleResp(resp.id)}>
                      <span className="sb-saved__name">{resp.name}</span>
                      <Badge bg="secondary" className="ms-2">
                        {resp.method}
                      </Badge>
                    </button>
                    <div className="sb-saved__actions">
                      <Button
                        size="sm"
                        variant="outline-secondary"
                        onClick={() => rename(resp.name, (n) => renameSavedResponse(resp.id, n))}
                        aria-label="Rename"
                        title="Rename"
                      >
                        <Pencil />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={() => deleteSavedResponse(resp.id)}
                        aria-label="Delete saved response"
                        title="Delete"
                      >
                        <Trash />
                      </Button>
                    </div>
                  </div>
                  {open && (
                    <div className="sb-saved__preview-json">
                      <JsonViewer json={resp.response} title={resp.name} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Tab>
    </Tabs>
  );
}
