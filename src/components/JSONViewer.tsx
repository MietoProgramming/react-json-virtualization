import React, { useEffect, useMemo, useRef, useState } from "react";
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

const buildLineStarts = (text: string): number[] => {
  const starts = [0];
  for (let index = 0; index < text.length; index += 1) {
    if (text.charCodeAt(index) === 10) {
      starts.push(index + 1);
    }
  }
  return starts;
};

const lineSlice = (text: string, lineStarts: number[], startIndex: number, endIndex: number): string => {
  const safeStart = Math.max(0, startIndex);
  const safeEnd = Math.min(lineStarts.length, endIndex);

  if (safeStart >= safeEnd) {
    return "";
  }

  const lines: string[] = [];

  for (let lineIndex = safeStart; lineIndex < safeEnd; lineIndex += 1) {
    const start = lineStarts[lineIndex];
    const nextStart = lineIndex + 1 < lineStarts.length ? lineStarts[lineIndex + 1] : text.length;
    let end = nextStart;

    if (end > start && text.charCodeAt(end - 1) === 10) {
      end -= 1;
    }
    if (end > start && text.charCodeAt(end - 1) === 13) {
      end -= 1;
    }

    lines.push(text.slice(start, end));
  }

  return lines.join("\n");
};

interface PrettyToken {
  text: string;
  className?: string;
}

const isDelimiter = (char: string | undefined): boolean => {
  return char === undefined || /[\s,\]\}\:]/.test(char);
};

const tokenizePrettyLine = (line: string): PrettyToken[] => {
  const tokens: PrettyToken[] = [];
  let index = 0;

  while (index < line.length) {
    const char = line[index];

    if (char === '"') {
      let cursor = index + 1;
      let escaped = false;

      while (cursor < line.length) {
        const current = line[cursor];
        if (escaped) {
          escaped = false;
          cursor += 1;
          continue;
        }
        if (current === "\\") {
          escaped = true;
          cursor += 1;
          continue;
        }
        if (current === '"') {
          cursor += 1;
          break;
        }
        cursor += 1;
      }

      const text = line.slice(index, cursor);
      const tail = line.slice(cursor);
      const isKey = /^\s*:/.test(tail);
      tokens.push({ text, className: isKey ? "rjv-token-key" : "rjv-token-string" });
      index = cursor;
      continue;
    }

    if (char === "-" || (char >= "0" && char <= "9")) {
      const match = line.slice(index).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/);
      if (match) {
        tokens.push({ text: match[0], className: "rjv-token-number" });
        index += match[0].length;
        continue;
      }
    }

    if (line.startsWith("true", index) && isDelimiter(line[index + 4])) {
      tokens.push({ text: "true", className: "rjv-token-boolean" });
      index += 4;
      continue;
    }

    if (line.startsWith("false", index) && isDelimiter(line[index + 5])) {
      tokens.push({ text: "false", className: "rjv-token-boolean" });
      index += 5;
      continue;
    }

    if (line.startsWith("null", index) && isDelimiter(line[index + 4])) {
      tokens.push({ text: "null", className: "rjv-token-null" });
      index += 4;
      continue;
    }

    if (/[\[\]{}:,]/.test(char)) {
      tokens.push({ text: char, className: "rjv-token-punctuation" });
      index += 1;
      continue;
    }

    let cursor = index + 1;
    while (cursor < line.length) {
      const current = line[cursor];
      if (current === '"' || /[\[\]{}:,]/.test(current)) {
        break;
      }
      if ((current === "-" || (current >= "0" && current <= "9")) && isDelimiter(line[cursor - 1])) {
        break;
      }
      if (line.startsWith("true", cursor) || line.startsWith("false", cursor) || line.startsWith("null", cursor)) {
        break;
      }
      cursor += 1;
    }

    tokens.push({ text: line.slice(index, cursor) });
    index = cursor;
  }

  return tokens;
};

export interface JSONViewerProps {
  json: string;
  metadata?: boolean;
  showLineNumbers?: boolean;
  height?: number | string;
  rowHeight?: number;
  overscan?: number;
  alwaysExpanded?: boolean;
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
  metadata = true,
  showLineNumbers = true,
  height = 520,
  rowHeight = 24,
  overscan = 8,
  alwaysExpanded = false,
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
  const onParseProgressRef = useRef(onParseProgress);
  const onParseErrorRef = useRef(onParseError);
  const onExpandedPathsChangeRef = useRef(onExpandedPathsChange);

