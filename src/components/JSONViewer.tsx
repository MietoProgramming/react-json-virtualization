import React, { useEffect, useMemo, useState } from "react";
import { flattenJson } from "../core/flatten";
import { parseJsonIncremental } from "../core/parser";
import type { FlatJsonRow, JSONValue } from "../core/types";
import { useVirtualization } from "../hooks/useVirtualization";
import { resolveTheme, type JsonThemeOverride } from "../theme";
import { JSONRow } from "./JSONRow";

interface JsonObjectLike {
  [key: string]: JSONValue;
}

export interface JSONViewerProps {
  json: string;
  height?: number | string;
  rowHeight?: number;
  overscan?: number;
  initialExpandDepth?: number;
  theme?: JsonThemeOverride;
  selectedPath?: string;
  className?: string;
  onNodeClick?: (path: string, row: FlatJsonRow) => void;
  onParseProgress?: (processedChars: number, totalChars: number) => void;
  onParseError?: (error: Error) => void;
}

const isContainer = (value: JSONValue): boolean => {
  return (
    Array.isArray(value) ||
    (typeof value === "object" && value !== null && !Array.isArray(value))
  );
};

const collectInitialExpandedPaths = (
  value: JSONValue,
  maxDepth: number,
  currentPath: string,
  depth: number,
  paths: Set<string>
): void => {
  if (!isContainer(value) || depth >= maxDepth) {
    return;
  }

  paths.add(currentPath);

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      collectInitialExpandedPaths(item, maxDepth, `${currentPath}[${index}]`, depth + 1, paths);
    });
    return;
  }

  const objectValue = value as JsonObjectLike;
  Object.entries(objectValue).forEach(([key, child]: [string, JSONValue]) => {
    const escapedKey = /^[$A-Z_a-z][$\w]*$/.test(key)
      ? `${currentPath}.${key}`
      : `${currentPath}[\"${key.replace(/\\/g, "\\\\").replace(/\"/g, "\\\"")}\"]`;
    collectInitialExpandedPaths(child, maxDepth, escapedKey, depth + 1, paths);
  });
};

export function JSONViewer({
  json,
  height = 520,
  rowHeight = 24,
  overscan = 8,
  initialExpandDepth = 1,
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
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(["$"]));
  const [internalSelectedPath, setInternalSelectedPath] = useState<string>("$");

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

        const nextExpanded = new Set<string>(["$"]);
        collectInitialExpandedPaths(parsed, initialExpandDepth, "$", 0, nextExpanded);
        setExpandedPaths(nextExpanded);
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
  }, [initialExpandDepth, json, onParseError, onParseProgress]);

  const rows = useMemo(() => {
    if (root === null) {
      return [];
    }
    return flattenJson(root, expandedPaths);
  }, [expandedPaths, root]);

  const {
    containerRef,
    onScroll,
    startIndex,
    endIndex,
    topSpacerHeight,
    bottomSpacerHeight
  } = useVirtualization({
    rowCount: rows.length,
    rowHeight,
    overscan
  });

  const visibleRows = rows.slice(startIndex, endIndex);
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
    setExpandedPaths((current: Set<string>) => {
      const next = new Set(current);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
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
