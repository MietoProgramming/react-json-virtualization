// @vitest-environment node
import { describe, expect, it } from "vitest";
import { compareDocuments, parseDocument } from "../src/core/documents";
import { buildDiffRows } from "../src/components/diff/buildDiffRows";

describe("buildDiffRows", () => {
  it("pairs keyed records by identity after an insertion and keeps deletions by their old predecessor", async () => {
    const before = await parseDocument({ format: "json", value: { users: [{ id: "a" }, { id: "b" }, { id: "c" }] } });
    const after = await parseDocument({ format: "json", value: { users: [{ id: "x" }, { id: "a" }, { id: "c" }] } });
    const compareOptions = { arrayKeys: { "$.users": "id" } };
    const comparison = await compareDocuments(before, after, compareOptions);
    const rows = buildDiffRows(before, after, comparison, compareOptions);
    const a = rows.find((row) => row.afterRow?.path === "$.users[1]");
    const removedB = rows.findIndex((row) => row.beforeRow?.path === "$.users[1]" && !row.afterRow);
    const c = rows.findIndex((row) => row.afterRow?.path === "$.users[2]");
    expect(a?.beforeRow?.path).toBe("$.users[0]");
    expect(rows.find((row) => row.afterRow?.path === "$.users[0]")?.changeKind).toBe("added");
    expect(removedB).toBeLessThan(c);
    expect(rows[removedB].changeKind).toBe("removed");
  });

  it("keeps before and after paths for a moved record whose fields also changed", async () => {
    const before = await parseDocument({ format: "json", value: { rows: [{ id: 1, value: "a" }, { id: 2, value: "b" }] } });
    const after = await parseDocument({ format: "json", value: { rows: [{ id: 2, value: "changed" }, { id: 1, value: "a" }] } });
    const compareOptions = { arrayKeys: { "$.rows": "id" } };
    const comparison = await compareDocuments(before, after, compareOptions);
    const rows = buildDiffRows(before, after, comparison, compareOptions);
    expect(rows.find((row) => row.afterRow?.path === "$.rows[0]")?.beforeRow?.path).toBe("$.rows[1]");
    expect(rows.find((row) => row.afterRow?.path === "$.rows[0].value")?.beforeRow?.path).toBe("$.rows[1].value");
  });
});
