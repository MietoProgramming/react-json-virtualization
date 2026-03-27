import type { FlatJsonRow, JSONArray, JSONObject, JSONValue, JSONValueType } from "./types";

const PREVIEW_MAX_LENGTH = 60;

const keyNeedsBracketNotation = (key: string): boolean => {
  return !/^[$A-Z_a-z][$\w]*$/.test(key);
};

const escapeKey = (key: string): string => {
  return key.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
};

const buildPath = (parentPath: string, key: string): string => {
  if (keyNeedsBracketNotation(key)) {
    return `${parentPath}["${escapeKey(key)}"]`;
  }
  return `${parentPath}.${key}`;
};

const getType = (value: JSONValue): JSONValueType => {
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return "array";
  }
  switch (typeof value) {
    case "string":
      return "string";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    default:
      return "object";
  }
};

const clip = (value: string): string => {
  if (value.length <= PREVIEW_MAX_LENGTH) {
    return value;
  }
  return `${value.slice(0, PREVIEW_MAX_LENGTH - 3)}...`;
};

const makePreview = (value: JSONValue): string => {
  const type = getType(value);

  if (type === "null") {
    return "null";
  }
  if (type === "boolean" || type === "number") {
    return String(value);
  }
  if (type === "string") {
    return `\"${clip(value as string)}\"`;
  }
  if (type === "array") {
    return `Array(${(value as JSONArray).length})`;
  }
  return `Object(${Object.keys(value as JSONObject).length})`;
};

const isExpandable = (value: JSONValue): boolean => {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return typeof value === "object" && value !== null && Object.keys(value).length > 0;
};

interface FlattenEntry {
  value: JSONValue;
  path: string;
  key?: string;
  depth: number;
}

export function flattenJson(
  rootValue: JSONValue,
  expandedPaths: ReadonlySet<string>
): FlatJsonRow[] {
  const rows: FlatJsonRow[] = [];
  const stack: FlattenEntry[] = [{ value: rootValue, path: "$", depth: 0 }];

  while (stack.length > 0) {
    const entry = stack.pop();
    if (!entry) {
      continue;
    }

    const type = getType(entry.value);
    const expandable = isExpandable(entry.value);
    const expanded = expandable ? expandedPaths.has(entry.path) : false;

    rows.push({
      id: entry.path,
      path: entry.path,
      depth: entry.depth,
      key: entry.key,
      valueType: type,
      rawValue: entry.value,
      preview: makePreview(entry.value),
      isExpandable: expandable,
      isExpanded: expanded
    });

    if (!expandable || !expanded) {
      continue;
    }

    if (Array.isArray(entry.value)) {
      for (let index = entry.value.length - 1; index >= 0; index -= 1) {
        const path = `${entry.path}[${index}]`;
        stack.push({
          value: entry.value[index],
          path,
          key: String(index),
          depth: entry.depth + 1
        });
      }
      continue;
    }

    const objectValue = entry.value as JSONObject;
    const keys = Object.keys(objectValue);
    for (let index = keys.length - 1; index >= 0; index -= 1) {
      const key = keys[index];
      const path = buildPath(entry.path, key);
      stack.push({
        value: objectValue[key],
        path,
        key,
        depth: entry.depth + 1
      });
    }
  }

  return rows;
}
