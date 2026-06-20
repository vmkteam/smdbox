import { useMemo, useState } from 'react';
import { Button, Form, Modal, Tab, Tabs } from 'react-bootstrap';
import { ArrowsAngleExpand, Clipboard, ClipboardCheck, Download } from 'react-bootstrap-icons';
import { JSONTree } from 'react-json-tree';

import { useClipboard } from '../hooks/useClipboard';
import { filterJson } from '../lib/jsonFilter';
import { highlightJson } from '../lib/jsonHighlight';
import { useStore } from '../store/store';

interface JsonViewerProps {
  json: unknown;
  title?: string;
  /** Tints the title to flag an error payload. */
  error?: boolean;
}

// Monokai-ish base16 theme; base00 is transparent so the container bg shows
// through. invertTheme flips it for light mode.
const TREE_THEME = {
  base00: 'transparent',
  base01: '#383830',
  base02: '#49483e',
  base03: '#75715e',
  base04: '#a59f85',
  base05: '#f8f8f2',
  base06: '#f5f4f1',
  base07: '#f9f8f5',
  base08: '#f92672',
  base09: '#fd971f',
  base0A: '#f4bf75',
  base0B: '#a6e22e',
  base0C: '#a1efe4',
  base0D: '#66d9ef',
  base0E: '#ae81ff',
  base0F: '#cc6633',
};

function stringify(json: unknown): string {
  try {
    return JSON.stringify(json, null, 2);
  } catch {
    return '';
  }
}

function Tree({ data, light, expandAll }: { data: unknown; light: boolean; expandAll: boolean }) {
  if (data === undefined) return <div className="sb-muted">No matches</div>;
  return (
    <JSONTree
      data={data}
      theme={TREE_THEME}
      invertTheme={light}
      hideRoot
      shouldExpandNodeInitially={(_keyPath, _data, level) => expandAll || level < 2}
    />
  );
}

/** Interactive JSON viewer: searchable tree, highlighted raw, and a fullscreen modal. */
export function JsonViewer({ json, title = 'Response', error = false }: JsonViewerProps) {
  const { copied, copy } = useClipboard();
  const light = useStore((s) => s.prefs.theme === 'light');
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [wrap, setWrap] = useState(false);

  const text = useMemo(() => stringify(json), [json]);
  const treeData = useMemo(() => filterJson(json, query), [json, query]);
  const rawHtml = useMemo(() => highlightJson(text), [text]);

  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, '-') || 'response'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Copy + Download, reused inline and in the expand modal (right-aligned).
  const actionButtons = (
    <>
      <Button size="sm" variant="outline-secondary" onClick={() => copy(text)}>
        {copied ? <ClipboardCheck className="me-1" /> : <Clipboard className="me-1" />}
        {copied ? 'Copied' : 'Copy'}
      </Button>
      <Button
        size="sm"
        variant="outline-secondary"
        onClick={download}
        aria-label="Download JSON"
        title="Download JSON"
      >
        <Download className="me-1" /> Download
      </Button>
    </>
  );

  const search = (
    <Form.Control
      size="sm"
      className="mb-2"
      placeholder="Filter response…"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      aria-label="Filter response"
    />
  );

  return (
    <div className="sb-json-viewer">
      <h4 className="sb-json-viewer__head">
        <span className={error ? 'text-danger' : undefined}>{title}</span>
        <span className="sb-json-viewer__actions">
          {actionButtons}
          <Button
            size="sm"
            variant="outline-secondary"
            onClick={() => setExpanded(true)}
            aria-label="Expand response"
            title="Expand"
          >
            <ArrowsAngleExpand />
          </Button>
        </span>
      </h4>

      <Tabs defaultActiveKey="tree" id={`json-viewer-${title}`} className="mb-2">
        <Tab eventKey="tree" title="Tree">
          {search}
          <div className="sb-json-viewer__tree">
            <Tree data={treeData} light={light} expandAll={Boolean(query.trim())} />
          </div>
        </Tab>
        <Tab eventKey="raw" title="Raw">
          <Form.Check
            type="switch"
            id={`wrap-${title}`}
            label="Wrap lines"
            checked={wrap}
            onChange={(e) => setWrap(e.target.checked)}
            className="mb-2"
          />
          <pre
            className={`sb-json-code${wrap ? ' sb-json-code--wrap' : ''}`}
            dangerouslySetInnerHTML={{ __html: rawHtml }}
          />
        </Tab>
      </Tabs>

      <Modal show={expanded} onHide={() => setExpanded(false)} size="xl" scrollable>
        <Modal.Header closeButton>
          <Modal.Title className="h6">{title}</Modal.Title>
          <span className="sb-json-viewer__actions ms-auto me-2">{actionButtons}</span>
        </Modal.Header>
        <Modal.Body>
          {search}
          <div className="sb-json-viewer__tree sb-json-viewer__tree--full">
            <Tree data={treeData} light={light} expandAll={Boolean(query.trim())} />
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
}
