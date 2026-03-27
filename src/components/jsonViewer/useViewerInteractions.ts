import { useCallback } from "react";
import { toggleExpandedPath } from "../../core/expansion";
import type { FlatJsonRow } from "../../core/types";

interface UseViewerInteractionsParams {
  alwaysExpanded: boolean;
  isExpandedControlled: boolean;
  activeExpandedPaths: ReadonlySet<string>;
  setInternalExpandedPaths: React.Dispatch<React.SetStateAction<Set<string>>>;
  onExpandedPathsChange?: (paths: Set<string>) => void;
  rowsByPath: Map<string, FlatJsonRow>;
  setInternalSelectedPath: React.Dispatch<React.SetStateAction<string>>;
  onNodeClick?: (path: string, row: FlatJsonRow) => void;
}

interface ViewerInteractions {
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
}

export const useViewerInteractions = ({
  alwaysExpanded,
  isExpandedControlled,
  activeExpandedPaths,
  setInternalExpandedPaths,
  onExpandedPathsChange,
  rowsByPath,
  setInternalSelectedPath,
  onNodeClick
}: UseViewerInteractionsParams): ViewerInteractions => {
  const onToggle = useCallback(
    (path: string): void => {
      if (alwaysExpanded) {
        return;
      }

      if (isExpandedControlled) {
        onExpandedPathsChange?.(toggleExpandedPath(activeExpandedPaths, path));
        return;
      }

      setInternalExpandedPaths((current: Set<string>) => {
        const next = toggleExpandedPath(current, path);
        onExpandedPathsChange?.(next);
        return next;
      });
    },
    [activeExpandedPaths, alwaysExpanded, isExpandedControlled, onExpandedPathsChange, setInternalExpandedPaths]
  );

  const onSelect = useCallback(
    (path: string): void => {
      setInternalSelectedPath(path);
      const row = rowsByPath.get(path);
      if (row) {
        onNodeClick?.(path, row);
      }
    },
    [onNodeClick, rowsByPath, setInternalSelectedPath]
  );

  return { onToggle, onSelect };
};