  onParseProgressRef.current = onParseProgress;
  onParseErrorRef.current = onParseError;
  onExpandedPathsChangeRef.current = onExpandedPathsChange;

  const isExpandedControlled = expandedPaths !== undefined;
  const fullyExpandedPaths = useMemo(() => {
    if (!metadata || root === null) {
      return createExpandedPathSet();
    }
    return expandedPathsFromDepth(root, Number.POSITIVE_INFINITY);
  }, [metadata, root]);

  const activeExpandedPaths = useMemo(
    () =>
      !metadata
        ? createExpandedPathSet()
        :
      alwaysExpanded
        ? fullyExpandedPaths
        : createExpandedPathSet(expandedPaths ?? internalExpandedPaths),
    [alwaysExpanded, expandedPaths, fullyExpandedPaths, internalExpandedPaths, metadata]
  );

  const prettySourceText = useMemo(() => {
    if (metadata) {
      return "";
    }

    if (json.includes("\n") || json.includes("\r")) {
      return json;
    }

    try {
      return JSON.stringify(JSON.parse(json), null, 2);
    } catch {
      return json;
    }
  }, [json, metadata]);

  const lineStarts = useMemo(() => {
    if (metadata) {
      return [] as number[];
    }
    return buildLineStarts(prettySourceText);
  }, [metadata, prettySourceText]);

