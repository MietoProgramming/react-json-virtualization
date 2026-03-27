import { describe, expect, it } from "vitest";
import { parseJsonIncremental } from "../src/core/parser";

describe("parseJsonIncremental", () => {
  it("parses nested JSON data", async () => {
    const input = JSON.stringify({
      users: [{ id: 1, name: "Ada" }, { id: 2, name: "Linus" }],
      active: true,
      note: null,
      score: 12.5
    });

    const result = await parseJsonIncremental(input);

    expect(result).toEqual({
      users: [{ id: 1, name: "Ada" }, { id: 2, name: "Linus" }],
      active: true,
      note: null,
      score: 12.5
    });
  });

  it("throws for invalid JSON", async () => {
    await expect(parseJsonIncremental("{ invalid"))
      .rejects
      .toThrowError(/Object keys must be strings/);
  });
});
