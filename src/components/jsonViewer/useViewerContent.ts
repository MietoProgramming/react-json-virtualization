import { useMemo } from "react";
import { createPathSearchIndex, filterRowsByPathQuery, type PathFilterMode } from "../../core/filter";
import { splitFilterQueryTerms } from "../../core/filterQuery";
import { flattenJson } from "../../core/flatten";
import type { FlatJsonRow, JSONValue } from "../../core/types";
import { normalizeSearchInput } from "./prettyTokens";

interface UseViewerContentParams {
  metadata: boolean;
  json: string;
  root: JSONValue | null;
  activeExpandedPaths: ReadonlySet<string>;
  pathFilterQuery?: string;
  pathFilterCaseSensitive: boolean;
  pathFilterMode: PathFilterMode;
}

interface ViewerContentState {
  filteredRows: FlatJsonRow[];
  rowsByPath: Map<string, FlatJsonRow>;
  prettyLines: string[];
  filteredPrettyLineIndexes: number[];
  filteredItemCount: number;
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
  pathFilterCaseSensitive,
  pathFilterMode
}: UseViewerContentParams): ViewerContentState => {
  const rows = useMemo(() => {
    if (!metadata || root === null) {
      return [] as FlatJsonRow[];
    }
    return flattenJson(root, activeExpandedPaths, { metadata });
  }, [activeExpandedPaths, metadata, root]);

  const normalizedFilterQuery = metadata ? (pathFilterQuery ?? "").trim() : "";
  const metadataQueryTerms = useMemo(
    () => splitFilterQueryTerms(normalizedFilterQuery),
    [normalizedFilterQuery]
  );
  const shouldBuildPathSearchIndex =
    metadata && canUsePrefixPathSearchIndex(metadataQueryTerms, pathFilterMode);

  const pathSearchIndex = useMemo(() => {
    if (!shouldBuildPathSearchIndex) {
      return undefined;
    }

    return createPathSearchIndex(rows, { caseSensitive: pathFilterCaseSensitive });
  }, [pathFilterCaseSensitive, rows, shouldBuildPathSearchIndex]);

  const filteredRows = useMemo(
    () =>
      !metadata
        ? []
        : filterRowsByPathQuery(rows, pathFilterQuery, {
            caseSensitive: pathFilterCaseSensitive,
            mode: pathFilterMode,
            index: pathSearchIndex
          }),
    [metadata, pathFilterCaseSensitive, pathFilterMode, pathFilterQuery, pathSearchIndex, rows]
  );

  const prettyLines = useMemo(() => {
    if (metadata) {
      return [] as string[];
    }

    if (json.includes("\n") || json.includes("\r")) {
      return json.split(/\r?\n/);
    }

    try {
      return JSON.stringify(JSON.parse(json), null, 2).split(/\r?\n/);
    } catch {
      return json.split(/\r?\n/);
    }
  }, [json, metadata]);

  const filteredPrettyLineIndexes = useMemo(() => {
    if (metadata) {
      return [] as number[];
    }

    const query = (pathFilterQuery ?? "").trim();
    if (!query) {
      return prettyLines.map((_line, index) => index);
    }

    const terms = splitFilterQueryTerms(query);
    if (terms.length === 0) {
      return prettyLines.map((_line, index) => index);
    }

    const needles = terms.map((term) => normalizeSearchInput(term, pathFilterCaseSensitive));
    const indexes: number[] = [];
    for (let index = 0; index < prettyLines.length; index += 1) {
      const line = normalizeSearchInput(prettyLines[index], pathFilterCaseSensitive);
      if (needles.some((needle) => line.includes(needle))) {
        indexes.push(index);
      }
    }

    return indexes;
  }, [metadata, pathFilterCaseSensitive, pathFilterQuery, prettyLines]);

  const rowsByPath = useMemo(() => {
    const index = new Map<string, FlatJsonRow>();
    rows.forEach((row) => {
      index.set(row.path, row);
    });
    return index;
  }, [rows]);

  return {
    filteredRows,
    rowsByPath,
    prettyLines,
    filteredPrettyLineIndexes,
    filteredItemCount: metadata ? filteredRows.length : filteredPrettyLineIndexes.length
  };
};
