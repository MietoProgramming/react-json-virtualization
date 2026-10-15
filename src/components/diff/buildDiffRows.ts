import { appendDocumentPath, parentDocumentPath } from "../../core/documents/paths";
import type { CompareOptions, DocumentChange, DocumentComparison, ParsedDocument } from "../../core/documents";
import type { JSONValue, FlatJsonRow, JSONValueType } from "../../core/types";

export interface DiffRow {
  key: string;
  displayPath: string;
  expansionKey: string;
  parentExpansionKey: string | null;
  depth: number;
  beforeRow?: FlatJsonRow;
  afterRow?: FlatJsonRow;
  changeKind?: DocumentChange["kind"];
}

interface WalkEntry { value: JSONValue; path: string; key?: string; depth: number }

const getType = (value: JSONValue): JSONValueType => {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") return "object";
  return typeof value as JSONValueType;
};

const makePreview = (value: JSONValue, type: JSONValueType): string => {
  if (type === "null") return "null";
  if (type === "string") {
    const text = JSON.stringify(value);
    return text.length > 72 ? `${text.slice(0, 69)}...` : text;
  }
  if (type === "number" || type === "boolean") return String(value);
  return type === "array" ? `Array(${(value as JSONValue[]).length})` : `Object(${Object.keys(value as object).length})`;
};

const flatten = (root: JSONValue): FlatJsonRow[] => {
  const rows: FlatJsonRow[] = [];
  const stack: WalkEntry[] = [{ value: root, path: "$", depth: 0 }];
  while (stack.length > 0) {
    const entry = stack.pop()!;
    const valueType = getType(entry.value);
    const expandable = Array.isArray(entry.value) ? entry.value.length > 0 : valueType === "object" && Object.keys(entry.value as object).length > 0;
    rows.push({
      id: entry.path,
      path: entry.path,
      depth: entry.depth,
      key: entry.key,
      valueType,
      rawValue: entry.value,
      preview: makePreview(entry.value, valueType),
      isExpandable: expandable,
      isExpanded: false
    });
    if (!expandable) continue;
    const children = Array.isArray(entry.value)
      ? entry.value.map((value, index) => [String(index), value, index] as const)
      : Object.entries(entry.value as Record<string, JSONValue>).map(([key, value]) => [key, value, key] as const);
    for (let index = children.length - 1; index >= 0; index -= 1) {
      const [key, value, segment] = children[index];
      stack.push({ value, key, path: appendDocumentPath(entry.path, segment), depth: entry.depth + 1 });
    }
  }
  return rows;
};

interface KeyedPathMappings {
  mappings: Array<{ from: string; to: string }>;
  beforeItems: string[];
  afterItems: string[];
}

const mapKeyedPath = (path: string, mappings: Map<string, string>, keyedItems: Set<string>): string | undefined => {
  let current: string | null = path;
  while (current !== null) {
    if (keyedItems.has(current)) {
      const mapped = mappings.get(current);
      return mapped === undefined ? undefined : `${mapped}${path.slice(current.length)}`;
    }
    current = parentDocumentPath(current);
  }
  return path;
};

const prefixMappingsFrom = (changes: DocumentChange[], side: "before" | "after"): Array<{ from: string; to: string }> =>
  changes
    .filter((change) => change.kind === "moved" && change.beforePath && change.afterPath)
    .map((change) => ({ from: side === "before" ? change.beforePath! : change.afterPath!, to: side === "before" ? change.afterPath! : change.beforePath! }))
    .sort((left, right) => right.from.length - left.from.length);

const readArrayKey = (record: unknown, segments: readonly (string | number)[]): string | undefined => {
  let value = record;
  for (const segment of segments) {
    if (Array.isArray(value) && typeof segment === "number") value = value[segment];
    else if (value !== null && typeof value === "object" && typeof segment === "string") value = (value as Record<string, unknown>)[segment];
    else return undefined;
  }
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  return `${typeof value}:${typeof value === "string" ? JSON.stringify(value) : String(value)}`;
};

