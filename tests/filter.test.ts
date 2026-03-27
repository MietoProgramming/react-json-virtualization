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

  it("matches primitive values at any depth and includes ancestors", () => {
    const data = {
      users: [{ id: 1, name: "test-user" }, { id: 2, name: "Linus" }],
      meta: { label: "production" }
    };
    const rows = flattenJson(data, new Set(["$", "$.users", "$.users[0]", "$.users[1]", "$.meta"]));

    const filtered = filterRowsByPathQuery(rows, "test");

    expect(filtered.map((row) => row.path)).toEqual([
      "$",
      "$.users",
      "$.users[0]",
      "$.users[0].name"
    ]);
  });

  it("respects case sensitivity for value matching", () => {
    const data = { profile: { tag: "TestCase" } };
    const rows = flattenJson(data, new Set(["$", "$.profile"]));

    const insensitive = filterRowsByPathQuery(rows, "test", { caseSensitive: false });
    const sensitive = filterRowsByPathQuery(rows, "test", { caseSensitive: true });

    expect(insensitive.map((row) => row.path)).toEqual(["$", "$.profile", "$.profile.tag"]);
    expect(sensitive).toEqual([]);
  });

  it("matches object and array values", () => {
    const data = {
      details: { code: "ABC" },
      tags: ["one", "two"]
    };
    const rows = flattenJson(data, new Set(["$", "$.details", "$.tags"]));

    const objectFiltered = filterRowsByPathQuery(rows, '"code":"ABC"');
    const arrayFiltered = filterRowsByPathQuery(rows, '"two"');

    expect(objectFiltered.map((row) => row.path)).toEqual(["$", "$.details"]);
    expect(arrayFiltered.map((row) => row.path)).toEqual(["$", "$.tags"]);
  });
});
