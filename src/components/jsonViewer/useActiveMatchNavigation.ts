import { useEffect, useMemo, useRef } from "react";
import type { FlatJsonRow, JSONViewerSearchMetadata } from "../../core/types";
import { resolveActiveMatchTarget } from "./activeMatch";

interface UseActiveMatchNavigationParams {
    searchMetadata: JSONViewerSearchMetadata;
    activeMatchIndex?: number | null;
    usesMetadataTree: boolean;
    filteredRows: FlatJsonRow[];
    filteredPrettyLineIndexes: number[];
    selectedPath: string | undefined;
    setInternalSelectedPath: React.Dispatch<React.SetStateAction<string>>;
    startIndex: number;
    endIndex: number;
    scrollToIndex: (index: number, align?: "start" | "center" | "end") => void;
}

interface ActiveMatchNavigationState {
    activeMatchPath: string | null;
    activeMatchLineIndex: number | null;
}

export const useActiveMatchNavigation = ({
    searchMetadata,
    activeMatchIndex,
    usesMetadataTree,
    filteredRows,
    filteredPrettyLineIndexes,
    selectedPath,
    setInternalSelectedPath,
    startIndex,
    endIndex,
    scrollToIndex
}: UseActiveMatchNavigationParams): ActiveMatchNavigationState => {
    const activeMatchTarget = useMemo(
        () => resolveActiveMatchTarget(searchMetadata, activeMatchIndex),
        [activeMatchIndex, searchMetadata]
    );
    const activeMatchPath =
        usesMetadataTree && activeMatchTarget?.mode === "tree" ? activeMatchTarget.path : null;
    const activeMatchLineIndex =
        !usesMetadataTree && activeMatchTarget?.mode === "plain"
            ? activeMatchTarget.lineNumber - 1
            : null;
    const filteredRowIndexByPath = useMemo(() => {
        if (!usesMetadataTree) {
            return new Map<string, number>();
        }

        const index = new Map<string, number>();
        filteredRows.forEach((row, rowIndex) => {
            index.set(row.path, rowIndex);
        });
        return index;
    }, [filteredRows, usesMetadataTree]);
    const filteredLineIndexByLine = useMemo(() => {
        if (usesMetadataTree) {
            return new Map<number, number>();
        }

        const index = new Map<number, number>();
        filteredPrettyLineIndexes.forEach((lineIndex, rowIndex) => {
            index.set(lineIndex, rowIndex);
        });
        return index;
    }, [filteredPrettyLineIndexes, usesMetadataTree]);
    const activeMatchScrollIndex = useMemo(() => {
        if (!activeMatchTarget) {
            return null;
        }

        if (activeMatchTarget.mode === "tree") {
            return filteredRowIndexByPath.get(activeMatchTarget.path) ?? null;
        }

        const lineIndex = activeMatchTarget.lineNumber - 1;
        return filteredLineIndexByLine.get(lineIndex) ?? null;
    }, [activeMatchTarget, filteredLineIndexByLine, filteredRowIndexByPath]);
    const lastActiveMatchSignature = useRef<string | null>(null);

    useEffect(() => {
        if (!usesMetadataTree || selectedPath !== undefined || !activeMatchPath) {
            return;
        }

        setInternalSelectedPath((current) => (current === activeMatchPath ? current : activeMatchPath));
    }, [activeMatchPath, selectedPath, setInternalSelectedPath, usesMetadataTree]);

    useEffect(() => {
        if (activeMatchScrollIndex === null || !activeMatchTarget) {
            lastActiveMatchSignature.current = null;
            return;
        }

        const nextSignature = activeMatchTarget.mode === "tree"
            ? `tree:${activeMatchTarget.path}:${activeMatchScrollIndex}`
            : `plain:${activeMatchTarget.lineNumber}:${activeMatchScrollIndex}`;

        if (lastActiveMatchSignature.current === nextSignature) {
            return;
        }

        lastActiveMatchSignature.current = nextSignature;

        if (activeMatchScrollIndex >= startIndex && activeMatchScrollIndex < endIndex) {
            return;
        }

        scrollToIndex(activeMatchScrollIndex, "center");
    }, [activeMatchScrollIndex, activeMatchTarget, endIndex, scrollToIndex, startIndex]);

    return {
        activeMatchPath,
        activeMatchLineIndex
    };
};
