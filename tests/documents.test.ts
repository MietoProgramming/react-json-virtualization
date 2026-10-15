// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  compareDocuments,
  filterDocument,
  getValueAtPath,
  parseDocument,
  parseDocumentPath,
  searchDocument,
  serializeNode,
  summarizeComparison
} from "../src/core/documents";
import { DocumentError } from "../src/core/documents/types";

describe("document parsing and paths", () => {
  it("parses JSON null and protects special object keys", async () => {
    const document = await parseDocument({ format: "json", text: '{"__proto__":{"safe":true},"x.y":[null]}' });
    expect(document.root).toEqual(JSON.parse('{"__proto__":{"safe":true},"x.y":[null]}'));
    expect(Object.getPrototypeOf(document.root)).toBe(Object.prototype);
    expect(await parseDocument({ format: "json", text: "null" })).toEqual({ format: "json", root: null });
    expect(parseDocumentPath('$["x.y"][0]')).toEqual(["x.y", 0]);
  });

  it("rejects non-JSON values and malformed JSON strings", async () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    await expect(parseDocument({ format: "json", value: cyclic as never })).rejects.toMatchObject({ code: "UNSUPPORTED_VALUE" });
    await expect(parseDocument({ format: "json", text: '"raw\nnewline"' })).rejects.toMatchObject({ code: "INVALID_JSON" });
  });

  it("parses YAML 1.2 aliases and rejects duplicate keys", async () => {
    const document = await parseDocument({ format: "yaml", text: "base: &item\n  id: 1\ncopy: *item\n" });
    expect(document.root).toEqual({ base: { id: 1 }, copy: { id: 1 } });
    expect(JSON.parse(JSON.stringify(document.root))).toEqual({ base: { id: 1 }, copy: { id: 1 } });
    await expect(parseDocument({ format: "yaml", text: "a: 1\na: 2" })).rejects.toMatchObject({ code: "INVALID_YAML" });
  });

  it("normalizes XML mixed content, namespaces and xml:space", async () => {
    const document = await parseDocument({
      format: "xml",
      text: '<p:root xmlns:p="urn:test" xml:space="preserve">a <p:item id="1"/> b<!--skip--></p:root>'
    });
    expect(document.root).toEqual({
      type: "document",
      children: [{
        type: "element",
        name: "{urn:test}root",
        attributes: { "{http://www.w3.org/XML/1998/namespace}space": "preserve" },
        children: [
          { type: "text", value: "a " },
          { type: "element", name: "{urn:test}item", attributes: { id: "1" }, children: [] },
          { type: "text", value: " b" }
        ]
      }]
    });
    await expect(parseDocument({ format: "xml", text: "<!DOCTYPE x><x/>" })).rejects.toMatchObject({ code: "INVALID_XML" });
    await expect(parseDocument({ format: "xml", text: "<x><!-- <!DOCTYPE inside comment> --><![CDATA[<!DOCTYPE text>]]></x>" })).resolves.toMatchObject({ format: "xml" });
    await expect(parseDocument({ format: "xml", text: "<x>a<![CDATA[b]]>c</x>" })).resolves.toMatchObject({
      root: { children: [{ children: [{ type: "text", value: "abc" }] }] }
    });
    await expect(parseDocument({ format: "xml", text: "<root> </root>" })).resolves.toMatchObject({
      root: { children: [{ children: [{ type: "text", value: " " }] }] }
    });
    await expect(parseDocument({ format: "xml", text: "<root>alpha<b/> </root>" })).resolves.toMatchObject({
      root: { children: [{ children: [{ type: "text", value: "alpha" }, { type: "element" }, { type: "text", value: " " }] }] }
    });
    await expect(parseDocument({ format: "xml", text: "<root><b/> <i/></root>" })).resolves.toMatchObject({
      root: { children: [{ children: [{ type: "element" }, { type: "element" }] }] }
    });
  });

  it("looks up null distinctly from a missing path and serializes nodes", async () => {
    const document = await parseDocument({ format: "json", value: { "dot.key": null } });
    expect(getValueAtPath(document, '$["dot.key"]')).toEqual({ found: true, value: null });
    expect(getValueAtPath(document, "$.missing")).toEqual({ found: false });
    expect(serializeNode(document, '$["dot.key"]')).toBe("null");
  });
});

