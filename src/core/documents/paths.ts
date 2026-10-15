import type { JSONValue } from "../types";
import { DocumentError, type JsonPathSegment, type ParsedDocument, type PathLookupResult } from "./types";

export const parseDocumentPath = (path: string): JsonPathSegment[] => {
  if (typeof path !== "string" || !path.startsWith("$")) {
    throw new DocumentError("INVALID_PATH", "Document paths must start with '$'");
  }
  const segments: JsonPathSegment[] = [];
  let index = 1;
  while (index < path.length) {
    if (path[index] === ".") {
      const start = ++index;
      while (index < path.length && path[index] !== "." && path[index] !== "[") index += 1;
      if (start === index) throw new DocumentError("INVALID_PATH", `Empty path segment in ${path}`);
      segments.push(path.slice(start, index));
      continue;
    }
    if (path[index] !== "[") throw new DocumentError("INVALID_PATH", `Invalid path syntax at index ${index}`);
    index += 1;
    if (path[index] === '"') {
      const start = index;
      index += 1;
      while (index < path.length) {
        if (path[index] === "\\") {
          index += 2;
          continue;
        }
        if (path[index] === '"') break;
        index += 1;
      }
      if (index >= path.length || path[index] !== '"' || path[index + 1] !== "]") {
        throw new DocumentError("INVALID_PATH", `Unclosed quoted path segment in ${path}`);
      }
      let segment: unknown;
      try {
        segment = JSON.parse(path.slice(start, index + 1));
      } catch {
        throw new DocumentError("INVALID_PATH", `Invalid quoted path segment in ${path}`);
      }
      if (typeof segment !== "string") throw new DocumentError("INVALID_PATH", `Invalid path segment in ${path}`);
      segments.push(segment);
      index += 2;
      continue;
    }
    const close = path.indexOf("]", index);
    if (close < 0) throw new DocumentError("INVALID_PATH", `Unclosed array path segment in ${path}`);
    const token = path.slice(index, close);
    if (!/^(0|[1-9]\d*)$/.test(token)) {
      throw new DocumentError("INVALID_PATH", `Expected a non-negative array index in ${path}`);
    }
    const numericIndex = Number(token);
    if (!Number.isSafeInteger(numericIndex)) throw new DocumentError("INVALID_PATH", `Array index is too large in ${path}`);
    segments.push(numericIndex);
    index = close + 1;
  }
  return segments;
};

export const appendDocumentPath = (parent: string, segment: JsonPathSegment): string => {
  if (typeof segment === "number") return `${parent}[${segment}]`;
  if (/^[$A-Z_a-z][$\w]*$/.test(segment)) return `${parent}.${segment}`;
  return `${parent}[${JSON.stringify(segment)}]`;
};

export const parentDocumentPath = (path: string): string | null => {
  const segments = parseDocumentPath(path);
  if (segments.length === 0) return null;
  const parentSegments = segments.slice(0, -1);
  return parentSegments.reduce<string>((current, segment) => appendDocumentPath(current, segment), "$");
};

export const getValueAtPath = (document: ParsedDocument, path: string): PathLookupResult => {
  const segments = parseDocumentPath(path);
  let current: JSONValue = document.root;
  for (const segment of segments) {
    if (Array.isArray(current)) {
      if (typeof segment !== "number" || segment >= current.length) return { found: false };
      current = current[segment];
      continue;
    }
    if (typeof current !== "object" || current === null || typeof segment !== "string") return { found: false };
    if (!Object.prototype.hasOwnProperty.call(current, segment)) return { found: false };
    current = current[segment];
  }
  return { found: true, value: current };
};

export const getDocumentPathAncestors = (path: string): string[] => {
  const ancestors: string[] = [];
  let current: string | null = path;
  while (current !== null) {
    ancestors.push(current);
    current = parentDocumentPath(current);
  }
  return ancestors.reverse();
};
