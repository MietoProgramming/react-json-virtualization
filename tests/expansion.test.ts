import { describe, expect, it } from "vitest";
import {
    collapsePath,
    createExpandedPathSet,
    expandedPathsFromDepth,
    expandPath,
    toggleExpandedPath
} from "../src/core/expansion";

describe("expansion helpers", () => {
  it("creates set that always includes root", () => {
    const set = createExpandedPathSet(["$.users"]);
    expect(set.has("$")).toBe(true);
    expect(set.has("$.users")).toBe(true);
  });

  it("expands and collapses paths", () => {
    const expanded = expandPath(createExpandedPathSet(), "$.users");
    expect(expanded.has("$.users")).toBe(true);

    const collapsed = collapsePath(expanded, "$.users");
    expect(collapsed.has("$.users")).toBe(false);
  });

  it("toggles paths", () => {
    const first = toggleExpandedPath(createExpandedPathSet(), "$.meta");
    expect(first.has("$.meta")).toBe(true);

    const second = toggleExpandedPath(first, "$.meta");
    expect(second.has("$.meta")).toBe(false);
  });

  it("builds depth-based expansion set", () => {
    const data = { users: [{ profile: { name: "Ada" } }] };
    const paths = expandedPathsFromDepth(data, 2);

    expect(paths.has("$")).toBe(true);
    expect(paths.has("$.users")).toBe(true);
    expect(paths.has("$.users[0]")).toBe(true);
    expect(paths.has("$.users[0].profile")).toBe(false);
  });
});
