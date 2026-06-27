import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Form, Modal, Spinner, Tab, Tabs } from 'react-bootstrap';
import { BookmarkPlus, Clipboard, ClipboardCheck, ClipboardPlus, Share, XLg } from 'react-bootstrap-icons';

import { useRpc } from '../data/queries';
import { useClipboard } from '../hooks/useClipboard';
import { fromCurl, rpcParams, toCurl } from '../lib/curl';
import { formatBytes, formatDuration, jsonByteSize } from '../lib/format';
import { createRequest, type JsonRpcParams, type JsonRpcRequest } from '../lib/rpc';
import type { JsonSchema } from '../lib/smdToJsonSchema';
import { useStore } from '../store/store';
import { FormFromSchema } from './FormFromSchema';
import { JsonViewer } from './JsonViewer';
import { RawJsonEditor } from './RawJsonEditor';

interface MethodInvokerProps {
  schema: JsonSchema;
  method: string;
  endpoint: string | null;
  headers: Record<string, string>;
}

function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

/** Try-it-out pane: parameter input (form/raw), export and the call result. */
export function MethodInvoker({ schema, method, endpoint, headers }: MethodInvokerProps) {
  const addHistory = useStore((s) => s.addHistory);
  const prefill = useStore((s) => s.prefill);
  const clearPrefill = useStore((s) => s.clearPrefill);
  const saveRequest = useStore((s) => s.saveRequest);
  const saveResponse = useStore((s) => s.saveResponse);
  const mutation = useRpc(endpoint, headers);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const { copied, copy } = useClipboard();
  const share = useClipboard();
  const [meta, setMeta] = useState<{ durationMs: number; size: number } | null>(null);
  // Last shown response, kept across re-runs so the viewer stays mounted and its
  // expand/collapse state survives (it resets only when the method changes).
  const [lastResult, setLastResult] = useState<{ value: unknown; errored: boolean } | null>(null);
  const [curlOpen, setCurlOpen] = useState(false);
  const [curlText, setCurlText] = useState('');
  const [curlError, setCurlError] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const startedAtRef = useRef(0);

  // Seed the form from a re-run or a shared deep link.
  useEffect(() => {
    if (prefill && prefill.method === method) {
      setFormData(prefill.params as Record<string, unknown>);
      clearPrefill();
    }
  }, [prefill, method, clearPrefill]);

  const run = (request: JsonRpcRequest | object, params: JsonRpcParams) => {
    const controller = new AbortController();
    controllerRef.current = controller;
    startedAtRef.current = performance.now();
    setMeta(null);
    mutation.mutate(
      { request: request as JsonRpcRequest, signal: controller.signal },
      {
        onSuccess: (resp) => {
          setMeta({ durationMs: performance.now() - startedAtRef.current, size: jsonByteSize(resp) });
          setLastResult({ value: resp.error ?? resp.result, errored: Boolean(resp.error) });
          addHistory({
            id: crypto.randomUUID(),
            method,
            params,
            response: resp.result,
            error: resp.error ?? null,
            status: resp.error ? 'error' : 'ok',
            ts: Date.now(),
          });
        },
        onError: (err) => {
          if (isAbort(err)) return;
          addHistory({
            id: crypto.randomUUID(),
            method,
            params,
            error: { message: String(err) },
            status: 'error',
            ts: Date.now(),
          });
        },
      },
    );
  };

  const onFormSubmit = (data: Record<string, unknown>) => {
    setFormData(data);
    run(createRequest(method, data), data);
  };

  const onRawSubmit = (full: object) => {
    const params = (full as { params?: JsonRpcParams }).params ?? {};
    run(full, params);
  };

  const cancel = () => controllerRef.current?.abort(new DOMException('Cancelled', 'AbortError'));

  const copyCurl = () => copy(toCurl(endpoint ?? '', headers, createRequest(method, formData)));

  const shareLink = () => {
    const base = `${location.origin}${location.pathname}${location.search}`;
    const p = encodeURIComponent(JSON.stringify(formData));
    void share.copy(`${base}#/method/${encodeURIComponent(method)}?p=${p}`);
  };

  const onSave = () => {
    const name = window.prompt('Save request as:', method);
    if (name) saveRequest(name, method, formData);
  };

  // Build the form from a pasted curl command (D2).
  const importCurl = () => {
    const params = rpcParams(fromCurl(curlText)?.body);
    if (params) {
      setFormData(params);
      setCurlOpen(false);
      setCurlText('');
      setCurlError(false);
    } else {
      setCurlError(true);
    }
  };

  const cancelled = isAbort(mutation.error);
  // Show the last response (kept mounted across re-runs to preserve tree state).
  const showResult = lastResult !== null && lastResult.value !== undefined;

  // Rendered inline to the right of each tab's "Try" button.
  const actions = (
    <>
      <Button type="button" variant="outline-secondary" onClick={copyCurl} title="Copy as curl">
        {copied ? <ClipboardCheck className="me-1" /> : <Clipboard className="me-1" />}
        <span className="sb-action-label">{copied ? 'Copied' : 'curl'}</span>
      </Button>
      <Button
        type="button"
        variant="outline-secondary"
        onClick={shareLink}
        title="Copy a shareable link with these parameters"
      >
        <Share className="me-1" />
        <span className="sb-action-label">{share.copied ? 'Copied' : 'Share'}</span>
      </Button>
      <Button type="button" variant="outline-secondary" onClick={onSave} title="Save this request">
        <BookmarkPlus className="me-1" />
        <span className="sb-action-label">Save</span>
      </Button>
    </>
  );

  const openCurl = () => {
    setCurlText('');
    setCurlError(false);
    setCurlOpen(true);
  };

  return (
    <div className="sb-method-invoker">
      <div className="sb-method-invoker__tabs">
        <Tabs defaultActiveKey="form" id="method-invoker-tabs" className="mb-2" mountOnEnter unmountOnExit>
          <Tab eventKey="form" title="Form">
            <FormFromSchema
              schema={schema}
              formData={formData}
              onChange={setFormData}
              onSubmit={onFormSubmit}
              actions={actions}
            />
          </Tab>
          <Tab eventKey="raw" title="Raw">
            <RawJsonEditor
              schema={schema}
              method={method}
              formData={formData}
              onChange={setFormData}
              onSubmit={onRawSubmit}
              actions={actions}
            />
          </Tab>
        </Tabs>
        <Button
          size="sm"
          variant="outline-secondary"
          className="sb-method-invoker__from-curl"
          onClick={openCurl}
          title="Build the request from a curl command"
        >
          <ClipboardPlus className="me-1" /> <span className="sb-action-label">From curl</span>
        </Button>
      </div>

      {mutation.isPending && (
        <div className="sb-method-invoker__loading" aria-busy="true">
          <Spinner animation="border" size="sm" /> Calling…
          <Button size="sm" variant="outline-danger" onClick={cancel}>
            <XLg className="me-1" /> Cancel
          </Button>
        </div>
      )}

      {cancelled && (
        <Alert variant="secondary" className="mt-2">
          Request cancelled.
        </Alert>
      )}

      {mutation.isError && !cancelled && (
        <Alert variant="danger" className="mt-2">
          <Alert.Heading className="h6 mb-1">Request failed</Alert.Heading>
          <div className="sb-error__message">{String(mutation.error)}</div>
        </Alert>
      )}

      {showResult && lastResult && (
        <div className="sb-method-invoker__result">
          <JsonViewer
            json={lastResult.value}
            title="Response"
            error={lastResult.errored}
            onSave={() => {
              const name = window.prompt('Save response as:', method);
              if (name) saveResponse(name, method, lastResult.value);
            }}
          />
          {meta && (
            <div className="sb-method-invoker__meta">
              {formatDuration(meta.durationMs)} · {formatBytes(meta.size)}
            </div>
          )}
        </div>
      )}

      <Modal show={curlOpen} onHide={() => setCurlOpen(false)}>
        <Modal.Header closeButton>
          <Modal.Title className="h6">Import from curl</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Control
            as="textarea"
            rows={6}
            value={curlText}
            onChange={(e) => setCurlText(e.target.value)}
            placeholder="Paste a curl command…"
            aria-label="curl command"
            autoFocus
          />
          {curlError && (
            <Alert variant="danger" className="mt-2 py-1">
              Could not read JSON-RPC params from this curl command.
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setCurlOpen(false)}>
            Cancel
          </Button>
          <Button variant="success" onClick={importCurl} disabled={!curlText.trim()}>
            Import
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
