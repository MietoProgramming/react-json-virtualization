import { useMemo } from "react";
import { createPathSearchIndex, type PathFilterMode } from "../../core/filter";
import { splitFilterQueryTerms } from "../../core/filterQuery";
import { flattenJson } from "../../core/flatten";
import { normalizeQuery, searchPrettyLinesByQueries, searchRowsByQueries } from "../../core/search";
import type { FlatJsonRow, JSONValue, JSONViewerSearchMetadata } from "../../core/types";
import { toPrettyLines } from "./prettyLines";
import {
    buildQueryParts,
    buildSearchMetadata,
    EMPTY_MATCHED_PATHS,
    EMPTY_MATCHED_PRETTY_LINE_INDEXES
} from "./searchMetadata";

interface UseViewerContentParams {
  metadata: boolean;
  json: string;
  root: JSONValue | null;
  activeExpandedPaths: ReadonlySet<string>;
  pathFilterQuery?: string;
  searchQuery?: string;
  pathFilterCaseSensitive: boolean;
  pathFilterMode: PathFilterMode;
  searchMetadataLimit?: number;
}

interface ViewerContentState {
  filteredRows: FlatJsonRow[];
  rowsByPath: Map<string, FlatJsonRow>;
  prettyLines: string[];
  filteredPrettyLineIndexes: number[];
  filteredItemCount: number;
  matchedPathSet: ReadonlySet<string>;
  matchedPrettyLineIndexSet: ReadonlySet<number>;
  searchMetadata: JSONViewerSearchMetadata;
}

const usesPrefixPathFiltering = (term: string, mode: PathFilterMode): boolean => {
  if (mode === "prefix") {
    return true;
  }

  return mode === "auto" && term.startsWith("$");
};

export const canUsePrefixPathSearchIndex = (
  queryTerms: string[],
  mode: PathFilterMode
): boolean => {
  return queryTerms.length === 1 && usesPrefixPathFiltering(queryTerms[0], mode);
};

export const useViewerContent = ({
  metadata,
  json,
  root,
  activeExpandedPaths,
  pathFilterQuery,
  searchQuery,
  pathFilterCaseSensitive,
  pathFilterMode,
  searchMetadataLimit
}: UseViewerContentParams): ViewerContentState => {
  const rows = useMemo(() => {
    if (!metadata || root === null) {
      return [] as FlatJsonRow[];
    }
    return flattenJson(root, activeExpandedPaths, { metadata });
  }, [activeExpandedPaths, metadata, root]);

  const normalizedPathFilterQuery = normalizeQuery(pathFilterQuery);
  const normalizedSearchQuery = normalizeQuery(searchQuery);
  const queryParts = useMemo(
    () => buildQueryParts(normalizedPathFilterQuery, normalizedSearchQuery),
    [normalizedPathFilterQuery, normalizedSearchQuery]
  );
  const shouldBuildPathSearchIndex = useMemo(() => {
    return metadata && queryParts.some((query) => {
      return canUsePrefixPathSearchIndex(splitFilterQueryTerms(query), pathFilterMode);
    });
  }, [metadata, pathFilterMode, queryParts]);

  const pathSearchIndex = useMemo(() => {
    if (!shouldBuildPathSearchIndex) {
      return undefined;
    }

    return createPathSearchIndex(rows, { caseSensitive: pathFilterCaseSensitive });
  }, [pathFilterCaseSensitive, rows, shouldBuildPathSearchIndex]);

  const treeSearchResult = useMemo(() => {
    if (!metadata) {
      return undefined;
    }

    return searchRowsByQueries(rows, queryParts, {
      caseSensitive: pathFilterCaseSensitive,
      mode: pathFilterMode,
      index: pathSearchIndex
    });
  }, [metadata, pathFilterCaseSensitive, pathFilterMode, pathSearchIndex, queryParts, rows]);
  const filteredRows = metadata ? (treeSearchResult?.filteredRows ?? []) : [];
  const matchedPathSet = metadata
    ? (treeSearchResult?.directMatchPathSet ?? EMPTY_MATCHED_PATHS)
    : EMPTY_MATCHED_PATHS;

  const prettyLines = useMemo(() => {
    if (metadata) {
      return [] as string[];
    }

    return toPrettyLines(json);
  }, [json, metadata]);

  const plainSearchResult = useMemo(() => {
    if (metadata) {
      return undefined;
    }

    return searchPrettyLinesByQueries(prettyLines, queryParts, pathFilterCaseSensitive);
  }, [metadata, pathFilterCaseSensitive, prettyLines, queryParts]);
  const filteredPrettyLineIndexes = metadata
    ? []
    : (plainSearchResult?.filteredLineIndexes ?? []);
  const matchedPrettyLineIndexSet = useMemo(() => {
    if (metadata || !plainSearchResult || plainSearchResult.matchedLineIndexes.length === 0) {
      return EMPTY_MATCHED_PRETTY_LINE_INDEXES;
    }

    return new Set<number>(plainSearchResult.matchedLineIndexes);
  }, [metadata, plainSearchResult]);

  const rowsByPath = useMemo(() => {
    const index = new Map<string, FlatJsonRow>();
    rows.forEach((row) => {
      index.set(row.path, row);
    });
    return index;
  }, [rows]);

  const searchMetadata = useMemo<JSONViewerSearchMetadata>(() => {
    return buildSearchMetadata({
      metadata,
      pathFilterQuery: normalizedPathFilterQuery,
      searchQuery: normalizedSearchQuery,
      searchMetadataLimit,
      treeSearchResult,
      plainSearchResult
    });
  }, [
    metadata,
    normalizedPathFilterQuery,
    normalizedSearchQuery,
    plainSearchResult,
    searchMetadataLimit,
    treeSearchResult
  ]);

  return {
    filteredRows,
    rowsByPath,
    prettyLines,
    filteredPrettyLineIndexes,
    filteredItemCount: metadata ? filteredRows.length : filteredPrettyLineIndexes.length,
    matchedPathSet,
    matchedPrettyLineIndexSet,
    searchMetadata
  };
};
