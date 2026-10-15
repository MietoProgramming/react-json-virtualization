import { compareDocuments } from "./compare";
import { getValueAtPath } from "./paths";
import { parseDocument } from "./parse";
import { filterDocument, searchDocument } from "./search";
import { DocumentError, type DocumentSerializeOptions, type ParsedDocument } from "./types";
import type { DocumentProcessor, DocumentInput, DocumentOperationOptions, DocumentQueryOptions, CompareOptions } from "./types";

export { compareDocuments, summarizeComparison } from "./compare";
export { appendDocumentPath, getDocumentPathAncestors, getValueAtPath, parseDocumentPath, parentDocumentPath } from "./paths";
export { parseDocument, validateParsedDocument } from "./parse";
export { filterDocument, searchDocument } from "./search";
export { DocumentError } from "./types";
export type {
  ChangeKind,
  ComparisonSummary,
  CompareOptions,
  DocumentChange,
  DocumentComparison,
  DocumentErrorCode,
  DocumentFilterResult,
  DocumentInput,
  DocumentMatch,
  DocumentOperationOptions,
  DocumentProgress,
  DocumentProcessor,
  DocumentQueryOptions,
  DocumentSearchResult,
  DocumentSerializeOptions,
  JsonPathSegment,
  ParsedDocument,
  PathLookupResult,
  StructuredFormat,
  SummaryOptions
} from "./types";

export const serializeNode = (
  document: ParsedDocument,
  path: string,
  options: DocumentSerializeOptions = {}
): string => {
  const result = getValueAtPath(document, path);
  if (!result.found) throw new DocumentError("PATH_NOT_FOUND", `No value exists at ${path}`, { format: document.format });
  try {
    const serialized = JSON.stringify(result.value, null, options.space);
    if (serialized === undefined) throw new Error("Value cannot be represented as JSON");
    return serialized;
  } catch (error) {
    throw new DocumentError("UNSUPPORTED_VALUE", error instanceof Error ? error.message : "Unable to serialize value", { format: document.format });
  }
};

export const createLocalDocumentProcessor = (): DocumentProcessor => ({
  parse: (input: DocumentInput, options?: DocumentOperationOptions) => parseDocument(input, options),
  search: (document: ParsedDocument, query: string, options?: DocumentQueryOptions) => searchDocument(document, query, options),
  filter: (document: ParsedDocument, query: string, options?: DocumentQueryOptions) => filterDocument(document, query, options),
  compare: (before: ParsedDocument, after: ParsedDocument, options?: CompareOptions) => compareDocuments(before, after, options)
});

export const documentProcessor = createLocalDocumentProcessor();
