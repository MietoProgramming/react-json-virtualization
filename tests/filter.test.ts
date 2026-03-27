import { describe, expect, it } from "vitest";
import { createPathSearchIndex, filterRowsByPathQuery } from "../src/core/filter";
import { flattenJson } from "../src/core/flatten";

describe("filterRowsByPathQuery", () => {
  it("returns matched rows and ancestors", () => {
    const data = {
      users: [{ id: 1, name: "Ada" }],
      config: { retry: true }
    };

    const rows = flattenJson(data, new Set(["$", "$.users", "$.users[0]", "$.config"]));
    const filtered = filterRowsByPathQuery(rows, "users[0].name");

    expect(filtered.map((row) => row.path)).toEqual(["$", "$.users", "$.users[0]", "$.users[0].name"]);
  });

  it("supports case insensitive filtering by default", () => {
    const data = { API: { token: "abc" } };
    const rows = flattenJson(data, new Set(["$", "$.API"]));
    const filtered = filterRowsByPathQuery(rows, "api");

    expect(filtered.map((row) => row.path)).toEqual(["$", "$.API", "$.API.token"]);
  });

  it("uses prefix mode for JSON-path style queries in auto mode", () => {
    const data = { users: [{ name: "Ada" }], profile: { city: "Gdansk" } };
    const rows = flattenJson(data, new Set(["$", "$.users", "$.users[0]", "$.profile"]));

    const filtered = filterRowsByPathQuery(rows, "$.users", { mode: "auto" });

    expect(filtered.map((row) => row.path)).toEqual([
      "$",
      "$.users",
      "$.users[0]",
      "$.users[0].name"
    ]);
  });

  it("returns same prefix result with and without trie index", () => {
    const data = {
      users: [{ id: 1, name: "Ada" }, { id: 2, name: "Linus" }],
      usage: { total: 2 }
    };
    const rows = flattenJson(data, new Set(["$", "$.users", "$.users[0]", "$.users[1]", "$.usage"]));

    const indexed = filterRowsByPathQuery(rows, "$.users", {
      mode: "prefix",
      index: createPathSearchIndex(rows)
    });
    const linear = filterRowsByPathQuery(rows, "$.users", { mode: "prefix" });

    expect(indexed.map((row) => row.path)).toEqual(linear.map((row) => row.path));
  });
});
