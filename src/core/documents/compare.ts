import { appendDocumentPath, parseDocumentPath } from "./paths";
import { DocumentError, type CompareOptions, type DocumentChange, type DocumentComparison, type ParsedDocument, type SummaryOptions } from "./types";
import { throwIfAborted } from "./yield";
import { validateParsedDocument } from "./parse";

type Frame = { before: unknown; after: unknown; beforePath: string; afterPath: string; beforeIndex?: number; afterIndex?: number };

const isContainer = (value: unknown): value is Record<string, unknown> | unknown[] => value !== null && typeof value === "object";
const isArray = (value: unknown): value is unknown[] => Array.isArray(value);
const sameType = (left: unknown, right: unknown): boolean => (Array.isArray(left) ? "array" : typeof left) === (Array.isArray(right) ? "array" : typeof right);
const scalarEqual = (left: unknown, right: unknown): boolean => left === right && !isContainer(left) && !isContainer(right);
const now = (): number => typeof performance !== "undefined" ? performance.now() : Date.now();

const createCheckpoint = (options: CompareOptions): (() => Promise<void>) => {
  const interval = options.yieldIntervalMs ?? 8;
  let lastYield = now();
  return async () => {
    throwIfAborted(options.signal);
    if (now() - lastYield < interval) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    lastYield = now();
    throwIfAborted(options.signal);
  };
};

const countNodes = async (root: unknown, options: CompareOptions): Promise<number> => {
  const stack: unknown[] = [root];
  let count = 0;
  const interval = options.yieldIntervalMs ?? 8;
  let checkpointAt = Date.now();
  while (stack.length > 0) {
    throwIfAborted(options.signal);
    const value = stack.pop();
    count += 1;
    if (Array.isArray(value)) {
      for (let index = value.length - 1; index >= 0; index -= 1) stack.push(value[index]);
    } else if (value !== null && typeof value === "object") {
      const children = Object.values(value as Record<string, unknown>);
      for (let index = children.length - 1; index >= 0; index -= 1) stack.push(children[index]);
    }
    if (Date.now() - checkpointAt >= interval) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      checkpointAt = Date.now();
      throwIfAborted(options.signal);
    }
  }
  return count;
};

const resolveArrayKey = (arrayKeys: CompareOptions["arrayKeys"], path: string): readonly (string | number)[] | undefined => {
  const configured = arrayKeys?.[path];
  if (typeof configured === "string") return [configured];
  return configured;
};

const readIdentifier = (record: unknown, segments: readonly (string | number)[]): { found: boolean; id?: string } => {
  let value = record;
  for (const segment of segments) {
    if (Array.isArray(value)) {
      if (typeof segment !== "number" || segment < 0 || segment >= value.length) return { found: false };
      value = value[segment];
    } else if (value !== null && typeof value === "object" && typeof segment === "string" && Object.prototype.hasOwnProperty.call(value, segment)) {
      value = (value as Record<string, unknown>)[segment];
    } else return { found: false };
  }
  if (typeof value !== "string" && typeof value !== "number") return { found: false };
  return { found: true, id: `${typeof value}:${typeof value === "string" ? JSON.stringify(value) : String(value)}` };
};

const indexByKey = async (
  items: unknown[],
  keySegments: readonly (string | number)[],
  side: string,
  checkpoint: () => Promise<void>
): Promise<Map<string, number>> => {
  const result = new Map<string, number>();
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const resolved = readIdentifier(item, keySegments);
    if (!resolved.found || resolved.id === undefined) {
      throw new DocumentError("INVALID_ARRAY_KEY", `Array record at ${side}[${index}] has no scalar matching key`);
    }
    if (result.has(resolved.id)) throw new DocumentError("DUPLICATE_ARRAY_KEY", `Duplicate array key at ${side}[${index}]`);
    result.set(resolved.id, index);
    await checkpoint();
  }
  return result;
};

const longestIncreasingSubsequencePositions = async (
  sequence: number[],
  beforeLength: number,
  checkpoint: () => Promise<void>
): Promise<Set<number>> => {
  const tree = new Array<number>(beforeLength + 1).fill(0);
  const lengthsStartingAt = new Array<number>(sequence.length).fill(0);
  const query = (index: number): number => {
    let maximum = 0;
    while (index > 0) {
      maximum = Math.max(maximum, tree[index]);
      index -= index & -index;
    }
    return maximum;
  };
  const update = (index: number, value: number): void => {
    while (index < tree.length) {
      tree[index] = Math.max(tree[index], value);
      index += index & -index;
    }
  };
  let longest = 0;
  for (let position = sequence.length - 1; position >= 0; position -= 1) {
    const rank = beforeLength - sequence[position];
    const length = query(rank - 1) + 1;
    lengthsStartingAt[position] = length;
    longest = Math.max(longest, length);
    update(rank, length);
    await checkpoint();
  }
  const positions = new Set<number>();
  let remaining = longest;
  let previousValue = Number.NEGATIVE_INFINITY;
  let nextPosition = 0;
  while (remaining > 0) {
    for (let position = nextPosition; position < sequence.length; position += 1) {
      if (sequence[position] <= previousValue || lengthsStartingAt[position] < remaining) continue;
      positions.add(position);
      previousValue = sequence[position];
      nextPosition = position + 1;
      remaining -= 1;
      break;
    }
    await checkpoint();
  }
  return positions;
};

