import React, { useEffect, useMemo, useState } from "react";
import {
    createExpandedPathSet,
    expandedPathsFromDepth,
    toggleExpandedPath
} from "../core/expansion";
import {
    createPathSearchIndex,
    filterRowsByPathQuery,
    type PathFilterMode
} from "../core/filter";
import { flattenJson } from "../core/flatten";
import { parseJsonIncremental } from "../core/parser";
import type { FlatJsonRow, JSONValue } from "../core/types";
import { useVirtualization } from "../hooks/useVirtualization";
import { resolveTheme, type JsonThemeOverride } from "../theme";
import { JSONRow } from "./JSONRow";

export interface JSONViewerProps {
  json: string;
  height?: number | string;
  rowHeight?: number;
  overscan?: number;
  initialExpandDepth?: number;
  expandedPaths?: ReadonlySet<string>;
  defaultExpandedPaths?: Iterable<string>;
  onExpandedPathsChange?: (paths: Set<string>) => void;
  pathFilterQuery?: string;
  pathFilterCaseSensitive?: boolean;
  pathFilterMode?: PathFilterMode;
  theme?: JsonThemeOverride;
  selectedPath?: string;
  className?: string;
  onNodeClick?: (path: string, row: FlatJsonRow) => void;
  onParseProgress?: (processedChars: number, totalChars: number) => void;
  onParseError?: (error: Error) => void;
}

export function JSONViewer({
  json,
  height = 520,
  rowHeight = 24,
  overscan = 8,
  initialExpandDepth = 1,
  expandedPaths,
  defaultExpandedPaths,
  onExpandedPathsChange,
  pathFilterQuery,
  pathFilterCaseSensitive = false,
  pathFilterMode = "auto",
  theme,
  selectedPath,
  className,
  onNodeClick,
  onParseProgress,
  onParseError
}: JSONViewerProps): React.ReactElement {
  const [root, setRoot] = useState<JSONValue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [internalExpandedPaths, setInternalExpandedPaths] = useState<Set<string>>(() =>
    createExpandedPathSet(defaultExpandedPaths)
  );
  const [internalSelectedPath, setInternalSelectedPath] = useState<string>("$");
  const isExpandedControlled = expandedPaths !== undefined;
  const activeExpandedPaths = useMemo(
    () => createExpandedPathSet(expandedPaths ?? internalExpandedPaths),
    [expandedPaths, internalExpandedPaths]
  );

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    const parse = async (): Promise<void> => {
      setIsParsing(true);
      setError(null);

      try {
        const parsed = await parseJsonIncremental(json, {
          signal: controller.signal,
          onProgress: onParseProgress
        });

        if (!mounted) {
          return;
        }

        setRoot(parsed);

        const nextExpanded =
          defaultExpandedPaths === undefined
            ? expandedPathsFromDepth(parsed, initialExpandDepth)
            : createExpandedPathSet(defaultExpandedPaths);

        if (!isExpandedControlled) {
          setInternalExpandedPaths(nextExpanded);
        }
        onExpandedPathsChange?.(nextExpanded);
      } catch (candidateError) {
        if (!mounted || controller.signal.aborted) {
          return;
        }

        const normalized =
          candidateError instanceof Error
            ? candidateError
            : new Error("Unknown JSON parse error");

        setError(normalized.message);
        onParseError?.(normalized);
      } finally {
        if (mounted) {
          setIsParsing(false);
        }
      }
    };

    parse();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [
    defaultExpandedPaths,
    initialExpandDepth,
    isExpandedControlled,
    json,
    onExpandedPathsChange,
    onParseError,
    onParseProgress
  ]);

  const rows = useMemo(() => {
    if (root === null) {
      return [];
    }
    return flattenJson(root, activeExpandedPaths);
  }, [activeExpandedPaths, root]);

  const normalizedFilterQuery = (pathFilterQuery ?? "").trim();
  const resolvedFilterMode: Exclude<PathFilterMode, "auto"> =
    pathFilterMode === "auto"
      ? normalizedFilterQuery.startsWith("$")
        ? "prefix"
        : "includes"
      : pathFilterMode;

  const pathSearchIndex = useMemo(() => {
    if (!normalizedFilterQuery || resolvedFilterMode !== "prefix") {
      return undefined;
    }
    return createPathSearchIndex(rows, { caseSensitive: pathFilterCaseSensitive });
  }, [normalizedFilterQuery, pathFilterCaseSensitive, resolvedFilterMode, rows]);

  const filteredRows = useMemo(
    () =>
      filterRowsByPathQuery(rows, pathFilterQuery, {
        caseSensitive: pathFilterCaseSensitive,
        mode: resolvedFilterMode,
        index: pathSearchIndex
      }),
    [pathFilterCaseSensitive, pathFilterQuery, pathSearchIndex, resolvedFilterMode, rows]
  );

  const {
    containerRef,
    onScroll,
    startIndex,
    endIndex,
    topSpacerHeight,
    bottomSpacerHeight
  } = useVirtualization({
    rowCount: filteredRows.length,
    rowHeight,
    overscan
  });

  const visibleRows = filteredRows.slice(startIndex, endIndex);
  const activeSelectedPath = selectedPath ?? internalSelectedPath;

  const resolvedTheme = resolveTheme(theme);

  const style = {
    height,
    "--rjv-background": resolvedTheme.background,
    "--rjv-row-hover": resolvedTheme.rowHover,
    "--rjv-row-selected": resolvedTheme.rowSelected,
    "--rjv-token-key": resolvedTheme.key,
    "--rjv-token-punctuation": resolvedTheme.punctuation,
    "--rjv-token-string": resolvedTheme.string,
    "--rjv-token-number": resolvedTheme.number,
    "--rjv-token-boolean": resolvedTheme.boolean,
    "--rjv-token-null": resolvedTheme.null,
    "--rjv-focus-ring": resolvedTheme.focusRing
  } as React.CSSProperties;

  const onToggle = (path: string): void => {
    if (isExpandedControlled) {
      onExpandedPathsChange?.(toggleExpandedPath(activeExpandedPaths, path));
      return;
    }

    setInternalExpandedPaths((current: Set<string>) => {
      const next = toggleExpandedPath(current, path);
      onExpandedPathsChange?.(next);
      return next;
    });
  };

  const onSelect = (path: string): void => {
    setInternalSelectedPath(path);
    const row = rows.find((item: FlatJsonRow) => item.path === path);
    if (row) {
      onNodeClick?.(path, row);
    }
  };

  const rootClassName = className ? `rjv-container ${className}` : "rjv-container";

  return (
    <div className={rootClassName} ref={containerRef} onScroll={onScroll} role="tree" style={style}>
      {isParsing && <div className="rjv-status">Parsing JSON...</div>}
      {!isParsing && error && <div className="rjv-status rjv-status-error">{error}</div>}
      {!isParsing && !error && (
        <>
          <div style={{ height: `${topSpacerHeight}px` }} />
          {visibleRows.map((row: FlatJsonRow) => (
            <JSONRow
              key={row.id}
              row={row}
              isSelected={activeSelectedPath === row.path}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
          <div style={{ height: `${bottomSpacerHeight}px` }} />
        </>
      )}
    </div>
  );
}