describe("document search and filter", () => {
  it("searches deep nodes independently of viewer expansion and paginates", async () => {
    const document = await parseDocument({ format: "json", value: { users: [{ name: "Ada" }, { name: "Linus" }] } });
    const result = await searchDocument(document, "linus", { limit: 1 });
    expect(result).toMatchObject({ total: 1, offset: 0, limit: 1, hasMore: false });
    expect(result.items[0].path).toBe("$.users[1].name");
  });

  it("supports path prefix and includes-OR terms, returning ancestor context", async () => {
    const document = await parseDocument({ format: "json", value: { users: [{ name: "Ada" }], profile: { city: "Gdansk" } } });
    const filtered = await filterDocument(document, "$.users profile", { mode: "auto" });
    expect(filtered.items.map(({ path }) => path)).toContain("$.users");
    expect(filtered.items.map(({ path }) => path)).toContain("$.profile");
    expect(filtered.contextPaths).toContain("$");
    expect(filtered.contextPaths).toContain("$.users[0].name");
  });

  it("matches exact special-key path segments", async () => {
    const document = await parseDocument({ format: "json", value: { "a.b": { value: 1 } } });
    const result = await searchDocument(document, "a.b", { mode: "exact" });
    expect(result.items.map(({ path }) => path)).toContain('$["a.b"]');
  });

  it("rejects invalid page sizes instead of rounding them", async () => {
    const document = await parseDocument({ format: "json", text: "[1,2]" });
    await expect(searchDocument(document, "", { limit: 1.5 })).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });
});

describe("document comparison", () => {
  const parse = (value: unknown) => parseDocument({ format: "json", value: value as never });

  it("compares object keys independent of order and distinguishes null, missing and value types", async () => {
    const before = await parse({ b: 1, missing: null, typed: 1 });
    const after = await parse({ typed: "1", b: 1, missing: null, addedNull: null });
    const result = await compareDocuments(before, after);
    expect(result.changes.map(({ kind, beforePath, afterPath }) => ({ kind, beforePath, afterPath }))).toEqual([
      { kind: "added", beforePath: undefined, afterPath: "$.addedNull" },
      { kind: "changed", beforePath: "$.typed", afterPath: "$.typed" }
    ]);
    expect(result.counts).toEqual({ added: 1, removed: 0, changed: 1, moved: 0, total: 2 });
  });

  it("treats negative zero as equal to zero", async () => {
    const before = await parse(-0);
    const after = await parse(0);
    await expect(compareDocuments(before, after)).resolves.toMatchObject({ equal: true, counts: { total: 0 } });
  });

  it("matches arrays by configured keys without false moves from a leading insertion", async () => {
    const before = await parse({ users: [{ id: 1, name: "Ada" }, { id: 2, name: "Linus" }] });
    const after = await parse({ users: [{ id: 3, name: "Grace" }, { id: 1, name: "Ada" }, { id: 2, name: "Linus" }] });
    const result = await compareDocuments(before, after, { arrayKeys: { "$.users": "id" } });
    expect(result.counts).toMatchObject({ added: 1, moved: 0, changed: 0 });
  });

  it("reports deterministic movement separately from field changes", async () => {
    const before = await parse({ rows: [{ id: "a", value: 1 }, { id: "b", value: 2 }, { id: "c", value: 3 }] });
    const after = await parse({ rows: [{ id: "c", value: 4 }, { id: "a", value: 1 }, { id: "b", value: 2 }] });
    const result = await compareDocuments(before, after, { arrayKeys: { "$.rows": "id" } });
    expect(result.counts).toMatchObject({ moved: 1, changed: 1 });
    expect(result.changes.find(({ kind }) => kind === "moved")).toMatchObject({ beforeIndex: 2, afterIndex: 0 });
    expect(summarizeComparison(result, { locale: "pl" }).description).toContain("przesunięto 1");
  });

  it("uses the earliest after index to break equally long reorder alignments", async () => {
    const before = await parse([{ id: "a" }, { id: "b" }]);
    const after = await parse([{ id: "b" }, { id: "a" }]);
    const result = await compareDocuments(before, after, { arrayKeys: { "$": "id" } });
    expect(result.changes.filter(({ kind }) => kind === "moved")).toMatchObject([
      { beforeIndex: 0, afterIndex: 1 }
    ]);
  });

  it("rejects ambiguous keys and reports format mismatches", async () => {
    const before = await parse([{ id: 1 }, { id: 1 }]);
    const after = await parse([{ id: 1 }]);
    await expect(compareDocuments(before, after, { arrayKeys: { "$": "id" } })).rejects.toBeInstanceOf(DocumentError);
    await expect(compareDocuments(before, { format: "yaml", root: [] })).rejects.toMatchObject({ code: "FORMAT_MISMATCH" });
  });
});