const keyedPathMappings = (
  before: ParsedDocument,
  after: ParsedDocument,
  arrayKeys: CompareOptions["arrayKeys"]
): KeyedPathMappings => {
  const mappings: Array<{ from: string; to: string }> = [];
  const beforeItems: string[] = [];
  const afterItems: string[] = [];
  const stack: Array<{ before: JSONValue; after: JSONValue; beforePath: string; afterPath: string }> = [
    { before: before.root, after: after.root, beforePath: "$", afterPath: "$" }
  ];
  while (stack.length > 0) {
    const frame = stack.pop()!;
    if (Array.isArray(frame.before) && Array.isArray(frame.after)) {
      const beforeArray = frame.before;
      const afterArray = frame.after;
      const configured = arrayKeys?.[frame.afterPath] ?? arrayKeys?.[frame.beforePath];
      if (configured) {
        const segments = typeof configured === "string" ? [configured] : configured;
        const beforeIndex = new Map<string, number>();
        beforeArray.forEach((_item, index) => beforeItems.push(appendDocumentPath(frame.beforePath, index)));
        afterArray.forEach((_item, index) => afterItems.push(appendDocumentPath(frame.afterPath, index)));
        beforeArray.forEach((item, index) => {
          const key = readArrayKey(item, segments);
          if (key !== undefined) beforeIndex.set(key, index);
        });
        afterArray.forEach((item, afterIndex) => {
          const key = readArrayKey(item, segments);
          const beforeItemIndex = key === undefined ? undefined : beforeIndex.get(key);
          if (beforeItemIndex === undefined) return;
          const from = appendDocumentPath(frame.beforePath, beforeItemIndex);
          const to = appendDocumentPath(frame.afterPath, afterIndex);
          mappings.push({ from, to });
          stack.push({ before: beforeArray[beforeItemIndex], after: item, beforePath: from, afterPath: to });
        });
      } else {
        for (let index = Math.min(beforeArray.length, afterArray.length) - 1; index >= 0; index -= 1) {
          stack.push({ before: beforeArray[index], after: afterArray[index], beforePath: appendDocumentPath(frame.beforePath, index), afterPath: appendDocumentPath(frame.afterPath, index) });
        }
      }
    } else if (frame.before !== null && frame.after !== null && typeof frame.before === "object" && typeof frame.after === "object" && !Array.isArray(frame.before) && !Array.isArray(frame.after)) {
      const beforeObject = frame.before as Record<string, JSONValue>;
      const afterObject = frame.after as Record<string, JSONValue>;
      Object.keys(beforeObject).filter((key) => Object.prototype.hasOwnProperty.call(afterObject, key)).forEach((key) => {
        stack.push({ before: beforeObject[key], after: afterObject[key], beforePath: appendDocumentPath(frame.beforePath, key), afterPath: appendDocumentPath(frame.afterPath, key) });
      });
    }
  }
  return {
    mappings: mappings.sort((left, right) => right.from.length - left.from.length),
    beforeItems,
    afterItems
  };
};

interface ChangeLookup {
  pairs: Map<string, DocumentChange["kind"]>;
  removed: Map<string, DocumentChange["kind"]>;
  added: Map<string, DocumentChange["kind"]>;
}

const buildChangeLookup = (changes: DocumentChange[]): ChangeLookup => {
  const lookup: ChangeLookup = { pairs: new Map(), removed: new Map(), added: new Map() };
  changes.forEach((change) => {
    if (change.beforePath && change.afterPath) lookup.pairs.set(JSON.stringify([change.beforePath, change.afterPath]), change.kind);
    if (change.kind === "removed" && change.beforePath) lookup.removed.set(change.beforePath, change.kind);
    if (change.kind === "added" && change.afterPath) lookup.added.set(change.afterPath, change.kind);
  });
  return lookup;
};

const findAncestorChange = (path: string | undefined, changes: Map<string, DocumentChange["kind"]>): DocumentChange["kind"] | undefined => {
  let ancestor = path ? parentDocumentPath(path) : null;
  while (ancestor !== null) {
    const kind = changes.get(ancestor);
    if (kind) return kind;
    ancestor = parentDocumentPath(ancestor);
  }
  return undefined;
};

const classify = (
  beforePath: string | undefined,
  afterPath: string | undefined,
  changes: ChangeLookup
): DocumentChange["kind"] | undefined => {
  if (beforePath && afterPath) {
    const exact = changes.pairs.get(JSON.stringify([beforePath, afterPath]));
    if (exact) return exact;
  }
  const removed = beforePath ? changes.removed.get(beforePath) ?? findAncestorChange(beforePath, changes.removed) : undefined;
  if (removed) return removed;
  return afterPath ? changes.added.get(afterPath) ?? findAncestorChange(afterPath, changes.added) : undefined;
};

