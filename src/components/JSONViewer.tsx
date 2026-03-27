import React, { useMemo, useState } from "react";
import { createExpandedPathSet, expandedPathsFromDepth } from "../core/expansion";
import { type PathFilterMode } from "../core/filter";
import type { FlatJsonRow } from "../core/types";
import { useVirtualization } from "../hooks/useVirtualization";
import { resolveTheme, type JsonThemeOverride } from "../theme";
import { JSONViewerPlainContent } from "./jsonViewer/JSONViewerPlainContent";
import { JSONViewerTreeContent } from "./jsonViewer/JSONViewerTreeContent";
import { useParsedJsonState } from "./jsonViewer/useParsedJsonState";
import { useViewerContent } from "./jsonViewer/useViewerContent";
import { useViewerInteractions } from "./jsonViewer/useViewerInteractions";

export interface JSONViewerProps {
  json: string;
  metadata?: boolean;
  showLineNumbers?: boolean;
  height?: number | string;
  rowHeight?: number;
  overscan?: number;
  alwaysExpanded?: boolean;
  initialExpandDepth?: number;
  expandedPaths?: ReadonlySet<string>;
  defaultExpandedPaths?: Iterable<string>;
  onExpandedPathsChange?: (paths: Set<string>) => void;
  pathFilterQuery?: string;
  pathFilterCaseSensitive?: boolean;
  pathFilterMode?: PathFilterMode;
  theme?: JsonThemeOverride;
  selectedPath?: string;
  className?: string;
  onNodeClick?: (path: string, row: FlatJsonRow) => void;
  onParseProgress?: (processedChars: number, totalChars: number) => void;
  onParseError?: (error: Error) => void;
}

export function JSONViewer({
  json,
  metadata = true,
  showLineNumbers = true,
  height = 520,
  rowHeight = 24,
  overscan = 8,
  alwaysExpanded = false,
  initialExpandDepth = 1,
  expandedPaths,
  defaultExpandedPaths,
  onExpandedPathsChange,
  pathFilterQuery,
  pathFilterCaseSensitive = false,
  pathFilterMode = "auto",
  theme,
  selectedPath,
  className,
  onNodeClick,
  onParseProgress,
  onParseError
}: JSONViewerProps): React.ReactElement {
  const isExpandedControlled = expandedPaths !== undefined;
  const { root, error, isParsing, internalExpandedPaths, setInternalExpandedPaths } = useParsedJsonState({
    json,
    metadata,
    alwaysExpanded,
    initialExpandDepth,
    defaultExpandedPaths,
    isExpandedControlled,
    onParseProgress,
    onParseError,
    onExpandedPathsChange
  });
  const [internalSelectedPath, setInternalSelectedPath] = useState<string>("$");

  const fullyExpandedPaths = useMemo(() => {
    if (!metadata || root === null) {
      return createExpandedPathSet();
    }
    return expandedPathsFromDepth(root, Number.POSITIVE_INFINITY);
  }, [metadata, root]);

  const activeExpandedPaths = useMemo(
    () =>
      !metadata
        ? createExpandedPathSet()
        :
      alwaysExpanded
        ? fullyExpandedPaths
        : createExpandedPathSet(expandedPaths ?? internalExpandedPaths),
    [alwaysExpanded, expandedPaths, fullyExpandedPaths, internalExpandedPaths, metadata]
  );

  const { filteredRows, rowsByPath, prettyLines, filteredPrettyLineIndexes, filteredItemCount } = useViewerContent({
    metadata,
    json,
    root,
    activeExpandedPaths,
    pathFilterQuery,
    pathFilterCaseSensitive,
    pathFilterMode
  });

  const {
    containerRef,
    onScroll,
    startIndex,
    endIndex,
    topSpacerHeight,
    bottomSpacerHeight
  } = useVirtualization({
    rowCount: filteredItemCount,
    rowHeight,
    overscan
  });

  const virtualizedRows = filteredRows.slice(startIndex, endIndex);
  const virtualizedPrettyLines = useMemo(() => {
    if (metadata || filteredPrettyLineIndexes.length === 0) {
      return [] as string[];
    }

    return filteredPrettyLineIndexes
      .slice(startIndex, endIndex)
      .map((lineIndex) => prettyLines[lineIndex]);
  }, [endIndex, filteredPrettyLineIndexes, metadata, prettyLines, startIndex]);
  const virtualizedPrettyLineNumbers = useMemo(() => {
    if (metadata || !showLineNumbers || endIndex <= startIndex) {
      return "";
    }

    return filteredPrettyLineIndexes
      .slice(startIndex, endIndex)
      .map((lineIndex) => String(lineIndex + 1))
      .join("\n");
  }, [endIndex, filteredPrettyLineIndexes, metadata, showLineNumbers, startIndex]);
  const activeSelectedPath = selectedPath ?? internalSelectedPath;

  const { onToggle, onSelect } = useViewerInteractions({
    alwaysExpanded,
    isExpandedControlled,
    activeExpandedPaths,
    setInternalExpandedPaths,
    onExpandedPathsChange,
    rowsByPath,
    setInternalSelectedPath,
    onNodeClick
  });

  const resolvedTheme = resolveTheme(theme);

  const style = {
    height,
    "--rjv-background": resolvedTheme.background,
    "--rjv-row-hover": resolvedTheme.rowHover,
    "--rjv-row-selected": resolvedTheme.rowSelected,
    "--rjv-token-key": resolvedTheme.key,
    "--rjv-token-punctuation": resolvedTheme.punctuation,
    "--rjv-token-string": resolvedTheme.string,
    "--rjv-token-number": resolvedTheme.number,
    "--rjv-token-boolean": resolvedTheme.boolean,
    "--rjv-token-null": resolvedTheme.null,
    "--rjv-focus-ring": resolvedTheme.focusRing
  } as React.CSSProperties;

  const rootClassName = className ? `rjv-container ${className}` : "rjv-container";
  const rootRole = metadata ? "tree" : "region";

  return (
    <div
      className={rootClassName}
      ref={containerRef}
      onScroll={onScroll}
      role={rootRole}
      style={style}
    >
      {isParsing && <div className="rjv-status">Parsing JSON...</div>}
      {!isParsing && error && <div className="rjv-status rjv-status-error">{error}</div>}
      {!isParsing && !error && (
        metadata ? (
          <JSONViewerTreeContent
            topSpacerHeight={topSpacerHeight}
            bottomSpacerHeight={bottomSpacerHeight}
            visibleRows={virtualizedRows}
            activeSelectedPath={activeSelectedPath}
            alwaysExpanded={alwaysExpanded}
            onToggle={onToggle}
            onSelect={onSelect}
          />
        ) : (
          <JSONViewerPlainContent
            topSpacerHeight={topSpacerHeight}
            bottomSpacerHeight={bottomSpacerHeight}
            showLineNumbers={showLineNumbers}
            rowHeight={rowHeight}
            startIndex={startIndex}
            visiblePrettyLines={virtualizedPrettyLines}
            visiblePrettyLineNumbers={virtualizedPrettyLineNumbers}
          />
        )
      )}
    </div>
  );
}
