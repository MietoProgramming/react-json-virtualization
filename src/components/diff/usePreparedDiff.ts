import { useEffect, useRef, useState } from "react";
import {
  documentProcessor,
  DocumentError,
  summarizeComparison
} from "../../core/documents";
import type {
  CompareOptions,
  ComparisonSummary,
  DocumentComparison,
  DocumentInput,
  DocumentProcessor,
  ParsedDocument,
  SummaryOptions
} from "../../core/documents";

const isParsedDocument = (input: DocumentInput | ParsedDocument): input is ParsedDocument =>
  Object.prototype.hasOwnProperty.call(input, "root");

export interface PreparedDiffState {
  before: ParsedDocument | null;
  after: ParsedDocument | null;
  comparison: DocumentComparison | null;
  summary: ComparisonSummary | null;
  error: Error | null;
  loading: boolean;
}

interface UsePreparedDiffOptions {
  beforeInput: DocumentInput | ParsedDocument;
  afterInput: DocumentInput | ParsedDocument;
  providedComparison?: DocumentComparison;
  compareOptions?: CompareOptions;
  processor?: DocumentProcessor;
  summaryOptions?: SummaryOptions;
  onComparison?: (comparison: DocumentComparison, summary: ComparisonSummary) => void;
  onError?: (error: Error) => void;
}

export const usePreparedDiff = ({
  beforeInput,
  afterInput,
  providedComparison,
  compareOptions,
  processor = documentProcessor,
  summaryOptions,
  onComparison,
  onError
}: UsePreparedDiffOptions): PreparedDiffState => {
  const [state, setState] = useState<PreparedDiffState>({ before: null, after: null, comparison: null, summary: null, error: null, loading: true });
  const callbacks = useRef({ onComparison, onError });
  callbacks.current = { onComparison, onError };
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    const controller = new AbortController();
    setState((current) => ({ ...current, error: null, loading: true }));
    const run = async (): Promise<void> => {
      try {
        const parseInput = (input: DocumentInput | ParsedDocument) => isParsedDocument(input)
          ? Promise.resolve(input)
          : processor.parse(input, { signal: controller.signal, onProgress: compareOptions?.onProgress });
        const [before, after] = await Promise.all([parseInput(beforeInput), parseInput(afterInput)]);
        const result = providedComparison ?? await processor.compare(before, after, { ...compareOptions, signal: controller.signal });
        if (result.format !== before.format || result.format !== after.format) {
          throw new DocumentError("FORMAT_MISMATCH", "The provided comparison does not match the supplied documents", { format: result.format });
        }
        const summary = summarizeComparison(result, summaryOptions);
        if (requestId.current !== id || controller.signal.aborted) return;
        setState({ before, after, comparison: result, summary, error: null, loading: false });
        callbacks.current.onComparison?.(result, summary);
      } catch (candidate) {
        if (requestId.current !== id || controller.signal.aborted) return;
        const error = candidate instanceof Error ? candidate : new Error("Unable to compare documents");
        setState({ before: null, after: null, comparison: null, summary: null, error, loading: false });
        callbacks.current.onError?.(error);
      }
    };
    void run();
    return () => {
      controller.abort();
    };
  }, [afterInput, beforeInput, compareOptions, processor, providedComparison, summaryOptions]);

  return state;
};
