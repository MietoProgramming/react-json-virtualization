import { useEffect, useRef, useState } from "react";
import { createExpandedPathSet, expandedPathsFromDepth } from "../../core/expansion";
import { parseJsonIncremental } from "../../core/parser";
import type { JSONValue } from "../../core/types";

interface UseParsedJsonStateParams {
  json: string;
  metadata: boolean;
  alwaysExpanded: boolean;
  initialExpandDepth: number;
  defaultExpandedPaths?: Iterable<string>;
  isExpandedControlled: boolean;
  onParseProgress?: (processedChars: number, totalChars: number) => void;
  onParseError?: (error: Error) => void;
  onExpandedPathsChange?: (paths: Set<string>) => void;
}

interface ParsedJsonState {
  root: JSONValue | null;
  error: string | null;
  isParsing: boolean;
  internalExpandedPaths: Set<string>;
  setInternalExpandedPaths: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export const useParsedJsonState = ({
  json,
  metadata,
  alwaysExpanded,
  initialExpandDepth,
  defaultExpandedPaths,
  isExpandedControlled,
  onParseProgress,
  onParseError,
  onExpandedPathsChange
}: UseParsedJsonStateParams): ParsedJsonState => {
  const [root, setRoot] = useState<JSONValue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [internalExpandedPaths, setInternalExpandedPaths] = useState<Set<string>>(() =>
    createExpandedPathSet(defaultExpandedPaths)
  );

  const onParseProgressRef = useRef(onParseProgress);
  const onParseErrorRef = useRef(onParseError);
  const onExpandedPathsChangeRef = useRef(onExpandedPathsChange);

  onParseProgressRef.current = onParseProgress;
  onParseErrorRef.current = onParseError;
  onExpandedPathsChangeRef.current = onExpandedPathsChange;

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

  return {
    root,
    error,
    isParsing,
    internalExpandedPaths,
    setInternalExpandedPaths
  };
};
