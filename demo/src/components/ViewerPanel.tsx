import { VirtualizeJSON, type FlatJsonRow, type JsonThemeOverride, type JSONViewerSearchMetadata, type SourceFormat } from "react-json-virtualization";

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
  searchMetadataLimit: number;
  theme: JsonThemeOverride;
  className?: string;
  selectedPath: string;
  onNodeClick: (path: string, row: FlatJsonRow) => void;
  onSearchMetadata: (meta: JSONViewerSearchMetadata) => void;
  onParseProgress: (processed: number, total: number) => void;
  onParseError: (error: Error) => void;
}

export function ViewerPanel({
  viewerMode, json, sourceFormat, metadata, showLineNumbers, height,
  rowHeight, overscan, initialExpandDepth, expandedPaths,
  pathFilterQuery, searchQuery, activeMatchIndex,
  pathFilterCaseSensitive, searchCaseSensitive, pathFilterMode,
  searchMetadataLimit, theme, className, selectedPath,
  onNodeClick, onSearchMetadata, onParseProgress, onParseError
}: ViewerPanelProps): JSX.Element {
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
    searchMetadataLimit,
    theme,
    className,
    selectedPath,
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