  useEffect(() => {
    if (!metadata) {
      setIsParsing(false);
      setError(null);
      return;
    }

    let mounted = true;
    const controller = new AbortController();

    const parse = async (): Promise<void> => {
      setIsParsing(true);
      setError(null);

      try {
        const parsed = await parseJsonIncremental(json, {
          signal: controller.signal,
          onProgress: (processedChars, totalChars) => {
            onParseProgressRef.current?.(processedChars, totalChars);
          }
        });

        if (!mounted) {
          return;
        }

        setRoot(parsed);

        if (!metadata) {
          return;
        }

        const nextExpanded =
          alwaysExpanded
            ? expandedPathsFromDepth(parsed, Number.POSITIVE_INFINITY)
            : defaultExpandedPaths === undefined
            ? expandedPathsFromDepth(parsed, initialExpandDepth)
            : createExpandedPathSet(defaultExpandedPaths);

        if (!isExpandedControlled) {
          setInternalExpandedPaths(nextExpanded);
        }
        onExpandedPathsChangeRef.current?.(nextExpanded);
      } catch (candidateError) {
        if (!mounted || controller.signal.aborted) {
          return;
        }

        const normalized =
          candidateError instanceof Error
            ? candidateError
            : new Error("Unknown JSON parse error");

        setError(normalized.message);
        onParseErrorRef.current?.(normalized);
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
    alwaysExpanded,
    defaultExpandedPaths,
    initialExpandDepth,
    isExpandedControlled,
    json,
    metadata
  ]);

  const rows = useMemo(() => {
    if (!metadata || root === null) {
      return [];
    }
    return flattenJson(root, activeExpandedPaths, { metadata });
  }, [activeExpandedPaths, metadata, root]);

  const normalizedFilterQuery = metadata ? (pathFilterQuery ?? "").trim() : "";
  const resolvedFilterMode: Exclude<PathFilterMode, "auto"> =
    pathFilterMode === "auto"
      ? normalizedFilterQuery.startsWith("$")
        ? "prefix"
        : "includes"
      : pathFilterMode;

  const pathSearchIndex = useMemo(() => {
    if (!metadata) {
      return undefined;
    }
    if (!normalizedFilterQuery || resolvedFilterMode !== "prefix") {
      return undefined;
    }
    return createPathSearchIndex(rows, { caseSensitive: pathFilterCaseSensitive });
  }, [metadata, normalizedFilterQuery, pathFilterCaseSensitive, resolvedFilterMode, rows]);

  const filteredRows = useMemo(
    () =>
      !metadata
        ? []
        :
      filterRowsByPathQuery(rows, pathFilterQuery, {
        caseSensitive: pathFilterCaseSensitive,
        mode: resolvedFilterMode,
        index: pathSearchIndex
      }),
    [metadata, pathFilterCaseSensitive, pathFilterQuery, pathSearchIndex, resolvedFilterMode, rows]
  );

  const rowsByPath = useMemo(() => {
    if (!metadata) {
      return new Map<string, FlatJsonRow>();
    }
    const index = new Map<string, FlatJsonRow>();
    rows.forEach((row) => {
      index.set(row.path, row);
    });
    return index;
  }, [metadata, rows]);

  const {
    containerRef,
    onScroll,
    startIndex,
    endIndex,
    topSpacerHeight,
    bottomSpacerHeight
  } = useVirtualization({
    rowCount: metadata ? filteredRows.length : lineStarts.length,
    rowHeight,
    overscan
  });

  const visibleRows = filteredRows.slice(startIndex, endIndex);
  const visiblePrettyLines = useMemo(() => {
    if (metadata || lineStarts.length === 0) {
      return [] as string[];
    }

    const text = lineSlice(prettySourceText, lineStarts, startIndex, endIndex);
    if (!text) {
      return [];
    }
    return text.split("\n");
  }, [endIndex, lineStarts, metadata, prettySourceText, startIndex]);
  const visiblePrettyLineNumbers = useMemo(() => {
    if (metadata || !showLineNumbers || endIndex <= startIndex) {
      return "";
    }

    const count = endIndex - startIndex;
    const numbers = new Array<string>(count);

    for (let index = 0; index < count; index += 1) {
      numbers[index] = String(startIndex + index + 1);
    }

    return numbers.join("\n");
  }, [endIndex, metadata, showLineNumbers, startIndex]);
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
    if (alwaysExpanded) {
      return;
    }

    if (isExpandedControlled) {
      onExpandedPathsChangeRef.current?.(toggleExpandedPath(activeExpandedPaths, path));
      return;
    }

    setInternalExpandedPaths((current: Set<string>) => {
      const next = toggleExpandedPath(current, path);
      onExpandedPathsChangeRef.current?.(next);
      return next;
    });
  };

  const onSelect = (path: string): void => {
    setInternalSelectedPath(path);
    const row = rowsByPath.get(path);
    if (row) {
      onNodeClick?.(path, row);
    }
  };

  const rootClassName = className ? `rjv-container ${className}` : "rjv-container";
  const rootRole = metadata ? "tree" : "region";

  return (
    <div
      className={rootClassName}
      ref={containerRef}
      onScroll={onScroll}
      role={rootRole}
      style={style}
    >
      {isParsing && <div className="rjv-status">Parsing JSON...</div>}
      {!isParsing && error && <div className="rjv-status rjv-status-error">{error}</div>}
      {!isParsing && !error && (
        metadata ? (
          <>
            <div style={{ height: `${topSpacerHeight}px` }} />
            {visibleRows.map((row: FlatJsonRow) => (
              <JSONRow
                key={row.id}
                row={row}
                isSelected={activeSelectedPath === row.path}
                onToggle={onToggle}
                onSelect={onSelect}
                canToggle={!alwaysExpanded}
              />
            ))}
            <div style={{ height: `${bottomSpacerHeight}px` }} />
          </>
        ) : (
          <>
            <div style={{ height: `${topSpacerHeight}px` }} />
            <div className="rjv-plain-frame">
              {showLineNumbers && (
                <pre className="rjv-plain-gutter" style={{ lineHeight: `${rowHeight}px` }}>
                  {visiblePrettyLineNumbers || " "}
                </pre>
              )}
              <div className="rjv-plain-window" style={{ lineHeight: `${rowHeight}px` }}>
                {visiblePrettyLines.length === 0 ? (
                  <div className="rjv-plain-line">&nbsp;</div>
                ) : (
                  visiblePrettyLines.map((line, lineOffset) => (
                    <div className="rjv-plain-line" key={startIndex + lineOffset}>
                      {tokenizePrettyLine(line).map((token, tokenIndex) => (
                        <span
                          key={`${startIndex + lineOffset}-${tokenIndex}`}
                          className={token.className}
                        >
                          {token.text || " "}
                        </span>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>
            <div style={{ height: `${bottomSpacerHeight}px` }} />
          </>
        )
      )}
    </div>
  );
}
