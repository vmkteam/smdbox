import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Button } from 'react-bootstrap';
import { Eye, EyeSlash } from 'react-bootstrap-icons';

import { usePaneWidth } from '../hooks/usePaneWidth';
import { smdToJsonSchema } from '../lib/smdToJsonSchema';
import { useStore } from '../store/store';
import type { SmdService } from '../types/smd';
import { MethodDescription } from './MethodDescription';
import { MethodInvoker } from './MethodInvoker';
import { PaneResizer } from './PaneResizer';

/** Main pane: documentation and try-it-out for the selected method. */
export function MethodViewer({ services }: { services: Record<string, SmdService> }) {
  const selected = useStore((s) => s.selected);
  const { endpoint, headers } = useStore((s) => s.project);
  const [showInfo, setShowInfo] = useState(true);
  const [showTry, setShowTry] = useState(true);

  // Draggable divider between the documentation and the try-it-out panes.
  const [docW, setDocW, resetDocW] = usePaneWidth('mv-doc');
  const splitRef = useRef<HTMLDivElement>(null);
  const onDocResize = useCallback(
    (w: number) => {
      const total = splitRef.current?.clientWidth ?? 0;
      // Keep both panes usable: documentation >= 280px, try-it-out >= 320px.
      setDocW(Math.max(280, Math.min(w, total - 320)));
    },
    [setDocW],
  );

  const service = selected ? services[selected] : undefined;
  const schema = useMemo(() => (service ? smdToJsonSchema(service) : null), [service]);

  if (!selected || !service || !schema) {
    return (
      <Alert variant="info" className="sb-method-viewer__empty">
        Select a method from the list on the left
      </Alert>
    );
  }

  const bothShown = showInfo && showTry;

  return (
    <div className="sb-method-viewer">
      <div
        className={`sb-split sb-split--mv${bothShown ? '' : ' sb-split--single'}`}
        ref={splitRef}
        style={
          bothShown && docW != null ? ({ '--sb-doc-w': `${docW}px` } as React.CSSProperties) : undefined
        }
      >
        {showInfo && (
          <div className="sb-split__pane sb-split__pane--doc">
            <h3 className="sb-method-viewer__title">
              {selected}
              {showTry ? (
                <Button
                  size="sm"
                  variant="outline-secondary"
                  onClick={() => setShowInfo(false)}
                  title="Hide description"
                  aria-label="Hide description"
                >
                  <EyeSlash />
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline-secondary"
                  onClick={() => setShowTry(true)}
                  title="Show Try it out"
                  aria-label="Show Try it out"
                >
                  <Eye />
                </Button>
              )}
            </h3>
            <MethodDescription service={service} />
          </div>
        )}

        {bothShown && (
          <PaneResizer label="Resize documentation" onResize={onDocResize} onReset={resetDocW} />
        )}

        {showTry && (
          <div className="sb-split__pane sb-split__pane--try">
            <h3 className="sb-method-viewer__title">
              Try it out
              {showInfo ? (
                <Button
                  size="sm"
                  variant="outline-secondary"
                  onClick={() => setShowTry(false)}
                  title="Hide Try it out"
                  aria-label="Hide Try it out"
                >
                  <EyeSlash />
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline-secondary"
                  onClick={() => setShowInfo(true)}
                  title="Show description"
                  aria-label="Show description"
                >
                  <Eye />
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
          </div>
        )}
      </div>
    </div>
  );
}