export const buildDiffRows = (
  before: ParsedDocument,
  after: ParsedDocument,
  comparison: DocumentComparison,
  options: Pick<CompareOptions, "arrayKeys"> = {}
): DiffRow[] => {
  const beforeRows = flatten(before.root);
  const afterRows = flatten(after.root);
  const keyedMappings = keyedPathMappings(before, after, options.arrayKeys);
  const beforeToAfter = new Map([...keyedMappings.mappings, ...prefixMappingsFrom(comparison.changes, "before")].map(({ from, to }) => [from, to]));
  const afterToBefore = new Map([...beforeToAfter].map(([from, to]) => [to, from]));
  const beforeKeyedItems = new Set(keyedMappings.beforeItems);
  const afterKeyedItems = new Set(keyedMappings.afterItems);
  const changeLookup = buildChangeLookup(comparison.changes);
  const beforeByPath = new Map(beforeRows.map((row) => [row.path, row]));
  const afterPaths = new Set(afterRows.map((row) => row.path));
  const usedBefore = new Set<string>();
  const rowsByAfter = afterRows.map((afterRow) => {
    const beforePath = mapKeyedPath(afterRow.path, afterToBefore, afterKeyedItems);
    const beforeRow = beforePath === undefined ? undefined : beforeByPath.get(beforePath);
    if (beforeRow && beforePath) usedBefore.add(beforePath);
    return {
      key: `pair:${beforePath ?? "added"}:${afterRow.path}`,
      displayPath: afterRow.path,
      expansionKey: `after:${afterRow.path}`,
      parentExpansionKey: parentDocumentPath(afterRow.path) ? `after:${parentDocumentPath(afterRow.path)}` : null,
      depth: afterRow.depth,
      beforeRow,
      afterRow,
      changeKind: classify(beforeRow?.path, afterRow.path, changeLookup)
    } satisfies DiffRow;
  });
  const indexByPath = new Map(rowsByAfter.map((row, index) => [row.afterRow!.path, index]));
  const afterBuckets = new Map<number, DiffRow[]>();
  const beforeBuckets = new Map<number, DiffRow[]>();
  let previousCommonIndex: number | undefined;
  const rowsBeforeInOrder = beforeRows.map((beforeRow) => {
    const mappedAfterPath = mapKeyedPath(beforeRow.path, beforeToAfter, beforeKeyedItems);
    const mapped = mappedAfterPath === undefined ? undefined : indexByPath.get(mappedAfterPath);
    return { beforeRow, mapped };
  });
  const nextCommonIndexes = new Array<number | undefined>(rowsBeforeInOrder.length);
  let nextCommonIndex: number | undefined;
  for (let index = rowsBeforeInOrder.length - 1; index >= 0; index -= 1) {
    if (rowsBeforeInOrder[index].mapped !== undefined) nextCommonIndex = rowsBeforeInOrder[index].mapped;
    nextCommonIndexes[index] = nextCommonIndex;
  }
  rowsBeforeInOrder.forEach(({ beforeRow, mapped }, beforeIndex) => {
    if (usedBefore.has(beforeRow.path) || mapped !== undefined) {
      if (mapped !== undefined) previousCommonIndex = mapped;
      return;
    }
    const changeKind = classify(beforeRow.path, undefined, changeLookup);
    const beforeParent = parentDocumentPath(beforeRow.path);
    const mappedParent = beforeParent ? mapKeyedPath(beforeParent, beforeToAfter, beforeKeyedItems) : null;
    const displayParent = mappedParent ?? beforeParent;
    const entry: DiffRow = {
      key: `before:${beforeRow.path}`,
      displayPath: beforeRow.path,
      expansionKey: `before:${beforeRow.path}`,
      parentExpansionKey: displayParent ? `${mappedParent && afterPaths.has(displayParent) ? "after" : "before"}:${displayParent}` : null,
      depth: beforeRow.depth,
      beforeRow,
      changeKind
    };
    const previous = previousCommonIndex;
    if (previous !== undefined) {
      const bucket = afterBuckets.get(previous) ?? [];
      bucket.push(entry);
      afterBuckets.set(previous, bucket);
    } else {
      const next = nextCommonIndexes[beforeIndex];
      const bucket = beforeBuckets.get(next ?? 0) ?? [];
      bucket.push(entry);
      beforeBuckets.set(next ?? 0, bucket);
    }
  });
  const result: DiffRow[] = [];
  rowsByAfter.forEach((row, index) => {
    result.push(...(beforeBuckets.get(index) ?? []), row, ...(afterBuckets.get(index) ?? []));
  });
  return result;
};
