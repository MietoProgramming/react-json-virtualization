import { useMemo } from "react";
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

    return (context, defaultContent) => {
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
    onNodeClick,
    onSearchMetadata,
    onParseProgress,
    onParseError
  };

  if (viewerMode === "collapsable") {
    return (
      <VirtualizeJSON.Collapsable
        {...commonProps}
        initialExpandDepth={initialExpandDepth}
        expandedPaths={expandedPaths}
      />
    );
  }

  return <VirtualizeJSON.Static {...commonProps} />;
}
