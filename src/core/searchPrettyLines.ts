import type { PathFilterMode } from "./filter";
import { splitFilterQueryTerms } from "./filterQuery";

export interface PrettyLineSearchResult {
  filteredLineIndexes: number[];
  matchedLineIndexes: number[];
}

const normalizeValue = (value: string, caseSensitive: boolean): string => {
  return caseSensitive ? value : value.toLowerCase();
};

const isBoundaryChar = (char: string | undefined): boolean => {
  if (!char) {
    return true;
  }

  return /[\s"',.:;\[\]{}()]/.test(char);
};

const matchesExactToken = (line: string, needle: string): boolean => {
  if (needle.length === 0) {
    return false;
  }

  let index = 0;
  while (index <= line.length - needle.length) {
    const matchIndex = line.indexOf(needle, index);
    if (matchIndex === -1) {
      return false;
    }

    const before = matchIndex === 0 ? undefined : line[matchIndex - 1];
    const after = line[matchIndex + needle.length];
    if (isBoundaryChar(before) && isBoundaryChar(after)) {
      return true;
    }

    index = matchIndex + needle.length;
  }

  return false;
};

export const searchPrettyLinesByQueries = (
  prettyLines: string[],
  queries: string[],
  caseSensitive: boolean,
  mode: PathFilterMode = "auto"
): PrettyLineSearchResult => {
  const queryNeedles = queries
    .map((query) => splitFilterQueryTerms(query))
    .filter((terms) => terms.length > 0)
    .map((terms) => terms.map((term) => normalizeValue(term, caseSensitive)));

  if (queryNeedles.length === 0) {
    return {
      filteredLineIndexes: prettyLines.map((_line, index) => index),
      matchedLineIndexes: []
    };
  }

  const matchedLineIndexes: number[] = [];

  const resolvedMode = mode === "exact" ? "exact" : "includes";

  prettyLines.forEach((line, lineIndex) => {
    const normalizedLine = normalizeValue(line, caseSensitive);
    const matchesAllQueries = queryNeedles.every((needles) =>
      needles.some((needle) =>
        resolvedMode === "exact"
          ? matchesExactToken(normalizedLine, needle)
          : normalizedLine.includes(needle)
      )
    );

    if (matchesAllQueries) {
      matchedLineIndexes.push(lineIndex);
    }
  });

  return {
    filteredLineIndexes: matchedLineIndexes,
    matchedLineIndexes
  };
};
