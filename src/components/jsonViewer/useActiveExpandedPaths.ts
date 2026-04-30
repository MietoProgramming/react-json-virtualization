import { useMemo } from "react";
import { createExpandedPathSet, expandedPathsFromDepth } from "../../core/expansion";
import type { JSONValue } from "../../core/types";

interface UseActiveExpandedPathsParams {
    usesMetadataTree: boolean;
    root: JSONValue | null;
    alwaysExpanded: boolean;
    expandedPaths: ReadonlySet<string> | undefined;
    internalExpandedPaths: Set<string>;
}

export const useActiveExpandedPaths = ({
    usesMetadataTree,
    root,
    alwaysExpanded,
    expandedPaths,
    internalExpandedPaths
}: UseActiveExpandedPathsParams): ReadonlySet<string> => {
    const fullyExpandedPaths = useMemo(() => {
        if (!usesMetadataTree || root === null) {
            return createExpandedPathSet();
        }
        return expandedPathsFromDepth(root, Number.POSITIVE_INFINITY);
    }, [root, usesMetadataTree]);

    return useMemo(() => {
        if (!usesMetadataTree) {
            return createExpandedPathSet();
        }

        if (alwaysExpanded) {
            return fullyExpandedPaths;
        }

        return createExpandedPathSet(expandedPaths ?? internalExpandedPaths);
    }, [alwaysExpanded, expandedPaths, fullyExpandedPaths, internalExpandedPaths, usesMetadataTree]);
};
