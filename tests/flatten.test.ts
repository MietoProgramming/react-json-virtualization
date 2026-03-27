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

  it("keeps tree rows but omits Object/Array count previews when metadata is disabled", () => {
    const value = {
      profile: {
        name: "Kamil"
      },
      items: [1, 2]
    };

    const rows = flattenJson(value, new Set(["$", "$.profile", "$.items"]), {
      metadata: false
    });

    expect(rows.map((row) => row.path)).toEqual([
      "$",
      "$.profile",
      "$.profile.name",
      "$.items",
      "$.items[0]",
      "$.items[1]"
    ]);
    expect(rows.find((row) => row.path === "$")?.preview).toBe("");
    expect(rows.find((row) => row.path === "$.items")?.preview).toBe("");
  });
});
