import { useRef, type PointerEvent } from 'react';

interface PaneResizerProps {
  /** Called during the drag with the left pane's new pixel width (unclamped). */
  onResize: (width: number) => void;
  /** Called on double-click to restore the default width. */
  onReset?: () => void;
  /** Accessible label, e.g. "Resize methods list". */
  label: string;
}

/**
 * A vertical drag handle that sits between two flex panes. It resizes the pane
 * immediately to its left (its previous sibling), reporting that pane's new
 * pixel width to the parent — which clamps and persists it (see usePaneWidth).
 * Double-click resets to the default. Hidden on stacked (narrow) layouts via CSS.
 */
export function PaneResizer({ onResize, onReset, label }: PaneResizerProps) {
  const start = useRef<{ x: number; w: number } | null>(null);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const pane = e.currentTarget.previousElementSibling as HTMLElement | null;
    if (!pane) return;
    start.current = { x: e.clientX, w: pane.getBoundingClientRect().width };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!start.current) return;
    onResize(start.current.w + (e.clientX - start.current.x));
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!start.current) return;
    start.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div
      className="sb-pane-resizer"
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      title="Drag to resize · double-click to reset"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={onReset}
    />
  );
}
