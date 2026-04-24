import React, { useMemo, useState } from "react";
import { createExpandedPathSet, expandedPathsFromDepth } from "../core/expansion";
import { type PathFilterMode } from "../core/filter";
import type { FlatJsonRow, JSONViewerSearchMetadata } from "../core/types";
import { useVirtualization } from "../hooks/useVirtualization";
import { resolveTheme, type JsonThemeOverride } from "../theme";
import { JSONViewerPlainContent } from "./jsonViewer/JSONViewerPlainContent";
import { JSONViewerTreeContent } from "./jsonViewer/JSONViewerTreeContent";
import { useParsedJsonState } from "./jsonViewer/useParsedJsonState";
import { useSearchMetadataCallback } from "./jsonViewer/useSearchMetadataCallback";
import { useViewerContent } from "./jsonViewer/useViewerContent";
import { useViewerInteractions } from "./jsonViewer/useViewerInteractions";
import { useVirtualizedPrettyContent } from "./jsonViewer/useVirtualizedPrettyContent";
import { createViewerStyle } from "./jsonViewer/viewerStyle";

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
  searchQuery?: string;
  pathFilterCaseSensitive?: boolean;
  pathFilterMode?: PathFilterMode;
  searchMetadataLimit?: number;
  theme?: JsonThemeOverride;
  selectedPath?: string;
  className?: string;
  onNodeClick?: (path: string, row: FlatJsonRow) => void;
  onParseProgress?: (processedChars: number, totalChars: number) => void;
  onParseError?: (error: Error) => void;
  onSearchMetadata?: (metadata: JSONViewerSearchMetadata) => void;
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
  searchQuery,
  pathFilterCaseSensitive = false,
  pathFilterMode = "auto",
  searchMetadataLimit = 500,
  theme,
  selectedPath,
  className,
  onNodeClick,
  onParseProgress,
  onParseError,
  onSearchMetadata
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

  const {
    filteredRows,
    rowsByPath,
    prettyLines,
    filteredPrettyLineIndexes,
    filteredItemCount,
    matchedPathSet,
    matchedPrettyLineIndexSet,
    searchMetadata
  } = useViewerContent({
    metadata,
    json,
    root,
    activeExpandedPaths,
    pathFilterQuery,
    searchQuery,
    pathFilterCaseSensitive,
    pathFilterMode,
    searchMetadataLimit
  });
  useSearchMetadataCallback(onSearchMetadata, searchMetadata);

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
  const {
    visiblePrettyLines,
    visiblePrettyLineNumbers,
    visiblePrettyLineIndexes
  } = useVirtualizedPrettyContent({
    metadata,
    showLineNumbers,
    startIndex,
    endIndex,
    filteredPrettyLineIndexes,
    prettyLines
  });
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
  const style = createViewerStyle(height, resolveTheme(theme));

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
            matchedPaths={matchedPathSet}
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
            visiblePrettyLines={visiblePrettyLines}
            visiblePrettyLineIndexes={visiblePrettyLineIndexes}
            visiblePrettyLineNumbers={visiblePrettyLineNumbers}
            matchedPrettyLineIndexes={matchedPrettyLineIndexSet}
          />
        )
      )}
    </div>
  );
}
