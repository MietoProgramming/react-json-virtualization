export type JSONPrimitive = string | number | boolean | null;

export type JSONValue = JSONPrimitive | JSONObject | JSONArray;

export interface JSONObject {
  [key: string]: JSONValue;
}

export type JSONArray = JSONValue[];

export type JSONValueType =
  | "string"
  | "number"
  | "boolean"
  | "null"
  | "object"
  | "array";

export interface FlatJsonRow {
  id: string;
  path: string;
  depth: number;
  key?: string;
  valueType: JSONValueType;
  rawValue: JSONValue;
  preview: string;
  isExpandable: boolean;
  isExpanded: boolean;
}

export type SearchMetadataMode = "tree" | "plain";

export interface JSONViewerSearchMetadata {
  mode: SearchMetadataMode;
  query: string;
  pathFilterQuery: string;
  searchQuery: string;
  matchCount: number;
  visibleCount: number;
  matchedPaths: string[];
  matchedRowIds: string[];
  matchedLineNumbers: number[];
  hasMore: boolean;
}

export interface ParseOptions {
  yieldIntervalMs?: number;
  signal?: AbortSignal;
  onProgress?: (processedChars: number, totalChars: number) => void;
}
