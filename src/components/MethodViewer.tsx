import { useMemo, useState } from 'react';
import { Alert, Button, Col, Row } from 'react-bootstrap';
import { Eye, EyeSlash } from 'react-bootstrap-icons';

import { smdToJsonSchema } from '../lib/smdToJsonSchema';
import { useStore } from '../store/store';
import type { SmdService } from '../types/smd';
import { MethodDescription } from './MethodDescription';
import { MethodInvoker } from './MethodInvoker';

/** Main pane: documentation and try-it-out for the selected method. */
export function MethodViewer({ services }: { services: Record<string, SmdService> }) {
  const selected = useStore((s) => s.selected);
  const { endpoint, headers } = useStore((s) => s.project);
  const [showInfo, setShowInfo] = useState(true);
  const [showTry, setShowTry] = useState(true);

  const service = selected ? services[selected] : undefined;
  const schema = useMemo(() => (service ? smdToJsonSchema(service) : null), [service]);

  if (!selected || !service || !schema) {
    return (
      <Alert variant="info" className="sb-method-viewer__empty">
        Select a method from the list on the left
      </Alert>
    );
  }

  return (
    <div className="sb-method-viewer">
      <Row>
        {showInfo && (
          <Col md={showTry ? 7 : 12}>
            <h3 className="sb-method-viewer__title">
              {selected}
              {showTry ? (
                <Button size="sm" variant="outline-secondary" onClick={() => setShowInfo(false)}>
                  <EyeSlash className="me-1" /> Hide
                </Button>
              ) : (
                <Button size="sm" variant="outline-secondary" onClick={() => setShowTry(true)}>
                  <Eye className="me-1" /> Try it
                </Button>
              )}
            </h3>
            <MethodDescription service={service} />
          </Col>
        )}

        {showTry && (
          <Col md={showInfo ? 5 : 12}>
            <h3 className="sb-method-viewer__title">
              Try it out
              {showInfo ? (
                <Button size="sm" variant="outline-secondary" onClick={() => setShowTry(false)}>
                  <EyeSlash className="me-1" /> Hide
                </Button>
              ) : (
                <Button size="sm" variant="outline-secondary" onClick={() => setShowInfo(true)}>
                  <Eye className="me-1" /> Show description
                </Button>
              )}
            </h3>
            <MethodInvoker
              key={selected}
              schema={schema}
              method={selected}
              endpoint={endpoint}
              headers={headers}
            />
          </Col>
        )}
      </Row>
    </div>
  );
}
