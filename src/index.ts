import "./styles.css";

import { JSONDiffViewer, type JSONDiffViewerProps } from "./components/JSONDiffViewer";
import { JSONViewer, type JSONViewerProps } from "./components/JSONViewer";
import {
    JSONViewerStatic,
    type JSONViewerStaticProps
} from "./components/JSONViewerStatic";

export type VirtualizeJSONCollapsableProps = Omit<JSONViewerProps, "alwaysExpanded">;
export type VirtualizeJSONStaticProps = JSONViewerStaticProps;
export type VirtualizeJSONDiffProps = JSONDiffViewerProps;
export type {
    JSONViewerCopyActions,
    JSONViewerProps,
    JSONViewerRevealResult
} from "./components/jsonViewer/JSONViewerProps";

export const VirtualizeJSON = {
    Collapsable: JSONViewer,
    Static: JSONViewerStatic,
    Diff: JSONDiffViewer
} as const;

export { JSONDiffViewer };
export type { JSONDiffViewerProps };

export type {
    JSONViewerPlainRowContext,
    JSONViewerRowContext, JSONViewerRowDecoration, JSONViewerRowDecorator, JSONViewerRowFilter,
    JSONViewerRowRenderer,
    JSONViewerTreeRowContext
} from "./components/jsonViewer/rowCustomization";
export {
    collapsePath,
    createExpandedPathSet, expandedPathsFromDepth, expandPath, toggleExpandedPath
} from "./core/expansion";
export { createPathSearchIndex, filterRowsByPathQuery } from "./core/filter";
export {
    compareDocuments,
    createLocalDocumentProcessor,
    documentProcessor,
    filterDocument,
    getDocumentPathAncestors,
    getValueAtPath,
    parseDocument,
    parseDocumentPath,
    parentDocumentPath,
    searchDocument,
    serializeNode,
    summarizeComparison
} from "./core/documents";
export type {
    ComparisonSummary,
    CompareOptions,
    DocumentChange,
    DocumentComparison,
    DocumentErrorCode,
    DocumentFilterResult,
    DocumentInput,
    DocumentMatch,
    DocumentOperationOptions,
    DocumentProcessor,
    DocumentProgress,
    DocumentQueryOptions,
    DocumentSearchResult,
    DocumentSerializeOptions,
    ParsedDocument,
    PathLookupResult,
    StructuredFormat,
    SummaryOptions
} from "./core/documents";
export type { PathFilterMode, PathSearchIndex } from "./core/filter";
export { flattenJson } from "./core/flatten";
export { parseJsonIncremental } from "./core/parser";
export {
    resolveSourceFormat,
    sourceFormatFromFileName,
    supportsTreeMetadata
} from "./core/sourceFormat";
export type { ResolvedSourceFormat, SourceFormat } from "./core/sourceFormat";
export { parseSourceIncremental } from "./core/sourceParser";
export type {
    FlatJsonRow,
    JSONValue,
    JSONValueType,
    JSONViewerSearchMetadata,
    SearchMetadataMode
} from "./core/types";
export { defaultTheme, draculaTheme, monokaiTheme, nordTheme, oneDarkTheme, resolveTheme, solarizedDarkTheme, solarizedLightTheme, vscodeDarkTheme } from "./theme";
export type { JsonTheme, JsonThemeOverride, VsCodeTheme } from "./theme";

