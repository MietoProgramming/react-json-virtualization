import type { PrettyLineSearchResult, TreeSearchResult } from "../../core/search";
import type { JSONViewerSearchMetadata } from "../../core/types";

interface BuildSearchMetadataParams {
  metadata: boolean;
  pathFilterQuery: string;
  searchQuery: string;
  searchMetadataLimit?: number;
  treeSearchResult?: TreeSearchResult;
  plainSearchResult?: PrettyLineSearchResult;
}

export const EMPTY_MATCHED_PATHS: ReadonlySet<string> = new Set<string>();
export const EMPTY_MATCHED_PRETTY_LINE_INDEXES: ReadonlySet<number> = new Set<number>();

export const buildQueryParts = (pathFilterQuery: string, searchQuery: string): string[] => {
  return [pathFilterQuery, searchQuery].filter((query) => query.length > 0);
};

const buildEffectiveSearchQuery = (pathFilterQuery: string, searchQuery: string): string => {
  if (pathFilterQuery && searchQuery) {
    return `${pathFilterQuery} && ${searchQuery}`;
  }

  return pathFilterQuery || searchQuery;
};

const resolveMetadataLimit = (limit: number | undefined): number => {
  if (limit === undefined || !Number.isFinite(limit)) {
    return 500;
  }

  return Math.max(0, Math.floor(limit));
};

const sliceWithLimit = <T,>(items: T[], limit: number): { items: T[]; hasMore: boolean } => {
  return {
    items: items.slice(0, limit),
    hasMore: items.length > limit
  };
};

export const buildSearchMetadata = ({
  metadata,
  pathFilterQuery,
  searchQuery,
  searchMetadataLimit,
  treeSearchResult,
  plainSearchResult
}: BuildSearchMetadataParams): JSONViewerSearchMetadata => {
  const effectiveQuery = buildEffectiveSearchQuery(pathFilterQuery, searchQuery);
  const mode = metadata ? "tree" : "plain";

  if (!effectiveQuery) {
    return {
      mode,
      query: "",
      pathFilterQuery,
      searchQuery,
      matchCount: 0,
      visibleCount: 0,
      matchedPaths: [],
      matchedRowIds: [],
      matchedLineNumbers: [],
      hasMore: false
    };
  }

  const limit = resolveMetadataLimit(searchMetadataLimit);
  if (metadata) {
    const directMatchPaths = treeSearchResult?.directMatchPaths ?? [];
    const directMatchRowIds = treeSearchResult?.directMatchRowIds ?? [];
    const cappedPaths = sliceWithLimit(directMatchPaths, limit);
    const cappedRowIds = sliceWithLimit(directMatchRowIds, limit);

    return {
      mode,
      query: effectiveQuery,
      pathFilterQuery,
      searchQuery,
      matchCount: directMatchPaths.length,
      visibleCount: treeSearchResult?.filteredRows.length ?? 0,
      matchedPaths: cappedPaths.items,
      matchedRowIds: cappedRowIds.items,
      matchedLineNumbers: [],
      hasMore: cappedPaths.hasMore || cappedRowIds.hasMore
    };
  }

  const matchedLineNumbers = (plainSearchResult?.matchedLineIndexes ?? []).map(
    (lineIndex) => lineIndex + 1
  );
  const cappedLines = sliceWithLimit(matchedLineNumbers, limit);

  return {
    mode,
    query: effectiveQuery,
    pathFilterQuery,
    searchQuery,
    matchCount: matchedLineNumbers.length,
    visibleCount: plainSearchResult?.filteredLineIndexes.length ?? 0,
    matchedPaths: [],
    matchedRowIds: cappedLines.items.map((lineNumber) => `line:${lineNumber}`),
    matchedLineNumbers: cappedLines.items,
    hasMore: cappedLines.hasMore
  };
};
