import { splitFilterQueryTerms } from "./filterQuery";
import type { FlatJsonRow } from "./types";

export type PathFilterMode = "auto" | "includes" | "prefix";

interface PathSearchTrieNode {
  children: Map<string, PathSearchTrieNode>;
  rowIndexes: number[];
}

export interface PathSearchIndex {
  readonly caseSensitive: boolean;
  readonly rowCount: number;
  matchPrefix: (query: string) => string[];
}

export interface PathFilterOptions {
  caseSensitive?: boolean;
  mode?: PathFilterMode;
  index?: PathSearchIndex;
}

const parentPath = (path: string): string | null => {
  if (path === "$") {
    return null;
  }

  if (path.endsWith("]")) {
    const index = path.lastIndexOf("[");
    if (index <= 0) {
      return "$";
    }
    return path.slice(0, index);
  }

  const dotIndex = path.lastIndexOf(".");
  if (dotIndex <= 0) {
    return "$";
  }
  return path.slice(0, dotIndex);
};

const normalize = (value: string, caseSensitive: boolean): string => {
  return caseSensitive ? value : value.toLowerCase();
};

const toSearchableValue = (row: FlatJsonRow): string | null => {
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
      return JSON.stringify(row.rawValue);
    default:
      return null;
  }
};

const createTrieNode = (): PathSearchTrieNode => ({
  children: new Map<string, PathSearchTrieNode>(),
  rowIndexes: []
});

const resolveTermMode = (term: string, mode: PathFilterMode | undefined): Exclude<PathFilterMode, "auto"> => {
  if (mode === "includes" || mode === "prefix") {
    return mode;
  }
  return term.startsWith("$") ? "prefix" : "includes";
};

export function createPathSearchIndex(
  rows: FlatJsonRow[],
  options: Pick<PathFilterOptions, "caseSensitive"> = {}
): PathSearchIndex {
  const caseSensitive = options.caseSensitive ?? false;
  const root = createTrieNode();
  const normalizedPaths = rows.map((row) => normalize(row.path, caseSensitive));

  normalizedPaths.forEach((path, rowIndex) => {
    let cursor = root;
    cursor.rowIndexes.push(rowIndex);

    for (let index = 0; index < path.length; index += 1) {
      const token = path[index];
      let next = cursor.children.get(token);
      if (!next) {
        next = createTrieNode();
        cursor.children.set(token, next);
      }
      next.rowIndexes.push(rowIndex);
      cursor = next;
    }
  });

  return {
    caseSensitive,
    rowCount: rows.length,
    matchPrefix: (query: string): string[] => {
      const normalizedQuery = normalize(query, caseSensitive);

      let cursor: PathSearchTrieNode | undefined = root;
      for (let index = 0; index < normalizedQuery.length; index += 1) {
        const token = normalizedQuery[index];
        cursor = cursor.children.get(token);
        if (!cursor) {
          return [];
        }
      }

      return cursor.rowIndexes.map((rowIndex) => rows[rowIndex].path);
    }
  };
}

export function filterRowsByPathQuery(
  rows: FlatJsonRow[],
  query: string | undefined,
  options: PathFilterOptions = {}
): FlatJsonRow[] {
  const normalizedQuery = (query ?? "").trim();
  if (!normalizedQuery) {
    return rows;
  }

  const queryTerms = splitFilterQueryTerms(normalizedQuery);
  if (queryTerms.length === 0) {
    return rows;
  }

  const caseSensitive = options.caseSensitive ?? false;
  const needles = queryTerms.map((term) => normalize(term, caseSensitive));
  const singleTermMode = resolveTermMode(queryTerms[0], options.mode);

  const matchedPaths = new Set<string>();
  if (
    singleTermMode === "prefix" &&
    needles.length === 1 &&
    options.index &&
    options.index.rowCount === rows.length &&
    options.index.caseSensitive === caseSensitive
  ) {
    const queryTerm = queryTerms[0];
    const needle = needles[0];
    options.index.matchPrefix(queryTerm).forEach((path) => {
      matchedPaths.add(path);
    });

    rows.forEach((row) => {
      const value = toSearchableValue(row);
      if (!value) {
        return;
      }

      if (normalize(value, caseSensitive).includes(needle)) {
        matchedPaths.add(row.path);
      }
    });
  } else {
    rows.forEach((row) => {
      const normalizedPath = normalize(row.path, caseSensitive);
      const value = toSearchableValue(row);
      const normalizedValue = value === null ? null : normalize(value, caseSensitive);

      const matchesAnyTerm = needles.some((needle, index) => {
        const termMode = resolveTermMode(queryTerms[index], options.mode);
        const pathMatch =
          termMode === "prefix"
            ? normalizedPath.startsWith(needle)
            : normalizedPath.includes(needle);
        const valueMatch = normalizedValue !== null && normalizedValue.includes(needle);
        return pathMatch || valueMatch;
      });

      if (matchesAnyTerm) {
        matchedPaths.add(row.path);
      }
    });
  }

  if (matchedPaths.size === 0) {
    return [];
  }

  const includedPaths = new Set<string>();
  matchedPaths.forEach((path) => {
    let cursor: string | null = path;
    while (cursor) {
      includedPaths.add(cursor);
      cursor = parentPath(cursor);
    }
  });

  return rows.filter((row) => includedPaths.has(row.path));
}
