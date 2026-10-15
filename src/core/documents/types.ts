import type { JSONValue } from "../types";

export type StructuredFormat = "json" | "yaml" | "xml";

export type DocumentInput =
  | { format: StructuredFormat; text: string }
  | { format: "json"; value: JSONValue };

export interface ParsedDocument {
  format: StructuredFormat;
  root: JSONValue;
}

export type DocumentProgress = {
  phase: "parse" | "search" | "filter" | "compare";
  processed: number;
  total: number;
};

export interface DocumentOperationOptions {
  signal?: AbortSignal;
  yieldIntervalMs?: number;
  onProgress?: (progress: DocumentProgress) => void;
}

export interface DocumentQueryOptions extends DocumentOperationOptions {
  mode?: "auto" | "prefix" | "includes" | "exact";
  caseSensitive?: boolean;
  offset?: number;
  limit?: number;
}

export interface DocumentMatch {
  path: string;
  valueType: string;
  value?: JSONValue;
}

export interface DocumentSearchResult {
  query: string;
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
  items: DocumentMatch[];
}

export interface DocumentFilterResult extends DocumentSearchResult {
  contextPaths: string[];
}

export interface DocumentSerializeOptions {
  space?: number;
}

export type ChangeKind = "added" | "removed" | "changed" | "moved";

export interface DocumentChange {
  kind: ChangeKind;
  beforePath?: string;
  afterPath?: string;
  beforeIndex?: number;
  afterIndex?: number;
  beforeValue?: JSONValue;
  afterValue?: JSONValue;
}

export interface DocumentComparison {
  format: StructuredFormat;
  equal: boolean;
  changes: DocumentChange[];
  counts: {
    added: number;
    removed: number;
    changed: number;
    moved: number;
    total: number;
  };
}

export type ComparisonSummary = DocumentComparison["counts"] & {
  equal: boolean;
  description: string;
};

export interface CompareOptions extends DocumentOperationOptions {
  arrayKeys?: Record<string, string | readonly string[]>;
  includeValues?: boolean;
}

export interface SummaryOptions {
  locale?: "pl" | "en";
}

export interface DocumentProcessor {
  parse(input: DocumentInput, options?: DocumentOperationOptions): Promise<ParsedDocument>;
  search(document: ParsedDocument, query: string, options?: DocumentQueryOptions): Promise<DocumentSearchResult>;
  filter(document: ParsedDocument, query: string, options?: DocumentQueryOptions): Promise<DocumentFilterResult>;
  compare(before: ParsedDocument, after: ParsedDocument, options?: CompareOptions): Promise<DocumentComparison>;
  dispose?(): void;
}

export interface PathLookupResult {
  found: boolean;
  value?: JSONValue;
}

export type DocumentErrorCode =
  | "INVALID_INPUT"
  | "INVALID_JSON"
  | "INVALID_YAML"
  | "INVALID_XML"
  | "UNSUPPORTED_VALUE"
  | "INVALID_PATH"
  | "PATH_NOT_FOUND"
  | "FORMAT_MISMATCH"
  | "INVALID_ARRAY_KEY"
  | "DUPLICATE_ARRAY_KEY"
  | "OPERATION_ABORTED";

export class DocumentError extends Error {
  readonly code: DocumentErrorCode;
  readonly format?: StructuredFormat;
  readonly line?: number;
  readonly column?: number;
  readonly index?: number;

  constructor(
    code: DocumentErrorCode,
    message: string,
    details: { format?: StructuredFormat; line?: number; column?: number; index?: number } = {}
  ) {
    super(message);
    this.name = "DocumentError";
    this.code = code;
    this.format = details.format;
    this.line = details.line;
    this.column = details.column;
    this.index = details.index;
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      format: this.format,
      line: this.line,
      column: this.column,
      index: this.index
    };
  }
}

export type JsonPathSegment = string | number;
