import { parseJsonIncremental } from "./parser";
import { resolveSourceFormat, type ResolvedSourceFormat, type SourceFormat } from "./sourceFormat";
import type { JSONValue, ParseOptions } from "./types";

export interface ParsedSourceResult {
    root: JSONValue | null;
    format: ResolvedSourceFormat;
}

export async function parseSourceIncremental(
    source: string,
    format: SourceFormat = "auto",
    options: ParseOptions = {}
): Promise<ParsedSourceResult> {
    if (options.signal?.aborted) {
        throw new Error("Source parsing aborted");
    }

    const resolvedFormat = resolveSourceFormat(source, format);
    if (resolvedFormat !== "json") {
        return {
            root: null,
            format: resolvedFormat
        };
    }

    const root = await parseJsonIncremental(source, options);
    return { root, format: resolvedFormat };
}
