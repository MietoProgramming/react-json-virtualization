import { useEffect, useRef, useState } from "react";
import { createExpandedPathSet, expandedPathsFromDepth } from "../../core/expansion";
import type { SourceFormat } from "../../core/sourceFormat";
import { parseSourceIncremental } from "../../core/sourceParser";
import type { JSONValue } from "../../core/types";
import type { DocumentProcessor } from "../../core/documents";

interface UseParsedJsonStateParams {
  json: string;
  sourceFormat: SourceFormat;
  metadata: boolean;
  alwaysExpanded: boolean;
  initialExpandDepth: number;
  defaultExpandedPaths?: Iterable<string>;
  isExpandedControlled: boolean;
  processor?: DocumentProcessor;
  onParseProgress?: (processedChars: number, totalChars: number) => void;
  onParseError?: (error: Error) => void;
  onExpandedPathsChange?: (paths: Set<string>) => void;
}

interface ParsedJsonState {
  root: JSONValue | null;
  hasRoot: boolean;
  error: string | null;
  isParsing: boolean;
  internalExpandedPaths: Set<string>;
  setInternalExpandedPaths: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export const useParsedJsonState = ({
  json,
  sourceFormat,
  metadata,
  alwaysExpanded,
  initialExpandDepth,
  defaultExpandedPaths,
  isExpandedControlled,
  processor,
  onParseProgress,
  onParseError,
  onExpandedPathsChange
}: UseParsedJsonStateParams): ParsedJsonState => {
  const [root, setRoot] = useState<JSONValue | null>(null);
  const [hasRoot, setHasRoot] = useState(false);
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
      setRoot(null);
      setHasRoot(false);
      setIsParsing(false);
      setError(null);
      return;
    }

    let mounted = true;
    const controller = new AbortController();

    const parse = async (): Promise<void> => {
      setIsParsing(true);
      setRoot(null);
      setHasRoot(false);
      setError(null);

      try {
        let parsedRoot: JSONValue;
        if (processor) {
          const parsedDocument = await processor.parse({ format: "json", text: json }, {
            signal: controller.signal,
            onProgress: (progress) => onParseProgressRef.current?.(progress.processed, progress.total)
          });
          parsedRoot = parsedDocument.root;
        } else {
          const parsedSource = await parseSourceIncremental(json, sourceFormat, {
            signal: controller.signal,
            onProgress: (processedChars, totalChars) => onParseProgressRef.current?.(processedChars, totalChars)
          });
          if (parsedSource.root === null && parsedSource.format !== "json") {
            throw new Error(`Metadata mode is not available for ${parsedSource.format} sources`);
          }
          parsedRoot = parsedSource.root as JSONValue;
        }

        if (!mounted) return;

        setRoot(parsedRoot);
        setHasRoot(true);

        const nextExpanded =
          alwaysExpanded
            ? expandedPathsFromDepth(parsedRoot, Number.POSITIVE_INFINITY)
            : defaultExpandedPaths === undefined
              ? expandedPathsFromDepth(parsedRoot, initialExpandDepth)
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
            : new Error("Unknown source parse error");

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
    processor,
    sourceFormat,
    metadata
  ]);

  return {
    root,
    hasRoot,
    error,
    isParsing,
    internalExpandedPaths,
    setInternalExpandedPaths
  };
};
