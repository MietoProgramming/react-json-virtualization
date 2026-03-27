import { describe, expect, it } from "vitest";
import { flattenJson } from "../src/core/flatten";

describe("flattenJson", () => {
  it("includes root row and expanded children", () => {
    const value = {
      profile: {
        name: "Kamil"
      },
      items: [1, 2]
    };

    const rows = flattenJson(value, new Set(["$", "$.profile"]));

    expect(rows.map((row) => row.path)).toEqual([
      "$",
      "$.profile",
      "$.profile.name",
      "$.items"
    ]);
  });
});
