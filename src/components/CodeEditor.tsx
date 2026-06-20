import { useMemo, useRef, type KeyboardEvent, type UIEvent } from 'react';

import { highlightJson } from '../lib/jsonHighlight';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** Fired on Cmd/Ctrl+Enter. */
  onSubmit?: () => void;
  invalid?: boolean;
  height?: number;
  ariaLabel?: string;
}

/**
 * Lightweight JSON editor: a transparent <textarea> over a syntax-highlighted
 * <pre>. Live highlighting with no editor dependency. The two layers share
 * identical type metrics so the caret lines up with the rendered tokens.
 */
export function CodeEditor({
  value,
  onChange,
  onSubmit,
  invalid = false,
  height = 240,
  ariaLabel,
}: CodeEditorProps) {
  const highlightRef = useRef<HTMLPreElement>(null);

  // Trailing newline mirrors the textarea's own, keeping the last line aligned.
  const html = useMemo(() => `${highlightJson(value)}\n`, [value]);

  // Keep the highlight layer scrolled in lockstep with the textarea.
  const syncScroll = (e: UIEvent<HTMLTextAreaElement>) => {
    const pre = highlightRef.current;
    if (!pre) return;
    pre.scrollTop = e.currentTarget.scrollTop;
    pre.scrollLeft = e.currentTarget.scrollLeft;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (onSubmit && (e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className={`sb-code-editor${invalid ? ' is-invalid' : ''}`} style={{ height }}>
      <pre
        className="sb-code-editor__highlight"
        aria-hidden="true"
        ref={highlightRef}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <textarea
        className="sb-code-editor__input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        onKeyDown={onKeyDown}
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        wrap="off"
        aria-label={ariaLabel}
      />
    </div>
  );
}