const compareCodePoints = (left: string, right: string): number => {
  const leftPoints = Array.from(left, (character) => character.codePointAt(0)!);
  const rightPoints = Array.from(right, (character) => character.codePointAt(0)!);
  const length = Math.min(leftPoints.length, rightPoints.length);
  for (let index = 0; index < length; index += 1) {
    if (leftPoints[index] !== rightPoints[index]) return leftPoints[index] - rightPoints[index];
  }
  return leftPoints.length - rightPoints.length;
};

const changeOrder: Record<DocumentChange["kind"], number> = { removed: 0, moved: 1, changed: 2, added: 3 };

export const compareDocuments = async (
  before: ParsedDocument,
  after: ParsedDocument,
  options: CompareOptions = {}
): Promise<DocumentComparison> => {
  throwIfAborted(options.signal);
  if (!before || typeof before !== "object" || !after || typeof after !== "object") {
    throw new DocumentError("INVALID_INPUT", "Both comparison inputs must be parsed documents");
  }
  const isFormat = (value: unknown): value is ParsedDocument["format"] => value === "json" || value === "yaml" || value === "xml";
  if (!isFormat(before.format) || !isFormat(after.format)) {
    throw new DocumentError("INVALID_INPUT", "Parsed documents must include a supported format");
  }
  if (before.format !== after.format) {
    throw new DocumentError("FORMAT_MISMATCH", `Cannot compare ${before.format} with ${after.format}`, { format: after.format });
  }
  before = await validateParsedDocument(before, options);
  after = await validateParsedDocument(after, options);
  const total = (await countNodes(before.root, options)) + (await countNodes(after.root, options));
  const stack: Frame[] = [{ before: before.root, after: after.root, beforePath: "$", afterPath: "$" }];
  const changes: DocumentChange[] = [];
  let processed = 0;
  const checkpoint = createCheckpoint(options);
  let lastProgress = now();
  const includeValues = options.includeValues ?? true;
  const addChange = (change: DocumentChange): void => {
    changes.push(includeValues ? change : { ...change, beforeValue: undefined, afterValue: undefined });
    if (!includeValues) {
      delete changes[changes.length - 1].beforeValue;
      delete changes[changes.length - 1].afterValue;
    }
  };
  while (stack.length > 0) {
    throwIfAborted(options.signal);
    const frame = stack.pop()!;
    processed += 1;
    const { before: left, after: right } = frame;
    if (!sameType(left, right) || (!isContainer(left) && !scalarEqual(left, right))) {
      addChange({ kind: "changed", beforePath: frame.beforePath, afterPath: frame.afterPath, beforeIndex: frame.beforeIndex, afterIndex: frame.afterIndex, beforeValue: left as never, afterValue: right as never });
    } else if (isArray(left) && isArray(right)) {
      const keySegments = resolveArrayKey(options.arrayKeys, frame.afterPath) ?? resolveArrayKey(options.arrayKeys, frame.beforePath);
      if (keySegments) {
        const beforeIndexes = await indexByKey(left, keySegments, frame.beforePath, checkpoint);
        const afterIndexes = await indexByKey(right, keySegments, frame.afterPath, checkpoint);
        const commonInAfter: Array<{ id: string; beforeIndex: number; afterIndex: number }> = [];
        for (let afterIndex = 0; afterIndex < right.length; afterIndex += 1) {
          const id = readIdentifier(right[afterIndex], keySegments).id!;
          const beforeIndex = beforeIndexes.get(id);
          if (beforeIndex !== undefined) commonInAfter.push({ id, beforeIndex, afterIndex });
          await checkpoint();
        }
        const stablePositions = await longestIncreasingSubsequencePositions(
          commonInAfter.map((item) => item.beforeIndex),
          left.length,
          checkpoint
        );
        for (let position = 0; position < commonInAfter.length; position += 1) {
          const item = commonInAfter[position];
          if (!stablePositions.has(position)) {
            addChange({
              kind: "moved",
              beforePath: appendDocumentPath(frame.beforePath, item.beforeIndex),
              afterPath: appendDocumentPath(frame.afterPath, item.afterIndex),
              beforeIndex: item.beforeIndex,
              afterIndex: item.afterIndex,
            beforeValue: left[item.beforeIndex] as never,
              afterValue: right[item.afterIndex] as never
            });
          }
          stack.push({
            before: left[item.beforeIndex],
            after: right[item.afterIndex],
            beforePath: appendDocumentPath(frame.beforePath, item.beforeIndex),
            afterPath: appendDocumentPath(frame.afterPath, item.afterIndex),
            beforeIndex: item.beforeIndex,
            afterIndex: item.afterIndex
          });
          await checkpoint();
        }
        for (const [id, beforeIndex] of beforeIndexes) {
          if (!afterIndexes.has(id)) addChange({ kind: "removed", beforePath: appendDocumentPath(frame.beforePath, beforeIndex), beforeIndex, beforeValue: left[beforeIndex] as never });
          await checkpoint();
        }
        for (const [id, afterIndex] of afterIndexes) {
          if (!beforeIndexes.has(id)) addChange({ kind: "added", afterPath: appendDocumentPath(frame.afterPath, afterIndex), afterIndex, afterValue: right[afterIndex] as never });
          await checkpoint();
        }
      } else {
        const commonLength = Math.min(left.length, right.length);
        for (let index = commonLength - 1; index >= 0; index -= 1) {
          stack.push({ before: left[index], after: right[index], beforePath: appendDocumentPath(frame.beforePath, index), afterPath: appendDocumentPath(frame.afterPath, index), beforeIndex: index, afterIndex: index });
          await checkpoint();
        }
        for (let index = left.length - 1; index >= commonLength; index -= 1) {
          addChange({ kind: "removed", beforePath: appendDocumentPath(frame.beforePath, index), beforeIndex: index, beforeValue: left[index] as never });
          await checkpoint();
        }
        for (let index = right.length - 1; index >= commonLength; index -= 1) {
          addChange({ kind: "added", afterPath: appendDocumentPath(frame.afterPath, index), afterIndex: index, afterValue: right[index] as never });
          await checkpoint();
        }
      }
    } else if (left !== null && right !== null && typeof left === "object" && typeof right === "object" && !Array.isArray(left) && !Array.isArray(right)) {
      const leftRecord = left as Record<string, unknown>;
      const rightRecord = right as Record<string, unknown>;
      const keys = [...new Set([...Object.keys(leftRecord), ...Object.keys(rightRecord)])].sort(compareCodePoints);
      for (let index = keys.length - 1; index >= 0; index -= 1) {
        const key = keys[index];
        const hasBefore = Object.prototype.hasOwnProperty.call(leftRecord, key);
        const hasAfter = Object.prototype.hasOwnProperty.call(rightRecord, key);
        const beforePath = appendDocumentPath(frame.beforePath, key);
        const afterPath = appendDocumentPath(frame.afterPath, key);
        if (hasBefore && hasAfter) stack.push({ before: leftRecord[key], after: rightRecord[key], beforePath, afterPath, beforeIndex: frame.beforeIndex, afterIndex: frame.afterIndex });
        else if (hasBefore) addChange({ kind: "removed", beforePath, beforeIndex: frame.beforeIndex, beforeValue: leftRecord[key] as never });
        else addChange({ kind: "added", afterPath, afterIndex: frame.afterIndex, afterValue: rightRecord[key] as never });
        await checkpoint();
      }
    }
    await checkpoint();
    if (now() - lastProgress >= 50) {
      options.onProgress?.({ phase: "compare", processed, total });
      lastProgress = now();
    }
  }
  changes.sort((left, right) => {
    const leftPath = left.afterPath ?? left.beforePath ?? "";
    const rightPath = right.afterPath ?? right.beforePath ?? "";
    const pathOrder = leftPath < rightPath ? -1 : leftPath > rightPath ? 1 : 0;
    return pathOrder || changeOrder[left.kind] - changeOrder[right.kind];
  });
  options.onProgress?.({ phase: "compare", processed, total });
  const counts = { added: 0, removed: 0, changed: 0, moved: 0, total: changes.length };
  changes.forEach(({ kind }) => { counts[kind] += 1; });
  return { format: before.format, equal: changes.length === 0, changes, counts };
};

export const summarizeComparison = (comparison: DocumentComparison, options: SummaryOptions = {}) => {
  const { added, removed, changed, moved, total, equal } = { ...comparison.counts, equal: comparison.equal };
  const description = options.locale === "pl"
    ? equal ? "Dokumenty są identyczne." : `Wykryto ${total} zmian: dodano ${added}, usunięto ${removed}, zmieniono ${changed}, przesunięto ${moved}.`
    : equal ? "The documents are identical." : `Found ${total} changes: ${added} added, ${removed} removed, ${changed} changed, ${moved} moved.`;
  return { added, removed, changed, moved, total, equal, description };
};

export const arrayKeyPathSegments = (path: string): (string | number)[] => parseDocumentPath(path);
