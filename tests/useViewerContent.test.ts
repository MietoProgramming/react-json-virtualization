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
});
