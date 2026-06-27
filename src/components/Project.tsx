import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Form, Spinner } from 'react-bootstrap';
import { ArrowClockwise, Download, PlusLg, Trash } from 'react-bootstrap-icons';

import { refreshSmd, useSmd } from '../data/queries';
import { defaultSmdUrlFromLocation, deriveEndpoint } from '../lib/smd';
import { useStore, type Preset } from '../store/store';

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

// Navbar presets to tell environments apart at a glance ('' = default ocean).
const NAVBAR_PRESETS: { label: string; color: string }[] = [
  { label: 'Default', color: '' },
  { label: 'Dev', color: '#047857' },
  { label: 'Stage', color: '#b45309' },
  { label: 'Prod', color: '#be123c' },
];

/** Project setup (initial) and settings form. */
export function Project({ mode = 'init', onClose }: ProjectProps) {
  const project = useStore((s) => s.project);
  const createProject = useStore((s) => s.createProject);
  const updateSettings = useStore((s) => s.updateSettings);
  const favorites = useStore((s) => s.prefs.favorites);
  const saved = useStore((s) => s.saved);
  const savedResponses = useStore((s) => s.savedResponses);
  const environments = useStore((s) => s.environments);
  const navbarColor = useStore((s) => s.prefs.navbarColor);
  const setNavbarColor = useStore((s) => s.setNavbarColor);
  const activeEnvironmentId = useStore((s) => s.activeEnvironmentId);
  const theme = useStore((s) => s.prefs.theme);
  const idLinks = useStore((s) => s.idLinks);
  const setIdLink = useStore((s) => s.setIdLink);
  const removeIdLink = useStore((s) => s.removeIdLink);
  const presets = useStore((s) => s.presets);

  const [smdUrl, setSmdUrl] = useState(
    () => project.smdUrl || defaultSmdUrlFromLocation(window.location.href),
  );
  const [endpoint, setEndpoint] = useState(project.endpoint ?? '');
  const [headers, setHeaders] = useState<HeaderRow[]>(
    Object.entries(project.headers).map(([key, value]) => ({ key, value })),
  );
  const [debouncedUrl, setDebouncedUrl] = useState(smdUrl);
  // Set when the user submits before the schema has finished loading: we kick
  // off the fetch immediately and enter as soon as it validates (A1).
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const [linkField, setLinkField] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  // Navbar color binds to the active env (if any), else the global pref.
  const activeEnv = environments.find((e) => e.id === activeEnvironmentId);
  const currentColor = activeEnv?.color || navbarColor;

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

  // Fill the form from a host-provided preset (A2); the user reviews, then Creates.
  const applyPreset = (p: Preset) => {
    setSmdUrl(p.smdUrl);
    setDebouncedUrl(p.smdUrl);
    setEndpoint(p.endpoint ?? '');
    setHeaders(p.headers ? Object.entries(p.headers).map(([key, value]) => ({ key, value })) : []);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'settings') {
      updateSettings({ endpoint: effectiveEndpoint, headers: headersObj });
      onClose?.();
      return;
    }
    // Init: enter immediately if the schema is already loaded.
    if (smd.data) {
      createProject({ endpoint: effectiveEndpoint, smdUrl: debouncedUrl, headers: headersObj });
      onClose?.();
      return;
    }
    // Schema not loaded yet: flush the debounce so the fetch starts now, and
    // let the effect below enter as soon as it succeeds (single click).
    if (smdUrl.trim()) {
      setDebouncedUrl(smdUrl);
      setPendingSubmit(true);
    }
  };

  // Complete a pending submit once the schema resolves (success → enter,
  // error → drop back to the form with its inline feedback).
  useEffect(() => {
    if (!pendingSubmit) return;
    if (smd.data) {
      createProject({ endpoint: effectiveEndpoint, smdUrl: debouncedUrl, headers: headersObj });
      setPendingSubmit(false);
      onClose?.();
    } else if (smd.isError) {
      setPendingSubmit(false);
    }
  }, [pendingSubmit, smd.data, smd.isError, effectiveEndpoint, debouncedUrl, headersObj, createProject, onClose]);

  const submitDisabled = mode === 'init' && (!smdUrl.trim() || pendingSubmit);

  const exportConfig = () => {
    const data = JSON.stringify(
      {
        endpoint: effectiveEndpoint,
        smdUrl: project.smdUrl,
        headers: headersObj,
        favorites,
        saved,
        savedResponses,
        environments,
        idLinks,
        navbarColor,
        theme,
      },
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

  return (
    <Form className="sb-project" onSubmit={onSubmit}>
      {mode === 'settings' && (
        <div className="sb-project__config">
          <h5>Configuration</h5>
          <div className="sb-project__actions">
            <Button type="button" size="sm" variant="outline-secondary" onClick={exportConfig}>
              <Download className="me-1" /> Export config
            </Button>
          </div>

          <h5 className="mt-3">Navbar color{activeEnv ? ` · ${activeEnv.name}` : ''}</h5>
          <div className="sb-project__swatches">
            {NAVBAR_PRESETS.map((p) => (
              <Button
                key={p.label}
                type="button"
                size="sm"
                variant={currentColor === p.color ? 'primary' : 'outline-secondary'}
                onClick={() => setNavbarColor(p.color)}
              >
                {p.color && (
                  <span className="sb-project__dot" style={{ background: p.color }} aria-hidden="true" />
                )}
                {p.label}
              </Button>
            ))}
            <Form.Control
              type="color"
              value={currentColor || '#075985'}
              onChange={(e) => setNavbarColor(e.target.value)}
              title="Custom navbar color"
              aria-label="Custom navbar color"
              className="sb-project__color"
            />
          </div>

          <h5 className="mt-3">Linked fields</h5>
          <p className="sb-muted sb-project__hint-text">
            Turn id values in responses into links. Use <code>{'{id}'}</code> as the placeholder.
          </p>
          {Object.entries(idLinks).map(([field, url]) => (
            <div className="sb-project__link-row" key={field}>
              <code className="sb-param-name">{field}</code>
              <span className="sb-muted text-truncate" title={url}>
                {url}
              </span>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => removeIdLink(field)}
                aria-label={`Remove ${field}`}
                title="Remove rule"
              >
                <Trash />
              </Button>
            </div>
          ))}
          <div className="sb-project__header-row">
            <Form.Control
              placeholder="field (e.g. productId)"
              value={linkField}
              onChange={(e) => setLinkField(e.target.value)}
            />
            <Form.Control
              placeholder="https://…/{id}"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
            />
            <Button
              size="sm"
              variant="outline-secondary"
              disabled={!linkField.trim() || !linkUrl.trim()}
              onClick={() => {
                setIdLink(linkField.trim(), linkUrl.trim());
                setLinkField('');
                setLinkUrl('');
              }}
              aria-label="Add link rule"
              title="Add rule"
            >
              <PlusLg />
            </Button>
          </div>
        </div>
      )}

      {mode !== 'settings' && presets.length > 0 && (
        <div className="mb-3">
          <h5>Presets</h5>
          <div className="sb-project__swatches">
            {presets.map((p) => (
              <Button
                key={p.name}
                type="button"
                size="sm"
                variant="outline-secondary"
                onClick={() => applyPreset(p)}
              >
                {p.name}
              </Button>
            ))}
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
          {mode === 'settings' ? (
            'Update'
          ) : pendingSubmit ? (
            <>
              <Spinner animation="border" size="sm" className="me-1" /> Checking…
            </>
          ) : (
            'Create'
          )}
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
