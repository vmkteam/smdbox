import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Button, Form, Modal, Tab, Tabs } from 'react-bootstrap';
import {
  ArrowsAngleExpand,
  ArrowsCollapse,
  ArrowsExpand,
  BookmarkPlus,
  BoxArrowUpRight,
  Clipboard,
  ClipboardCheck,
  Download,
  Pencil,
} from 'react-bootstrap-icons';
import { JSONTree } from 'react-json-tree';

import { useClipboard } from '../hooks/useClipboard';
import { idLinkUrl, lowerRuleKeys } from '../lib/idLinks';
import { filterJson } from '../lib/jsonFilter';
import { highlightJson } from '../lib/jsonHighlight';
import { useStore } from '../store/store';
import { CodeEditor } from './CodeEditor';

interface JsonViewerProps {
  json: unknown;
  title?: string;
  /** Tints the title to flag an error payload. */
  error?: boolean;
  /** When set, renders a "Save" action (e.g. to store the response). */
  onSave?: () => void;
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

interface TreeProps {
  data: unknown;
  light: boolean;
  /** Force-expand everything (e.g. while filtering). */
  expandAll: boolean;
  /** Levels expanded by default (Infinity = expand all, 0 = collapse all). */
  expandLevel: number;
  /** Lowercased field -> URL-template rules (see lowerRuleKeys). */
  idLinkRules: Record<string, string>;
}

function Tree({ data, light, expandAll, expandLevel, idLinkRules }: TreeProps) {
  if (data === undefined) return <div className="sb-muted">No matches</div>;
  return (
    <JSONTree
      data={data}
      theme={TREE_THEME}
      invertTheme={light}
      hideRoot
      shouldExpandNodeInitially={(_keyPath, _data, level) => expandAll || level < expandLevel}
      // Turn ids into open/copy links when the field matches a configured rule (F1).
      valueRenderer={(display, value, ...keyPath) => {
        const url = idLinkUrl(keyPath as (string | number)[], value, idLinkRules);
        if (!url) return display as ReactNode;
        return (
          <span className="sb-json-link">
            <span>{display as ReactNode}</span>
            <a
              className="sb-json-link__btn"
              href={url}
              target="_blank"
              rel="noreferrer"
              title={`Open ${url}`}
              onClick={(e) => e.stopPropagation()}
            >
              <BoxArrowUpRight />
            </a>
            <button
              type="button"
              className="sb-json-link__btn"
              title="Copy link"
              onClick={(e) => {
                e.stopPropagation();
                void navigator.clipboard?.writeText(url);
              }}
            >
              <Clipboard />
            </button>
          </span>
        );
      }}
    />
  );
}

/** Interactive JSON viewer: searchable tree, highlighted raw, and a fullscreen modal. */
export function JsonViewer({ json, title = 'Response', error = false, onSave }: JsonViewerProps) {
  const { copied, copy } = useClipboard();
  const light = useStore((s) => s.prefs.theme === 'light');
  const idLinks = useStore((s) => s.idLinks);
  const idLinkRules = useMemo(() => lowerRuleKeys(idLinks), [idLinks]);
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [wrap, setWrap] = useState(false);
  // Expand-all / collapse-all: bump treeKey to remount the tree with a new
  // default depth; re-runs keep the key (and thus the user's expand state).
  const [expandMode, setExpandMode] = useState<'all' | 'none' | null>(null);
  const [treeKey, setTreeKey] = useState(0);
  const expandLevel = expandMode === 'all' ? Infinity : expandMode === 'none' ? 0 : 2;
  const expandAllNodes = () => {
    setExpandMode('all');
    setTreeKey((k) => k + 1);
  };
  const collapseAllNodes = () => {
    setExpandMode('none');
    setTreeKey((k) => k + 1);
  };
  // E2: local edits to the raw response (for tweaking before reuse as a mock).
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);

  const text = useMemo(() => stringify(json), [json]);
  const shown = draft ?? text;
  const treeData = useMemo(() => filterJson(json, query), [json, query]);
  const rawHtml = useMemo(() => highlightJson(shown), [shown]);

  // A new response discards any local edit.
  useEffect(() => {
    setDraft(null);
    setEditing(false);
  }, [text]);

  const download = () => {
    const url = URL.createObjectURL(new Blob([shown], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, '-') || 'response'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Copy + Download (+ optional Save), reused inline and in the expand modal.
  const actionButtons = (
    <>
      {onSave && (
        <Button size="sm" variant="outline-secondary" onClick={onSave} title="Save this response">
          <BookmarkPlus className="me-1" /> Save
        </Button>
      )}
      <Button size="sm" variant="outline-secondary" onClick={() => copy(shown)}>
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

  // Filter input + expand-all/collapse-all, shown above the tree (inline and modal).
  const treeControls = (
    <div className="sb-json-viewer__treebar">
      <Form.Control
        size="sm"
        placeholder="Filter response…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Filter response"
      />
      <Button size="sm" variant="outline-secondary" onClick={expandAllNodes} aria-label="Expand all" title="Expand all">
        <ArrowsExpand />
      </Button>
      <Button size="sm" variant="outline-secondary" onClick={collapseAllNodes} aria-label="Collapse all" title="Collapse all">
        <ArrowsCollapse />
      </Button>
    </div>
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
          {treeControls}
          <div className="sb-json-viewer__tree">
            <Tree
              key={treeKey}
              data={treeData}
              light={light}
              expandAll={Boolean(query.trim())}
              expandLevel={expandLevel}
              idLinkRules={idLinkRules}
            />
          </div>
        </Tab>
        <Tab eventKey="raw" title="Raw">
          <div className="sb-json-viewer__rawbar">
            <Form.Check
              type="switch"
              id={`wrap-${title}`}
              label="Wrap lines"
              checked={wrap}
              onChange={(e) => setWrap(e.target.checked)}
              disabled={editing}
            />
            <Button
              size="sm"
              variant="outline-secondary"
              onClick={() => {
                if (!editing && draft === null) setDraft(text);
                setEditing((v) => !v);
              }}
              title="Edit the response (local only)"
            >
              <Pencil className="me-1" /> {editing ? 'Done' : 'Edit'}
            </Button>
          </div>
          {editing ? (
            <CodeEditor value={draft ?? text} onChange={setDraft} ariaLabel="Edit response JSON" />
          ) : (
            <pre
              className={`sb-json-code${wrap ? ' sb-json-code--wrap' : ''}`}
              dangerouslySetInnerHTML={{ __html: rawHtml }}
            />
          )}
        </Tab>
      </Tabs>

      <Modal show={expanded} onHide={() => setExpanded(false)} size="xl" scrollable>
        <Modal.Header closeButton>
          <Modal.Title className="h6">{title}</Modal.Title>
          <span className="sb-json-viewer__actions ms-auto me-2">{actionButtons}</span>
        </Modal.Header>
        <Modal.Body>
          {treeControls}
          <div className="sb-json-viewer__tree sb-json-viewer__tree--full">
            <Tree
              key={treeKey}
              data={treeData}
              light={light}
              expandAll={Boolean(query.trim())}
              expandLevel={expandLevel}
              idLinkRules={idLinkRules}
            />
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
}
