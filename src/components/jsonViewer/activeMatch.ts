import type { JSONViewerSearchMetadata } from "../../core/types";

export type ActiveMatchTarget =
    | { mode: "tree"; path: string }
    | { mode: "plain"; lineNumber: number };

const isValidIndex = (value: number | null | undefined): value is number => {
    return value !== null && value !== undefined && Number.isInteger(value) && value >= 0;
};

export const resolveActiveMatchTarget = (
    metadata: JSONViewerSearchMetadata,
    activeMatchIndex?: number | null
): ActiveMatchTarget | null => {
    if (!isValidIndex(activeMatchIndex)) {
        return null;
    }

    if (metadata.mode === "tree") {
        const path = metadata.matchedPaths[activeMatchIndex];
        return path ? { mode: "tree", path } : null;
    }

    const lineNumber = metadata.matchedLineNumbers[activeMatchIndex];
    if (lineNumber === undefined) {
        return null;
    }

    return { mode: "plain", lineNumber };
};
