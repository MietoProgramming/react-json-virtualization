import { useEffect, useMemo, useState } from "react";
import {
    VirtualizeJSON,
    type FlatJsonRow,
    type JsonThemeOverride,
    type JSONViewerRowDecorator,
    type JSONViewerRowFilter,
    type JSONViewerRowRenderer,
    type JSONViewerSearchMetadata,
    type SourceFormat
} from "react-json-virtualization";
import { createWorkerProcessor } from "react-json-virtualization/worker";

interface ViewerPanelProps {
  viewerMode: "collapsable" | "static";
  json: string;
  sourceFormat: SourceFormat;
  metadata: boolean;
  showLineNumbers: boolean;
  height: number;
  rowHeight: number;
  overscan: number;
  initialExpandDepth?: number;
  expandedPaths?: Set<string>;
  pathFilterQuery: string;
  searchQuery: string;
  activeMatchIndex: number | null;
  pathFilterCaseSensitive: boolean;
  searchCaseSensitive: boolean;
  pathFilterMode: "auto" | "prefix" | "includes" | "exact";
  searchMatchMode: "auto" | "prefix" | "includes" | "exact";
  searchMetadataLimit: number;
  theme: JsonThemeOverride;
  className?: string;
  selectedPath: string;
  rowHighlightQuery: string;
  rowHideQuery: string;
  rowHighlightEnabled: boolean;
  rowActionsEnabled: boolean;
  rowRendererEnabled: boolean;
  rowHideEnabled: boolean;
  onNodeClick: (path: string, row: FlatJsonRow) => void;
  onSearchMetadata: (meta: JSONViewerSearchMetadata) => void;
  onParseProgress: (processed: number, total: number) => void;
  onParseError: (error: Error) => void;
}

export function ViewerPanel({
  viewerMode, json, sourceFormat, metadata, showLineNumbers, height,
  rowHeight, overscan, initialExpandDepth, expandedPaths,
  pathFilterQuery, searchQuery, activeMatchIndex,
  pathFilterCaseSensitive, searchCaseSensitive, pathFilterMode, searchMatchMode,
  searchMetadataLimit, theme, className, selectedPath,
  rowHighlightQuery, rowHideQuery, rowHighlightEnabled,
  rowActionsEnabled, rowRendererEnabled, rowHideEnabled,
  onNodeClick, onSearchMetadata, onParseProgress, onParseError
}: ViewerPanelProps): JSX.Element {
  const [pathDraft, setPathDraft] = useState("");
  const [revealPath, setRevealPath] = useState<string>();
  const [revealStatus, setRevealStatus] = useState("");
  const [copyEnabled, setCopyEnabled] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [useWorker, setUseWorker] = useState(false);
  const processor = useMemo(() => useWorker
    ? createWorkerProcessor(() => new Worker(new URL("../document.worker.ts", import.meta.url), { type: "module" }))
    : undefined, [useWorker]);
  useEffect(() => () => processor?.dispose?.(), [processor]);
  const highlightNeedle = rowHighlightQuery.trim().toLowerCase();
  const hideNeedle = rowHideQuery.trim().toLowerCase();

  const rowFilter = useMemo<JSONViewerRowFilter | undefined>(() => {
    if (!rowHideEnabled || !hideNeedle) {
      return undefined;
    }

    return (context) => !context.text.toLowerCase().includes(hideNeedle);
  }, [hideNeedle, rowHideEnabled]);

  const rowDecorator = useMemo<JSONViewerRowDecorator | undefined>(() => {
    if (!highlightNeedle || (!rowHighlightEnabled && !rowActionsEnabled)) {
      return undefined;
    }

    return (context) => {
      const isMatch = context.text.toLowerCase().includes(highlightNeedle);
      if (!isMatch) {
        return undefined;
      }

      return {
        className: rowHighlightEnabled ? "demo-row-highlight" : undefined,
        actions: rowActionsEnabled ? (
          <button type="button" className="demo-row-action" aria-label="Mark row">
            Mark
          </button>
        ) : undefined
      };
    };
  }, [highlightNeedle, rowActionsEnabled, rowHighlightEnabled]);

  const rowRenderer = useMemo<JSONViewerRowRenderer | undefined>(() => {
    if (!rowRendererEnabled || !highlightNeedle) {
      return undefined;
    }

    return function renderDemoRow(context, defaultContent) {
      const isMatch = context.text.toLowerCase().includes(highlightNeedle);
      if (!isMatch) {
        return defaultContent;
      }

      return (
        <button
          type="button"
          className="demo-row-pill"
          onClick={(event) => event.stopPropagation()}
        >
          {defaultContent}
        </button>
      );
    };
  }, [highlightNeedle, rowRendererEnabled]);

  const commonProps = {
    json,
    sourceFormat,
    metadata,
    showLineNumbers,
    height,
    rowHeight,
    overscan,
    pathFilterQuery,
    searchQuery,
    activeMatchIndex,
    pathFilterCaseSensitive,
    searchCaseSensitive,
    pathFilterMode,
    searchMode: searchMatchMode,
    searchMetadataLimit,
    theme,
    className,
    selectedPath,
    rowFilter,
    rowDecorator,
    rowRenderer,
    processor,
    onNodeClick,
    onSearchMetadata,
    onParseProgress,
    onParseError
  };

  const viewer = viewerMode === "collapsable"
    ? <VirtualizeJSON.Collapsable {...commonProps} initialExpandDepth={initialExpandDepth} expandedPaths={expandedPaths} revealPath={revealPath} copyActions={copyEnabled} onRevealResult={(result) => { setRevealStatus(`${result.status}: ${result.path}`); setRevealPath(undefined); }} onCopyError={(error) => setCopyError(error.message)} />
    : <VirtualizeJSON.Static {...commonProps} revealPath={revealPath} copyActions={copyEnabled} onRevealResult={(result) => { setRevealStatus(`${result.status}: ${result.path}`); setRevealPath(undefined); }} onCopyError={(error) => setCopyError(error.message)} />;

  return (
    <>
      <div className="demo-path-controls">
        <label>Reveal path <input value={pathDraft} onChange={(event) => setPathDraft(event.target.value)} placeholder="$.users[0].name" /></label>
        <button type="button" onClick={() => { setRevealStatus(""); setRevealPath(pathDraft.trim()); }}>Go</button>
        <label><input type="checkbox" checked={copyEnabled} onChange={(event) => setCopyEnabled(event.target.checked)} /> Enable row copy actions</label>
        <label><input type="checkbox" checked={useWorker} onChange={(event) => setUseWorker(event.target.checked)} /> Parse JSON in Web Worker</label>
        <span aria-live="polite">{revealStatus || copyError}</span>
      </div>
      {viewer}
    </>
  );
}
