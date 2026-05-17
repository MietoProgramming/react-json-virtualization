import type { PathFilterMode } from "../../core/filter";
import type { SourceFormat } from "../../core/sourceFormat";
import type { FlatJsonRow, JSONViewerSearchMetadata } from "../../core/types";
import type { JsonThemeOverride } from "../../theme";
import type {
    JSONViewerRowDecorator,
    JSONViewerRowFilter,
    JSONViewerRowRenderer
} from "./rowCustomization";

export interface JSONViewerProps {
    json: string;
    sourceFormat?: SourceFormat;
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
    activeMatchIndex?: number | null;
    pathFilterCaseSensitive?: boolean;
    searchCaseSensitive?: boolean;
    pathFilterMode?: PathFilterMode;
    searchMode?: PathFilterMode;
    searchMetadataLimit?: number;
    theme?: JsonThemeOverride;
    selectedPath?: string;
    className?: string;
    rowFilter?: JSONViewerRowFilter;
    rowDecorator?: JSONViewerRowDecorator;
    rowRenderer?: JSONViewerRowRenderer;
    onNodeClick?: (path: string, row: FlatJsonRow) => void;
    onParseProgress?: (processedChars: number, totalChars: number) => void;
    onParseError?: (error: Error) => void;
    onSearchMetadata?: (metadata: JSONViewerSearchMetadata) => void;
}
