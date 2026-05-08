import { useCallback, useMemo, useState, useEffect } from "react";
import type { DemoState, DemoStateActions } from "./useDemoStateTypes";

export function useViewerState(): [
  Pick<DemoState, "activeMatchIndex" | "searchMetadata" | "viewerMode" | "expandedPaths" | "availableMatches" | "hasSearchQuery" | "matchCounterLabel" | "searchMatchCount" | "searchMode" | "searchCapped" | "expandedPathsCount">,
  Pick<DemoStateActions, "goToNextMatch" | "goToPreviousMatch">
] {
  const [activeMatchIndex, setActiveMatchIndex] = useState<number | null>(null);
  const [searchMetadata, setSearchMetadata] = useState<DemoState["searchMetadata"]>(null);
  const [viewerMode, setViewerMode] = useState<DemoState["viewerMode"]>("collapsable");
  const [expandedPaths, setExpandedPaths] = useState<DemoState["expandedPaths"]>(new Set());

  const availableMatches = searchMetadata?.matchedRowIds.length ?? 0;
  const hasSearchQuery = Boolean(searchMetadata?.query);

  const matchCounterLabel = !hasSearchQuery
    ? "n/a"
    : availableMatches === 0 ? "0" : `${(activeMatchIndex ?? 0) + 1} / ${availableMatches}${searchMetadata?.hasMore ? "+" : ""}`;

  const goToNextMatch = useCallback(() => {
    if (availableMatches === 0) return;
    setActiveMatchIndex((c) => (c === null ? 0 : (c + 1) % availableMatches));
  }, [availableMatches]);

  const goToPreviousMatch = useCallback(() => {
    if (availableMatches === 0) return;
    setActiveMatchIndex((c) => (c === null ? availableMatches - 1 : (c - 1 + availableMatches) % availableMatches));
  }, [availableMatches]);

  useEffect(() => {
    if (!searchMetadata?.query || availableMatches === 0) {
      setActiveMatchIndex(null);
      return;
    }
    setActiveMatchIndex((c) => (c === null || c < 0 || c >= availableMatches ? 0 : c));
  }, [availableMatches, searchMetadata?.query]);

  const searchMatchCount = searchMetadata?.query
    ? `${searchMetadata.matchCount} direct (${searchMetadata.visibleCount} visible)`
    : "none";
  const searchMode = searchMetadata?.mode ?? "n/a";
  const searchCapped = searchMetadata ? (searchMetadata.hasMore ? "yes" : "no") : "n/a";
  const expandedPathsCount = viewerMode === "collapsable" ? `${expandedPaths.size}` : "n/a (static)";

  return [{
    viewerMode, activeMatchIndex, searchMetadata, expandedPaths,
    availableMatches, hasSearchQuery, matchCounterLabel,
    searchMatchCount, searchMode, searchCapped, expandedPathsCount
  }, { goToNextMatch, goToPreviousMatch }];
}
