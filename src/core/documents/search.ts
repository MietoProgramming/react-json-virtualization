import { splitFilterQueryTerms } from "../filterQuery";
import { getPathSegments } from "../pathSegments";
import { appendDocumentPath, getDocumentPathAncestors, getValueAtPath } from "./paths";
import { DocumentError, type DocumentFilterResult, type DocumentMatch, type DocumentQueryOptions, type DocumentSearchResult, type ParsedDocument } from "./types";
import { throwIfAborted } from "./yield";
import { validateParsedDocument } from "./parse";

const nodeType = (value: unknown): string => {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
};

const resolveMode = (term: string, mode: NonNullable<DocumentQueryOptions["mode"]>): "prefix" | "includes" | "exact" => {
  if (mode !== "auto") return mode;
  return term.startsWith("$") ? "prefix" : "includes";
};

const matches = (path: string, value: unknown, terms: string[], options: DocumentQueryOptions): boolean => {
  const caseSensitive = options.caseSensitive ?? false;
  const normalize = (text: string): string => caseSensitive ? text : text.toLowerCase();
  const normalizedPath = normalize(path);
  const normalizedSegments = options.mode === "exact" ? getPathSegments(path).map(normalize) : [];
  const scalar = value === null || ["string", "number", "boolean"].includes(typeof value) ? normalize(String(value)) : null;
  return terms.some((term) => {
    const needle = normalize(term);
    const mode = resolveMode(term, options.mode ?? "auto");
    const pathMatch = mode === "exact"
      ? normalizedPath === needle || normalizedSegments.includes(needle)
      : mode === "prefix" ? normalizedPath.startsWith(needle) : normalizedPath.includes(needle);
    const valueMatch = scalar !== null && (mode === "exact" ? scalar === needle : scalar.includes(needle));
    return pathMatch || valueMatch;
  });
};

interface MatchScan {
  items: DocumentMatch[];
  total: number;
}

const scan = async (
  document: ParsedDocument,
  query: string,
  options: DocumentQueryOptions,
  phase: "search" | "filter",
  includeAll = false
): Promise<MatchScan> => {
  const terms = splitFilterQueryTerms(query);
  if (!includeAll && terms.length === 0) return { items: [], total: 0 };
  const limit = Math.max(0, Math.floor(options.limit ?? 500));
  const offset = Math.max(0, Math.floor(options.offset ?? 0));
  const stack: Array<{ value: unknown; path: string }> = [{ value: document.root, path: "$" }];
  const items: DocumentMatch[] = [];
  let total = 0;
  let processed = 0;
  let lastYield = typeof performance !== "undefined" ? performance.now() : Date.now();
  const interval = options.yieldIntervalMs ?? 8;
  while (stack.length > 0) {
    throwIfAborted(options.signal);
    const current = stack.pop()!;
    processed += 1;
    if (includeAll || matches(current.path, current.value, terms, options)) {
      if (total >= offset && items.length < limit) {
        items.push({ path: current.path, valueType: nodeType(current.value), value: current.value as never });
      }
      total += 1;
    }
    if (Array.isArray(current.value)) {
      for (let index = current.value.length - 1; index >= 0; index -= 1) {
        stack.push({ value: current.value[index], path: appendDocumentPath(current.path, index) });
      }
    } else if (current.value !== null && typeof current.value === "object") {
      const entries = Object.entries(current.value as Record<string, unknown>);
      for (let index = entries.length - 1; index >= 0; index -= 1) {
        const [key, value] = entries[index];
        stack.push({ value, path: appendDocumentPath(current.path, key) });
      }
    }
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (now - lastYield >= interval) {
      options.onProgress?.({ phase, processed, total: processed + stack.length });
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      lastYield = typeof performance !== "undefined" ? performance.now() : Date.now();
      throwIfAborted(options.signal);
    }
  }
  options.onProgress?.({ phase, processed, total: processed });
  return { items, total };
};

const validateOptions = (options: DocumentQueryOptions): void => {
  if (options.limit !== undefined && (!Number.isSafeInteger(options.limit) || options.limit < 0)) {
    throw new DocumentError("INVALID_INPUT", "Search limit must be a non-negative integer");
  }
  if (options.offset !== undefined && (!Number.isSafeInteger(options.offset) || options.offset < 0)) {
    throw new DocumentError("INVALID_INPUT", "Search offset must be a non-negative integer");
  }
  if (options.mode !== undefined && !["auto", "prefix", "includes", "exact"].includes(options.mode)) {
    throw new DocumentError("INVALID_INPUT", "Search mode must be auto, prefix, includes, or exact");
  }
};

export const searchDocument = async (
  document: ParsedDocument,
  query: string,
  options: DocumentQueryOptions = {}
): Promise<DocumentSearchResult> => {
  if (typeof query !== "string") throw new DocumentError("INVALID_INPUT", "Search query must be a string");
  validateOptions(options);
  document = await validateParsedDocument(document, options);
  const result = await scan(document, query, options, "search");
  const offset = Math.max(0, Math.floor(options.offset ?? 0));
  const limit = Math.max(0, Math.floor(options.limit ?? 500));
  return { query, total: result.total, offset, limit, hasMore: offset + result.items.length < result.total, items: result.items };
};

export const filterDocument = async (
  document: ParsedDocument,
  query: string,
  options: DocumentQueryOptions = {}
): Promise<DocumentFilterResult> => {
  if (typeof query !== "string") throw new DocumentError("INVALID_INPUT", "Filter query must be a string");
  validateOptions(options);
  document = await validateParsedDocument(document, options);
  const result = await scan(document, query, options, "filter", query.trim().length === 0);
  const contextPaths = [...new Set(result.items.flatMap((item) => getDocumentPathAncestors(item.path)))].sort();
  const offset = Math.max(0, Math.floor(options.offset ?? 0));
  const limit = Math.max(0, Math.floor(options.limit ?? 500));
  return { query, total: result.total, offset, limit, hasMore: offset + result.items.length < result.total, items: result.items, contextPaths };
};

export { getValueAtPath };
