import type { PrettyLineSearchResult, TreeSearchResult } from "../../core/search";
import type { JSONViewerSearchMetadata } from "../../core/types";

interface BuildSearchMetadataParams {
  metadata: boolean;
  pathFilterQuery: string;
  searchQuery: string;
  searchMetadataLimit?: number;
  treeSearchResult?: TreeSearchResult;
  plainSearchResult?: PrettyLineSearchResult;
  visibleCount: number;
}

export const EMPTY_MATCHED_PATHS: ReadonlySet<string> = new Set<string>();
export const EMPTY_MATCHED_PRETTY_LINE_INDEXES: ReadonlySet<number> = new Set<number>();

export const buildQueryParts = (query: string): string[] => {
  return query.length > 0 ? [query] : [];
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
  plainSearchResult,
  visibleCount
}: BuildSearchMetadataParams): JSONViewerSearchMetadata => {
  const effectiveQuery = searchQuery;
  const mode = metadata ? "tree" : "plain";

  if (!effectiveQuery) {
    return {
      mode,
      query: "",
      pathFilterQuery,
      searchQuery,
      matchCount: 0,
      visibleCount,
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
      visibleCount,
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
    visibleCount,
    matchedPaths: [],
    matchedRowIds: cappedLines.items.map((lineNumber) => `line:${lineNumber}`),
    matchedLineNumbers: cappedLines.items,
    hasMore: cappedLines.hasMore
  };
};
