import { splitFilterQueryTerms } from "./filterQuery";

export interface PrettyLineSearchResult {
  filteredLineIndexes: number[];
  matchedLineIndexes: number[];
}

const normalizeValue = (value: string, caseSensitive: boolean): string => {
  return caseSensitive ? value : value.toLowerCase();
};

export const searchPrettyLinesByQueries = (
  prettyLines: string[],
  queries: string[],
  caseSensitive: boolean
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

  prettyLines.forEach((line, lineIndex) => {
    const normalizedLine = normalizeValue(line, caseSensitive);
    const matchesAllQueries = queryNeedles.every((needles) =>
      needles.some((needle) => normalizedLine.includes(needle))
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
