export type SourceFormat = "auto" | "json" | "yaml" | "xml" | "markdown" | "text";
export type ResolvedSourceFormat = Exclude<SourceFormat, "auto">;

const JSON_START_PATTERN = /^(\{|\[|true\b|false\b|null\b|"|-?\d)/;
const YAML_KEY_PATTERN = /^([A-Za-z0-9_"'-]+|-\s+[A-Za-z0-9_"'-]+)\s*:/;
const MARKDOWN_HINT_PATTERN = /^(#{1,6}\s+|[-*+]\s+|>\s+|```|~~~|\|.+\|)/;
const SAMPLE_LINE_LIMIT = 24;

const getSampleLines = (source: string): string[] => {
    return source
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .slice(0, SAMPLE_LINE_LIMIT);
};

const looksLikeYaml = (source: string): boolean => {
    const lines = getSampleLines(source);
    if (lines.length === 0) {
        return false;
    }

    if (lines[0] === "---" || lines.some((line) => line === "...")) {
        return true;
    }

    const yamlLikeCount = lines.filter((line) => YAML_KEY_PATTERN.test(line)).length;
    return yamlLikeCount >= Math.min(3, lines.length);
};

const looksLikeMarkdown = (source: string): boolean => {
    const lines = getSampleLines(source);
    if (lines.length === 0) {
        return false;
    }

    const markdownLikeCount = lines.filter((line) => MARKDOWN_HINT_PATTERN.test(line)).length;
    return markdownLikeCount >= Math.min(2, lines.length);
};

export const sourceFormatFromFileName = (fileName: string): SourceFormat => {
    const normalized = fileName.toLowerCase();
    if (normalized.endsWith(".json")) {
        return "json";
    }
    if (normalized.endsWith(".yaml") || normalized.endsWith(".yml")) {
        return "yaml";
    }
    if (normalized.endsWith(".xml")) {
        return "xml";
    }
    if (normalized.endsWith(".md") || normalized.endsWith(".markdown")) {
        return "markdown";
    }
    if (normalized.endsWith(".txt")) {
        return "text";
    }
    return "auto";
};

export const resolveSourceFormat = (
    source: string,
    format: SourceFormat = "auto"
): ResolvedSourceFormat => {
    if (format !== "auto") {
        return format;
    }

    const trimmed = source.trimStart();
    if (trimmed.length === 0) {
        return "text";
    }

    if (trimmed.startsWith("<")) {
        return "xml";
    }

    if (JSON_START_PATTERN.test(trimmed)) {
        return "json";
    }

    if (looksLikeYaml(trimmed)) {
        return "yaml";
    }

    if (looksLikeMarkdown(trimmed)) {
        return "markdown";
    }

    return "text";
};

export const supportsTreeMetadata = (format: ResolvedSourceFormat): boolean => {
    return format === "json";
};
