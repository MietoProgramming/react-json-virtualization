import { useMemo } from "react";

interface UseVirtualizedPrettyContentParams {
  metadata: boolean;
  showLineNumbers: boolean;
  startIndex: number;
  endIndex: number;
  filteredPrettyLineIndexes: number[];
  prettyLines: string[];
}

interface VirtualizedPrettyContentState {
  visiblePrettyLines: string[];
  visiblePrettyLineNumbers: string;
  visiblePrettyLineIndexes: number[];
}

export const useVirtualizedPrettyContent = ({
  metadata,
  showLineNumbers,
  startIndex,
  endIndex,
  filteredPrettyLineIndexes,
  prettyLines
}: UseVirtualizedPrettyContentParams): VirtualizedPrettyContentState => {
  const visiblePrettyLineIndexes = useMemo(() => {
    if (metadata || endIndex <= startIndex || filteredPrettyLineIndexes.length === 0) {
      return [] as number[];
    }

    return filteredPrettyLineIndexes.slice(startIndex, endIndex);
  }, [endIndex, filteredPrettyLineIndexes, metadata, startIndex]);

  const visiblePrettyLines = useMemo(() => {
    if (metadata || visiblePrettyLineIndexes.length === 0) {
      return [] as string[];
    }

    return visiblePrettyLineIndexes.map((lineIndex) => prettyLines[lineIndex]);
  }, [metadata, prettyLines, visiblePrettyLineIndexes]);

  const visiblePrettyLineNumbers = useMemo(() => {
    if (metadata || !showLineNumbers || visiblePrettyLineIndexes.length === 0) {
      return "";
    }

    return visiblePrettyLineIndexes.map((lineIndex) => String(lineIndex + 1)).join("\n");
  }, [metadata, showLineNumbers, visiblePrettyLineIndexes]);

  return {
    visiblePrettyLines,
    visiblePrettyLineNumbers,
    visiblePrettyLineIndexes
  };
};
