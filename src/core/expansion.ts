import type { JSONValue } from "./types";
import { appendDocumentPath } from "./documents/paths";

interface JsonObjectLike {
  [key: string]: JSONValue;
}

const isContainer = (value: JSONValue): boolean => {
  return (
    Array.isArray(value) ||
    (typeof value === "object" && value !== null && !Array.isArray(value))
  );
};

export function createExpandedPathSet(paths?: Iterable<string>): Set<string> {
  const set = new Set(paths ?? ["$"]);
  set.add("$");
  return set;
}

export function expandPath(current: ReadonlySet<string>, path: string): Set<string> {
  const next = new Set(current);
  next.add(path);
  return next;
}

export function collapsePath(current: ReadonlySet<string>, path: string): Set<string> {
  if (path === "$") {
    return createExpandedPathSet();
  }

  const next = new Set(current);
  next.delete(path);
  return next;
}

export function toggleExpandedPath(current: ReadonlySet<string>, path: string): Set<string> {
  if (current.has(path)) {
    return collapsePath(current, path);
  }
  return expandPath(current, path);
}

export function expandedPathsFromDepth(root: JSONValue, depth: number): Set<string> {
  const paths = createExpandedPathSet();
  const stack: Array<{ value: JSONValue; path: string; depth: number }> = [{ value: root, path: "$", depth: 0 }];
  while (stack.length > 0) {
    const entry = stack.pop()!;
    if (!isContainer(entry.value) || entry.depth > depth) continue;
    paths.add(entry.path);
    if (entry.depth === depth) continue;
    if (Array.isArray(entry.value)) {
      for (let index = entry.value.length - 1; index >= 0; index -= 1) {
        stack.push({ value: entry.value[index], path: appendDocumentPath(entry.path, index), depth: entry.depth + 1 });
      }
    } else {
      const entries = Object.entries(entry.value as JsonObjectLike);
      for (let index = entries.length - 1; index >= 0; index -= 1) {
        const [key, value] = entries[index];
        stack.push({ value, path: appendDocumentPath(entry.path, key), depth: entry.depth + 1 });
      }
    }
  }
  return paths;
}
