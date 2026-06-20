import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Form, Spinner } from 'react-bootstrap';
import { ArrowClockwise, Download, PlusLg, Trash, Upload } from 'react-bootstrap-icons';

import { refreshSmd, useSmd } from '../data/queries';
import { defaultSmdUrlFromLocation, deriveEndpoint } from '../lib/smd';
import { useStore, type Environment, type SavedRequest } from '../store/store';

interface HeaderRow {
  key: string;
  value: string;
}

function toObject(rows: HeaderRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const { key, value } of rows) {
    if (key && value) out[key] = value;
  }
  return out;
}

interface ProjectProps {
  mode?: 'init' | 'settings';
  onClose?: () => void;
}

const DEBOUNCE_MS = 800;

/** Project setup (initial) and settings form. */
export function Project({ mode = 'init', onClose }: ProjectProps) {
  const project = useStore((s) => s.project);
  const createProject = useStore((s) => s.createProject);
  const updateSettings = useStore((s) => s.updateSettings);
  const importConfig = useStore((s) => s.importConfig);
  const favorites = useStore((s) => s.prefs.favorites);
  const saved = useStore((s) => s.saved);
  const environments = useStore((s) => s.environments);

  const [smdUrl, setSmdUrl] = useState(
    () => project.smdUrl || defaultSmdUrlFromLocation(window.location.href),
  );
  const [endpoint, setEndpoint] = useState(project.endpoint ?? '');
  const [headers, setHeaders] = useState<HeaderRow[]>(
    Object.entries(project.headers).map(([key, value]) => ({ key, value })),
  );
  const [debouncedUrl, setDebouncedUrl] = useState(smdUrl);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedUrl(smdUrl), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [smdUrl]);

  const headersObj = useMemo(() => toObject(headers), [headers]);
  const activeUrl = mode === 'settings' ? project.smdUrl : debouncedUrl || null;
  const smd = useSmd(activeUrl, headersObj);

  // Endpoint derived from the loaded schema (init mode); the editable
  // `endpoint` overrides it once the user types.
  const derivedEndpoint = useMemo(
    () => (mode === 'init' && smd.data && activeUrl ? deriveEndpoint(activeUrl, smd.data.target) : ''),
    [mode, smd.data, activeUrl],
  );
  const effectiveEndpoint = endpoint || derivedEndpoint;

  const validity = smd.isError ? false : smd.data ? true : undefined;

  const addHeader = () => setHeaders((h) => [...h, { key: '', value: '' }]);
  const removeHeader = (i: number) => setHeaders((h) => h.filter((_, idx) => idx !== i));
  const patchHeader = (i: number, patch: Partial<HeaderRow>) =>
    setHeaders((h) => h.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'settings') {
      updateSettings({ endpoint: effectiveEndpoint, headers: headersObj });
    } else {
      createProject({ endpoint: effectiveEndpoint, smdUrl: debouncedUrl, headers: headersObj });
    }
    onClose?.();
  };

  const submitDisabled = mode === 'init' && !smd.data;

  const exportConfig = () => {
    const data = JSON.stringify(
      { endpoint: effectiveEndpoint, smdUrl: project.smdUrl, headers: headersObj, favorites, saved, environments },
      null,
      2,
    );
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'smdbox-config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadConfigFile = async (file: File) => {
    try {
      const cfg = JSON.parse(await file.text()) as Partial<{
        endpoint: string;
        smdUrl: string;
        headers: Record<string, string>;
        favorites: string[];
        saved: SavedRequest[];
        environments: Environment[];
      }>;
      if (!cfg.smdUrl) return;
      importConfig(cfg);
      onClose?.();
    } catch {
      // ignore invalid config file
    }
  };

  return (
    <Form className="sb-project" onSubmit={onSubmit}>
      {mode === 'settings' && (
        <div className="sb-project__config">
          <h5>Configuration</h5>
          <div className="sb-project__actions">
            <Button type="button" size="sm" variant="outline-secondary" onClick={exportConfig}>
              <Download className="me-1" /> Export config
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline-secondary"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="me-1" /> Import config
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void loadConfigFile(f);
              }}
            />
          </div>
        </div>
      )}

      {mode !== 'settings' && (
        <Form.Group className="mb-3">
          <Form.Label>
            Schema URL (SMD or OpenRPC) * {smd.isFetching && <Spinner animation="border" size="sm" />}
          </Form.Label>
          <Form.Control
            placeholder="Enter SMD or OpenRPC schema url"
            value={smdUrl}
            onChange={(e) => setSmdUrl(e.target.value)}
            isInvalid={validity === false}
            isValid={validity === true}
          />
          {smd.isError && (
            <Form.Control.Feedback type="invalid">
              Could not load the schema. Check the URL, CORS and headers.
            </Form.Control.Feedback>
          )}
        </Form.Group>
      )}

      <h5>Custom headers</h5>
      {headers.map((header, index) => (
        <div className="sb-project__header-row" key={index}>
          <Form.Control
            placeholder="Key"
            value={header.key}
            onChange={(e) => patchHeader(index, { key: e.target.value })}
          />
          <Form.Control
            placeholder="Value"
            value={header.value}
            onChange={(e) => patchHeader(index, { value: e.target.value })}
          />
          <Button
            variant="outline-danger"
            size="sm"
            onClick={() => removeHeader(index)}
            aria-label="Remove header"
            title="Remove header"
          >
            <Trash />
          </Button>
        </div>
      ))}
      <Button className="mb-3" size="sm" variant="outline-secondary" onClick={addHeader}>
        <PlusLg className="me-1" /> Add header
      </Button>

      <h5>API endpoint</h5>
      <Form.Group className="mb-3">
        <Form.Control
          placeholder="Enter endpoint url"
          value={effectiveEndpoint}
          onChange={(e) => setEndpoint(e.target.value)}
        />
      </Form.Group>

      {mode === 'settings' && smd.isError && (
        <Alert variant="warning">SMD schema is currently unavailable.</Alert>
      )}

      <div className="sb-project__actions">
        <Button type="submit" variant={mode === 'settings' ? 'primary' : 'success'} disabled={submitDisabled}>
          {mode === 'settings' ? 'Update' : 'Create'}
        </Button>
        {mode === 'settings' && (
          <Button
            type="button"
            variant="outline-secondary"
            onClick={() => refreshSmd(project.smdUrl)}
            disabled={!project.smdUrl || smd.isFetching}
          >
            <ArrowClockwise className="me-1" /> {smd.isFetching ? 'Refreshing…' : 'Refresh schema'}
          </Button>
        )}
      </div>
    </Form>
  );
}
