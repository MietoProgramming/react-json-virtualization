import type { JSONValue } from "./types";

interface JsonObjectLike {
  [key: string]: JSONValue;
}

const isContainer = (value: JSONValue): boolean => {
  return (
    Array.isArray(value) ||
    (typeof value === "object" && value !== null && !Array.isArray(value))
  );
};

const appendObjectPath = (currentPath: string, key: string): string => {
  if (/^[$A-Z_a-z][$\w]*$/.test(key)) {
    return `${currentPath}.${key}`;
  }

  const escaped = key.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
  return `${currentPath}["${escaped}"]`;
};

const collectExpandedPaths = (
  value: JSONValue,
  maxDepth: number,
  currentPath: string,
  depth: number,
  paths: Set<string>
): void => {
  if (!isContainer(value) || depth > maxDepth) {
    return;
  }

  paths.add(currentPath);

  if (depth === maxDepth) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      collectExpandedPaths(item, maxDepth, `${currentPath}[${index}]`, depth + 1, paths);
    });
    return;
  }

  const objectValue = value as JsonObjectLike;
  Object.entries(objectValue).forEach(([key, child]) => {
    collectExpandedPaths(child, maxDepth, appendObjectPath(currentPath, key), depth + 1, paths);
  });
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
  collectExpandedPaths(root, depth, "$", 0, paths);
  return paths;
}
