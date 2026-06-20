import { useMemo, useState } from 'react';
import { Badge, Button, Col, Form, Row, Tab, Tabs } from 'react-bootstrap';
import { ArrowClockwise } from 'react-bootstrap-icons';

import { useStore, type HistoryItem } from '../store/store';
import { JsonViewer } from './JsonViewer';

function formatTime(ts?: number): string {
  if (!ts) return '';
  return new Date(ts).toLocaleString();
}

/** Request history: searchable list of past calls (success and error). */
export function History({ onClose }: { onClose?: () => void }) {
  const items = useStore((s) => s.history);
  const prefillRequest = useStore((s) => s.prefillRequest);
  const [selected, setSelected] = useState<HistoryItem | null>(null);
  const [search, setSearch] = useState('');

  const rerun = (item: HistoryItem) => {
    prefillRequest(item.method, item.params);
    onClose?.();
  };

  const filtered = useMemo(() => {
    const needle = search.toLowerCase();
    // newest first
    return [...items].reverse().filter((i) => i.method.toLowerCase().includes(needle));
  }, [items, search]);

  return (
    <div className="sb-history">
      <Form.Control
        className="mb-2"
        placeholder="Filter by method"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Filter history"
      />
      <Row>
        <Col md={5}>
          <ul className="nav nav-pills flex-column">
            {filtered.length === 0 && <li className="sb-history__empty">No calls</li>}
            {filtered.map((item) => (
              <li key={item.id} className={selected?.id === item.id ? 'active' : ''}>
                <a
                  href=""
                  onClick={(e) => {
                    e.preventDefault();
                    setSelected(item);
                  }}
                >
                  <span className="sb-history__method">{item.method}</span>
                  <Badge bg={item.status === 'error' ? 'danger' : 'success'} className="ms-1">
                    {item.status === 'error' ? 'error' : 'ok'}
                  </Badge>
                  <div className="sb-history__time">{formatTime(item.ts)}</div>
                </a>
              </li>
            ))}
          </ul>
        </Col>
        <Col md={7}>
          {selected && (
            <>
              <div className="sb-history__detail-head">
                <span className="sb-history__method">{selected.method}</span>
                <Button size="sm" variant="outline-primary" onClick={() => rerun(selected)}>
                  <ArrowClockwise className="me-1" /> Re-run
                </Button>
              </div>
              <Tabs defaultActiveKey="response" id="history-item-tabs">
              <Tab eventKey="response" title={selected.status === 'error' ? 'Error' : 'Response'}>
                <JsonViewer
                  title={selected.status === 'error' ? 'Error' : 'Response data'}
                  json={selected.status === 'error' ? selected.error : selected.response}
                />
              </Tab>
              <Tab eventKey="params" title="Request params">
                <JsonViewer title="Request params" json={selected.params} />
              </Tab>
              </Tabs>
            </>
          )}
        </Col>
      </Row>
    </div>
  );
}
