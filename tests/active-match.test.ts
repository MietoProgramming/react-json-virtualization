import { describe, expect, it } from "vitest";
import { resolveActiveMatchTarget } from "../src/components/jsonViewer/activeMatch";
import type { JSONViewerSearchMetadata } from "../src/core/types";

const createTreeMetadata = (matchedPaths: string[]): JSONViewerSearchMetadata => ({
    mode: "tree",
    query: "q",
    pathFilterQuery: "",
    searchQuery: "q",
    matchCount: matchedPaths.length,
    visibleCount: matchedPaths.length,
    matchedPaths,
    matchedRowIds: matchedPaths.map((_, index) => `row:${index}`),
    matchedLineNumbers: [],
    hasMore: false
});

const createPlainMetadata = (matchedLineNumbers: number[]): JSONViewerSearchMetadata => ({
    mode: "plain",
    query: "q",
    pathFilterQuery: "",
    searchQuery: "q",
    matchCount: matchedLineNumbers.length,
    visibleCount: matchedLineNumbers.length,
    matchedPaths: [],
    matchedRowIds: matchedLineNumbers.map((line) => `line:${line}`),
    matchedLineNumbers,
    hasMore: false
});

describe("resolveActiveMatchTarget", () => {
    it("resolves tree matches by index", () => {
        const metadata = createTreeMetadata(["$", "$.users"]);

        expect(resolveActiveMatchTarget(metadata, 1)).toEqual({
            mode: "tree",
            path: "$.users"
        });
    });

    it("returns null for out-of-range tree indexes", () => {
        const metadata = createTreeMetadata(["$.users"]);

        expect(resolveActiveMatchTarget(metadata, 3)).toBeNull();
    });

    it("rejects negative or non-integer indexes", () => {
        const metadata = createTreeMetadata(["$.users"]);

        expect(resolveActiveMatchTarget(metadata, -1)).toBeNull();
        expect(resolveActiveMatchTarget(metadata, 1.5)).toBeNull();
    });

    it("resolves plain matches by line number", () => {
        const metadata = createPlainMetadata([2, 10]);

        expect(resolveActiveMatchTarget(metadata, 0)).toEqual({
            mode: "plain",
            lineNumber: 2
        });
    });

    it("returns null for out-of-range plain indexes", () => {
        const metadata = createPlainMetadata([2]);

        expect(resolveActiveMatchTarget(metadata, 1)).toBeNull();
    });
});
