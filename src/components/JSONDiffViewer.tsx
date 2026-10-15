import React, { useEffect, useMemo, useState } from "react";
import type { CompareOptions, ComparisonSummary, DocumentComparison, DocumentInput, DocumentProcessor, ParsedDocument, SummaryOptions } from "../core/documents";
import type { JsonThemeOverride } from "../theme";
import { useVirtualization } from "../hooks/useVirtualization";
import { resolveTheme } from "../theme";
import { createViewerStyle } from "./jsonViewer/viewerStyle";
import { buildDiffRows } from "./diff/buildDiffRows";
import { DiffChangeList } from "./diff/DiffChangeList";
import { DiffRowView } from "./diff/DiffRowView";
import { usePreparedDiff } from "./diff/usePreparedDiff";

export interface JSONDiffViewerProps {
  before: DocumentInput | ParsedDocument;
  after: DocumentInput | ParsedDocument;
  comparison?: DocumentComparison;
  compareOptions?: CompareOptions;
  processor?: DocumentProcessor;
  height?: number | string;
  rowHeight?: number;
  overscan?: number;
  theme?: JsonThemeOverride;
  className?: string;
  activeChangeIndex?: number;
  summaryOptions?: SummaryOptions;
  onActiveChangeIndexChange?: (index: number) => void;
  onComparison?: (comparison: DocumentComparison, summary: ComparisonSummary) => void;
  onError?: (error: Error) => void;
}

export function JSONDiffViewer({
  before,
  after,
  comparison,
  compareOptions,
  processor,
  height = 560,
  rowHeight = 24,
  overscan = 8,
  theme,
  className,
  activeChangeIndex,
  summaryOptions,
  onActiveChangeIndexChange,
  onComparison,
  onError
}: JSONDiffViewerProps): React.ReactElement {
  const state = usePreparedDiff({
    beforeInput: before,
    afterInput: after,
    providedComparison: comparison,
    compareOptions,
    processor,
    summaryOptions,
    onComparison,
    onError
  });
  const rows = useMemo(() => state.before && state.after && state.comparison
    ? buildDiffRows(state.before, state.after, state.comparison, compareOptions)
    : [], [compareOptions, state.after, state.before, state.comparison]);
  const rowByExpansionKey = useMemo(() => new Map(rows.map((row) => [row.expansionKey, row])), [rows]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => new Set(["after:$"]));
  const [internalActiveIndex, setInternalActiveIndex] = useState(0);
  const changes = useMemo(() => state.comparison?.changes ?? [], [state.comparison]);
  const activeIndex = activeChangeIndex ?? internalActiveIndex;
  const safeActiveIndex = activeIndex >= 0 && activeIndex < changes.length ? activeIndex : null;
  const visibleRows = useMemo(() => {
    const visible: typeof rows = [];
    const visibleKeys = new Set<string>();
    rows.forEach((row) => {
      const parentVisible = row.parentExpansionKey === null || visibleKeys.has(row.parentExpansionKey);
      const parentExpanded = row.parentExpansionKey === null || expandedPaths.has(row.parentExpansionKey);
      if (!parentVisible || !parentExpanded) return;
      visible.push(row);
      visibleKeys.add(row.expansionKey);
    });
    return visible;
  }, [expandedPaths, rows]);
  const { containerRef, onScroll, startIndex, endIndex, topSpacerHeight, bottomSpacerHeight, scrollToIndex } = useVirtualization({
    rowCount: visibleRows.length,
    rowHeight,
    overscan
  });

  useEffect(() => {
    if (safeActiveIndex === null) return;
    const change = changes[safeActiveIndex];
    const targetRowIndex = rows.findIndex((row) =>
      (change.afterPath && row.afterRow?.path === change.afterPath) ||
      (change.beforePath && row.beforeRow?.path === change.beforePath)
    );
    if (targetRowIndex < 0) return;
    const target = rows[targetRowIndex];
    const parents: string[] = [];
    let parent = target.parentExpansionKey;
    while (parent) {
      parents.push(parent);
      parent = rowByExpansionKey.get(parent)?.parentExpansionKey ?? null;
    }
    setExpandedPaths((current) => {
      const next = new Set(current);
      let changed = false;
      parents.forEach((path) => {
        if (!next.has(path)) { next.add(path); changed = true; }
      });
      return changed ? next : current;
    });
    const visibleIndex = visibleRows.findIndex((row) => row.key === target.key);
    if (visibleIndex >= 0) scrollToIndex(visibleIndex, "center");
  }, [changes, rowByExpansionKey, rows, safeActiveIndex, scrollToIndex, visibleRows]);

  const selectChange = (index: number): void => {
    if (activeChangeIndex === undefined) setInternalActiveIndex(index);
    onActiveChangeIndexChange?.(index);
  };
  const toggle = (path: string): void => {
    setExpandedPaths((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };
  const style = { ...createViewerStyle(height, resolveTheme(theme)), display: "flex", flexDirection: "column" } as React.CSSProperties;
  const rootClassName = `rjv-container rjv-diff-container ${className ?? ""}`.trim();

  return (
    <section className={rootClassName} style={style} aria-label="Document comparison">
      {state.loading && <div className="rjv-status">Comparing documents…</div>}
      {!state.loading && state.error && <div className="rjv-status rjv-status-error" role="alert">{state.error.message}</div>}
      {!state.loading && !state.error && state.comparison && state.summary && (
        <>
          <header className="rjv-diff-summary">
            <strong>{state.summary.description}</strong>
            <span>+{state.summary.added}</span>
            <span>−{state.summary.removed}</span>
            <span>~{state.summary.changed}</span>
            <span>↕{state.summary.moved}</span>
          </header>
          {changes.length > 0 && <DiffChangeList changes={changes} activeIndex={safeActiveIndex} onSelect={selectChange} />}
          <div className="rjv-diff-columns-heading" aria-hidden="true">
            <span /><span>Before</span><span>After</span>
          </div>
          <div
            className="rjv-diff-scroll"
            ref={containerRef}
            onScroll={onScroll}
            role="treegrid"
            aria-label="Aligned document values"
          >
            <div style={{ height: `${topSpacerHeight}px` }} />
            {visibleRows.slice(startIndex, endIndex).map((row) => (
              <DiffRowView
                key={row.key}
                row={row}
                isExpanded={expandedPaths.has(row.expansionKey)}
                isActive={safeActiveIndex !== null && Boolean(changes[safeActiveIndex].afterPath === row.afterRow?.path || changes[safeActiveIndex].beforePath === row.beforeRow?.path)}
                rowHeight={rowHeight}
                onToggle={toggle}
              />
            ))}
            <div style={{ height: `${bottomSpacerHeight}px` }} />
          </div>
        </>
      )}
    </section>
  );
}
