import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
    canUsePrefixPathSearchIndex,
    useViewerContent
} from "../src/components/jsonViewer/useViewerContent";
import type { JSONValue } from "../src/core/types";

type HookParams = Parameters<typeof useViewerContent>[0];
type HookResult = ReturnType<typeof useViewerContent>;

const runUseViewerContent = (params: HookParams): HookResult => {
  let result: HookResult | undefined;

  const Harness = (): null => {
    result = useViewerContent(params);
    return null;
  };

  renderToStaticMarkup(React.createElement(Harness));

  if (!result) {
    throw new Error("useViewerContent did not return a value.");
  }

  return result;
};

describe("canUsePrefixPathSearchIndex", () => {
  it("requires exactly one prefix-eligible term", () => {
    expect(canUsePrefixPathSearchIndex(["$.users"], "auto")).toBe(true);
    expect(canUsePrefixPathSearchIndex(["$.users", "profile"], "auto")).toBe(false);
    expect(canUsePrefixPathSearchIndex(["users"], "auto")).toBe(false);
    expect(canUsePrefixPathSearchIndex(["users"], "prefix")).toBe(true);
  });
});

describe("useViewerContent", () => {
  it("applies auto mode per term for mixed prefix and includes queries", () => {
    const root: JSONValue = {
      users: [{ name: "Ada" }],
      profile: { city: "Gdansk" }
    };

    const result = runUseViewerContent({
      metadata: true,
      json: JSON.stringify(root),
      root,
      activeExpandedPaths: new Set(["$", "$.users", "$.users[0]", "$.profile"]),
      pathFilterQuery: "$.users profile",
      pathFilterCaseSensitive: false,
      pathFilterMode: "auto"
    });

    expect(result.filteredRows.map((row) => row.path)).toEqual([
      "$",
      "$.users",
      "$.users[0]",
      "$.users[0].name",
      "$.profile",
      "$.profile.city"
    ]);
  });

  it("reports direct matches separately from ancestor rows in metadata mode", () => {
    const root: JSONValue = {
      users: [{ name: "Ada" }],
      profile: { city: "Gdansk" }
    };

    const result = runUseViewerContent({
      metadata: true,
      json: JSON.stringify(root),
      root,
      activeExpandedPaths: new Set(["$", "$.users", "$.users[0]", "$.profile"]),
      pathFilterQuery: "users[0].name",
      searchQuery: "$.users[0].name",
      pathFilterCaseSensitive: false,
      pathFilterMode: "auto"
    });

    expect(result.filteredRows.map((row) => row.path)).toEqual([
      "$",
      "$.users",
      "$.users[0]",
      "$.users[0].name"
    ]);
    expect(result.matchedPathSet.has("$.users[0].name")).toBe(true);
    expect(result.matchedPathSet.has("$.users")).toBe(false);
    expect(result.searchMetadata.mode).toBe("tree");
    expect(result.searchMetadata.query).toBe("$.users[0].name");
    expect(result.searchMetadata.matchCount).toBe(1);
    expect(result.searchMetadata.visibleCount).toBe(4);
    expect(result.searchMetadata.matchedPaths).toEqual(["$.users[0].name"]);
    expect(result.searchMetadata.hasMore).toBe(false);
  });

  it("does not filter rows when only searchQuery is set", () => {
    const root: JSONValue = {
      users: [{ name: "Ada" }, { name: "Linus" }],
      profile: { city: "Gdansk" }
    };

    const base = runUseViewerContent({
      metadata: true,
      json: JSON.stringify(root),
      root,
      activeExpandedPaths: new Set(["$", "$.users", "$.users[0]", "$.users[1]", "$.profile"]),
      pathFilterQuery: "",
      pathFilterCaseSensitive: false,
      pathFilterMode: "auto"
    });

    const result = runUseViewerContent({
      metadata: true,
      json: JSON.stringify(root),
      root,
      activeExpandedPaths: new Set(["$", "$.users", "$.users[0]", "$.users[1]", "$.profile"]),
      pathFilterQuery: "",
      searchQuery: "Linus",
      pathFilterCaseSensitive: false,
      pathFilterMode: "auto"
    });

    expect(result.filteredRows.map((row) => row.path)).toEqual(
      base.filteredRows.map((row) => row.path)
    );
    expect(result.matchedPathSet.size).toBeGreaterThan(0);
    expect(result.searchMetadata.query).toBe("Linus");
  });

  it("caps metadata match payloads and sets hasMore", () => {
    const root: JSONValue = {
      users: [{ name: "Ada" }, { name: "Ada" }, { name: "Ada" }]
    };

    const result = runUseViewerContent({
      metadata: true,
      json: JSON.stringify(root),
      root,
      activeExpandedPaths: new Set(["$", "$.users", "$.users[0]", "$.users[1]", "$.users[2]" ]),
      pathFilterQuery: "name",
      searchQuery: "Ada",
      pathFilterCaseSensitive: false,
      pathFilterMode: "auto",
      searchMetadataLimit: 1
    });

    expect(result.searchMetadata.matchCount).toBeGreaterThan(1);
    expect(result.searchMetadata.matchedPaths.length).toBe(1);
    expect(result.searchMetadata.matchedRowIds.length).toBe(1);
    expect(result.searchMetadata.hasMore).toBe(true);
  });

  it("filters pretty lines using OR semantics across terms", () => {
    const json = `{
  "zero": 0,
  "greet": "hello",
  "other": "x"
}`;

    const result = runUseViewerContent({
      metadata: false,
      json,
      root: null,
      activeExpandedPaths: new Set<string>(),
      pathFilterQuery: "zero hello",
      pathFilterCaseSensitive: false,
      pathFilterMode: "auto"
    });

    expect(result.filteredPrettyLineIndexes).toEqual([1, 2]);
    expect(result.filteredItemCount).toBe(2);
  });

  it("supports quoted phrase filtering in pretty line mode", () => {
    const json = `{
  "city": "new york",
  "other": "x"
}`;

    const result = runUseViewerContent({
      metadata: false,
      json,
      root: null,
      activeExpandedPaths: new Set<string>(),
      pathFilterQuery: '"new york"',
      pathFilterCaseSensitive: false,
      pathFilterMode: "auto"
    });

    expect(result.filteredPrettyLineIndexes).toEqual([1]);
    expect(result.filteredItemCount).toBe(1);
  });

  it("highlights matches without filtering in pretty line mode", () => {
    const json = `{
  "city": "new york",
  "other": "new jersey"
}`;

    const result = runUseViewerContent({
      metadata: false,
      json,
      root: null,
      activeExpandedPaths: new Set<string>(),
      pathFilterQuery: "",
      searchQuery: "york",
      pathFilterCaseSensitive: false,
      pathFilterMode: "auto"
    });

    expect(result.filteredPrettyLineIndexes).toEqual([0, 1, 2, 3]);
    expect(result.matchedPrettyLineIndexSet.has(1)).toBe(true);
    expect(result.searchMetadata.mode).toBe("plain");
    expect(result.searchMetadata.query).toBe("york");
    expect(result.searchMetadata.matchCount).toBe(1);
    expect(result.searchMetadata.visibleCount).toBe(4);
    expect(result.searchMetadata.matchedLineNumbers).toEqual([2]);
    expect(result.searchMetadata.matchedRowIds).toEqual(["line:2"]);
  });

  it("keeps filter rows and highlights only matching row for search", () => {
    const root: JSONValue = {
      emptyObject: {},
      emptyArray: []
    };

    const result = runUseViewerContent({
      metadata: true,
      json: JSON.stringify(root),
      root,
      activeExpandedPaths: new Set(["$"]),
      pathFilterQuery: "empty",
      searchQuery: "Arr",
      pathFilterCaseSensitive: false,
      pathFilterMode: "auto"
    });

    expect(result.filteredRows.map((row) => row.path)).toEqual(["$", "$.emptyObject", "$.emptyArray"]);
    expect(result.matchedPathSet.has("$.emptyArray")).toBe(true);
    expect(result.matchedPathSet.has("$.emptyObject")).toBe(false);
    expect(result.searchMetadata.matchCount).toBe(1);
    expect(result.searchMetadata.visibleCount).toBe(3);
  });
});
