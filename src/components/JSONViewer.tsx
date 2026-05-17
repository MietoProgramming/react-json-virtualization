import React, { useMemo, useState } from "react";
import { resolveSourceFormat, supportsTreeMetadata } from "../core/sourceFormat";
import { useVirtualization } from "../hooks/useVirtualization";
import { resolveTheme } from "../theme";
import { JSONViewerPlainContent } from "./jsonViewer/JSONViewerPlainContent";
import type { JSONViewerProps } from "./jsonViewer/JSONViewerProps";
import { JSONViewerTreeContent } from "./jsonViewer/JSONViewerTreeContent";
import { useActiveExpandedPaths } from "./jsonViewer/useActiveExpandedPaths";
import { useActiveMatchNavigation } from "./jsonViewer/useActiveMatchNavigation";
import { useParsedJsonState } from "./jsonViewer/useParsedJsonState";
import { useSearchMetadataCallback } from "./jsonViewer/useSearchMetadataCallback";
import { useViewerContent } from "./jsonViewer/useViewerContent";
import { useViewerInteractions } from "./jsonViewer/useViewerInteractions";
import { useVirtualizedPrettyContent } from "./jsonViewer/useVirtualizedPrettyContent";
import { createViewerStyle } from "./jsonViewer/viewerStyle";

export type { JSONViewerProps } from "./jsonViewer/JSONViewerProps";

export function JSONViewer({
  json,
  sourceFormat = "auto",
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
  activeMatchIndex,
  pathFilterCaseSensitive = false,
  searchCaseSensitive = false,
  pathFilterMode = "auto",
  searchMode,
  searchMetadataLimit = 500,
  theme,
  selectedPath,
  className,
  rowFilter,
  rowDecorator,
  rowRenderer,
  onNodeClick,
  onParseProgress,
  onParseError,
  onSearchMetadata
}: JSONViewerProps): React.ReactElement {
  const resolvedSourceFormat = useMemo(() => resolveSourceFormat(json, sourceFormat), [json, sourceFormat]);
  const usesMetadataTree = metadata && supportsTreeMetadata(resolvedSourceFormat);
  const isExpandedControlled = expandedPaths !== undefined;
  const { root, error, isParsing, internalExpandedPaths, setInternalExpandedPaths } = useParsedJsonState({
    json,
    sourceFormat: resolvedSourceFormat,
    metadata: usesMetadataTree,
    alwaysExpanded,
    initialExpandDepth,
    defaultExpandedPaths,
    isExpandedControlled,
    onParseProgress,
    onParseError,
    onExpandedPathsChange
  });
  const [internalSelectedPath, setInternalSelectedPath] = useState<string>("$");
  const activeExpandedPaths = useActiveExpandedPaths({
    usesMetadataTree,
    root,
    alwaysExpanded,
    expandedPaths,
    internalExpandedPaths
  });
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
    metadata: usesMetadataTree,
    sourceFormat: resolvedSourceFormat,
    json,
    root,
    activeExpandedPaths,
    pathFilterQuery,
    searchQuery,
    pathFilterCaseSensitive,
    searchCaseSensitive,
    pathFilterMode,
    searchMode,
    searchMetadataLimit,
    rowFilter
  });
  useSearchMetadataCallback(onSearchMetadata, searchMetadata);
  const { containerRef, onScroll, startIndex, endIndex, topSpacerHeight, bottomSpacerHeight, scrollToIndex } =
    useVirtualization({
      rowCount: filteredItemCount,
      rowHeight,
      overscan
    });
  const { activeMatchPath, activeMatchLineIndex } = useActiveMatchNavigation({
    searchMetadata,
    activeMatchIndex,
    usesMetadataTree,
    filteredRows,
    filteredPrettyLineIndexes,
    selectedPath,
    setInternalSelectedPath,
    startIndex,
    endIndex,
    scrollToIndex
  });
  const virtualizedRows = filteredRows.slice(startIndex, endIndex);
  const { visiblePrettyLines, visiblePrettyLineNumbers, visiblePrettyLineIndexes } = useVirtualizedPrettyContent({
    metadata: usesMetadataTree,
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
  const rootRole = usesMetadataTree ? "tree" : "region";
  return (
    <div
      className={rootClassName}
      ref={containerRef}
      onScroll={onScroll}
      role={rootRole}
      style={style}
    >
      {isParsing && <div className="rjv-status">Parsing {resolvedSourceFormat.toUpperCase()}...</div>}
      {!isParsing && error && <div className="rjv-status rjv-status-error">{error}</div>}
      {!isParsing && !error && (
        usesMetadataTree ? (
          <JSONViewerTreeContent
            topSpacerHeight={topSpacerHeight}
            bottomSpacerHeight={bottomSpacerHeight}
            visibleRows={virtualizedRows}
            matchedPaths={matchedPathSet}
            activeMatchPath={activeMatchPath}
            activeSelectedPath={activeSelectedPath}
            alwaysExpanded={alwaysExpanded}
            sourceFormat={resolvedSourceFormat}
            rowDecorator={rowDecorator}
            rowRenderer={rowRenderer}
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
            activeMatchLineIndex={activeMatchLineIndex}
            sourceFormat={resolvedSourceFormat}
            rowDecorator={rowDecorator}
            rowRenderer={rowRenderer}
          />
        )
      )}
    </div>
  );
}
