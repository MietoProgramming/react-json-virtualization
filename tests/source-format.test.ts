import { describe, expect, it } from "vitest";
import {
    resolveSourceFormat,
    sourceFormatFromFileName,
    supportsTreeMetadata
} from "../src/core/sourceFormat";
import { parseSourceIncremental } from "../src/core/sourceParser";

describe("source format detection", () => {
    it("detects common formats from source text", () => {
        expect(resolveSourceFormat('{"users":[]}')).toBe("json");
        expect(resolveSourceFormat("<root><item>1</item></root>")).toBe("xml");
        expect(resolveSourceFormat("name: Ada\nactive: true\nscore: 12")).toBe("yaml");
        expect(resolveSourceFormat("## Release notes\n- Added parser\n- Added docs")).toBe("markdown");
        expect(resolveSourceFormat("plain text line without delimiters")).toBe("text");
    });

    it("maps file extensions to explicit format hints", () => {
        expect(sourceFormatFromFileName("payload.json")).toBe("json");
        expect(sourceFormatFromFileName("config.yaml")).toBe("yaml");
        expect(sourceFormatFromFileName("config.yml")).toBe("yaml");
        expect(sourceFormatFromFileName("layout.xml")).toBe("xml");
        expect(sourceFormatFromFileName("guide.md")).toBe("markdown");
        expect(sourceFormatFromFileName("readme.txt")).toBe("text");
        expect(sourceFormatFromFileName("unknown.bin")).toBe("auto");
    });

    it("marks only structured formats as metadata-capable", () => {
        expect(supportsTreeMetadata("json")).toBe(true);
        expect(supportsTreeMetadata("yaml")).toBe(false);
        expect(supportsTreeMetadata("xml")).toBe(false);
        expect(supportsTreeMetadata("markdown")).toBe(false);
        expect(supportsTreeMetadata("text")).toBe(false);
    });
});

describe("parseSourceIncremental", () => {
    it("parses JSON into metadata-compatible values", async () => {
        await expect(parseSourceIncremental('{"name":"Ada","active":true}', "json")).resolves.toEqual({
            format: "json",
            root: {
                active: true,
                name: "Ada"
            }
        });
    });

    it("keeps non-JSON formats in plain mode", async () => {
        await expect(parseSourceIncremental("name: Ada\nactive: true\nscore: 12.5", "yaml")).resolves.toEqual({
            format: "yaml",
            root: null
        });

        await expect(parseSourceIncremental("<root><value>12</value><enabled>true</enabled></root>", "xml"))
            .resolves
            .toEqual({
                format: "xml",
                root: null
            });
    });

    it("returns plain-source result for markdown", async () => {
        await expect(parseSourceIncremental("## heading\n- one\n- two", "markdown")).resolves.toEqual({
            format: "markdown",
            root: null
        });
    });

    it("does not parse non-JSON formats even when progress callback is provided", async () => {
        const events: Array<[number, number]> = [];
        await parseSourceIncremental("name: Ada\nactive: true", "yaml", {
            onProgress: (processed, total) => {
                events.push([processed, total]);
            }
        });

        expect(events).toEqual([]);
    });
});
