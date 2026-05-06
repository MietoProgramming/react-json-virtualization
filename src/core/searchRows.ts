import type { PathFilterMode, PathSearchIndex } from "./filter";
import { splitFilterQueryTerms } from "./filterQuery";
import { getNormalizedPathSegments, parentPath } from "./pathSegments";
import type { FlatJsonRow } from "./types";

interface SearchRowsByQueriesOptions {
  caseSensitive?: boolean;
  mode?: PathFilterMode;
  index?: PathSearchIndex;
  includeStructuredValueMatch?: boolean;
}

interface QueryDefinition {
  terms: string[];
  needles: string[];
  indexedPrefixPaths?: Set<string>;
}
export interface TreeSearchResult {
  filteredRows: FlatJsonRow[];
  directMatchPathSet: Set<string>;
  directMatchPaths: string[];
  directMatchRowIds: string[];
}

export const normalizeQuery = (query?: string): string => {
  return (query ?? "").trim();
};

const normalizeValue = (value: string, caseSensitive: boolean): string => {
  return caseSensitive ? value : value.toLowerCase();
};

const toSearchableValue = (
  row: FlatJsonRow,
  includeStructuredValueMatch: boolean
): string | null => {
  switch (row.valueType) {
    case "string":
      return row.rawValue as string;
    case "number":
    case "boolean":
      return String(row.rawValue);
    case "null":
      return "null";
    case "object":
    case "array":
      return includeStructuredValueMatch ? JSON.stringify(row.rawValue) : null;
    default:
      return null;
  }
};

const resolveTermMode = (
  term: string,
  mode: PathFilterMode
): Exclude<PathFilterMode, "auto"> => {
  if (mode === "includes" || mode === "prefix" || mode === "exact") {
    return mode;
  }

  return term.startsWith("$") ? "prefix" : "includes";
};

const createQueryDefinition = (
  query: string,
  mode: PathFilterMode,
  caseSensitive: boolean,
  rows: FlatJsonRow[],
  index: PathSearchIndex | undefined
): QueryDefinition | null => {
  const terms = splitFilterQueryTerms(query);
  if (terms.length === 0) {
    return null;
  }

  const needles = terms.map((term) => normalizeValue(term, caseSensitive));
  const canUseIndexedPrefix =
    terms.length === 1 &&
    resolveTermMode(terms[0], mode) === "prefix" &&
    index !== undefined &&
    index.rowCount === rows.length &&
    index.caseSensitive === caseSensitive;

  if (!canUseIndexedPrefix) {
    return { terms, needles };
  }

  return {
    terms,
    needles,
    indexedPrefixPaths: new Set(index.matchPrefix(terms[0]))
  };
};

const matchesQueryDefinition = (
  row: FlatJsonRow,
  definition: QueryDefinition,
  normalizedPath: string,
  normalizedValue: string | null,
  normalizedSegments: string[] | null,
  mode: PathFilterMode
): boolean => {
  return definition.needles.some((needle, termIndex) => {
    const termMode = resolveTermMode(definition.terms[termIndex], mode);
    let pathMatch = false;
    if (termMode === "prefix") {
      pathMatch = definition.indexedPrefixPaths
        ? definition.indexedPrefixPaths.has(row.path)
        : normalizedPath.startsWith(needle);
    } else if (termMode === "exact") {
      pathMatch =
        normalizedPath === needle ||
        (normalizedSegments !== null && normalizedSegments.includes(needle));
    } else {
      pathMatch = normalizedPath.includes(needle);
    }

    const valueMatch =
      normalizedValue !== null &&
      (termMode === "exact" ? normalizedValue === needle : normalizedValue.includes(needle));
    return pathMatch || valueMatch;
  });
};

export const searchRowsByQueries = (
  rows: FlatJsonRow[],
  queries: string[],
  options: SearchRowsByQueriesOptions = {}
): TreeSearchResult => {
  const caseSensitive = options.caseSensitive ?? false;
  const mode = options.mode ?? "auto";
  const includeStructuredValueMatch = options.includeStructuredValueMatch ?? true;

  const definitions = queries
    .map((query) => createQueryDefinition(query, mode, caseSensitive, rows, options.index))
    .filter((definition): definition is QueryDefinition => definition !== null);

  if (definitions.length === 0) {
    return {
      filteredRows: rows,
      directMatchPathSet: new Set<string>(),
      directMatchPaths: [],
      directMatchRowIds: []
    };
  }

  const directMatchPathSet = new Set<string>();
  const directMatchPaths: string[] = [];
  const directMatchRowIds: string[] = [];

  rows.forEach((row) => {
    const normalizedPath = normalizeValue(row.path, caseSensitive);
    const normalizedSegments =
      mode === "exact" ? getNormalizedPathSegments(row.path, caseSensitive) : null;
    const value = toSearchableValue(row, includeStructuredValueMatch);
    const normalizedValueString = value === null ? null : normalizeValue(value, caseSensitive);
    const matchesAllQueries = definitions.every((definition) =>
      matchesQueryDefinition(
        row,
        definition,
        normalizedPath,
        normalizedValueString,
        normalizedSegments,
        mode
      )
    );

    if (matchesAllQueries) {
      directMatchPathSet.add(row.path);
      directMatchPaths.push(row.path);
      directMatchRowIds.push(row.id);
    }
  });

  if (directMatchPathSet.size === 0) {
    return {
      filteredRows: [],
      directMatchPathSet,
      directMatchPaths,
      directMatchRowIds
    };
  }

  const includedPaths = new Set<string>();
  directMatchPathSet.forEach((path) => {
    let cursor: string | null = path;
    while (cursor) {
      includedPaths.add(cursor);
      cursor = parentPath(cursor);
    }
  });

  return {
    filteredRows: rows.filter((row) => includedPaths.has(row.path)),
    directMatchPathSet,
    directMatchPaths,
    directMatchRowIds
  };
};
