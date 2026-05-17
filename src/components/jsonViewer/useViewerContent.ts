import { useMemo } from "react";
import { createPathSearchIndex, type PathFilterMode } from "../../core/filter";
import { splitFilterQueryTerms } from "../../core/filterQuery";
import { flattenJson } from "../../core/flatten";
import { normalizeQuery, searchPrettyLinesByQueries, searchRowsByQueries } from "../../core/search";
import type { ResolvedSourceFormat } from "../../core/sourceFormat";
import type { FlatJsonRow, JSONValue, JSONViewerSearchMetadata } from "../../core/types";
import { toPrettyLines } from "./prettyLines";
import type { JSONViewerRowFilter } from "./rowCustomization";
import { createPlainRowContext, createTreeRowContext } from "./rowCustomization";
import { buildQueryParts, buildSearchMetadata, EMPTY_MATCHED_PATHS, EMPTY_MATCHED_PRETTY_LINE_INDEXES } from "./searchMetadata";

interface UseViewerContentParams {
  metadata: boolean;
  sourceFormat: ResolvedSourceFormat;
  json: string;
  root: JSONValue | null;
  activeExpandedPaths: ReadonlySet<string>;
  pathFilterQuery?: string;
  searchQuery?: string;
  pathFilterCaseSensitive: boolean;
  searchCaseSensitive?: boolean;
  pathFilterMode: PathFilterMode;
  searchMode?: PathFilterMode;
  searchMetadataLimit?: number;
  rowFilter?: JSONViewerRowFilter;
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
  sourceFormat,
  json,
  root,
  activeExpandedPaths,
  pathFilterQuery,
  searchQuery,
  pathFilterCaseSensitive,
  searchCaseSensitive = false,
  pathFilterMode,
  searchMode = pathFilterMode,
  searchMetadataLimit,
  rowFilter
}: UseViewerContentParams): ViewerContentState => {
  const rows = useMemo(() => {
    if (!metadata || root === null) {
      return [] as FlatJsonRow[];
    }
    return flattenJson(root, activeExpandedPaths, { metadata });
  }, [activeExpandedPaths, metadata, root]);

  const normalizedPathFilterQuery = normalizeQuery(pathFilterQuery);
  const normalizedSearchQuery = normalizeQuery(searchQuery);
  const filterQueryParts = useMemo(() => buildQueryParts(normalizedPathFilterQuery), [normalizedPathFilterQuery]);
  const searchQueryParts = useMemo(() => buildQueryParts(normalizedSearchQuery), [normalizedSearchQuery]);
  const shouldBuildPathSearchIndex = useMemo(() => {
    if (!metadata) {
      return false;
    }

    const isFilterPrefix = filterQueryParts.some((query) => {
      return canUsePrefixPathSearchIndex(splitFilterQueryTerms(query), pathFilterMode);
    });
    const isSearchPrefix = searchQueryParts.some((query) => {
      return canUsePrefixPathSearchIndex(splitFilterQueryTerms(query), searchMode);
    });

    return isFilterPrefix || isSearchPrefix;
  }, [metadata, pathFilterMode, searchMode, filterQueryParts, searchQueryParts]);

  const pathSearchIndex = useMemo(() => {
    if (!shouldBuildPathSearchIndex) {
      return undefined;
    }

    return createPathSearchIndex(rows, { caseSensitive: pathFilterCaseSensitive });
  }, [pathFilterCaseSensitive, rows, shouldBuildPathSearchIndex]);

  const filterResult = useMemo(() => {
    if (!metadata) {
      return undefined;
    }

    return searchRowsByQueries(rows, filterQueryParts, {
      caseSensitive: pathFilterCaseSensitive,
      mode: pathFilterMode,
      index: pathSearchIndex
    });
  }, [metadata, pathFilterCaseSensitive, pathFilterMode, pathSearchIndex, filterQueryParts, rows]);
  const baseFilteredRows = metadata ? (filterResult?.filteredRows ?? rows) : [];
  const filteredRows = useMemo(() => {
    if (!metadata || !rowFilter) {
      return baseFilteredRows;
    }

    return baseFilteredRows.filter((row) => {
      return rowFilter(createTreeRowContext(row, sourceFormat));
    });
  }, [baseFilteredRows, metadata, rowFilter, sourceFormat]);
  const searchIndex = filterQueryParts.length === 0 ? pathSearchIndex : undefined;
  const matchSearchResult = useMemo(() => {
    if (!metadata || searchQueryParts.length === 0) {
      return undefined;
    }

    return searchRowsByQueries(filteredRows, searchQueryParts, {
      caseSensitive: searchCaseSensitive,
      mode: searchMode,
      index: searchIndex,
      includeStructuredValueMatch: false
    });
  }, [
    filteredRows,
    metadata,
    searchCaseSensitive,
    searchMode,
    searchIndex,
    searchQueryParts
  ]);
  const matchedPathSet = metadata ? (matchSearchResult?.directMatchPathSet ?? EMPTY_MATCHED_PATHS) : EMPTY_MATCHED_PATHS;

  const prettyLines = useMemo(() => {
    if (metadata) {
      return [] as string[];
    }

    return toPrettyLines(json);
  }, [json, metadata]);

  const filterPlainResult = useMemo(() => {
    if (metadata) {
      return undefined;
    }

    return searchPrettyLinesByQueries(
      prettyLines,
      filterQueryParts,
      pathFilterCaseSensitive,
      pathFilterMode
    );
  }, [metadata, pathFilterCaseSensitive, pathFilterMode, prettyLines, filterQueryParts]);
  const basePrettyLineIndexes = metadata ? [] : (filterPlainResult?.filteredLineIndexes ?? []);
  const filteredPrettyLineIndexes = useMemo(() => {
    if (metadata || !rowFilter) {
      return basePrettyLineIndexes;
    }

    return basePrettyLineIndexes.filter((lineIndex) => {
      return rowFilter(createPlainRowContext(prettyLines[lineIndex], lineIndex, sourceFormat));
    });
  }, [basePrettyLineIndexes, metadata, prettyLines, rowFilter, sourceFormat]);
  const matchPlainResult = useMemo(() => {
    if (metadata || searchQueryParts.length === 0) {
      return undefined;
    }

    if (filteredPrettyLineIndexes.length === 0) {
      return { filteredLineIndexes: [], matchedLineIndexes: [] };
    }

    const filteredLines = filteredPrettyLineIndexes.map((lineIndex) => prettyLines[lineIndex]);
    const filteredSearch = searchPrettyLinesByQueries(
      filteredLines,
      searchQueryParts,
      searchCaseSensitive,
      searchMode
    );
    const mappedMatches = filteredSearch.matchedLineIndexes.map(
      (filteredIndex) => filteredPrettyLineIndexes[filteredIndex]
    );

    return {
      filteredLineIndexes: mappedMatches,
      matchedLineIndexes: mappedMatches
    };
  }, [
    metadata,
    searchQueryParts,
    filteredPrettyLineIndexes,
    prettyLines,
    pathFilterCaseSensitive,
    searchMode,
    searchCaseSensitive
  ]);
  const matchedPrettyLineIndexSet = useMemo(() => {
    if (metadata || !matchPlainResult || matchPlainResult.matchedLineIndexes.length === 0) {
      return EMPTY_MATCHED_PRETTY_LINE_INDEXES;
    }

    return new Set<number>(matchPlainResult.matchedLineIndexes);
  }, [metadata, matchPlainResult]);

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
      treeSearchResult: matchSearchResult,
      plainSearchResult: matchPlainResult,
      visibleCount: metadata ? filteredRows.length : filteredPrettyLineIndexes.length
    });
  }, [
    metadata,
    normalizedPathFilterQuery,
    normalizedSearchQuery,
    filteredPrettyLineIndexes.length,
    filteredRows.length,
    matchPlainResult,
    searchMetadataLimit,
    matchSearchResult
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
